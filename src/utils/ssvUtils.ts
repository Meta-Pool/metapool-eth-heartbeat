import { readFileSync, readdirSync } from "fs";
import { etow, wtoe } from "./numberUtils";
import { getConfig } from "../crypto/config";
import { ClusterData, ClusterInformation, SsvData } from "../entities/ssvEntities";
import { EMPTY_MAIL_REPORT, IMailReportHelper, Severity } from "../entities/emailUtils";
import { globalSsvData } from "../globals/globalMetrics";
import { isDebug } from "../globals/globalUtils";
import { ssvContract, ssvViewsContract } from "../globals/globalVariables";

const blocksPerDay = 7160
const blocksPerYear = blocksPerDay * 365
export const MIN_DAYS_UNTIL_SSV_RUNWAY = 30
const MAX_DAYS_SSV_RUNWAY = 100

type Result = {success: boolean, ids: string, error?: string}


export async function refreshSsvData() {
    if(isDebug) return
    const config = getConfig()
    const network = config.network
    const ownerAddress = config.ssvOwnerAddress

    const operatorsFileNames: string[] = readdirSync(`./db/clustersDataSsv/${network}`)

    const promises: Promise<void>[] = operatorsFileNames.map(async (operatorsFileName: string) => {
        const operatorIdsStr: string = operatorsFileName.split(".")[0]

        const clusterData: ClusterData = getClusterData(operatorIdsStr)
        const operatorIdsArray = operatorIdsStr.split(",").map(Number)

        // Avoid using Promise.all for these calls, as they may cause rate limiting issues
        const liquidationThresholdPeriodInBlocks = await ssvViewsContract.getLiquidationThresholdPeriod()
        const minimumLiquidationCollateralInSsv = await ssvViewsContract.getMinimumLiquidationCollateral()
        const networkFee = await ssvViewsContract.getNetworkFee()
        const balance = await ssvViewsContract.getBalance(ownerAddress, operatorIdsArray, clusterData)
        const clusterBurnRate = await ssvViewsContract.getBurnRate(ownerAddress, operatorIdsArray, clusterData)
        
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
    const calculatedLiquidationCollateralForClusterInDays = calculatedLiquidationCollateralForClusterInBlocks / blocksPerYear

    const liquidationCollateralForClusterInDays = Math.max(calculatedLiquidationCollateralForClusterInDays, wtoe(minimumLiquidationCollateralInSsv))

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

export function getClustersThatNeedDeposit(): ClusterInformation[] {
    
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
 * @returns A boolean representing whether a manual deposit is needed for ssv. If true is returned, 
 * either no deposit was needed or a deposit was made successfully. If false is returned, 
 * a deposit was needed and failed.
 */
export async function checkDeposit(): Promise<IMailReportHelper> {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: checkDeposit.name}

    const clustersNeedingDeposit = await getClustersThatNeedDeposit()

    if(clustersNeedingDeposit.length === 0) {
        return {
            ...output,
            ok: true,
            subject: "",
            body: `Ssv clusters have enough funding for more than ${MIN_DAYS_UNTIL_SSV_RUNWAY} days`,
            severity: Severity.OK
        }
    }

    try {
        const resultPromises: Promise<Result>[] = clustersNeedingDeposit.map(async (cluster: ClusterInformation) => {
            try {
                const clusterOwner: string = getConfig().ssvOwnerAddress
                const operatorIds: string = cluster.operatorIds
                const amount: bigint = etow(getNeededDepositForRunway(operatorIds, MAX_DAYS_SSV_RUNWAY))
                const clusterData: ClusterData = cluster.clusterData
                await ssvContract.deposit(clusterOwner, operatorIds, amount, clusterData)

                return { success: true, ids: cluster.operatorIds }
            } catch(err: any) {
                console.error("ERR: Deposit for cluster with operatorIds", cluster.operatorIds, ":", err.message, err.stack)
                return { success: false, ids: cluster.operatorIds, error: err.message }
            }
        })

        const results: Result[] = await Promise.all(resultPromises)
        const resultsWithErrors = results.filter((result: Result) => result.success === false)

        if(resultsWithErrors.length > 0) {
            const errorMessages = resultsWithErrors.map((result: Result) => {
                return `Operators ${result.ids}: ${result.error}`
            })
            const body = `
                Error while depositing into clusters:
                ${errorMessages.join("\n                ")}
            `
            return {
                ...output,
                ok: false,
                subject: "Ssv cluster deposit",
                body,
                severity: Severity.ERROR
            }
        } // It was tried to make deposits and something failed

        // Deposits were made and everything turned out fine
        const clusters = results.map((result: Result) => result.ids)
        return {
            ...output,
            ok: true,
            subject: "",
            body: `Successfully deposited into clusters ${clusters.join(" - ")}`,
            severity: Severity.OK
        }
        
    } catch(err: any) {
        console.error("ERR: couldn't make deposit for ssv cluster", err.message, err.stack)
        return {
            ...output,
            ok: false,
            subject: "Ssv cluster deposit",
            body: `Unexpected error while depositing into cluster: ${err.message}`,
            severity: Severity.ERROR
        }
    }
}