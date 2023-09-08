import { readFileSync, readdirSync } from "fs";
import { globalSsvData, ssvViewsContract } from "../bots/heartbeat";
import { wtoe } from "./numberUtils";
import { getConfig } from "../ethereum/config";
import { ClusterData, SsvData } from "../entities/ssv";

const blocksPerDay = 7160
const blocksPerYear = blocksPerDay * 365


export async function refreshSsvData() {
    
    const network = getConfig().network
    const operatorsFileNames: string[] = readdirSync(`./db/clustersDataSsv/${network}`)

    const promises: Promise<void>[] = operatorsFileNames.map(async (operatorsFileName: string) => {
        const operatorIdsStr: string = operatorsFileName.split(".")[0]
        const estimatedRunway = await getEstimatedRunwayInDays(operatorIdsStr)
        const clusterData: ClusterData = getClusterData(operatorIdsStr)
        globalSsvData.clusterInformation[operatorIdsStr] = {
            estimatedRunway,
            clusterData
        }
    })

    await Promise.all(promises)    
}

export async function getEstimatedRunwayInDays(operatorIds: number[]|string) {
    let operatorIdsArray = Array.isArray(operatorIds) ? operatorIds : operatorIds.split(",").map(Number)
    const config = getConfig()
    
    const ownerAddress = config.ownerAddress
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
        ssvViewsContract.getBalance(ownerAddress, operatorIdsArray, clusterData),
        ssvViewsContract.getBurnRate(ownerAddress, operatorIdsArray, clusterData),
    ]) 
    const balanceInSsv = wtoe(balance)
    const burnRateInEth = wtoe(clusterBurnRate) * blocksPerYear
    // const feesSum: number = fees.reduce((acc: number, current: number) => acc + current, wtoe(networkFee))
    const calculatedLiquidationCollateralForClusterInBlocks = burnRateInEth * Number(liquidationThresholdPeriodInBlocks.toString())
    const calculatedLiquidationCollateralForCluserInDays = calculatedLiquidationCollateralForClusterInBlocks / blocksPerYear

    const liquidationCollateralForClusterInDays = Math.max(calculatedLiquidationCollateralForCluserInDays, wtoe(minimumLiquidationCollateralInSsv))
    return (balanceInSsv - liquidationCollateralForClusterInDays) / (burnRateInEth) * 365
}

export function getClusterData(operatorIds: number[]|string): ClusterData {
    let operatorIdsStr = operatorIds
    if(Array.isArray(operatorIds)) {
        operatorIdsStr = operatorIds.join(",")
    }
    
    const file = readFileSync(`./db/clustersDataSsv/${getConfig().network}/${operatorIdsStr}.txt`).toString()
    const clusterSplitted = file.split("cluster")
    const cluster = clusterSplitted[clusterSplitted.length - 1].substring(2).split("}")[0]
    const [validatorCount, networkFeeIndex, index, active, balance] = JSON.parse(cluster)
    return {
        validatorCount, 
        networkFeeIndex, 
        index, 
        active, 
        balance
    }
}