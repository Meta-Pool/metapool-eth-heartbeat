import { StakingManagerContract } from "../../ethereum/auroraStakingManager"
import { sendEmail } from "../../utils/mailUtils"

/**
 * Checks whether the order queue should be cleaned or not and runs it if necessary. Sends an email report in case of error
 * @returns A boolean telling if the order queue was cleaned
 */
export async function checkAuroraDelayedUnstakeOrders(useOldContract: boolean): Promise<boolean> {
    try {
        const stakingManagerContract = new StakingManagerContract(useOldContract)
        const nextRunTimestampInSeconds: BigInt = await stakingManagerContract.nextCleanOrderQueue()
        const nextRunTimestampInMs: number = Number(nextRunTimestampInSeconds.toString()) * 1000
        const now = new Date().getTime()
        console.log("Next clean orders queue", new Date(nextRunTimestampInMs))
        console.log("Time remaining to next run", (nextRunTimestampInMs - now) / 1000, "seconds")
        if(now >= nextRunTimestampInMs) {
            console.log("Running clean orders queue")
            // const tx = await stakingManagerContract.cleanOrdersQueue()
            const tx = await stakingManagerContract.cleanOrdersQueue()
            console.log("tx", tx)
            const waitResult = await tx.wait()
            console.log("waitResult", waitResult)
            return true
        }
    } catch(err: any) {
        console.error("Error", err.message)
        const subject = "[ERR] Aurora clean orders queue"
        const body = "There was an error cleaning the aurora's orders queue: " + err.message
        sendEmail(subject, body)
    }
    return false
    
}

// checkAuroraDelayedUnstakeOrders()