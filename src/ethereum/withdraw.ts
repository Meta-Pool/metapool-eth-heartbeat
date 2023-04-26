import { ethers } from "ethers"
import withdrawAbi from "./abi/withdrawAbi.json"
import { getConfig } from "./config"
import { EthContract } from "./contracts"

export class WithdrawContract extends EthContract {

    constructor() {
        super(getConfig().withdrawContractAddress, withdrawAbi.abi)
    }

    pendingWithdraws() {
        return this.getReadableContract().pendingWithdraws()
    }
    
    async getAvailableStakingBalance(): Promise<bigint> {
        const balance = await this.getWalletBalance(this.address)
        const pendingWithdrawals = await this.pendingWithdraws()

        const difference = balance - pendingWithdrawals

        return difference > 0n ? difference : 0n
    }

    ethRemaining(): Promise<bigint> {
        return this.getReadableContract().ethRemaining()
    }
}



