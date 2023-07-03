import { ENV, getEnv } from "../entities/env"
import liquidityAbi from "./abi/LiquidUnstakePool.json"
import { EthConfig, getConfig } from "./config"
import { EthContract } from "./ethContracts"

export class LiquidityContract extends EthContract {

    constructor() {
        const config: EthConfig = getConfig()
        super(config.liquidityContractAddress, liquidityAbi.abi)
    }

    totalSupply(): Promise<bigint> {
        return this.contract.totalSupply()
    }
    
    totalAssets(): Promise<bigint> {
        return this.contract.totalAssets()
    }
    
    getAvailableEthForValidator(): Promise<bigint> {
        return this.contract.getAvailableEthForValidator().catch(this.decodeError)
    }
}


