import { MS_IN_HOUR, globalPersistentData, globalStakingData } from "../bots/heartbeat";
import { ZEROS_9 } from "../bots/nodesBalance";
import { divide } from "./mathUtils";
import { etow, wtoe } from "./numberUtils";

export function getEstimatedMpEthPrice(estimatedRewardsPerSecond: bigint, lastNodesUpdate: bigint): bigint {
    const totalEstimatedAssets = BigInt(globalStakingData.totalAssets.toString()) + estimatedRewardsPerSecond * (BigInt(Math.floor(Date.now() / 1000)) - lastNodesUpdate)
    const teaInEth = wtoe(totalEstimatedAssets)
    const totalSupply = wtoe(globalStakingData.totalSupply.toString())
    console.log(1, totalEstimatedAssets)
    console.log(2, teaInEth)
    console.log(3, totalSupply)
    console.log(4, BigInt(Math.floor(Date.now() / 1000)) - lastNodesUpdate)
    console.log(5, globalStakingData.totalAssets)
    return etow(teaInEth / totalSupply)
}