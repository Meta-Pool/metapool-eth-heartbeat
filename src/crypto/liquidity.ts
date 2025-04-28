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

    name(): Promise<string> {
        return this.contract.name().catch(this.decodeError)
    }

    symbol(): Promise<string> {
        return this.contract.symbol().catch(this.decodeError)
    }

    MAX_FEE(): Promise<bigint> {
        return this.contract.MAX_FEE().catch(this.decodeError)
    }

    MIN_FEE(): Promise<bigint> {
        return this.contract.MIN_FEE().catch(this.decodeError)
    }

    targetLiquidity(): Promise<bigint> {
        return this.contract.targetLiquidity().catch(this.decodeError)
    }

    decimals(): Promise<bigint> {
        return this.contract.decimals().catch(this.decodeError)
    }

    minDeposit(): Promise<bigint> {
        return this.contract.MIN_DEPOSIT().catch(this.decodeError)
    }

    minFee(): Promise<bigint> {
        return this.contract.minFee().catch(this.decodeError)
    }

    maxFee(): Promise<bigint> {
        return this.contract.maxFee().catch(this.decodeError)
    }
}


