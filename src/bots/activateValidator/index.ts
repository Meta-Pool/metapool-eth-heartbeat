import { ethers } from "ethers"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { getValidatorsData } from "../../services/beaconcha/beaconcha"
import { Node, StakingContract } from "../../ethereum/stakingContract"
import depositData from "../../validator_data/deposit_data-1677016004.json"
import { EthConfig, getConfig } from "../../ethereum/config"
import { ValidatorDataResponse } from '../../services/beaconcha/beaconcha'

const ETH_32 = ethers.parseEther("32")
const liqLastUsageFilename = __dirname + "/lastUsage.txt"
const stakingContract: StakingContract = new StakingContract()
const HOURS_TO_WAIT_BEFORE_REUSING_LIQ_ETH = 6

export async function activateValidator(): Promise<boolean> {    
    let wasValidatorCreated = false
    const config: EthConfig = getConfig()
    try {
        const stakingBalance = await stakingContract.getWalletBalance(config.stakingContractAddress)
        const liqBalance = await stakingContract.getWalletBalance(config.liquidityContractAddress)
        const liqMpEthBalance = await stakingContract.balanceOf(config.liquidityContractAddress)
        console.log("Staking ETH balance:", ethers.formatEther(stakingBalance))
        console.log("Liquidity ETH balance:", ethers.formatEther(liqBalance))
        console.log("Liquidity mpETH balance:", ethers.formatEther(liqMpEthBalance))

        const availableLiqEth = liqBalance - liqMpEthBalance > 0 ? liqBalance - liqMpEthBalance : BigInt(0)
        
        const isStakingBalanceEnough = stakingBalance > ETH_32
        const availableBalanceToCreateValidator = await canUseLiqEth() ? stakingBalance + availableLiqEth : stakingBalance 
        const ethNecesaryFromLiq = ETH_32 - stakingBalance > 0 ? ETH_32 - stakingBalance : BigInt(0)
        console.log("Available balance to create validators", ethers.formatEther(availableBalanceToCreateValidator))
        console.log("ETH necessary from liquidity", ethNecesaryFromLiq)
        if(availableBalanceToCreateValidator >= ETH_32) {
            console.log("Creating validator")
            const node = await getNextNodeToActivateData()
            console.log("Node", node)
            await stakingContract.pushToBeacon(node, ethNecesaryFromLiq)
            wasValidatorCreated = true
            
            if(!isStakingBalanceEnough) {
                await writeFileSync(liqLastUsageFilename, new Date().getTime().toString())
            }
        } else {
            console.log(`Not enough balance. ${ethers.formatEther(ETH_32 - stakingBalance)} ETH needed`)
        }
    } catch(err: any) {
        console.error("There was a problem activating a validator " + err.message)
        // Send email appending err.message
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
    const validatorsDataResponse: ValidatorDataResponse[] = await getValidatorsData()
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