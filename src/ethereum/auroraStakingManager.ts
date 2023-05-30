import stakingManagerAbi from "./abi/StakingManager.json"
import { getConfig } from "./config"
import { AurContract } from "./aurContracts"

export class StakingManagerContract extends AurContract {

    constructor() {
        // Network is hardcoded here since ETH is not in prod, but Aur is
        super(getConfig("mainnet").stakingManagerAddress, stakingManagerAbi.abi, "mainnet")
    }

    nextCleanOrderQueue() {
        return this.contract.nextCleanOrderQueue()
    }

    cleanOrdersQueue(): Promise<any> {                          
        return this.contract.cleanOrdersQueue()
    }
}



