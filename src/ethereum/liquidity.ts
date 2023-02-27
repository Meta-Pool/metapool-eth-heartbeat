import { getReadableContract, getWritableContract } from "./contracts"
import liquidityAbi from "./abi/LiquidUnstakePool.json"

export const LIQUIDITY_CONTRACT_ADDRESS = "0xF870BCB0174176B461D0f1f8B36d8c621D9a5501"

function getReadableLiquidityContract() {
    return getReadableContract(LIQUIDITY_CONTRACT_ADDRESS, liquidityAbi.abi)
}

function getWritableLiquidityContract() {
    return getWritableContract(LIQUIDITY_CONTRACT_ADDRESS, liquidityAbi.abi)
}
