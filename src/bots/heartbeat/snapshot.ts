import { ethers } from "ethers";
import { beaconChainData, globalLiquidityData, globalPersistentData, globalStakingData, PriceData } from "./index"
import { sLeftToTimeLeft } from "../../utils/timeUtils";
import { etow, wtoe } from "../../utils/numberUtils";
import { ValidatorDataResponse } from "../../services/beaconcha/beaconcha";
import { ZEROS_9 } from "../nodesBalance";

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
        console.log(3, deltaDays, l)
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

    mpethPrice: number
    lpPrice: number
    mp_eth_3_day_apy: number
    mp_eth_7_day_apy: number
    mp_eth_15_day_apy: number
    mp_eth_30_day_apy: number
    lp_3_day_apy: number
    lp_7_day_apy: number
    lp_15_day_apy: number
    lp_30_day_apy: number

    stakingBalance: string
    liquidityEthBalance: string
    liquidityMpethBalance: string
    withdrawBalance: string
    totalPendingWithdraws: string
    nodesBalances: string

    stakingTotalSupply: string
    liqTotalSupply: string
    activatedValidators: number
    createdValidatorsLeft: number
    secondsRemainingToFinishEpoch: number
    // rewardsPerSecondInWei: string
    mpTotalAssets: string

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
    
    nodesBalances: Record<string, number>
    validatorsTypesQty: Record<string, number>

}

export function fromGlobalState(): Record<string,any> {

    const nodesBalanceSum = Object.keys(globalPersistentData.historicalNodesBalances).reduce((acc: bigint, key: string) => {
        const balanceArray = globalPersistentData.historicalNodesBalances[key]
        return acc + BigInt(balanceArray[balanceArray.length - 1].balance)
    }, 0n)

    
    let snap: Snapshot = {
        mpethPrice: Number(ethers.formatEther(globalPersistentData.mpethPrice)),
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
        nodesBalances: nodesBalanceSum.toString(),

        stakingTotalSupply: globalPersistentData.stakingTotalSupply,
        liqTotalSupply: globalPersistentData.liqTotalSupply,
        activatedValidators: globalPersistentData.activeValidatorsQty,
        createdValidatorsLeft: globalPersistentData.createdValidatorsLeft,
        secondsRemainingToFinishEpoch: globalPersistentData.timeRemainingToFinishMetapoolEpoch,
        // rewardsPerSecondInWei: globalPersistentData.rewardsPerSecondsInWei,
        mpTotalAssets: globalStakingData.totalAssets.toString(),

    }

    const output: Record<string, string|number> = snap
    
    Object.keys(globalPersistentData.nodesBalances).forEach((pubkey: any) => {
        output[`nodesBalance_${pubkey}`] = globalPersistentData.nodesBalances[pubkey]
    });

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
        
        nodesBalances,
        validatorsTypesQty: beaconChainData.validatorsStatusesQty
    }

    // Object.assign(snap,globalPersistentData.extraData)
    return snap

}