import { readFileSync } from "fs";
import { ssvViewsContract } from "../bots/heartbeat";
import { wtoe } from "./numberUtils";
import { getConfig } from "../ethereum/config";

const blocksPerDay = 7160
const blocksPerYear = blocksPerDay * 365

export async function getEstimatedRunwayInDays(operatorIds: number[]) {
    // const balance = 3.91
    // const fees = [1,1,1,0]
    // const clusterValidatorsCount = 1

    const ownerAddress = getConfig().ownerAddress
    const clusterData = getClusterData(operatorIds)
    
    const [
        liquidationThresholdPeriodInBlocks,
        minimumLiquidationCollateralInSsv,
        networkFee,
        balance,
        clusterBurnRate,
    ] = await Promise.all([
        ssvViewsContract.getLiquidationThresholdPeriod(),
        ssvViewsContract.getMinimumLiquidationCollateral(),
        ssvViewsContract.getNetworkFee(),
        ssvViewsContract.getBalance(ownerAddress, operatorIds, clusterData),
        ssvViewsContract.getBurnRate(ownerAddress, operatorIds, clusterData),
    ]) 
    const balanceInSsv = wtoe(balance)
    const burnRateInEth = wtoe(clusterBurnRate) * blocksPerYear
    // const feesSum: number = fees.reduce((acc: number, current: number) => acc + current, wtoe(networkFee))
    const calculatedLiquidationCollateralForClusterInBlocks = burnRateInEth * Number(liquidationThresholdPeriodInBlocks.toString())
    const calculatedLiquidationCollateralForCluserInDays = calculatedLiquidationCollateralForClusterInBlocks / blocksPerYear

    const liquidationCollateralForClusterInDays = Math.max(calculatedLiquidationCollateralForCluserInDays, wtoe(minimumLiquidationCollateralInSsv))
    return (balanceInSsv - liquidationCollateralForClusterInDays) / (burnRateInEth) * 365
}

function getClusterData(operatorIds: number[]) {
    const file = readFileSync(`./db/clustersDataSsv/${operatorIds.join(",")}.txt`).toString()
    const clusterSplitted = file.split("cluster")
    const cluster = clusterSplitted[clusterSplitted.length - 1].substring(2).split("}")[0]
    return JSON.parse(cluster)
}