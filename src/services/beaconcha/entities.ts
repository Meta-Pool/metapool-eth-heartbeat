import { IBalanceHistory } from "../../entities/beaconcha/validator"
import { IBalanceHistoryData, ValidatorData, ValidatorDataResponse } from "./beaconcha"

export interface IValidatorProposal {
    data: IValidatorProposalStatus[]
    status: string
}

export interface IValidatorProposalStatus {
    attestationscount: number,
    attesterslashingscount: number,
    blockroot: string,
    depositscount: number,
    epoch: number,
    eth1data_blockhash: string,
    eth1data_depositcount: number,
    eth1data_depositroot: string,
    exec_base_fee_per_gas: number,
    exec_block_hash: string,
    exec_block_number: number,
    exec_extra_data: string,
    exec_fee_recipient: string,
    exec_gas_limit: number,
    exec_gas_used: number,
    exec_logs_bloom: string,
    exec_parent_hash: string,
    exec_random: string,
    exec_receipts_root: string,
    exec_state_root: string,
    exec_timestamp: number,
    exec_transactions_count: number,
    graffiti: string,
    graffiti_text: string,
    parentroot: string,
    proposer: number,
    proposerslashingscount: number,
    randaoreveal: string,
    signature: string,
    slot: number,
    stateroot: string,
    status: string,
    syncaggregate_bits: string,
    syncaggregate_participation: number,
    syncaggregate_signature: string,
    voluntaryexitscount: number
}

export interface IBeaconChainHeartBeatData {
    validatorsData: ValidatorData[]
    validatorsStatusesQty: Record<string, number> // key is status type
    validatorsIncomeDetailHistory: Record<string, IBalanceHistoryData[]> // key is pubkey
    validatorsWithdrawalHistory: Record<string, IValidatorWithrawals[]> // key is pubkey
    currentEpoch: number
    incomeDetailHistory: IIncomeDetailHistoryData[]
}

export const EMPTY_BEACON_CHAIN_DATA: IBeaconChainHeartBeatData = {
    validatorsData: [],
    validatorsStatusesQty: {},
    validatorsIncomeDetailHistory: {},
    validatorsWithdrawalHistory: {},
    currentEpoch: 0,
    incomeDetailHistory: []
}

export interface IValidatorWithrawals {
    status: string
    data: IWithdrawalData
}

export interface IWithdrawalData {
    epoch: number
    slot: number
    blockroot: string
    withdrawalindex: number
    validatorindex: number
    address: string
    amount: number // Has 9 decimals
}

export interface IEpochResponse {
    status: string
    data: IEpochData
}

export interface IEpochData {
    attestationscount: number,
    attesterslashingscount: number,
    averagevalidatorbalance: number,
    blockscount: number,
    depositscount: number,
    eligibleether: number,
    epoch: number,
    finalized: boolean,
    globalparticipationrate: number,
    missedblocks: number,
    orphanedblocks: number,
    proposedblocks: number,
    proposerslashingscount: number,
    rewards_exported: boolean,
    scheduledblocks: number,
    totalvalidatorbalance: number,
    ts: string,
    validatorscount: number,
    voluntaryexitscount: number,
    votedether: number,
    withdrawalcount: number
}

export interface IIncomeDetailHistoryResponse {
    status: string
    data:  IIncomeDetailHistoryData[]
}

export interface IIncomeDetailHistoryData {
    income: IIncomeData,
    epoch: number,
    validatorindex: number,
    week: number,
    week_start: string,
    week_end: string
}

export interface IIncomeData { // If you add a property here, make sure to add it in the array INCOME_DATA_KEYS in this same file
    attestation_head_reward?: number,
    attestation_source_penalty?: number,
    attestation_source_reward?: number,
    attestation_target_penalty?: number,
    attestation_target_reward?: number,
    finality_delay_penalty?: number,
    proposals_missed?: number,
    proposer_attestation_inclusion_reward?: number,
    proposer_slashing_inclusion_reward?: number,
    proposer_sync_inclusion_reward?: number,
    slashing_penalty?: number,
    slashing_reward?: number,
    sync_committee_penalty?: number,
    sync_committee_reward?: number,
    tx_fee_reward_wei?: string
}

export const INCOME_DATA_KEYS: string[] = [
    "attestation_head_reward",
    "attestation_source_penalty",
    "attestation_source_reward",
    "attestation_target_penalty",
    "attestation_target_reward",
    "finality_delay_penalty",
    "proposals_missed",
    "proposer_attestation_inclusion_reward",
    "proposer_slashing_inclusion_reward",
    "proposer_sync_inclusion_reward",
    "slashing_penalty",
    "slashing_reward",
    "sync_committee_penalty",
    "sync_committee_reward",
    "tx_fee_reward_wei"
]

export interface MiniIDHReport {
    lastCheckedEpoch: number
    rewards: bigint
    penalties: bigint
    penaltiesCount: number

}

export interface Donations {
    beaconEpoch: number
    depositAmountWei: string
    transactionHash: string
}

export interface QueueResponse {
    status: string
    data: QueueData
}

export interface QueueData {
    beaconchain_entering: number
    beaconchain_exiting: number
    validatorscount: number
}

export interface ActivationData {
    epoch: number
    timestamp: number
}