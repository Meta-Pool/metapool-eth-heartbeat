import oldStakingManagerAbi from "./abi/StakingManager.json"
import stakingManagerAbi from "./abi/NewStakingManager.json"
import { getConfig } from "./config"
import { AurContract } from "./aurContracts"

export class StakingManagerContract extends AurContract {

    constructor(old: boolean = false) {
        const network = "mainnet"
        const config = getConfig(network)
        const address = old && config.oldStakingManagerAddress? config.oldStakingManagerAddress : config.stakingManagerAddress
        const abi = old ? oldStakingManagerAbi.abi : stakingManagerAbi.abi
        // Network is hardcoded here since ETH is not in prod, but Aur is
        super(address, abi, network)
    }

    nextCleanOrderQueue() {
        return this.contract.nextCleanOrderQueue()
    }

    cleanOrdersQueue(): Promise<any> {                          
        return this.contract.cleanOrdersQueue()
    }
}



