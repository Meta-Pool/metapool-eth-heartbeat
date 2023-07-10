import { IMailReportHelper, Severity } from "../../entities/emailUtils"
import { Report } from "../../entities/staking"
import { StakingContract } from "../../ethereum/stakingContract"
import { WithdrawContract } from "../../ethereum/withdraw"
import { IBalanceHistoryData, ValidatorDataResponse, getEpoch, getValidatorsData } from "../../services/beaconcha/beaconcha"
import { IEpochResponse } from "../../services/beaconcha/entities"
import { sendEmail } from "../../utils/mailUtils"
import { etow, max, wtoe } from "../../utils/numberUtils"
import { MS_IN_DAY, MS_IN_SECOND, beaconChainData, globalPersistentData } from "../heartbeat"
import { computeRollingApy } from "../heartbeat/snapshot"

export const ZEROS_9 = "0".repeat(9)

/**
 * Updates nodes balance in the contract. Since validators transfer rewards automatically, there might be a 
 * concurrence issue. Hence, we check there was no transfer validating ethRemaining is the same before
 * and after getting the nodesBalance.
 * @returns An array with 4 values, telling whether has been any error, a sujested topic for an email and a body to append, and the error severity
 */
export async function updateNodesBalance(): Promise<IMailReportHelper> {
    const functionName = "updateNodesBalance"
    console.log("Updating mpeth price")
    let retries = 5
    const withdrawContract: WithdrawContract = new WithdrawContract()
    const stakingContract: StakingContract = new StakingContract()
    let initialEthRemaining: bigint = -1n
    let totalBalanceBigInt: string = "-1"

    try {
        // let finishingEthRemaining: bigint = await withdrawContract.ethRemaining()
        let finishingEthRemaining: bigint = BigInt(globalPersistentData.withdrawAvailableEthForValidators)

        while (retries > 0 && initialEthRemaining !== finishingEthRemaining) {
            retries--
            initialEthRemaining = finishingEthRemaining

            totalBalanceBigInt = await getNodesBalance()
            const withdrawBalance = await withdrawContract.getWalletBalance(withdrawContract.address)
            const totalPendingWithdraw = await withdrawContract.totalPendingWithdraw()
            finishingEthRemaining = withdrawBalance - totalPendingWithdraw
        }

        if (initialEthRemaining !== finishingEthRemaining && retries === 0) {
            throw new Error(`Error getting nodes balances. Eth remaining changed after 5 retries`)
        }

        if (initialEthRemaining === -1n || totalBalanceBigInt === "-1") {
            throw new Error(`Unexpected value after getting nodes balance. initialEthRemaining: ${initialEthRemaining}. totalBalanceBigInt: ${totalBalanceBigInt}`)
        }


        await stakingContract.updateNodesBalance(totalBalanceBigInt, BigInt("1000000000000"))
        console.log("MpEth price updated")
        return {
            ok: true,
            function: functionName,
            subject: "",
            body: "MpEth price updated successfully",
            severity: Severity.OK
        }
    } catch (err: any) {
        console.error(`Error updating mpeth price ${err.message}`)

        const subject = "Update nodes balance"
        const body = err.message
        // sendEmail(subject, body)
        return {
            ok: false,
            function: functionName,
            subject,
            body,
            severity: Severity.ERROR
        }
    }
}

export async function getNodesBalance(reloadNodesData: boolean = false): Promise<string> {
    if(reloadNodesData) {
        beaconChainData.validatorsData = await getValidatorsData()
    }
    const validatorDataArray: ValidatorDataResponse[] = beaconChainData.validatorsData

    const balances: number[] = validatorDataArray.map((v: ValidatorDataResponse) => v.data.balance)
    console.log("Validators balances", balances)
    const totalBalance = balances.reduce((p: number, c: number) => p + c, 0)

    // Total balance comes with 9 decimals, so we add 9 zeros
    const totalBalanceBigInt: bigint = BigInt(totalBalance) * BigInt(1 + ZEROS_9) 
    console.log("Total balance", totalBalanceBigInt)
    return totalBalanceBigInt.toString()
}

export async function checkValidatorsPenalization() {
    console.log("Checking if a validator was penalized")
    // const validatorDataArray: ValidatorDataResponse[] = beaconChainData.validatorsData

    // const validatorsBalanceHistory: IBalanceHistoryData[][] = await Promise.all(validatorDataArray.map((v: ValidatorDataResponse) => getValidatorBalanceHistory(v.data.pubkey)))
    const validatorsBalanceHistory: Record<string, IBalanceHistoryData[]> = beaconChainData.validatorsIncomeDetailHistory

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
    const balancesHistory: Record<string, IBalanceHistoryData[]> = beaconChainData.validatorsIncomeDetailHistory

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
    const initialEpochInfo: IEpochResponse = await getEpoch(report.from.toString())
    const finalEpochInfo: IEpochResponse = await getEpoch(report.to.toString())

    // data.ts is an ISO timestamp in seconds
    const deltaMs = new Date(finalEpochInfo.data.ts).getTime() - new Date(initialEpochInfo.data.ts).getTime()
    const deltaS = Math.floor(deltaMs / 1000)

    // When dividing with BigInt it truncates the result if necessary, which is expected
    return income / BigInt(deltaS)
    
}