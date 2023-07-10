import { ethers } from "ethers";
import { beaconChainData, globalLiquidityData, globalPersistentData, globalStakingData, globalWithdrawdata, MS_IN_SECOND, PriceData } from "./index"
import { sLeftToTimeLeft } from "../../utils/timeUtils";
import { etow, wtoe } from "../../utils/numberUtils";
import { ValidatorDataResponse } from "../../services/beaconcha/beaconcha";
import { ZEROS_9 } from "../nodesBalance";
import { getEstimatedMpEthPrice } from "../../utils/bussinessUtils";
import { calculateMpEthPrice } from "../../utils/priceUtils";

export type U128String = string

export function mpEthPromotionApy(): number {
    const estimatedTotalAssetsAfterAYear = wtoe(globalStakingData.totalAssets) + 0.75 / 7 * 365
    return (estimatedTotalAssetsAfterAYear / wtoe(globalStakingData.totalAssets) - 1) * 100

}
//---------------------------------------------------
//check for pending work in the SC and turn the crank
//---------------------------------------------------
export function computeRollingApy(priceArray: PriceData[] | undefined, deltaDays: number, isForStaking: boolean = false): number {

    if (!priceArray) {
        console.log(2)
        return isForStaking ? mpEthPromotionApy() : 0;
    }
    // check how many prices
    const l = priceArray.length
    if (deltaDays >= l) {
        return isForStaking ? mpEthPromotionApy() : 0;
    }
    //get both prices
    const currentPrice = priceArray[l - 1].price
    const priceAtStart = priceArray[l - 1 - deltaDays].price
    if (!priceAtStart || !currentPrice) {
        console.log(4)
        return isForStaking ? mpEthPromotionApy() : 0;
    }

    const curPrice = BigInt(currentPrice)
    const projectedInAYear = curPrice + (
        (curPrice - BigInt(priceAtStart)) * 365n / BigInt(deltaDays)
    )
    const apy = (projectedInAYear - curPrice) * 10000n / curPrice;

    return Math.max(Number(apy) / 100, 0)
}

export type Snapshot = {

    mpethPriceUnderlying: number
    mpethPrice: number
    rewardsPerSecondInWei: U128String
    lpPrice: number
    mp_eth_3_day_apy: number
    mp_eth_7_day_apy: number
    mp_eth_15_day_apy: number
    mp_eth_30_day_apy: number
    lp_3_day_apy: number
    lp_7_day_apy: number
    lp_15_day_apy: number
    lp_30_day_apy: number

    stakingBalance: U128String
    liquidityEthBalance: U128String
    liquidityMpethBalance: U128String
    withdrawBalance: U128String
    totalPendingWithdraws: U128String
    totalNodesBalances: U128String

    stakingTotalUnderlying: U128String
    stakingTotalAssets: U128String
    stakingTotalSupply: U128String
    liqTotalAssets: U128String
    liqTotalSupply: U128String
    activatedValidators: number
    createdValidatorsLeft: number
    secondsRemainingToFinishEpoch: number

    lastRewards: U128String
    lastPenalties: U128String
    
    // nodesBalances: Record<string, number>
    // validatorsTypesQty: Record<string, number>

}

export type SnapshotHR = {

    mpethPrice: number
    estimatedMpEthPrice: number
    rewardsPerSecondInETH: number
    lpPrice: number
    mp_eth_3_day_apy: number
    mp_eth_7_day_apy: number
    mp_eth_15_day_apy: number
    mp_eth_30_day_apy: number
    lp_3_day_apy: number
    lp_7_day_apy: number
    lp_15_day_apy: number
    lp_30_day_apy: number

    stakingBalance: number
    liquidityEthBalance: number
    liquidityMpethBalance: number
    withdrawBalance: number
    totalPendingWithdraws: number
    totalNodesBalance: number
    
    stakingTotalUnderlying: number
    stakingTotalAssets: number
    stakingTotalSupply: number
    liqTotalAssets: number
    liqTotalSupply: number
    activatedValidators: number
    createdValidatorsLeft: number
    timeRemainingToFinishEpoch: string

    lastRewards: number
    lastPenalties: number
    
    nodesBalances: Record<string, number>
    validatorsTypesQty: Record<string, number>

}

