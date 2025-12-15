import { globalLiquidityData, globalPersistentData, globalStakingData } from "../globals/globalMetrics";
import { etow, wtoe } from "./numberUtils";

export function getEstimatedMpEthPrice(): bigint {
    // const totalEstimatedAssets = BigInt(globalStakingData.totalAssets.toString()) 
    const totalEstimatedAssets = globalStakingData.totalAssets
    const teaInEth = wtoe(totalEstimatedAssets)
    const totalSupply = wtoe(globalStakingData.totalSupply.toString())
    return etow(teaInEth / totalSupply)
}

export function getEstimatedEthForCreatingValidator(): number {
    const ethAvailableFromLiqToValidators = wtoe(globalPersistentData.liqBalance) - wtoe(globalLiquidityData.totalAssets / 2n)
    const withdrawAvailableFromLiqToValidators = wtoe(globalPersistentData.withdrawBalance) - wtoe(globalPersistentData.totalPendingWithdraws)
    const ethNeededToActivateValidator = 32 - wtoe(globalPersistentData.stakingBalance) - ethAvailableFromLiqToValidators - withdrawAvailableFromLiqToValidators

    return ethNeededToActivateValidator
}