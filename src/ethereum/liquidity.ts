import { ENV, getEnv } from "../entities/env"
import liquidityAbi from "./abi/LiquidUnstakePool.json"
import { EthConfig, getConfig } from "./config"
import { EthContract } from "./ethContracts"

export class LiquidityContract extends EthContract {

    constructor() {
        const config: EthConfig = getConfig()
        super(config.liquidityContractAddress, liquidityAbi.abi)
    }

    totalSupply(): Promise<BigInt> {
        return this.contract.totalSupply()
    }
    
    totalAssets(): Promise<BigInt> {
        return this.contract.totalAssets()
    }
    
}


