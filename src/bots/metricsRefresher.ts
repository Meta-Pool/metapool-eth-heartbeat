import { StakingManagerContract } from "../crypto/auroraStakingManager"
import { getConfig } from "../crypto/config"
import { StakedQVaultContract } from "../crypto/q/stakedQVault"
import { QVaultContract } from "../crypto/qVaultContract"
import { ZEROS_9 } from "../entities/beaconcha/beaconChainEntities"
import { ValidatorData } from "../entities/beaconcha/beaconChainValidator"
import { liquidityContract, stakingContract, withdrawContract } from "../globals/globalVariables"
import { globalBeaconChainData, globalLiquidityData, globalPersistentData, globalQData, globalStakingData, globalWithdrawData } from "../globals/globalMetrics"
import { isDebug } from "../globals/globalUtils"
import { getPrice, getTokenHoldersQty } from "../services/tokens/tokens"
import { sendEmail } from "../utils/mailUtils"
import { calculateLpPrice, calculateMpEthPrice, calculateMpEthPriceTotalUnderlying } from "../utils/priceUtils"
// import { globalBeaconChainData, globalLiquidityData, globalPersistentData, globalQData, globalStakingData, globalWithdrawData, isDebug, liquidityContract, stakingContract, withdrawContract } from "./heartbeat"

export function handleRefreshError(functionName: string, err: any): void {
    console.error(`Error refreshing ${functionName}`, err.message, err.stack)
    sendEmail(`[ERR] ${functionName}`, `Error while running ${functionName}:\n${err.message}\n${err.stack}`)
}

/**
 * Metrics are brought one by one since infura has a limit for calling too often in one second. See https://docs.infura.io/api/networks/ethereum/how-to/avoid-rate-limiting
 */
export async function refreshStakingData() {
    try {

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

        console.log("Staking data refreshed")
    } catch (err: any) {
        handleRefreshError(refreshStakingData.name, err)
    }
}

/**
 * Metrics are brought one by one since infura has a limit for calling too often in one second. See https://docs.infura.io/api/networks/ethereum/how-to/avoid-rate-limiting
 */
export async function refreshLiquidityData() {
    try {

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
        console.log("Liq data refreshed")
    } catch (err: any) {
        handleRefreshError(refreshLiquidityData.name, err)
    }
}

/**
 * Metrics are brought one by one since infura has a limit for calling too often in one second. See https://docs.infura.io/api/networks/ethereum/how-to/avoid-rate-limiting
 */
export async function refreshWithdrawData() {
    try {

        globalWithdrawData.balance = await withdrawContract.getWalletBalance(withdrawContract.address)
        globalWithdrawData.epoch = await withdrawContract.getEpoch()
        globalWithdrawData.epochTimeLeft = Number(await withdrawContract.getEpochTimeLeft())
        globalWithdrawData.startTimestamp = Number(await withdrawContract.startTimestamp())
        globalWithdrawData.totalPendingWithdraw = await withdrawContract.totalPendingWithdraw()
        globalWithdrawData.withdrawalsStartEpoch = Number(await withdrawContract.withdrawalsStartEpoch())
        globalWithdrawData.validatorsDisassembleTime = await withdrawContract.validatorsDisassembleTime()

        console.log("Withdraw data refreshed")
    } catch (err: any) {
        handleRefreshError(refreshWithdrawData.name, err)
    }
}

export async function refreshQVaultMetrics() {
    try {
        const account = getConfig().qStakeDelegatedAccount

        const qVaultContract = new QVaultContract()
        const delegationsList = await qVaultContract.getDelegationsList(account)

        delegationsList.forEach((validatorData: any[]) => {
            const address = validatorData[0]
            // index 1: actual stake - index 6: claimableRewards
            const balance = validatorData[1] + validatorData[6]
            globalQData.validatorsBalancesByAddress[address] = balance
        })
        console.log("QVault metrics refreshed")
    } catch (err: any) {
        handleRefreshError(refreshQVaultMetrics.name, err)
    }
}

export async function refreshStakedQVaultMetrics() {
    try {

        const stakedQVaultContract = new StakedQVaultContract()
        const totalAssets = await stakedQVaultContract.totalAssets()
        const totalSupply = await stakedQVaultContract.totalSupply()
        const getStQPrice = await stakedQVaultContract.getStQPrice()

        globalQData.totalAssets = totalAssets
        globalQData.totalSupply = totalSupply
        globalQData.stQPrice = getStQPrice
        console.log("Staked QVault metrics refreshed")
    } catch (err: any) {
        handleRefreshError(refreshStakedQVaultMetrics.name, err)
    }

}

export async function refreshOtherMetrics() {
    try {
        const aurContract = new StakingManagerContract()
        
        const ethBotWalletBalance = await stakingContract.getWalletBalance(stakingContract.connectedWallet.address)
        const aurBotWalletBalance = await aurContract.getWalletBalance(aurContract.connectedWallet.address)
        const ethPrice = await getPrice("ETH")
        const mpethHoldersQty = await getTokenHoldersQty(getConfig().stakingContractAddress)
            
        globalPersistentData.ethBotBalance = ethBotWalletBalance.toString()
        globalPersistentData.aurBotBalance = aurBotWalletBalance.toString()
        globalPersistentData.ethPrice = ethPrice
        globalPersistentData.mpethHoldersQty = mpethHoldersQty

        console.log("Other metrics refreshed")
    } catch (err: any) {
        handleRefreshError(refreshOtherMetrics.name, err)
    }
}

export function refreshContractData() {
    try {
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
        console.log("Contract data refreshed")
    } catch (err: any) {
        handleRefreshError(refreshContractData.name, err)
    }
}