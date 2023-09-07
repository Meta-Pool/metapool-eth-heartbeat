import { readFileSync, readdirSync } from "fs";
import { globalSsvData, ssvContract, ssvViewsContract } from "../bots/heartbeat";
import { etow, wtoe } from "./numberUtils";
import { getConfig } from "../ethereum/config";
import { ClusterData, ClusterInformation, SsvData } from "../entities/ssv";

const blocksPerDay = 7160
const blocksPerYear = blocksPerDay * 365
export const MIN_DAYS_UNTIL_SSV_RUNWAY = 240


export async function refreshSsvData() {
    
    const config = getConfig()
    const network = config.network
    const ownerAddress = config.ssvOwnerAddress
    const operatorsFileNames: string[] = readdirSync(`./db/clustersDataSsv/${network}`)

    const promises: Promise<void>[] = operatorsFileNames.map(async (operatorsFileName: string) => {
        const operatorIdsStr: string = operatorsFileName.split(".")[0]

        const clusterData: ClusterData = getClusterData(operatorIdsStr)
        const operatorIdsArray = operatorIdsStr.split(",").map(Number)

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
        
        globalSsvData.clusterInformationRecord[operatorIdsStr] = {
            operatorIds: operatorIdsStr,
            clusterData,

            liquidationThresholdPeriodInBlocks,
            minimumLiquidationCollateralInSsv,
            networkFee,
            balance,
            clusterBurnRate,
        }
    })

    await Promise.all(promises)    
}

export function getEstimatedRunwayInDays(operatorIds: string) {
    const clusterInformation = globalSsvData.clusterInformationRecord[operatorIds]
    const liquidationThresholdPeriodInBlocks = clusterInformation.liquidationThresholdPeriodInBlocks
    const minimumLiquidationCollateralInSsv = clusterInformation.minimumLiquidationCollateralInSsv
    const balance = clusterInformation.balance
    const clusterBurnRate = clusterInformation.clusterBurnRate
    
    const balanceInSsv = wtoe(balance)
    const burnRateInEth = wtoe(clusterBurnRate) * blocksPerYear
    
    const calculatedLiquidationCollateralForClusterInBlocks = burnRateInEth * Number(liquidationThresholdPeriodInBlocks.toString())
    const calculatedLiquidationCollateralForCluserInDays = calculatedLiquidationCollateralForClusterInBlocks / blocksPerYear

    const liquidationCollateralForClusterInDays = Math.max(calculatedLiquidationCollateralForCluserInDays, wtoe(minimumLiquidationCollateralInSsv))
    return (balanceInSsv - liquidationCollateralForClusterInDays) / (burnRateInEth) * 365
}

function getNeededDepositForRunway(operatorIds: string, runway: number) {
    const clusterInformation = globalSsvData.clusterInformationRecord[operatorIds]
    const liquidationThresholdPeriodInBlocks = clusterInformation.liquidationThresholdPeriodInBlocks
    const minimumLiquidationCollateralInSsv = clusterInformation.minimumLiquidationCollateralInSsv
    const clusterBurnRate = clusterInformation.clusterBurnRate
    
    const burnRateInEth = wtoe(clusterBurnRate) * blocksPerYear
    
    const calculatedLiquidationCollateralForClusterInBlocks = burnRateInEth * Number(liquidationThresholdPeriodInBlocks.toString())
    const calculatedLiquidationCollateralForCluserInDays = calculatedLiquidationCollateralForClusterInBlocks / blocksPerYear

    const liquidationCollateralForClusterInDays = Math.max(calculatedLiquidationCollateralForCluserInDays, wtoe(minimumLiquidationCollateralInSsv))

    return runway / 365 * burnRateInEth + liquidationCollateralForClusterInDays - wtoe(clusterInformation.balance)
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

export async function getClustersThatNeedDeposit(): Promise<ClusterInformation[]> {
    
    const clustersToReport = Object.keys(globalSsvData.clusterInformationRecord).filter((operatorIds: string) => {
        const clusterInformation = globalSsvData.clusterInformationRecord[operatorIds]
        const estimatedRunway = getEstimatedRunwayInDays(clusterInformation.operatorIds)
        console.log(operatorIds, estimatedRunway)
        return estimatedRunway < MIN_DAYS_UNTIL_SSV_RUNWAY
    }).map((operatorIds: string) => {
        return globalSsvData.clusterInformationRecord[operatorIds]
    })

    return clustersToReport
}

/**
 * 
 * @returns A boolean representing whether everything is ok or not. If true is returned, 
 * either no deposit was needed or a deposit was made successfully. If false is returned, 
 * a deposit was needed and failed.
 */
export async function checkDeposit(): Promise<boolean> {
    const clustersNeedingDeposit = await getClustersThatNeedDeposit()

    if(clustersNeedingDeposit.length === 0) return true

    try {
        const resultPromises: Promise<boolean>[] = clustersNeedingDeposit.map(async (cluster: ClusterInformation) => {
            try {
                const clusterOwner: string = getConfig().ssvOwnerAddress
                const operatorIds: string = cluster.operatorIds
                const amount: bigint = etow(getNeededDepositForRunway(operatorIds, MIN_DAYS_UNTIL_SSV_RUNWAY + 30))
                const clusterData: ClusterData = cluster.clusterData
                await ssvContract.deposit(clusterOwner, operatorIds, amount, clusterData)

                return true
            } catch(err: any) {
                console.error("ERR: Deposit for cluster with operatorIds", cluster.operatorIds, ":", err.message, err.stack)
                return false
            }
        })

        const results: boolean[] = await Promise.all(resultPromises)
        return results.every(r => r === true)
        
    } catch(err: any) {
        console.error("ERR: couldn't make deposit for ssv cluster", err.message, err.stack)
        return false
    }
}