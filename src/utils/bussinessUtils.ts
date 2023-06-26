import { MS_IN_HOUR, MS_IN_SECOND, globalPersistentData, globalStakingData } from "../bots/heartbeat";
import { ZEROS_9 } from "../bots/nodesBalance";
import { etow, wtoe } from "./numberUtils";

export function getEstimatedMpEthPrice(estimatedRewardsPerSecond: bigint, lastNodesUpdateTime: bigint): bigint {
    // const totalEstimatedAssets = BigInt(globalStakingData.totalAssets.toString()) 
    const estimatedRewards = estimatedRewardsPerSecond * (BigInt(Math.floor(Date.now() / 1000)) - lastNodesUpdateTime - BigInt(4 * MS_IN_HOUR / MS_IN_SECOND))
    const totalEstimatedAssets = BigInt(globalPersistentData.stakingBalance) + BigInt(160 + ZEROS_9 + ZEROS_9) + BigInt(globalPersistentData.withdrawBalance) - BigInt(globalPersistentData.totalPendingWithdraws)
        + estimatedRewards
    const teaInEth = wtoe(totalEstimatedAssets)
    const totalSupply = wtoe(globalStakingData.totalSupply.toString())
    console.log(1, totalEstimatedAssets)
    console.log(2, teaInEth)
    console.log(3, totalSupply)
    console.log(4, BigInt(Math.floor(Date.now() / 1000)) - lastNodesUpdateTime)
    console.log(5, globalStakingData.totalAssets)
    return etow(teaInEth / totalSupply)
}