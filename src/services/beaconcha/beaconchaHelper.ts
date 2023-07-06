import { beaconChainData, globalPersistentData, globalStakingData, isDebug, stakingContract } from "../../bots/heartbeat";
import { loadJSON, saveJSON } from "../../bots/heartbeat/save-load-JSON";
import { getEstimatedRewardsPerSecond } from "../../bots/nodesBalance";
import { EpochData, IncomeReport } from "../../entities/incomeReport";
import { Report } from "../../entities/staking";
import { etow } from "../../utils/numberUtils";
import { ValidatorDataResponse, getEpoch as getBeaconChainEpoch, getEpoch, getValidatorBalanceHistory, getValidatorWithrawalInEpoch, getValidatorsData, getValidatorsIncomeDetailHistory } from "./beaconcha";
import { Donations as Donation, EMPTY_BEACON_CHAIN_DATA, IBeaconChainHeartBeatData, IEpochResponse, MiniIDHReport } from "./entities";



export async function setBeaconchaData() {
    beaconChainData.validatorsData = await getValidatorsData()


    beaconChainData.validatorsStatusesQty = beaconChainData.validatorsData.reduce((acc: Record<string, number>, curr: ValidatorDataResponse) => {
        if (!curr.data.status) return acc
        if (!acc[curr.data.status]) acc[curr.data.status] = 0
        acc[curr.data.status] += 1
        return acc
    }, {})

    const latestEpochData: IEpochResponse = await getBeaconChainEpoch()
    beaconChainData.currentEpoch = latestEpochData.data.epoch
}

export async function setIncomeDetailHistory() {
    try {
        const toEpoch: number = (await getEpoch()).data.epoch - 3 // Last 3 epochs are still getting processed, so they shouldn't be added
        const filename = "income_detail_history.json"
        // When coming from file, it's not the class, but the structure.
        const incomeDetailHistory: Record<number, IncomeReport> = {}
        loadJSON<IncomeReport[]>(filename, true).forEach((e: IncomeReport) => incomeDetailHistory[e.index] = new IncomeReport(e.index, e.atEpoch, e.prevAtEpoch))
        console.log("Income report file read successfully")
        let fromEpoch = 186000
        if (Object.keys(incomeDetailHistory).length > 0) { // All atEpoch.epoch should be the same for all registries
            const firstKey = Object.keys(incomeDetailHistory)[0]
            fromEpoch = incomeDetailHistory[Number(firstKey)].atEpoch.epoch + 1
        }
        console.log("Getting IDH from epoch", fromEpoch, "to epoch", toEpoch)
        // Obtaining validatorsIndexes filtering out undefined ones
        if (!beaconChainData.validatorsData) throw new Error("Validators data not set")
        const validatorIndexes: number[] = beaconChainData.validatorsData
            .map((v: ValidatorDataResponse) => v.data.validatorindex)
            .filter((index: number | undefined) => index !== undefined) as number[]// If it's undefined, it hasn't been fully activated yet

        // Splitting active validators in groups of 100 and getting IDH, since beacon chain doesn't allow more
        const validatorsGroups = getValidatorsGroups(validatorIndexes)
        const validatorsIDHArray: Record<number, MiniIDHReport>[] = await Promise.all(validatorsGroups.map(async (validatorsGroup: number[]) => {
            console.log("Getting IDH for validators", validatorsGroup)
            return getValidatorsIncomeDetailHistory(validatorsGroup, fromEpoch, toEpoch)
        }))

        // TODO Test
        // let validatorsIDH: Record<number, MiniIDHReport> = {}
        // for(let v of validatorsIDHArray) {
        //     Object.assign(validatorsIDH, v)
        // }
        
        // Joining IDH
        const validatorsIDH: Record<number, MiniIDHReport> = validatorsIDHArray.reduce((acc: Record<number, MiniIDHReport>, curr: Record<number, MiniIDHReport>) => {
            Object.keys(curr).forEach((validatorIndex: string) => acc[Number(validatorIndex)] = curr[Number(validatorIndex)])
            return acc
        }, {})
        console.log("Validators IDH", JSON.stringify(validatorsIDH))

        // Adding new donations
        console.log("Getting donations")
        const recentDonations = getNewDonations(fromEpoch, toEpoch)
        console.log("Donations", recentDonations)
        validatorsIDH[0] = {
            lastCheckedEpoch: 0,
            rewards: recentDonations,
            penalties: 0n
        }

        // Calling contract
        console.log("Building report")
        const report: Report = { from: fromEpoch, to: toEpoch, rewards: 0n, penalties: 0n }
        Object.keys(validatorsIDH).forEach((validatorIndex: string) => {
            const indexAsNumber = Number(validatorIndex)
            const validatorIDH: MiniIDHReport = validatorsIDH[indexAsNumber]
            report.rewards += validatorIDH.rewards
            report.penalties += validatorIDH.penalties
        })
        const rewardsPerSecond = await getEstimatedRewardsPerSecond(report)

        console.log("Reporting epochs to contract")
        await stakingContract.reportEpochs(report, rewardsPerSecond)
        console.log("Epochs reported successfully")
        // Setting new data for saving file
        Object.keys(validatorsIDH).forEach((index: string) => {
            const indexAsNumber = Number(index)
            const validatorIDH: MiniIDHReport = validatorsIDH[indexAsNumber]
            if (!incomeDetailHistory[indexAsNumber]) {
                const initialEpochData: EpochData = {
                    epoch: validatorsIDH[indexAsNumber].lastCheckedEpoch - 1,
                    totalHistoricRewards: "0",
                    totalHistoricPenalties: "0",
                }

                incomeDetailHistory[indexAsNumber] = new IncomeReport(indexAsNumber, initialEpochData, initialEpochData)
            }

            incomeDetailHistory[indexAsNumber].setAtEpoch(toEpoch, validatorIDH.rewards, validatorIDH.penalties)
        })
        const jsonToSave: IncomeReport[] = Object.keys(incomeDetailHistory).map((index: string) => (
            incomeDetailHistory[Number(index)]
        ))
        console.log("Saving IDH", JSON.stringify(jsonToSave))
        saveJSON(jsonToSave, filename)
    } catch (err: any) {
        console.error("Error reporting income detail", err.message, err.stack)
    }
}

function getValidatorsGroups(validatorIndexes: number[]): number[][] {
    let i = 0
    const output = []
    while (i < validatorIndexes.length) {
        output.push(validatorIndexes.slice(i, i + 100))
        i += 100
    }
    return output
}

function getNewDonations(fromEpoch: number, toEpoch: number): bigint {
    const donations = loadJSON<Donation[]>("donations.json", true)
    const recentDonations = donations.filter((d: Donation) => {
        return d.beaconEpoch >= fromEpoch && d.beaconEpoch <= toEpoch
    })
    const recentDonationsWei = recentDonations.reduce((sum: bigint, curr: Donation) => sum + BigInt(curr.depositAmountWei), 0n)
    return recentDonationsWei
}