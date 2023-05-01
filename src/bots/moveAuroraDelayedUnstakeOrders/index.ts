import { StakingManagerContract } from "../../ethereum/auroraStakingManager"
import { sendEmail } from "../../utils/mailUtils"

/**
 * Checks whether the order queue should be cleaned or not and runs it if necessary. Sends an email report in case of error
 * @returns A boolean telling if the order queue was cleaned
 */
export async function checkAuroraDelayedUnstakeOrders(): Promise<boolean> {
    try {
        const stakingManagerContract = new StakingManagerContract()
        const nextRunTimestampInSeconds: BigInt = await stakingManagerContract.nextCleanOrderQueue()
        const nextRunTimestampInMs: number = Number(nextRunTimestampInSeconds.toString()) * 1000
        const now = new Date().getTime()
        console.log("Next clean orders queue", new Date(nextRunTimestampInMs))
        console.log("Time remaining to next run", nextRunTimestampInMs - now, "seconds")
        if(now >= nextRunTimestampInMs) {
            console.log("Running clean orders queue")
            await stakingManagerContract.cleanOrdersQueue()
            return true
        }
    } catch(err: any) {
        const subject = "[ERR] Aurora clean orders queue"
        const body = "There was an error cleaning the aurora's orders queue: " + err.message
        sendEmail(subject, body)
    }
    return false
    
}

// checkAuroraDelayedUnstakeOrders()