import { ethers } from "ethers"
import { globalLiquidityData, globalPersistentData, globalStakingData } from "../bots/heartbeat"
import { divide } from "./mathUtils"

/**
 * Assumes globalStakingData is always filled with data. This should never happen
 * @returns MpETHPrice
 */
export function calculateMpEthPrice(): BigInt {
    if(globalStakingData.totalSupply == 0n) return ethers.parseEther("1")
    console.log(1, globalPersistentData.mpTotalAssets)
    console.log(2, globalStakingData.totalSupply)
    const totalAssets = ethers.formatEther(globalPersistentData.mpTotalAssets.toString())
    const totalSupply = ethers.formatEther(globalStakingData.totalSupply.toString())

    return ethers.parseEther(divide(totalAssets, totalSupply))
}

/**
 * Assumes globalLiquidityData is always filled with data. This should never happen
 * @returns LpPrice
 */
export function calculateLpPrice(): BigInt {
    if(globalLiquidityData.totalSupply == 0n) return ethers.parseEther("1")
    return ethers.parseEther(divide(globalLiquidityData.totalAssets.toString(), globalLiquidityData.totalSupply.toString()))
}