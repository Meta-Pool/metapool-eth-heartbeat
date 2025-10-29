import { StakingManagerContract } from "../crypto/auroraStakingManager"
import { getConfig } from "../crypto/config"
import { StakedQVaultContract } from "../crypto/q/stakedQVault"
import { QVaultContract } from "../crypto/qVaultContract"
import { ValidatorData } from "../services/beaconcha/beaconcha"
import { getPrice, getTokenHoldersQty } from "../services/tokens/tokens"
import { calculateLpPrice, calculateMpEthPrice, calculateMpEthPriceTotalUnderlying } from "../utils/priceUtils"
import { globalBeaconChainData, globalLiquidityData, globalPersistentData, globalQData, globalStakingData, globalWithdrawData, isDebug, liquidityContract, stakingContract, withdrawContract } from "./heartbeat"
import { ZEROS_9 } from "./nodesBalance"

/**
 * Metrics are brought one by one since infura has a limit for calling too often in one second. See https://docs.infura.io/api/networks/ethereum/how-to/avoid-rate-limiting
 */
export async function refreshStakingData() {

    globalStakingData.stakingBalance = await stakingContract.getWalletBalance(stakingContract.address)
    globalStakingData.totalAssets = await stakingContract.totalAssets()
    globalStakingData.totalSupply = await stakingContract.totalSupply()

    globalStakingData.totalUnderlying = await stakingContract.totalUnderlying()

    globalStakingData.estimatedRewardsPerSecond = await stakingContract.estimatedRewardsPerSecond()
    globalStakingData.submitReportUnlockTime = await stakingContract.submitReportUnlockTime() // Last time updateNodesBalanceWasCalled

    if(!globalStakingData.decimals) globalStakingData.decimals = Number(await stakingContract.decimals())
    if(!globalStakingData.name) globalStakingData.name = await stakingContract.name()
    globalStakingData.rewardsFee = Number(await stakingContract.rewardsFee())
    if(!globalStakingData.symbol) globalStakingData.symbol = await stakingContract.symbol()
    globalStakingData.totalNodesActivated = Number(await stakingContract.totalNodesActivated())
    globalStakingData.whitelistEnabled = await stakingContract.whitelistEnabled()
    globalStakingData.depositFee = Number(await stakingContract.depositFee())
    globalStakingData.submitReportTimelock = Number(await stakingContract.submitReportTimelock())
    globalStakingData.minDeposit = await stakingContract.minDeposit()

    if (isDebug) console.log("Staking data refreshed")
}

/**
 * Metrics are brought one by one since infura has a limit for calling too often in one second. See https://docs.infura.io/api/networks/ethereum/how-to/avoid-rate-limiting
 */
export async function refreshLiquidityData() {

    globalLiquidityData.totalAssets = await liquidityContract.totalAssets()
    globalLiquidityData.totalSupply = await liquidityContract.totalSupply()
    globalLiquidityData.mpEthBalance = await stakingContract.balanceOf(liquidityContract.address)
    if(!globalLiquidityData.name) globalLiquidityData.name = await liquidityContract.name()
    if(!globalLiquidityData.symbol) globalLiquidityData.symbol = await liquidityContract.symbol()
    globalLiquidityData.targetLiquidity = await liquidityContract.targetLiquidity()
    if(!globalLiquidityData.decimals) globalLiquidityData.decimals = Number(await liquidityContract.decimals())
    globalLiquidityData.minDeposit = await liquidityContract.minDeposit()
    globalLiquidityData.liquidityBalance = await liquidityContract.getWalletBalance(liquidityContract.address)
    if(!globalLiquidityData.minFee) globalLiquidityData.minFee = Number(await liquidityContract.minFee())
    if(!globalLiquidityData.maxFee) globalLiquidityData.maxFee = Number(await liquidityContract.maxFee())

    globalPersistentData.lpPrice = calculateLpPrice().toString()
    if (isDebug) console.log("Liq data refreshed")
}

/**
 * Metrics are brought one by one since infura has a limit for calling too often in one second. See https://docs.infura.io/api/networks/ethereum/how-to/avoid-rate-limiting
 */
