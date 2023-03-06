import { StakingContract } from "../../ethereum/stakingContract"
import { getValidatorsData, ValidatorDataResponse } from "../../services/beaconcha/beaconcha"

const ZEROS_9 = "0".repeat(9)

async function run() {
    const validatorDataArray: ValidatorDataResponse[] = await getValidatorsData()

    const balances: number[] = validatorDataArray.map((v: ValidatorDataResponse) => v.data.balance)
    const totalBalance = balances.reduce((p: number, c: number) => p + c, 0)

    // Total balance comes with 9 decimals, so we add 9 zeros
    const totalBalanceBigInt: string = totalBalance.toString() + ZEROS_9

    const stakingContract: StakingContract = new StakingContract()

    await stakingContract.updateNodesBalance(totalBalanceBigInt)
}

run()