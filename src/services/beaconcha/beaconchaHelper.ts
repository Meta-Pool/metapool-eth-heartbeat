import { globalBeaconChainData, globalPersistentData, globalStakingData, isDebug, stakingContract } from "../../bots/heartbeat";
import { loadJSON, saveJSON } from "../../bots/heartbeat/save-load-JSON";
import { getEstimatedRewardsPerSecond } from "../../bots/nodesBalance";
import { EpochData, IncomeReport } from "../../entities/incomeReport";
import { Report } from "../../entities/staking";
import { ValidatorDataResponse, getBeaconChainEpoch, getValidatorsData, getValidatorsIncomeDetailHistory as getValidatorsIncomeDetailHistory, getIncomeDetailHistory, ValidatorData } from "./beaconcha";
import { Donations as Donation, IEpochResponse, IIncomeDetailHistoryData, IIncomeDetailHistoryResponse, MiniIDHReport } from "./entities";



export async function refreshBeaconChainData() {
    try {

        globalBeaconChainData.validatorsData = await getValidatorsData()
        console.log(globalBeaconChainData.validatorsData)
        globalBeaconChainData.validatorsStatusesQty = globalBeaconChainData.validatorsData.reduce((acc: Record<string, number>, curr: ValidatorData) => {
            console.log(3, curr)
            if (!curr.status) return acc
            if (!acc[curr.status]) acc[curr.status] = 0
            acc[curr.status] += 1
            return acc
        }, {})
    
        const latestEpochData: IEpochResponse = await getBeaconChainEpoch()
        globalBeaconChainData.currentEpoch = latestEpochData.data.epoch
    
        const latestEpoch = latestEpochData.data.epoch
        const lastEpochRegistered = Math.max(globalPersistentData.latestBeaconChainEpochRegistered, latestEpoch - 100)
    
        if(lastEpochRegistered === latestEpoch) return
    
        const newIDH = await getAllValidatorsIDH(lastEpochRegistered, latestEpoch)
        globalPersistentData.latestBeaconChainEpochRegistered = latestEpoch
    
        const registeredIDH = {status: "OK", data: globalBeaconChainData.incomeDetailHistory || []}
        globalBeaconChainData.incomeDetailHistory = sortIDH(joinMultipleIDH([newIDH, registeredIDH])).data
    } catch(err: any) {
        console.error(err.message)
        console.error(err.stack)
    }

}

export async function getAllValidatorsIDH(fromEpoch: number, toEpoch: number): Promise<IIncomeDetailHistoryResponse> {
    if(fromEpoch === toEpoch) return {status: "OK", data: []}
    console.log("Getting validators IDH")
    if (!globalBeaconChainData.validatorsData) throw new Error("Validators data not set")
    const validatorIndexes: number[] = globalBeaconChainData.validatorsData
        .map((v: ValidatorData) => v.validatorindex)
        .filter((index: number | undefined) => index !== undefined) as number[]// If it's undefined, it hasn't been fully activated yet

    // Splitting active validators in groups of 100 and getting IDH, since beacon chain doesn't allow more
    const validatorsGroups = getValidatorsGroups(validatorIndexes)
    const validatorsIDHArray: IIncomeDetailHistoryResponse[] = await Promise.all(validatorsGroups.map(async (validatorsGroup: number[]) => {
        const limits: number[] = [ fromEpoch ]
        let auxFrom = fromEpoch
        while(auxFrom < toEpoch) {
            auxFrom = Math.min(toEpoch, auxFrom + 100)
            limits.push(auxFrom)
        }
        
        const idhResponses: (IIncomeDetailHistoryResponse|undefined)[] = await Promise.all(limits.map((limitFrom: number, index: number) => {
            if(index + 1 === limits.length) return undefined
            const limitTo = limits[index + 1]
            return getIncomeDetailHistory(validatorsGroup, limitFrom, limitTo)
        }))
        
        return joinMultipleIDH(idhResponses.slice(0, -1) as IIncomeDetailHistoryResponse[])
    }))


    const unsortedIDHs: IIncomeDetailHistoryResponse = joinMultipleIDH(validatorsIDHArray)
    const sortedIDH  = sortIDH(unsortedIDHs)
    return sortedIDH
}

function joinMultipleIDH(idhArray: IIncomeDetailHistoryResponse[]) {
    const finalIDH: IIncomeDetailHistoryResponse = {
        status: "OK",
        data: []
    }
    idhArray.forEach((idh: IIncomeDetailHistoryResponse) => {
        if(idh.status !== "OK") {
            finalIDH.status = idh.status
        }
        finalIDH.data.push(...idh.data)
    })
    return finalIDH
}

