import { LiquidityData, StakingData, WithdrawData } from "../bots/heartbeat/contractData"
import { U128String } from "../entities/basicCryptoEntities"
import { QHeartBeatData } from "../entities/q/q"
import { SsvData } from "../entities/ssvEntities"
import { ActivationData, IBeaconChainHeartBeatData, IIncomeDetailHistoryData } from "../entities/beaconcha/beaconChainEntities"


export interface PriceData {
    dateISO: string
    price: string
    assets: string
    supply: string
}

export interface BalanceData {
    dateISO: string
    balance: string
}

export interface SimpleNumberRecord {
    dateISO: string
    number: number
}

export interface PersistentData {
    // Time data
    lastSavedPriceDateISO: string
    lastContractUpdateISO: string
    beatCount: number
    timestamp: number
    delayedUnstakeEpoch: number
    lastValidatorCheckProposalTimestamp: number
    weeklyDelimiterDateISO: string
    last8HourExecutionTimestamp: number // To avoid multiple executions in the same 8 hour period

    // Price data
    mpEthPrices: PriceData[]
    lpPrices: PriceData[]
    mpethPrice: string
    estimatedMpEthPrice: string
    lpPrice: string
    stQPrices: PriceData[]

    // Historical data
    stakingBalances: BalanceData[]
    stakingTotalSupplies: BalanceData[]
    withdrawBalances: BalanceData[]
    liquidityBalances: BalanceData[]
    liquidityMpEthBalances: BalanceData[]
    liqTotalSupplies: BalanceData[]
    historicalNodesBalances: Record<string, BalanceData[]> // Key is node pub key
    requestedDelayedUnstakeBalances: BalanceData[]
    historicalActiveValidators: SimpleNumberRecord[]
    incomeDetailHistory: IIncomeDetailHistoryData[]
    qBalancesByAddress: Record<string, BalanceData[]> // address - balanceData

    // Current data
    stakingBalance: string
    mpTotalAssets: string
    stakingTotalSupply: string
    liqBalance: string
    liqMpEthBalance: string
    liqTotalSupply: string
    withdrawBalance: string
    totalPendingWithdraws: string
    withdrawAvailableEthForValidators: string
    activeValidatorsQty: number
    createdValidatorsLeft: number
    nodesBalances: Record<string, string> // Key is node pub key
    validatorsLatestProposal: { [validatorIndex: number]: number }
    timeRemainingToFinishMetapoolEpoch: number
    rewardsPerSecondsInWei: string
    lastRewards: U128String
    lastPenalties: U128String
    ethBotBalance: U128String
    aurBotBalance: U128String
    ethPrice: number
    mpethHoldersQty: number

    // Chain data
    latestEpochCheckedForReport: number
    latestEpochCheckedForPenalties: number
    latestBeaconChainEpochRegistered: number
    estimatedActivationEpochs: Record<string, ActivationData> // pubkey - data
    blacklistedValidators: string[]

    // Testnet helper data
    lastIDHTs?: number
}

export let globalPersistentData: PersistentData
export let globalStakingData: StakingData = {} as StakingData
export let globalLiquidityData: LiquidityData = {} as LiquidityData
export let globalWithdrawData: WithdrawData = {} as WithdrawData
export let globalBeaconChainData: IBeaconChainHeartBeatData
export let globalSsvData: SsvData
export let globalQData: QHeartBeatData = {} as QHeartBeatData
export const TotalCalls = {
    beats: 0,
    beaconChainApiCallsOnBeat: 0,
}

export function setGlobalPersistentData(data: PersistentData) {
    globalPersistentData = data
}

export function setGlobalStakingData(data: StakingData) {
    globalStakingData = data
}

export function setGlobalLiquidityData(data: LiquidityData) {
    globalLiquidityData = data
}

export function setGlobalWithdrawData(data: WithdrawData) {
    globalWithdrawData = data
}

export function setGlobalBeaconChainData(data: IBeaconChainHeartBeatData) {
    globalBeaconChainData = data
}

export function setGlobalSsvData(data: SsvData) {
    globalSsvData = data
}

export function setGlobalQData(data: QHeartBeatData) {
    globalQData = data
}