import { StakingContract } from "../ethereum/stakingContract";

export async function convertMpEthToEth(value: bigint): Promise<bigint> {
    const stakingContract: StakingContract = new StakingContract()

    const totalAssets = await stakingContract.totalAssets()
    const totalSupply = await stakingContract.totalSupply()

    if(totalAssets === 0n) return value

    return value * totalSupply / totalAssets
}