function sortIDH(idh: IIncomeDetailHistoryResponse) {
    idh.data.sort((data1: IIncomeDetailHistoryData, data2: IIncomeDetailHistoryData) => {
        if(data1.validatorindex === data2.validatorindex) {
            return data1.epoch - data2.epoch
        }
        return data1.validatorindex - data2.validatorindex
    })
    return idh
}

export async function getValidatorsIDH(fromEpoch: number, toEpoch: number): Promise<Record<number, MiniIDHReport>> {
    // Obtaining validatorsIndexes filtering out undefined ones
    console.log("Getting validators IDH")
    if (!globalBeaconChainData.validatorsData) throw new Error("Validators data not set")
    const validatorIndexes: number[] = globalBeaconChainData.validatorsData
        .map((v: ValidatorData) => v.validatorindex)
        .filter((index: number | undefined) => index !== undefined) as number[]// If it's undefined, it hasn't been fully activated yet

    // Splitting active validators in groups of 100 and getting IDH, since beacon chain doesn't allow more
    const validatorsGroups = getValidatorsGroups(validatorIndexes)
    const validatorsIDHArray: Record<number, MiniIDHReport>[] = await Promise.all(validatorsGroups.map(async (validatorsGroup: number[]) => {
        console.log("Getting IDH for validators", validatorsGroup)
        return getValidatorsIncomeDetailHistory(validatorsGroup, fromEpoch, toEpoch)
    }))

    // Joining IDH
    let validatorsIDH: Record<number, MiniIDHReport> = {}
    for(let v of validatorsIDHArray) {
        Object.assign(validatorsIDH, v)
    }
    return validatorsIDH
}

// export async function getValidatorsIDHPenaltyCount(fromEpoch: number, toEpoch: number): Promise<Record<number, number>> {
//     // Obtaining validatorsIndexes filtering out undefined ones
//     console.log("Getting validators IDH")
//     if (!beaconChainData.validatorsData) throw new Error("Validators data not set")
//     const validatorIndexes: number[] = beaconChainData.validatorsData
//         .map((v: ValidatorDataResponse) => v.data.validatorindex)
//         .filter((index: number | undefined) => index !== undefined) as number[]// If it's undefined, it hasn't been fully activated yet

//     // Splitting active validators in groups of 100 and getting IDH, since beacon chain doesn't allow more
//     const validatorsGroups = getValidatorsGroups(validatorIndexes)
//     const validatorsIDHArray: Record<number, number>[] = await Promise.all(validatorsGroups.map(async (validatorsGroup: number[]) => {
//         console.log("Getting IDH for validators", validatorsGroup)
//         return getValidatorsIncomeDetailHistoryCount(validatorsGroup, fromEpoch, toEpoch)
//     }))

//     // Joining IDH
//     let validatorsIDH: Record<number, number> = {}
//     for(let v of validatorsIDHArray) {
//         Object.assign(validatorsIDH, v)
//     }
//     return validatorsIDH
// }

export async function setIncomeDetailHistory() {
    try {
        const toEpoch: number = (await getBeaconChainEpoch()).data.epoch
        const filename = "income_detail_history.json"
        // When coming from file, it's not the class, but the structure.
        const incomeDetailHistory: Record<number, IncomeReport> = {}
        loadJSON<IncomeReport[]>(filename, true).forEach((e: IncomeReport) => incomeDetailHistory[e.index] = new IncomeReport(e.index, e.atEpoch, e.prevAtEpoch))
        console.log("Income report file read successfully")
        let fromEpoch = Number(await stakingContract.lastEpochReported()) + 1
        console.log("Getting IDH from epoch", fromEpoch, "to epoch", toEpoch)
        if(fromEpoch >= toEpoch) {
            throw new Error("From epoch is higher or equal than toEpoch")
        }
        
        const validatorsIDH = await getValidatorsIDH(fromEpoch, toEpoch)
        console.log("Validators IDH", validatorsIDH)

        // Adding new donations
        console.log("Getting donations")
        const recentDonations = getNewDonations(fromEpoch, toEpoch)
        console.log("Donations", recentDonations)
        validatorsIDH[0] = {
            lastCheckedEpoch: 0,
            rewards: recentDonations,
            penalties: 0n,
            penaltiesCount: 0,
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
        console.log("Estimated rewards per second", rewardsPerSecond)
        console.log("Report", report)

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
        console.log("Saving persistent data")
        globalPersistentData.lastRewards = report.rewards.toString()
        globalPersistentData.lastPenalties = report.penalties.toString()
        
    } catch (err: any) {
        console.error("ERROR reporting income detail", err.message, err.stack)
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