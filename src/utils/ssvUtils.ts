import { ssvViewsContract } from "../bots/heartbeat";
import { wtoe } from "./numberUtils";

const blocksPerDay = 7160
const blocksPerYear = blocksPerDay * 365

export async function getEstimatedRunwayInDays() {
    const balance = 3.91
    const fees = [1,1,1,0]
    const clusterValidatorsCount = 1
    
    const [
        liquidationThresholdPeriodInBlocks,
        minimumLiquidationCollateralInSsv,
        networkFee,
    ] = await Promise.all([
        ssvViewsContract.getLiquidationThresholdPeriod(),
        ssvViewsContract.getMinimumLiquidationCollateral(),
        ssvViewsContract.getNetworkFee(),
    ]) 
    
    const feesSum: number = fees.reduce((acc: number, current: number) => acc + current, wtoe(networkFee))
    const calculatedLiquidationCollateralForClusterInBlocks = clusterValidatorsCount * feesSum * Number(liquidationThresholdPeriodInBlocks.toString())
    const calculatedLiquidationCollateralForCluserInDays = calculatedLiquidationCollateralForClusterInBlocks / blocksPerYear

    const liquidationCollateralForClusterInDays = Math.max(calculatedLiquidationCollateralForCluserInDays, wtoe(minimumLiquidationCollateralInSsv))
    return (balance - liquidationCollateralForClusterInDays) / (clusterValidatorsCount * feesSum) * 365


}