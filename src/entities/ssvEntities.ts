import { U128String } from "./basicCryptoEntities"

export interface ClusterData {
    validatorCount: number, 
    networkFeeIndex: number, 
    index: number, 
    active: boolean, 
    balance: U128String
}

export interface SsvData {
    clusterInformationRecord: Record<string, ClusterInformation>
}

export interface ClusterInformation {
    operatorIds: string
    clusterData: ClusterData
    liquidationThresholdPeriodInBlocks: bigint,
    minimumLiquidationCollateralInSsv: bigint,
    networkFee: bigint,
    balance: bigint,
    clusterBurnRate: bigint,
}