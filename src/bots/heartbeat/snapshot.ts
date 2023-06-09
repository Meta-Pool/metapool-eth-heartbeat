import { ethers } from "ethers";
import { globalPersistentData, PriceData } from "./index"

//---------------------------------------------------
//check for pending work in the SC and turn the crank
//---------------------------------------------------
function computeRollingApy(priceArray: PriceData[] | undefined, deltaDays: number, defaultApy: number = 0): number {

    if (!priceArray) return defaultApy;
    // check how many prices
    const l = priceArray.length
    if (deltaDays >= l) return defaultApy;
    //get both prices
    const currentPrice = priceArray[l - 1].price
    const priceAtStart = priceArray[l - 1 - deltaDays].price
    if (!priceAtStart || !currentPrice) return defaultApy;

    const curPrice = BigInt(currentPrice)
    const projectedInAYear = curPrice + (
        (curPrice - BigInt(priceAtStart)) * 365n / BigInt(deltaDays)
    )
    const apy = (projectedInAYear - curPrice) * 10000n / curPrice;

    return Number(apy) / 100
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
    timeRemainingToFinishEpoch: string

    // env_epoch_height: number,
    // prev_epoch_duration_ms: number,
    // contract_account_balance: number,

    // /// This amount increments with deposits and decrements with for_staking
    // /// increments with complete_unstake and decrements with user withdrawals from the contract
    // /// withdrawals from the pools can include rewards
    // /// since staking is delayed and in batches it only eventually matches env::balance()
    // total_available: number,

    // /// The total amount of tokens selected for staking by the users 
    // /// not necessarily what's actually staked since staking can be done in batches
    // total_for_staking: number,
    // tvl: number,

    // /// we remember how much we sent to the pools, so it's easy to compute staking rewards
    // /// total_actually_staked: Amount actually sent to the staking pools and staked - NOT including rewards
    // /// During distribute(), If !staking_paused && total_for_staking<total_actually_staked, then the difference gets staked in 100kN batches
    // total_actually_staked: number,

    // epoch_stake_orders: number,
    // epoch_unstake_orders: number,

    // /// sum(accounts.unstake). Every time a user delayed-unstakes, this amount is incremented
    // /// when the funds are withdrawn the amount is decremented.
    // /// Control: total_unstaked_claims == reserve_for_unstaked_claims + total_unstaked_and_waiting
    // total_unstake_claims: number,

    // // how many "shares" were minted. Every time someone "stakes" he "buys pool shares" with the staked amount
    // // the share price is computed so if he "sells" the shares on that moment he recovers the same near amount
    // // staking produces rewards, so share_price = total_for_staking/total_shares
    // // when someone "unstakes" she "burns" X shares at current price to recoup Y near
    // total_stake_shares: number,

    // /// The total amount of tokens actually unstaked (the tokens are in the staking pools)
    // /// During distribute(), If !staking_paused && total_for_unstaking<total_actually_unstaked, then the difference gets unstaked in 100kN batches
    // total_unstaked_and_waiting: number,

    // /// Every time a user performs a delayed-unstake, stNEAR tokens are burned and the user gets a unstaked_claim that will
    // /// be fulfilled 4 epochs from now. If there are someone else staking in the same epoch, both orders (stake & d-unstake) cancel each other
    // /// (no need to go to the staking-pools) but the NEAR received for staking must be now reserved for the unstake-withdraw 4 epochs form now. 
    // /// This amount increments *after* end_of_epoch_clearing, *if* there are staking & unstaking orders that cancel each-other.
    // /// This amount also increments at retrieve_from_staking_pool
    // /// The funds here are *reserved* fro the unstake-claims and can only be user to fulfill those claims
    // /// This amount decrements at unstake-withdraw, sending the NEAR to the user
    // /// Note: There's a extra functionality (quick-exit) that can speed-up unstaking claims if there's funds in this amount.
    // reserve_for_unstake_claims: number,

    // /// total meta minted by stNEAR contract 
    // total_meta: number,
    // st_near_price: number,
    // st_near_price_usd: number,
    // st_near_3_day_apy: number,
    // st_near_7_day_apy: number,
    // st_near_15_day_apy: number,
    // st_near_30_day_apy: number,
    // linear_3_day_apy: number,
    // linear_30_day_apy: number,

    // /// the staking pools will add rewards to the staked amount on each epoch
    // /// here we store the accumulated amount only for stats purposes. This amount can only grow
    // accumulated_staked_rewards: number,

    // nslp_liquidity: number,
    // nslp_stnear_balance: number,
    // nslp_target: number,
    // nslp_total_shares: number,
    // nslp_share_price: number,
    // lp_3_day_apy: number,
    // lp_7_day_apy: number,
    // lp_15_day_apy: number,
    // lp_30_day_apy: number,

    // /// Current discount for immediate unstake (sell stNEAR)
    // nslp_current_discount: number,
    // nslp_min_discount: number,
    // nslp_max_discount: number,

    // accounts_count: number,//U64,

    // //count of pools to diversify in
    // staking_pools_count: number, //u16, 
    // staked_pools_count: number, // count where staked!="0", 

    // min_deposit_amount: number,

    // est_meta_rewards_stakers: number,
    // est_meta_rewards_lu: number,
    // est_meta_rewards_lp: number,

    // max_meta_rewards_stakers: number,
    // max_meta_rewards_lu: number,
    // max_meta_rewards_lp: number,

    // treasury_st_near: number,
    // operator_treasury_st_near: number, // inflow from rewards fees
    // near_usd_price: number,
    // ref_meta_price: number,
    // ref_meta_price_usd: number,
    // meta_token_supply: number,

    // operator_balance_near: number,

    // ref_oct_st_near_apr: number, 
    // ref_meta_st_near_apr: number,
    // ref_wnear_st_near_apr: number,
    // ref_wnear_st_near_stable_apr: number

    // aurora_wnear_balance: number|undefined,
    // aurora_stnear_balance: number|undefined,

    // aurora_admin_balance_eth: number|undefined,
    // aurora_withdraw_balance_eth: number|undefined,
    // aurora_refill_balance_eth: number|undefined,

    // aurora_st_near_price: number|undefined,
    // aurora_acc_wnear_fees: number|undefined,
    // aurora_acc_stnear_fees: number|undefined,

}

