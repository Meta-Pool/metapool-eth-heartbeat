import { U128String } from "../bots/heartbeat/snapshot"

export interface ClusterData {
    validatorCount: number, 
    networkFeeIndex: number, 
    index: number, 
    active: boolean, 
    balance: U128String 
}

export interface SsvData {
    clusterInformation: Record<string, ClusterInformation>
}

export interface ClusterInformation {
    estimatedRunway: number
    clusterData: ClusterData
}