import { MS_IN_HOUR, MS_IN_SECOND, globalPersistentData, globalStakingData } from "../bots/heartbeat";
import { ZEROS_9 } from "../bots/nodesBalance";
import { etow, wtoe } from "./numberUtils";

export function getEstimatedMpEthPrice(): bigint {
    // const totalEstimatedAssets = BigInt(globalStakingData.totalAssets.toString()) 
    const totalEstimatedAssets = globalStakingData.totalAssets
    const teaInEth = wtoe(totalEstimatedAssets)
    const totalSupply = wtoe(globalStakingData.totalSupply.toString())
    return etow(teaInEth / totalSupply)
}