export async function refreshWithdrawData() {

    globalWithdrawData.balance = await withdrawContract.getWalletBalance(withdrawContract.address)
    globalWithdrawData.epoch = await withdrawContract.getEpoch()
    globalWithdrawData.epochTimeLeft = Number(await withdrawContract.getEpochTimeLeft())
    globalWithdrawData.startTimestamp = Number(await withdrawContract.startTimestamp())
    globalWithdrawData.totalPendingWithdraw = await withdrawContract.totalPendingWithdraw()
    globalWithdrawData.withdrawalsStartEpoch = Number(await withdrawContract.withdrawalsStartEpoch())
    globalWithdrawData.validatorsDisassembleTime = await withdrawContract.validatorsDisassembleTime()

    if (isDebug) console.log("Withdraw data refreshed")
}

export async function refreshQVaultMetrics() {
    const account = getConfig().qStakeDelegatedAccount

    const qVaultContract = new QVaultContract()
    const [
        delegationsList,
    ] = await Promise.all([
        qVaultContract.getDelegationsList(account),
    ])

    delegationsList.forEach((validatorData: any[]) => {
        const address = validatorData[0]
        // index 1: actual stake - index 6: claimableRewards
        const balance = validatorData[1] + validatorData[6]
        globalQData.validatorsBalancesByAddress[address] = balance
    })
}

export async function refreshStakedQVaultMetrics() {

    const stakedQVaultContract = new StakedQVaultContract()
    const [
        totalAssets,
        totalSupply,
        getStQPrice,
    ] = await Promise.all([
        stakedQVaultContract.totalAssets(),
        stakedQVaultContract.totalSupply(),
        stakedQVaultContract.getStQPrice(),
    ])

    globalQData.totalAssets = totalAssets
    globalQData.totalSupply = totalSupply
    globalQData.stQPrice = getStQPrice
}

export async function refreshOtherMetrics() {
    const aurContract = new StakingManagerContract()
    
    const ethBotWalletBalance = await stakingContract.getWalletBalance(stakingContract.connectedWallet.address)
    const aurBotWalletBalance = await aurContract.getWalletBalance(aurContract.connectedWallet.address)
    const ethPrice = await getPrice("ETH")
    const mpethHoldersQty = await getTokenHoldersQty(getConfig().stakingContractAddress)
        
    globalPersistentData.ethBotBalance = ethBotWalletBalance.toString()
    globalPersistentData.aurBotBalance = aurBotWalletBalance.toString()
    globalPersistentData.ethPrice = ethPrice
    globalPersistentData.mpethHoldersQty = mpethHoldersQty

    if (isDebug) console.log("Other metrics refreshed")
}

export function refreshContractData() {
    globalPersistentData.stakingBalance = globalStakingData.stakingBalance.toString()
    globalPersistentData.liqBalance = globalLiquidityData.liquidityBalance.toString()
    globalPersistentData.liqMpEthBalance = globalLiquidityData.mpEthBalance.toString()
    globalPersistentData.withdrawBalance = globalWithdrawData.balance.toString()
    globalPersistentData.totalPendingWithdraws = globalWithdrawData.totalPendingWithdraw.toString()
    globalPersistentData.withdrawAvailableEthForValidators = (globalWithdrawData.balance - globalWithdrawData.totalPendingWithdraw).toString()
    globalPersistentData.timeRemainingToFinishMetapoolEpoch = Number(globalWithdrawData.epochTimeLeft.toString())

    globalPersistentData.mpethPrice = calculateMpEthPrice().toString()
    globalPersistentData.estimatedMpEthPrice = calculateMpEthPriceTotalUnderlying().toString()
    globalPersistentData.stakingTotalSupply = globalStakingData.totalSupply.toString()
    globalPersistentData.liqTotalSupply = globalLiquidityData.totalSupply.toString()
    globalPersistentData.rewardsPerSecondsInWei = globalStakingData.estimatedRewardsPerSecond.toString()

    globalPersistentData.activeValidatorsQty = globalBeaconChainData.validatorsData.reduce((acc: number, curr: ValidatorData) => {
        if (curr.status === "active" || curr.status === "active_offline" || curr.status === "active_online") {
            return acc + 1
        } else {
            return acc
        }
    }, 0)

    if (!globalPersistentData.nodesBalances) globalPersistentData.nodesBalances = {}
    globalBeaconChainData.validatorsData.forEach((node: ValidatorData) => {
        globalPersistentData.nodesBalances[node.pubkey] = node.balance.toString() + ZEROS_9
    })
    if (isDebug) console.log("Contract data refreshed")
}