export function fromGlobalState(): Record<string,any> {

    const nodesBalanceSum = beaconChainData.validatorsData.reduce((acc: bigint, v: ValidatorDataResponse) => {
        return acc + BigInt(v.data.balance + ZEROS_9)
    }, 0n)

    
    let snap: Snapshot = {
        mpethPriceUnderlying: wtoe(calculateMpEthPrice().toString()),
        mpethPrice: Number(ethers.formatEther(globalPersistentData.mpethPrice)),
        rewardsPerSecondInWei: globalPersistentData.rewardsPerSecondsInWei,
        lpPrice: Number(ethers.formatEther(globalPersistentData.lpPrice)),
        mp_eth_3_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 3, true),
        mp_eth_7_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 7, true),
        mp_eth_15_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 15, true),
        mp_eth_30_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 30, true),
        lp_3_day_apy: computeRollingApy(globalPersistentData.lpPrices, 3),
        lp_7_day_apy: computeRollingApy(globalPersistentData.lpPrices, 7),
        lp_15_day_apy: computeRollingApy(globalPersistentData.lpPrices, 15),
        lp_30_day_apy: computeRollingApy(globalPersistentData.lpPrices, 30),
        
        stakingBalance: globalPersistentData.stakingBalance,
        liquidityEthBalance: globalPersistentData.liqBalance,
        liquidityMpethBalance: globalPersistentData.liqMpEthBalance,
        withdrawBalance: globalPersistentData.withdrawBalance,
        totalPendingWithdraws: globalPersistentData.totalPendingWithdraws,
        totalNodesBalances: nodesBalanceSum.toString(),

        stakingTotalUnderlying: globalStakingData.totalUnderlying.toString(),
        stakingTotalAssets: globalStakingData.totalAssets.toString(),
        stakingTotalSupply: globalStakingData.totalSupply.toString(),
        liqTotalAssets: globalLiquidityData.totalAssets.toString(),
        liqTotalSupply: globalPersistentData.liqTotalSupply,
        activatedValidators: globalPersistentData.activeValidatorsQty,
        createdValidatorsLeft: globalPersistentData.createdValidatorsLeft,
        secondsRemainingToFinishEpoch: globalPersistentData.timeRemainingToFinishMetapoolEpoch,
    
        lastRewards: globalPersistentData.lastRewards,
        lastPenalties: globalPersistentData.lastPenalties
    }

    const output: Record<string, string|number> = snap
    
    // Object.keys(globalPersistentData.nodesBalances).forEach((pubkey: any) => {
    //     output[`nodeBalance_${pubkey}`] = globalPersistentData.nodesBalances[pubkey]
    // });

    Object.keys(beaconChainData.validatorsStatusesQty).forEach((status: any) => {
        output[`validatorsStatusesQty_${status}`] = beaconChainData.validatorsStatusesQty[status]
    });

    // Object.assign(snap,globalPersistentData.extraData)
    return output

}

export function fromGlobalStateForHuman(): Record<string,any> {

    const nodesBalanceSum = beaconChainData.validatorsData.reduce((acc: bigint, v: ValidatorDataResponse) => {
        return acc + BigInt(v.data.balance + ZEROS_9)
    }, 0n)

    const nodesBalances: Record<string, number> = {}
    beaconChainData.validatorsData.forEach((v: ValidatorDataResponse) => {
        nodesBalances[v.data.pubkey] = wtoe(v.data.balance + ZEROS_9)
    })

    let snap: SnapshotHR = {
        mpethPrice: Number(ethers.formatEther(globalPersistentData.mpethPrice)),
        estimatedMpEthPrice: wtoe(globalPersistentData.estimatedMpEthPrice),
        rewardsPerSecondInETH: wtoe(globalPersistentData.rewardsPerSecondsInWei),
        lpPrice: Number(ethers.formatEther(globalPersistentData.lpPrice)),
        stakingTotalUnderlying: wtoe(globalStakingData.totalUnderlying),
        stakingTotalAssets: wtoe(globalStakingData.totalAssets),
        stakingTotalSupply: wtoe(globalStakingData.totalSupply),
        liqTotalAssets: wtoe(globalLiquidityData.totalAssets.toString()),
        liqTotalSupply: wtoe(globalPersistentData.liqTotalSupply),
        mp_eth_3_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 3, true),
        mp_eth_7_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 7, true),
        mp_eth_15_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 15, true),
        mp_eth_30_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 30, true),
        lp_3_day_apy: computeRollingApy(globalPersistentData.lpPrices, 3),
        lp_7_day_apy: computeRollingApy(globalPersistentData.lpPrices, 7),
        lp_15_day_apy: computeRollingApy(globalPersistentData.lpPrices, 15),
        lp_30_day_apy: computeRollingApy(globalPersistentData.lpPrices, 30),

        stakingBalance: wtoe(globalPersistentData.stakingBalance),
        liquidityEthBalance: wtoe(globalPersistentData.liqBalance),
        liquidityMpethBalance: wtoe(globalPersistentData.liqMpEthBalance),
        withdrawBalance: wtoe(globalPersistentData.withdrawBalance),
        totalPendingWithdraws: wtoe(globalPersistentData.totalPendingWithdraws),
        totalNodesBalance: wtoe(nodesBalanceSum.toString()),
        
        activatedValidators: globalPersistentData.activeValidatorsQty,
        createdValidatorsLeft: globalPersistentData.createdValidatorsLeft,
        timeRemainingToFinishEpoch: sLeftToTimeLeft(globalPersistentData.timeRemainingToFinishMetapoolEpoch),

        lastRewards: wtoe(globalPersistentData.lastRewards),
        lastPenalties: wtoe(globalPersistentData.lastPenalties),
        
        nodesBalances,
        validatorsTypesQty: beaconChainData.validatorsStatusesQty
    }

    // Object.assign(snap,globalPersistentData.extraData)
    return snap

}

export function forFront(): Record<string,any> {

    let stakingData: Record<string, number|string|bigint> = {}
    Object.entries(globalStakingData).forEach(([k, v]) => {
        const value = typeof v === "bigint" ? v.toString() : v
        stakingData[k] = value
    })

    let liquidityData: Record<string, number|string|bigint> = {}
    Object.entries(globalLiquidityData).forEach(([k, v]) => {
        const value = typeof v === "bigint" ? v.toString() : v
        liquidityData[k] = value
    })

    let withdrawData: Record<string, number|string|bigint> = {}
    Object.entries(globalWithdrawdata).forEach(([k, v]) => {
        const value = typeof v === "bigint" ? v.toString() : v
        withdrawData[k] = value
    })

    let snap: Record<string, any> = {
        stakingData,
        liquidityData,
        withdrawData
    }

    // Object.assign(snap,globalPersistentData.extraData)
    return snap

}