export function fromGlobalState(): Record<string,any> {

    const nodesBalanceSum = Object.keys(globalPersistentData.historicalNodesBalances).reduce((acc: bigint, key: string) => {
        const balanceArray = globalPersistentData.historicalNodesBalances[key]
        return acc + BigInt(balanceArray[balanceArray.length - 1].balance)
    }, 0n)

    
    let snap: Snapshot = {
        mpethPrice: Number(ethers.formatEther(globalPersistentData.mpethPrice)),
        lpPrice: Number(ethers.formatEther(globalPersistentData.lpPrice)),
        mp_eth_3_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 3, 10),
        mp_eth_7_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 7, 10),
        mp_eth_15_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 15, 10),
        mp_eth_30_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 30, 10),
        lp_3_day_apy: computeRollingApy(globalPersistentData.lpPrices, 3),
        lp_7_day_apy: computeRollingApy(globalPersistentData.lpPrices, 7),
        lp_15_day_apy: computeRollingApy(globalPersistentData.lpPrices, 15),
        lp_30_day_apy: computeRollingApy(globalPersistentData.lpPrices, 30),

        stakingBalance: globalPersistentData.stakingBalance,
        liquidityEthBalance: globalPersistentData.liqBalance,
        liquidityMpethBalance: globalPersistentData.liqMpEthBalance,
        withdrawBalance: globalPersistentData.withdrawBalance,
        totalPendingWithdraws: globalPersistentData.requestedDelayedUnstakeBalance,
        nodesBalances: nodesBalanceSum.toString(),

        stakingTotalSupply: globalPersistentData.stakingTotalSupply,
        liqTotalSupply: globalPersistentData.liqTotalSupply,
        activatedValidators: globalPersistentData.activeValidators,
        createdValidatorsLeft: globalPersistentData.createdValidatorsLeft,
        timeRemainingToFinishEpoch: globalPersistentData.timeRemainingToFinishEpoch,

    }

    // Object.assign(snap,globalPersistentData.extraData)
    return snap

}