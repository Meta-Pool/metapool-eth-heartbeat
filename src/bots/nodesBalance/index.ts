import { StakingContract } from "../../ethereum/stakingContract"
import { BalanceHistory, BalanceHistoryData, getValidatorBalanceHistory, getValidatorsData, ValidatorDataResponse } from "../../services/beaconcha/beaconcha"
import { sendEmail } from "../../utils/mailUtils"

const ZEROS_9 = "0".repeat(9)

export async function updateNodesBalance() {
    console.log("Updating mpeth price")
    const validatorDataArray: ValidatorDataResponse[] = await getValidatorsData()

    const balances: number[] = validatorDataArray.map((v: ValidatorDataResponse) => v.data.balance)
    console.log("Validators balances", balances)
    const totalBalance = balances.reduce((p: number, c: number) => p + c, 0)
    
    // Total balance comes with 9 decimals, so we add 9 zeros
    const totalBalanceBigInt: string = totalBalance.toString() + ZEROS_9
    console.log("Total balance", totalBalanceBigInt)

    const stakingContract: StakingContract = new StakingContract()

    try {
        await stakingContract.updateNodesBalance(totalBalanceBigInt)
        console.log("MpEth price updated")
    } catch (err: any) {
        const subject = "[ERROR] update nodes balance"
        const body = err.message
        sendEmail(subject, body)
    }
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

// checkValidatorsPenalization()

