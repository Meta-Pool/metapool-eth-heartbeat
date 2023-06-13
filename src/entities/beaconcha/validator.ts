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