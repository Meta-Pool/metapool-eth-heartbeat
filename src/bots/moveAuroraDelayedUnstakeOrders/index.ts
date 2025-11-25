import { StakingManagerContract } from "../../crypto/auroraStakingManager"
import { sendEmail } from "../../utils/mailUtils"
import { sLeftToTimeLeft } from "../../utils/timeUtils"
import { isTestnet } from "../heartbeat"

/**
 * Checks whether the order queue should be cleaned or not and runs it if necessary. Sends an email report in case of error
 * @returns A boolean telling if the order queue was cleaned
 */
export async function checkAuroraDelayedUnstakeOrders(useOldContract: boolean): Promise<boolean> {
    try {
        const stakingManagerContract = new StakingManagerContract(useOldContract)
        const depositorsLength: bigint = await stakingManagerContract.getDepositorsLength()
        const nextRunTimestampInSeconds: BigInt = await stakingManagerContract.nextCleanOrderQueue()
        const nextRunTimestampInMs: number = Number(nextRunTimestampInSeconds.toString()) * 1000
        const now = new Date().getTime()
        console.log("Depositors length", depositorsLength)
        console.log("Next clean orders queue", new Date(nextRunTimestampInMs))
        console.log("Time remaining to next run", sLeftToTimeLeft(Math.floor((nextRunTimestampInMs - now) / 1000)))
        if(now >= nextRunTimestampInMs && depositorsLength > 0n) {
            console.log("Running clean orders queue")
            const tx = await stakingManagerContract.cleanOrdersQueue()
            console.log("tx", tx)
            return true
        }
    } catch(err: any) {
        console.error("Error", err.message)
        const subject = (isTestnet ? "[TESTNET]" : "") + "[ERR] Aurora clean orders queue"
        const body = "There was an error cleaning the aurora's orders queue: " + err.message
        sendEmail(subject, body)
    }
    return false
    
}

// checkAuroraDelayedUnstakeOrders()