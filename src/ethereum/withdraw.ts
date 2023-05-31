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

    pendingWithdraws(address: string): Promise<WithdrawRequest> {
        return this.contract.pendingWithdraws(address)
    }

    ethRemaining(): Promise<bigint> {
        return this.contract.ethRemaining()
    }

    totalPendingWithdraw(): Promise<bigint> {
        return this.contract.totalPendingWithdraw()
    }

    getEpoch(): Promise<bigint> {
        return this.contract.getEpoch()
    }
}



