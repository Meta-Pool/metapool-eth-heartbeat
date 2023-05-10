import stakingManagerAbi from "./abi/StakingManager.json"
import { getConfig } from "./config"
import { AurContract } from "./aurContracts"

export class StakingManagerContract extends AurContract {
    // auroraProvider:new ethers.providers.JsonRpcProvider("https://mainnet.aurora.dev"),

    constructor() {
        // Network is hardcoded here since ETH is not in prod, but Aur is
        super(getConfig("mainnet").stakingManagerAddress, stakingManagerAbi.abi, "mainnet")
        console.log("STAKING MANAGER", this.address)
    }

    nextCleanOrderQueue() {
        return this.getReadableContract().nextCleanOrderQueue()
    }

    cleanOrdersQueue(): Promise<any> {                                
        return this.getWritableContract().cleanOrdersQueue()
    }
}



