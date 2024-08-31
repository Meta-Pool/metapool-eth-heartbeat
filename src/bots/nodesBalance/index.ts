import { Report } from "../../entities/staking"
import { IBalanceHistoryData, ValidatorData, getBeaconChainEpoch } from "../../services/beaconcha/beaconcha"
import { IEpochResponse } from "../../services/beaconcha/entities"
import { sendEmail } from "../../utils/mailUtils"
import { max } from "../../utils/numberUtils"
import { globalBeaconChainData } from "../heartbeat"

export const ZEROS_9 = "0".repeat(9)


export async function checkValidatorsPenalization() {
    console.log("Checking if a validator was penalized")
    // const validatorDataArray: ValidatorDataResponse[] = beaconChainData.validatorsData

    // const validatorsBalanceHistory: IBalanceHistoryData[][] = await Promise.all(validatorDataArray.map((v: ValidatorDataResponse) => getValidatorBalanceHistory(v.data.pubkey)))
    const validatorsBalanceHistory: Record<string, IBalanceHistoryData[]> = globalBeaconChainData.validatorsIncomeDetailHistory

    // BalanceHistoryData is ordered so the index 0 has the most recent epoch
    const penalizedValidatorsKeys: string[] = Object.keys(validatorsBalanceHistory).filter((key: string) => validatorsBalanceHistory[key][0].balance < validatorsBalanceHistory[key][1].balance)

    if (penalizedValidatorsKeys.length == 0) {
        console.log("There are no validators being penalized")
    } else {
        reportPenalizedValidators(penalizedValidatorsKeys)
    }
}

function reportPenalizedValidators(penalizedValidatorsKeys: string[]) {
    console.log("There are validators being penalized")
    const balancesHistory: Record<string, IBalanceHistoryData[]> = globalBeaconChainData.validatorsIncomeDetailHistory

    const subject = "[ERROR] Penalized validators"

    const bodyDetails: string[] = penalizedValidatorsKeys.map((k: string) => {
        const v: IBalanceHistoryData[] = balancesHistory[k]
        return `
            <h3><u>Validator Index: ${v[0].validatorindex}</u></h3>
            
            <div>Epoch ${v[0].epoch} - Balance: ${v[0].balance}</div>
            <div>Epoch ${v[1].epoch} - Balance: ${v[1].balance}</div>
            <div>Lost wei: <span style="color:red">${v[1].balance - v[0].balance}</span></div>
        `})

    const body =
        `
            <h2>There are ${penalizedValidatorsKeys.length} validators being penalized.</h2>

            <div>${bodyDetails.join("\n")}</div>
        `

    sendEmail(subject, body)
}

export async function getEstimatedRewardsPerSecond(report: Report): Promise<bigint> {
    const income = max(report.rewards - report.penalties, 0n)
    const initialEpochInfo: IEpochResponse = await getBeaconChainEpoch(report.from.toString())
    const finalEpochInfo: IEpochResponse = await getBeaconChainEpoch(report.to.toString())

    // data.ts is an ISO timestamp in seconds
    const deltaMs = new Date(finalEpochInfo.data.ts).getTime() - new Date(initialEpochInfo.data.ts).getTime()
    const deltaS = Math.floor(deltaMs / 1000)

    // When dividing with BigInt it truncates the result if necessary, which is expected
    return income / BigInt(deltaS)
    
}