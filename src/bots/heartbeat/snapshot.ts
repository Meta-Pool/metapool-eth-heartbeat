import { ethers } from "ethers";
import { globalPersistentData, PriceData } from "./index"

//---------------------------------------------------
//check for pending work in the SC and turn the crank
//---------------------------------------------------
function computeRollingApy(priceArray: PriceData[] | undefined, deltaDays: number): number {

    if (!priceArray) return 0;
    // check how many prices
    const l = priceArray.length
    if (deltaDays >= l) return 0;
    //get both prices
    const currentPrice = priceArray[l - 1].price
    const priceAtStart = priceArray[l - 1 - deltaDays].price
    if (!priceAtStart || !currentPrice) return 0;

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

    const nodesBalanceSum = Object.keys(globalPersistentData.nodesBalances).reduce((acc: bigint, key: string) => {
        const balanceArray = globalPersistentData.nodesBalances[key]
        return acc + BigInt(balanceArray[balanceArray.length - 1].balance)
    }, 0n)

    
    let snap: Snapshot = {
        mpethPrice: Number(ethers.formatEther(globalPersistentData.mpethPrice)),
        lpPrice: Number(ethers.formatEther(globalPersistentData.lpPrice)),
        mp_eth_3_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 3),
        mp_eth_7_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 7),
        mp_eth_15_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 15),
        mp_eth_30_day_apy: computeRollingApy(globalPersistentData.mpEthPrices, 30),
        lp_3_day_apy: computeRollingApy(globalPersistentData.lpPrices, 3),
        lp_7_day_apy: computeRollingApy(globalPersistentData.lpPrices, 7),
        lp_15_day_apy: computeRollingApy(globalPersistentData.lpPrices, 15),
        lp_30_day_apy: computeRollingApy(globalPersistentData.lpPrices, 30),

        stakingBalance: globalPersistentData.stakingBalances[globalPersistentData.stakingBalances.length - 1].balance,
        liquidityEthBalance: globalPersistentData.liquidityBalances[globalPersistentData.liquidityBalances.length - 1].balance,
        liquidityMpethBalance: globalPersistentData.liquidityMpEthBalances[globalPersistentData.liquidityMpEthBalances.length - 1].balance,
        withdrawBalance: globalPersistentData.withdrawBalances[globalPersistentData.withdrawBalances.length - 1].balance,
        totalPendingWithdraws: globalPersistentData.requestedDelayedUnstakeBalances[globalPersistentData.requestedDelayedUnstakeBalances.length - 1].balance,
        nodesBalances: nodesBalanceSum.toString(),
        // env_epoch_height: Number(globalContractState.env_epoch_height),
        // prev_epoch_duration_ms: epoch.prev_epoch_duration_ms,
        // contract_account_balance: yton(globalContractState.contract_account_balance),

        // /// This amount increments with deposits and decrements with for_staking
        // /// increments with complete_unstake and decrements with user withdrawals from the contract
        // /// withdrawals from the pools can include rewards
        // /// since staking is delayed and in batches it only eventually matches env::balance()
        // total_available: yton(globalContractState.total_available),

        // /// The total amount of tokens selected for staking by the users 
        // /// not necessarily what's actually staked since staking can be done in batches
        // total_for_staking: yton(globalContractState.total_for_staking),

        // tvl: yton(globalContractState.total_for_staking) + yton(globalContractState.nslp_liquidity),

        // /// we remember how much we sent to the pools, so it's easy to compute staking rewards
        // /// total_actually_staked: Amount actually sent to the staking pools and staked - NOT including rewards
        // /// During distribute(), If !staking_paused && total_for_staking<total_actually_staked, then the difference gets staked in 100kN batches
        // total_actually_staked: yton(globalContractState.total_actually_staked),

        // epoch_stake_orders: yton(globalContractState.epoch_stake_orders),
        // epoch_unstake_orders: yton(globalContractState.epoch_unstake_orders),

        // /// sum(accounts.unstake). Every time a user delayed-unstakes, this amount is incremented
        // /// when the funds are withdrawn the amount is decremented.
        // /// Control: total_unstaked_claims == reserve_for_unstaked_claims + total_unstaked_and_waiting
        // total_unstake_claims: yton(globalContractState.total_unstake_claims),

        // // how many "shares" were minted. Every time someone "stakes" he "buys pool shares" with the staked amount
        // // the share price is computed so if he "sells" the shares on that moment he recovers the same near amount
        // // staking produces rewards, so share_price = total_for_staking/total_shares
        // // when someone "unstakes" she "burns" X shares at current price to recoup Y near
        // total_stake_shares: yton(globalContractState.total_stake_shares),

        // /// The total amount of tokens actually unstaked (the tokens are in the staking pools)
        // /// During distribute(), If !staking_paused && total_for_unstaking<total_actually_unstaked, then the difference gets unstaked in 100kN batches
        // total_unstaked_and_waiting: yton(globalContractState.total_unstaked_and_waiting),

        // /// Every time a user performs a delayed-unstake, stNEAR tokens are burned and the user gets a unstaked_claim that will
        // /// be fulfilled 4 epochs from now. If there are someone else staking in the same epoch, both orders (stake & d-unstake) cancel each other
        // /// (no need to go to the staking-pools) but the NEAR received for staking must be now reserved for the unstake-withdraw 4 epochs form now. 
        // /// This amount increments *after* end_of_epoch_clearing, *if* there are staking & unstaking orders that cancel each-other.
        // /// This amount also increments at retrieve_from_staking_pool
        // /// The funds here are *reserved* fro the unstake-claims and can only be user to fulfill those claims
        // /// This amount decrements at unstake-withdraw, sending the NEAR to the user
        // /// Note: There's a extra functionality (quick-exit) that can speed-up unstaking claims if there's funds in this amount.
        // reserve_for_unstake_claims: yton(globalContractState.reserve_for_unstake_claims),

        // // Note: yton(globalContractState.total_meta) is wrongly computed because it includes non-harvestable $META in the ..NSLP.. account
        // /// total meta minted (estimated)
        // total_meta:
        //     yton(globalContractState.est_meta_rewards_stakers) +
        //     yton(globalContractState.est_meta_rewards_lu) +
        //     yton(globalContractState.est_meta_rewards_lp),

        // st_near_price: stNearPrice,
        // st_near_price_usd: stNearPriceUsd,
        // st_near_3_day_apy: computeRollingApy(globalPersistentData.stNearPrices, 3),
        // st_near_7_day_apy: computeRollingApy(globalPersistentData.stNearPrices, 7),
        // st_near_15_day_apy: computeRollingApy(globalPersistentData.stNearPrices, 15),
        // st_near_30_day_apy: computeRollingApy(globalPersistentData.stNearPrices, 30),
        
        // linear_3_day_apy: computeRollingApy(globalPersistentData.linearPrices, 3),
        // linear_30_day_apy: computeRollingApy(globalPersistentData.linearPrices, 30),

        // /// the staking pools will add rewards to the staked amount on each epoch
        // /// here we store the accumulated amount only for stats purposes. This amount can only grow
        // accumulated_staked_rewards: yton(globalContractState.accumulated_staked_rewards),

        // nslp_liquidity: yton(globalContractState.nslp_liquidity),
        // nslp_stnear_balance: yton(globalContractState.nslp_stnear_balance),
        // nslp_target: yton(globalContractState.nslp_target),
        // nslp_share_price: yton(globalContractState.nslp_share_price),
        // nslp_total_shares: yton(globalContractState.nslp_total_shares),
        // lp_3_day_apy: computeRollingApy(globalPersistentData.LpPrices, 3),
        // lp_7_day_apy: computeRollingApy(globalPersistentData.LpPrices, 7),
        // lp_15_day_apy: computeRollingApy(globalPersistentData.LpPrices, 15),
        // lp_30_day_apy: computeRollingApy(globalPersistentData.LpPrices, 30),


        // /// Current discount for immediate unstake (sell stNEAR)
        // nslp_current_discount: globalContractState.nslp_current_discount_basis_points / 100,
        // nslp_min_discount: globalContractState.nslp_min_discount_basis_points / 100,
        // nslp_max_discount: globalContractState.nslp_max_discount_basis_points / 100,

        // accounts_count: Number(globalContractState.accounts_count),

        // //count of pools to diversify in
        // staking_pools_count: globalContractState.staking_pools_count,
        // staked_pools_count: globalPersistentData.staked_pools_count||globalContractState.staking_pools_count,

        // min_deposit_amount: yton(globalContractState.min_deposit_amount),

        // est_meta_rewards_stakers: yton(globalContractState.est_meta_rewards_stakers),
        // est_meta_rewards_lu: yton(globalContractState.est_meta_rewards_lu),
        // est_meta_rewards_lp: yton(globalContractState.est_meta_rewards_lp),

        // max_meta_rewards_stakers: yton(globalContractState.max_meta_rewards_stakers),
        // max_meta_rewards_lu: yton(globalContractState.max_meta_rewards_lu),
        // max_meta_rewards_lp: yton(globalContractState.max_meta_rewards_lp),

        // treasury_st_near: globalStNearTreasuryBalance.treasury,
        // operator_treasury_st_near: globalStNearTreasuryBalance.operator,

        // near_usd_price: globalPersistentData.lastNearUsdPrice,

        // operator_balance_near: yton(globalOperatorAccountInfo.amount),

        // ref_meta_price:  globalPersistentData.refMetaPrice ,
        // ref_meta_price_usd:  globalPersistentData.refMetaPrice * stNearPriceUsd ,
        // meta_token_supply: globalPersistentData.meta_token_supply? yton(globalPersistentData.meta_token_supply):0,
        // ref_oct_st_near_apr: globalPersistentData.refPupData.octStNearApr, 
        // ref_meta_st_near_apr: globalPersistentData.refPupData.metaStNearApr,
        // ref_wnear_st_near_apr: globalPersistentData.refPupData.wNearStNearApr,
        // ref_wnear_st_near_stable_apr: globalPersistentData.refPupData.wNearStNearStableApr,
        

        // aurora_wnear_balance: globalPersistentData.auroraSwapContractData.wNEARBalance,
        // aurora_stnear_balance: globalPersistentData.auroraSwapContractData.stNEARBalance,

        // aurora_admin_balance_eth: globalPersistentData.auroraSwapContractData.adminBalanceEth,
        // aurora_withdraw_balance_eth: globalPersistentData.auroraSwapContractData.withdrawBalanceEth,
        // aurora_refill_balance_eth: globalPersistentData.auroraSwapContractData.refillBalanceEth,

        // aurora_st_near_price: globalPersistentData.auroraSwapContractData.aurora_st_near_price,
        // aurora_acc_wnear_fees: globalPersistentData.auroraSwapContractData.aurora_acc_wnear_fees,
        // aurora_acc_stnear_fees: globalPersistentData.auroraSwapContractData.aurora_acc_stnear_fees,

    }

    // Object.assign(snap,globalPersistentData.extraData)
    return snap

}