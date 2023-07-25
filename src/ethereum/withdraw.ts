import withdrawAbi from "./abi/withdrawAbi.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"

export interface WithdrawRequest {
    amount: bigint
    unlockEpoch: bigint
}

export class WithdrawContract extends EthContract {

    constructor() {
        super(getConfig().withdrawContractAddress, withdrawAbi.abi)
    }
    
    startTimestamp(): Promise<bigint> {
        return this.contract.startTimestamp().catch(this.decodeError)
    }

    pendingWithdraws(address: string): Promise<WithdrawRequest> {
        return this.contract.pendingWithdraws(address).catch(this.decodeError)
    }

    totalPendingWithdraw(): Promise<bigint> {
        return this.contract.totalPendingWithdraw().catch(this.decodeError)
    }

    getEpoch(): Promise<number> {
        return this.contract.getEpoch().then(e => Number(e)).catch(this.decodeError)
    }

    getEpochTimeLeft(): Promise<bigint> {
        return this.contract.getEpochTimeLeft().catch(this.decodeError)
    }

    withdrawalsStartEpoch(): Promise<bigint> {
        return this.contract.withdrawalsStartEpoch().catch(this.decodeError)
    }

    validatorsDisassembleTime(): Promise<bigint> {
        return this.contract.validatorsDisassembleTime().catch(this.decodeError)
    }

}



