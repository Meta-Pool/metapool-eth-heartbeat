import { globalBeaconChainData, globalPersistentData, globalStakingData } from '../bots/heartbeat';
import { ValidatorData } from '../services/beaconcha/beaconcha';
import { wtoe } from '../utils/numberUtils';
import * as snapshot from '../bots/heartbeat/snapshot'

// Provided docs: https://docs.stakingrewards.com/staking-data/sr-adapter/liquid-staking-lst
export type StakingRewardsProvider = {
    name: string; // Brand 
    totalUsers: number; // unique delegation addresses
    totalBalanceUsd: number; // usd value of all assets, may be including other networks
    supportedAssets: StakingRewardsSupportedAssets[]
};

type StakingRewardsSupportedAssets = {
    symbol: string; // Asset name
    slug: string; // Asset slug, preferred slugs can be found below. Required if name not provided
    baseSlug: string; // The slug of the base asset.
    supply: number; // The total token supply of the LST.
    apr: number; // Annual percentage rate for staking on this chain.
    fee: number; // Fee percentage for staking services.
    users: number; // Number of individual wallets holding the LST.
    unstakingTime: number; // Time in seconds to unbond - not exchanging!
    exchangeRatio: number; // Ratio of the base asset to LST.
    validators?: number; // (Optional) Number of validators.
    nodeOperators?: number; // (Optional) Number of node operators.
    nodeOperatorBreakdown?: StakingRewardsNode[] // (Optional) Array of Node operators.
}

type StakingRewardsNode = {
    operatorSlug: string; // the slug of the provider, more info below.
    balance: number; // token balance of the base asset validated by this operator.
    fee: number // Fee percentage the operator gets.
    validators: number; // number of validators this operator runs for you.
    validatorBreakdown?: ValidatorBreakdown[] // (Optional) Array of Addresses for this operator.
}

type ValidatorBreakdown = {
    address: string; // validator address
    balance: number; // validator token balance
}

export function buildStakingRewardsProvider(): StakingRewardsProvider {
    console.log("Building staking rewards data")
    const users = globalPersistentData.mpethHoldersQty
    const balanceUsd = wtoe(globalStakingData.totalAssets) * globalPersistentData.ethPrice
    
    const nodes = globalBeaconChainData.validatorsData.filter((validatorData: ValidatorData) => {
        return validatorData.status === "active_online"
    }).map((validatorData: ValidatorData) => {
        return {
            nodeType: "posNode", 
            address: validatorData.pubkey,
            fee: 0,
            users,
            balanceToken: validatorData.balance
        }
    })

    const snap = snapshot.fromGlobalState()
    
    const apr = Math.max(
        snap["mp_eth_3_day_apy"],
        snap["mp_eth_7_day_apy"],
        snap["mp_eth_15_day_apy"],
        snap["mp_eth_30_day_apy"]
    )


    return {
        name: "Metapool",
        totalUsers: users,
        totalBalanceUsd: balanceUsd,
        supportedAssets: [
            {
                symbol: "MpEth",
                slug: "metapool-ethereum",
                baseSlug: "ethereum-2-0",
                supply: wtoe(globalStakingData.totalSupply),
                apr,
                fee: 0,
                users,
                unstakingTime: 14 * 24 * 60 * 60, // Consider formula improvement
                exchangeRatio: wtoe(globalPersistentData.mpethPrice),
                validators: nodes.length,
            }
        ]
    }
}