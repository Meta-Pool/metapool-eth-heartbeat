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