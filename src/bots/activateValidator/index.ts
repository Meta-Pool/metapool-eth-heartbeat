import { ethers } from "ethers"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { getValidatorsData } from "../../services/beaconcha/beaconcha"
import { LiquidityContract, LIQUIDITY_CONTRACT_ADDRESS } from "../../ethereum/liquidity"
import { Node, StakingContract, STAKING_CONTRACT_ADDRESS } from "../../ethereum/stakingContract"
import depositData from "../../validator_data/deposit_data-1677016004.json"

const ETH_32 = ethers.parseEther("32")
const liqLastUsageFilename = __dirname + "/lastUsage.txt"
const stakingContract: StakingContract = new StakingContract()
const liquidityContract: LiquidityContract = new LiquidityContract()

async function run() {    
    try {
        const stakingBalance = await stakingContract.getWalletBalance(STAKING_CONTRACT_ADDRESS)
        const liqBalance = await stakingContract.getWalletBalance(LIQUIDITY_CONTRACT_ADDRESS)
        const liqMpEthBalance = await stakingContract.balanceOf(LIQUIDITY_CONTRACT_ADDRESS)

        const availableLiqEth = liqBalance - liqMpEthBalance > 0 ? liqBalance - liqMpEthBalance : BigInt(0)
        
        const isStakingBalanceEnough = stakingBalance > ETH_32
        const availableBalanceToCreateValidator = await canUseLiqEth() ? stakingBalance + availableLiqEth : stakingBalance 
        const ethNecesaryFromLiq = ETH_32 - stakingBalance > 0 ? ETH_32 - stakingBalance : BigInt(0)
        console.log(stakingBalance, availableLiqEth)
        console.log(liqBalance, liqMpEthBalance)
        if(availableBalanceToCreateValidator > ETH_32) {
            console.log("Can create validator")
            const node = await getNodeData()
            console.log("Node", node)
            await stakingContract.pushToBeacon(node, ethNecesaryFromLiq)
            // Read deposit data json and get data from index activatedValidators
            if(!isStakingBalanceEnough) {
                await writeFileSync(liqLastUsageFilename, new Date().getTime().toString())
                console.log("Should edit last liquidity usage")
            }
        } else {
            console.log(`Not enough balance. ${ethers.formatEther(ETH_32 - stakingBalance)} ETH needed`)
        }
    } catch(err: any) {
        console.error("There was a problem activating a validator " + err.message)
        // Send email appending err.message
    }
}

async function canUseLiqEth(): Promise<boolean> {
    const liqLastUsageFileExists = await existsSync(liqLastUsageFilename)
    if(!liqLastUsageFileExists) {
        let timeToSet = new Date()
        timeToSet.setHours(timeToSet.getHours() - 6)
        await writeFileSync(liqLastUsageFilename, timeToSet.getTime().toString())
    }

    const lastUsageTimestamp = await readFileSync(liqLastUsageFilename)
    const elapsedMsSinceLastLiqUse = new Date().getTime() - Number(lastUsageTimestamp)
    return elapsedMsSinceLastLiqUse / 1000 / 60 / 60 > 6
}

async function getActivatedValidatorQty(): Promise<number> {
    const validatorsDataResponse = await getValidatorsData()
    return validatorsDataResponse.length
}

async function getNodeData(): Promise<Node> {
    const activatedValidators = await getActivatedValidatorQty()
    const node = depositData[activatedValidators]
    return {
        pubkey: "0x" + node.pubkey,
        withdrawCredentials: "0x" + node.withdrawal_credentials,
        signature: "0x" + node.signature,
        depositDataRoot: "0x" + node.deposit_data_root
    } 
}

run()