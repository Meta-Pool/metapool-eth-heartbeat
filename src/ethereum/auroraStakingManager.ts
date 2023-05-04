import { ethers } from "ethers"
import stakingManagerAbi from "./abi/StakingManager.json"
import { getConfig } from "./config"
import { EthContract } from "./contracts"

export class StakingManagerContract extends EthContract {

    constructor() {
        super(getConfig("mainnet").stakingManagerAddress, stakingManagerAbi.abi)
    }

    nextCleanOrderQueue() {
        return this.getReadableContract().nextCleanOrderQueue()
    }

    cleanOrdersQueue(): Promise<bigint> {
        return this.getWritableContract().cleanOrdersQueue()
    }
}



