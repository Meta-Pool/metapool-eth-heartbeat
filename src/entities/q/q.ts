export interface QHeartBeatData {
    validatorsBalancesByAddress: Record<string, bigint> // address - balance
    totalAssets: bigint
    totalSupply: bigint
    stQPrice: bigint
}