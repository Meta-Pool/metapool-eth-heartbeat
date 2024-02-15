export interface IBalanceHistory {
    status: string
    data: IBalance[]
}

export interface IBalance {
    balance: number
    effectivebalance: number
    epoch: number
    validatorindex: number
    week: number
    week_start: string
    week_end: string
}

export interface ILuckResponse {
    data: ILuckData
    status: string
}

export interface ILuckData {
    average_proposal_interval: number,
    next_proposal_estimate_ts: number,
    proposal_luck: number,
    time_frame_name: string
}