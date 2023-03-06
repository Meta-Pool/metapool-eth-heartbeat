import liquidityAbi from "./abi/LiquidUnstakePool.json"
import { EthContract } from "./contracts"

export const LIQUIDITY_CONTRACT_ADDRESS = "0xF870BCB0174176B461D0f1f8B36d8c621D9a5501"

export class LiquidityContract extends EthContract {

    constructor() {
        super(LIQUIDITY_CONTRACT_ADDRESS, liquidityAbi.abi)
    }

    totalSupply(): Promise<BigInt> {
        return this.getReadableContract().totalSupply()
    }
    
    totalAssets(): Promise<BigInt> {
        return this.getReadableContract().totalAssets()
    }
    
}


