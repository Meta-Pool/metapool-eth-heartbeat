export interface EpochData {
    epoch: number
    totalHistoricRewards: string
    totalHistoricPenalties: string
}

export class IncomeReport {

    index: number
    atEpoch: EpochData
    prevAtEpoch: EpochData

    constructor(index: number, atEpoch: EpochData, prevAtEpoch: EpochData) {
        this.index = index
        this.atEpoch = atEpoch
        this.prevAtEpoch = prevAtEpoch
    }

    setAtEpoch(epoch: number, rewards: bigint, penalties: bigint) {
        this.prevAtEpoch = {...this.atEpoch}
        this.atEpoch.epoch = epoch
        this.atEpoch.totalHistoricRewards = (BigInt(this.atEpoch.totalHistoricRewards) + rewards).toString()
        this.atEpoch.totalHistoricPenalties = (BigInt(this.atEpoch.totalHistoricPenalties) + penalties).toString()
    }

    toContractObject() {
        return {
            from: this.prevAtEpoch.epoch + 1,
            to: this.atEpoch.epoch,
            rewards: BigInt(this.atEpoch.totalHistoricRewards) - BigInt(this.prevAtEpoch.totalHistoricRewards),
            penalties: BigInt(this.atEpoch.totalHistoricPenalties) - BigInt(this.prevAtEpoch.totalHistoricPenalties)
        }
    }
}