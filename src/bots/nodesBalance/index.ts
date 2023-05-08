import { StakingContract } from "../../ethereum/stakingContract"
import { WithdrawContract } from "../../ethereum/withdraw"
import { BalanceHistoryData, getValidatorBalanceHistory, getValidatorsData, ValidatorDataResponse } from "../../services/beaconcha/beaconcha"
import { sendEmail } from "../../utils/mailUtils"

export const ZEROS_9 = "0".repeat(9)

/**
 * Updates nodes balance in the contract. Since validators transfer rewards automatically, there might be a 
 * concurrence issue. Hence, we check there was no transfer validating ethRemaining is the same before
 * and after getting the nodesBalance.
 */
export async function updateNodesBalance() {
    console.log("Updating mpeth price")
    let retries = 5
    const withdrawContract: WithdrawContract = new WithdrawContract()
    const stakingContract: StakingContract = new StakingContract()
    let initialEthRemaining: bigint = -1n
    let totalBalanceBigInt: string = "-1"

    try {
        let finishingEthRemaining: bigint = await withdrawContract.ethRemaining()

        while(retries > 0 && initialEthRemaining !== finishingEthRemaining) {
            retries--
            initialEthRemaining = finishingEthRemaining

            totalBalanceBigInt = await getNodesBalance()
            finishingEthRemaining = await withdrawContract.ethRemaining()
        }

        if(initialEthRemaining !== finishingEthRemaining && retries === 0) {
            throw new Error(`Error getting nodes balances. Eth remaining changed after 5 retries`)
        }

        if(initialEthRemaining === -1n || totalBalanceBigInt === "-1") {
            throw new Error(`Unexpected value after getting nodes balance. initialEthRemaining: ${initialEthRemaining}. totalBalanceBigInt: ${totalBalanceBigInt}`)
        }    

    
        await stakingContract.updateNodesBalance(totalBalanceBigInt)
        console.log("MpEth price updated")
    } catch (err: any) {
        console.error(`Error updating mpeth price ${err.message}`)
        
        const subject = "[ERROR] update nodes balance"
        const body = err.message
        sendEmail(subject, body)
    }
}

async function getNodesBalance(): Promise<string> {
    const validatorDataArray: ValidatorDataResponse[] = await getValidatorsData()

    const balances: number[] = validatorDataArray.map((v: ValidatorDataResponse) => v.data.balance)
    console.log("Validators balances", balances)
    const totalBalance = balances.reduce((p: number, c: number) => p + c, 0)
    
    // Total balance comes with 9 decimals, so we add 9 zeros
    const totalBalanceBigInt: string = totalBalance.toString() + ZEROS_9
    console.log("Total balance", totalBalanceBigInt)
    return totalBalanceBigInt
}

export async function checkValidatorsPenalization() {
    console.log("Checking if a validator was penalized")
    const validatorDataArray: ValidatorDataResponse[] = await getValidatorsData()

    const validatorsBalanceHistory: BalanceHistoryData[][] = await Promise.all(validatorDataArray.map((v: ValidatorDataResponse) => getValidatorBalanceHistory(v.data.pubkey)))

    // BalanceHistoryData is ordered so the index 0 has the most recent epoch
    const penalizedValidators = validatorsBalanceHistory.filter((history: BalanceHistoryData[]) => history[0].balance < history[1].balance)

    if(penalizedValidators.length == 0) {
        console.log("There are no validators being penalized")
    } else {
        reportPenalizedValidators(penalizedValidators)
    }
    
    
}

function reportPenalizedValidators(penalizedValidators: BalanceHistoryData[][]) {
    console.log("There are validators being penalized")

        const subject = "[ERROR] Penalized validators"

        const bodyDetails: string[] = penalizedValidators.map((v: BalanceHistoryData[]) => 
        `
            <h3><u>Validator Index: ${v[0].validatorindex}</u></h3>
            
            <div>Epoch ${v[0].epoch} - Balance: ${v[0].balance}</div>
            <div>Epoch ${v[1].epoch} - Balance: ${v[1].balance}</div>
            <div>Lost wei: <span style="color:red">${v[1].balance - v[0].balance}</span></div>
        `)

        const body = 
        `
            <h2>There are ${penalizedValidators.length} validators being penalized.</h2>

            <div>${bodyDetails.join("\n")}</div>
        `

        sendEmail(subject, body)
}
