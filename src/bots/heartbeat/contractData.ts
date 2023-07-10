export interface StakingData {

    stakingBalance: bigint
    totalAssets: bigint
    totalSupply: bigint
    totalUnderlying: bigint
    estimatedRewardsPerSecond: bigint
    submitReportUnlockTime: bigint

    decimals: number
    name: string
    rewardsFee: number
    symbol: string
    totalNodesActivated: number
    whitelistEnabled: boolean
    depositFee: number
    submitReportTimelock: number
    minDeposit: bigint
}

export interface LiquidityData {
    
    totalAssets: bigint
    totalSupply: bigint

    mpEthBalance: bigint
    name: string
    symbol: string
    MAX_FEE: number
    MIN_FEE: number
    targetLiquidity: bigint
    decimals: number
    minDeposit: bigint
    liquidityBalance: bigint
    
}

export interface WithdrawData {
    balance: bigint
    epoch: number 
    epochTimeLeft: number
    startTimestamp: number
    totalPendingWithdraw: bigint
    withdrawalsStartEpoch: number
}