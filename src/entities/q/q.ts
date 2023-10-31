export interface QHeartBeatData {
    validatorsBalancesByAddress: Record<string, bigint> // address - balance
}