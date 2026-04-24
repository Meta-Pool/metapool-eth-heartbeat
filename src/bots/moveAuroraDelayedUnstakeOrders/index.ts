import { StakingManagerContract } from "../../crypto/auroraStakingManager"
import { isTestnet } from "../../globals/globalUtils"
import { sendEmail, shouldSendEmail } from "../../utils/mailUtils"
import { sLeftToTimeLeft } from "../../utils/timeUtils"

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
        let body = "There was an error cleaning the aurora's orders queue: " + err.message
        if(err.message.includes("server response 520")) {
            body += "\nThis error normally means the server is overloaded. This function will be called again soon. If the error persists for a long time, please check the server status."
        }
        if (shouldSendEmail(subject)) {
            sendEmail(subject, body)
        }
    }
    return false
    
}

// checkAuroraDelayedUnstakeOrders()