import oldStakingManagerAbi from "./abi/StakingManager.json"
import stakingManagerAbi from "./abi/NewStakingManager.json"
import { getConfig } from "./config"
import { AurContract } from "./aurContracts"

export class StakingManagerContract extends AurContract {

    constructor(old: boolean = false) {
        const config = getConfig()
        const address = old && config.oldStakingManagerAddress? config.oldStakingManagerAddress : config.stakingManagerAddress
        const abi = old ? oldStakingManagerAbi.abi : stakingManagerAbi.abi
        super(address, abi, config.network)
    }

    nextCleanOrderQueue() {
        return this.contract.nextCleanOrderQueue()
    }

    cleanOrdersQueue(): Promise<any> {                          
        return this.call("cleanOrdersQueue")
    }
}



