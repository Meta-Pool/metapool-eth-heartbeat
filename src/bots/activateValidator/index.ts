import { ethers } from "ethers"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { Node, StakingContract } from "../../ethereum/stakingContract"
import depositData from "../../validator_data/deposit_data-1677016004.json"
import { EthConfig, getConfig } from "../../ethereum/config"
import { ValidatorDataResponse } from '../../services/beaconcha/beaconcha'
import { WithdrawContract } from "../../ethereum/withdraw"
import { sendEmail } from "../../utils/mailUtils"
import { convertMpEthToEth } from "../../utils/convert"
import { max, min } from "../../utils/numberUtils"
import { DAYS, HOURS, SECONDS, globalPersistentData } from "../heartbeat"
import { sLeftToTimeLeft } from "../../utils/timeUtils"
import { beaconChainData } from "../../services/beaconcha/beaconchaHelper"

export const ETH_32 = ethers.parseEther("32")
const liqLastUsageFilename = __dirname + "/lastUsage.txt"
const stakingContract: StakingContract = new StakingContract()
const withdrawContract: WithdrawContract = new WithdrawContract()
const HOURS_TO_WAIT_BEFORE_REUSING_LIQ_ETH = 6

export interface Balances {
    staking: bigint
    liquidity: bigint
    liquidityMpEth: bigint
    liquidityMpEthInEth: bigint
    withdrawBalance: bigint
    ethAvailableForStakingInWithdraw: bigint
    totalPendingWithdraw: bigint
}

export async function activateValidator(): Promise<boolean> {    
    let wasValidatorCreated = false
    
    try {
        const secondsUntilNextEpoch = await withdrawContract.getEpochTimeLeft()
        globalPersistentData.timeRemainingToFinishEpoch = sLeftToTimeLeft(secondsUntilNextEpoch)
        const shouldSaveForDelayedUnstake = Number(secondsUntilNextEpoch.toString()) * SECONDS < 2 * DAYS
        const balances: Balances = await getBalances()
        
        const amountToSaveForDelayedUnstake: bigint = shouldSaveForDelayedUnstake ? balances.totalPendingWithdraw : 0n
        const realStakingBalance = balances.staking + balances.withdrawBalance - amountToSaveForDelayedUnstake
        if(realStakingBalance < 0n) {
            console.log("There is no balance to cover for delayed unstakes. Shouldn't create validator")
            return false
        }
        
        const maxLiqEthAvailable = max(balances.liquidity - ETH_32, 0n)
        const availableLiqEth = max(0n, min(balances.liquidity - balances.liquidityMpEthInEth, maxLiqEthAvailable))
        
        const isStakingBalanceEnough = realStakingBalance > ETH_32
        const availableBalanceToCreateValidator = await canUseLiqEth() ? realStakingBalance + availableLiqEth : realStakingBalance 
        // const ethNecesaryFromLiq = ETH_32 - realStakingBalance > 0 ? ETH_32 - realStakingBalance : BigInt(0)
        const ethNecesaryFromLiq = max(ETH_32 - realStakingBalance, 0n)
        console.log("Available balance to create validators", ethers.formatEther(availableBalanceToCreateValidator))
        console.log("ETH necessary from liquidity", ethers.formatEther(ethNecesaryFromLiq))
        if(availableBalanceToCreateValidator >= ETH_32) {
            console.log("Creating validator")
            const node: Node = await getNextNodeToActivateData()
            console.log("Node", node)
            await stakingContract.pushToBeacon(node, ethNecesaryFromLiq, balances.withdrawBalance)
            wasValidatorCreated = true
            
            if(!isStakingBalanceEnough) {
                await writeFileSync(liqLastUsageFilename, new Date().getTime().toString())
            }
        } else {
            console.log(`Not enough balance. ${ethers.formatEther(ETH_32 - balances.staking)} ETH needed`)
        }
    } catch(err: any) {
        console.error("There was a problem activating a validator " + err.message)
        const subject = "[ERROR] Activating validator"
        const body = "Error: " + err.message 
        sendEmail(subject, body)
    } 
    return wasValidatorCreated
}

async function canUseLiqEth(): Promise<boolean> {
    const liqLastUsageFileExists = await existsSync(liqLastUsageFilename)
    if(!liqLastUsageFileExists) {
        let timeToSet = new Date()
        timeToSet.setHours(timeToSet.getHours() - HOURS_TO_WAIT_BEFORE_REUSING_LIQ_ETH)
        await writeFileSync(liqLastUsageFilename, timeToSet.getTime().toString())
    }

    const lastUsageTimestamp = await readFileSync(liqLastUsageFilename)
    const elapsedMsSinceLastLiqUse = new Date().getTime() - Number(lastUsageTimestamp)
    return elapsedMsSinceLastLiqUse / 1000 / 60 / 60 > HOURS_TO_WAIT_BEFORE_REUSING_LIQ_ETH
}

async function getValidatorToActivate(): Promise<any> {
    // const validatorsDataResponse: ValidatorDataResponse[] = beaconChainData.validatorsData
    const validatorsDataResponse: ValidatorDataResponse[] = beaconChainData.validatorsData
    return depositData.find((depData: any) => {
        return validatorsDataResponse.every((v: ValidatorDataResponse) => {
            return v.data.pubkey !== `0x${depData.pubkey}`
        })
    })
}

async function getNextNodeToActivateData(): Promise<Node> {
    const node = await getValidatorToActivate()
    return {
        pubkey: "0x" + node.pubkey,
        withdrawCredentials: "0x" + node.withdrawal_credentials,
        signature: "0x" + node.signature,
        depositDataRoot: "0x" + node.deposit_data_root
    } 
}

export async function getBalances(): Promise<Balances> {
    const config: EthConfig = getConfig()

    const stakingBalance = stakingContract.getWalletBalance(config.stakingContractAddress)
    const liqBalance = stakingContract.getWalletBalance(config.liquidityContractAddress)
    const liqMpEthBalance = stakingContract.balanceOf(config.liquidityContractAddress)
    const withdrawBalance = stakingContract.getWalletBalance(config.withdrawContractAddress)
    const withdrawContractStakingBalance = stakingContract.balanceOf(config.withdrawContractAddress)
    const totalPendingWithdraw = withdrawContract.totalPendingWithdraw()

    return {
        staking: await stakingBalance,
        liquidity: await liqBalance,
        liquidityMpEth: await liqMpEthBalance,
        liquidityMpEthInEth: await convertMpEthToEth(await liqMpEthBalance),
        withdrawBalance: await withdrawBalance,
        ethAvailableForStakingInWithdraw: await withdrawContractStakingBalance,
        totalPendingWithdraw: await totalPendingWithdraw,
    }
}