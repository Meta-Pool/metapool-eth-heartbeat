import { IDailyReportHelper, Severity } from "../../entities/emailUtils"
import { StakingContract } from "../../ethereum/stakingContract"
import { WithdrawContract } from "../../ethereum/withdraw"
import { IBalanceHistoryData, ValidatorDataResponse } from "../../services/beaconcha/beaconcha"
import { sendEmail } from "../../utils/mailUtils"
import { etow, wtoe } from "../../utils/numberUtils"
import { MS_IN_DAY, MS_IN_SECOND, beaconChainData, globalPersistentData } from "../heartbeat"
import { computeRollingApy } from "../heartbeat/snapshot"

export const ZEROS_9 = "0".repeat(9)

/**
 * Updates nodes balance in the contract. Since validators transfer rewards automatically, there might be a 
 * concurrence issue. Hence, we check there was no transfer validating ethRemaining is the same before
 * and after getting the nodesBalance.
 * @returns An array with 4 values, telling whether has been any error, a sujested topic for an email and a body to append, and the error severity
 */
export async function updateNodesBalance(): Promise<IDailyReportHelper> {
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

export async function getNodesBalance(): Promise<string> {
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
    const validatorsBalanceHistory: Record<string, IBalanceHistoryData[]> = beaconChainData.validatorsBalanceHistory

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
    const balancesHistory: Record<string, IBalanceHistoryData[]> = beaconChainData.validatorsBalanceHistory

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

export function getEstimatedRewardsPerSecond(): bigint {
    const injectionFinishTimestampMs = 1688007600000 // 2023/06/29 00:00:00

    // Previous to that date, we inject 0.75 ETH every week and have no rewards
    if(Date.now() < injectionFinishTimestampMs) {
        const ethRewardsPerWeek = etow(0.75)
        const ethRewardsPerSecond = ethRewardsPerWeek / BigInt(7 * MS_IN_DAY) * BigInt(MS_IN_SECOND)
        console.log("Rewards per second", ethRewardsPerSecond)
        return ethRewardsPerSecond
    } else {
        const apy = computeRollingApy(globalPersistentData.mpEthPrices, 1)
        const ethRewardsPerYear = wtoe(globalPersistentData.mpTotalAssets) * (apy/100)
        const ethRewardsPerSecond = ethRewardsPerYear / (365 * MS_IN_DAY) * MS_IN_SECOND
        return etow(ethRewardsPerSecond)
    }
}