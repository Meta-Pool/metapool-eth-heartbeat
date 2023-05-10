import stakingManagerAbi from "./abi/StakingManager.json"
import { getConfig } from "./config"
import { AurContract } from "./aurContracts"
import { ENV, getEnv } from "../entities/env"

export class StakingManagerContract extends AurContract {

    constructor() {
        // Network is hardcoded here since ETH is not in prod, but Aur is
        super(getConfig("mainnet").stakingManagerAddress, stakingManagerAbi.abi, "mainnet")
        console.log("STAKING MANAGER", this.address)
    }

    nextCleanOrderQueue() {
        return this.contract.nextCleanOrderQueue()
    }

    cleanOrdersQueue(): Promise<any> {   
        // const env: ENV = getEnv()
        // const pk: string = env.AURORA_ACCOUNT_PRIVATE_KEY as string                             
        return this.contract.cleanOrdersQueue()
    }
}



