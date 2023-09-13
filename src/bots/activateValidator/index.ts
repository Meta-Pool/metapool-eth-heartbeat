import { ethers } from "ethers"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { Node, StakingContract } from "../../ethereum/stakingContract"
import testnetDepositData from "../../validator_data/deposit_data-1677016004.json"
import mainnetDepositData from "../../validator_data/mainnet_deposit_data-1689287540.json"
import { EthConfig, getConfig } from "../../ethereum/config"
import { ValidatorData, ValidatorDataResponse } from '../../services/beaconcha/beaconcha'
import { WithdrawContract } from "../../ethereum/withdraw"
import { sendEmail } from "../../utils/mailUtils"
import { convertMpEthToEth } from "../../utils/convert"
import { max, min, wtoe } from "../../utils/numberUtils"
import { MS_IN_DAY, MS_IN_HOUR, MS_IN_SECOND, globalBeaconChainData, globalPersistentData, isTestnet } from "../heartbeat"
import { sLeftToTimeLeft } from "../../utils/timeUtils"
import { LiquidityContract } from "../../ethereum/liquidity"

export const ETH_32 = ethers.parseEther("32")
const liqLastUsageFilename = __dirname + "/lastUsage.txt"
const stakingContract: StakingContract = new StakingContract()
const liquidityContract: LiquidityContract = new LiquidityContract()
const withdrawContract: WithdrawContract = new WithdrawContract()
const HOURS_TO_WAIT_BEFORE_REUSING_LIQ_ETH = 6

export interface Balances {
    staking: bigint
    liquidity: bigint
    liquidityMpEth: bigint
    liquidityMpEthInEth: bigint
    liqAvailableEthForValidators: bigint
    withdrawBalance: bigint
    totalPendingWithdraw: bigint
}

function getDepositData() {
    if(isTestnet) {
        return testnetDepositData
    } else {
        return mainnetDepositData
    }
}

export async function activateValidator(): Promise<boolean> {    
    let wasValidatorCreated = false
    
    try {
        const secondsUntilNextEpoch = await withdrawContract.getEpochTimeLeft()
        globalPersistentData.timeRemainingToFinishMetapoolEpoch = Number(secondsUntilNextEpoch.toString())
        const balances: Balances = await getBalances()
        const balanceForValidators = balances.staking + balances.withdrawBalance + balances.liqAvailableEthForValidators - balances.totalPendingWithdraw
        const validatorsToCreate = Math.floor(wtoe(balanceForValidators) / 32)
        
        if(validatorsToCreate > 0) {
            console.log("Creating", validatorsToCreate, "validators")
            const totalNecessaryWei = BigInt(validatorsToCreate) * ETH_32
            const weiFromLiq = max(0n, min(totalNecessaryWei - balances.staking, balances.liqAvailableEthForValidators))
            const weiFromWithdraw = max(0n, min(totalNecessaryWei - balances.staking - weiFromLiq, balances.withdrawBalance - balances.totalPendingWithdraw))

            console.log("ETH needed", wtoe(totalNecessaryWei))
            console.log("ETH from staking", wtoe(balances.staking))
            console.log("ETH from liq", wtoe(weiFromLiq))
            console.log("ETH from withdraw", wtoe(weiFromWithdraw))
            if(totalNecessaryWei != balances.staking + weiFromLiq + weiFromWithdraw) {
                console.error("Inconsistency when activating validator. Needed wei don't match balances")
                throw new Error(`Inconsistency when activating validator. Needed wei don't match balances
                    Trying to activate ${validatorsToCreate}
                    Needed ETH: ${wtoe(totalNecessaryWei)}
                    ETH from staking: ${wtoe(balances.staking)}
                    ETH from liq: ${wtoe(weiFromLiq)}
                    ETH from withdraw: ${wtoe(weiFromWithdraw)}
                `)
            }
            const nodes: Node[] = await getNextNodesToActivate(validatorsToCreate)
            console.log("Nodes", nodes)
            await stakingContract.pushToBeacon(nodes, weiFromLiq, weiFromWithdraw)
            wasValidatorCreated = true
        } else {
            console.log(`Not enough balance. Current balance for creating validators: ${wtoe(balanceForValidators)}`)
        }
    } catch(err: any) {
        console.error("There was a problem activating a validator", err.message)
        const subject = "[ERROR] Activating validator"
        const body = "Error: " + err.message 
        sendEmail(subject, body)
    } 
    return wasValidatorCreated
}

async function getValidatorsToActivate(): Promise<any[]> {
    // const validatorsDataResponse: ValidatorDataResponse[] = beaconChainData.validatorsData
    const validatorsDataResponse: ValidatorData[] = globalBeaconChainData.validatorsData
    return getDepositData().filter((depData: any) => {
        return validatorsDataResponse.every((v: ValidatorData) => {
            return v.pubkey !== `0x${depData.pubkey}`
        })
    })
}

async function getNextNodesToActivate(qty: number): Promise<Node[]> {
    const nodes = await getValidatorsToActivate()
    return nodes.slice(0, qty).map((node: any) => {
        return {
            pubkey: "0x" + node.pubkey,
            // withdrawCredentials: "0x" + node.withdrawal_credentials,
            signature: "0x" + node.signature,
            depositDataRoot: "0x" + node.deposit_data_root
        } 
    })
}

export async function getBalances(): Promise<Balances> {
    const config: EthConfig = getConfig()
    
    const [
        stakingBalance,
        liqBalance,
        liqMpEthBalance,
        liqAvailableEthForValidators,
        withdrawBalance,
        totalPendingWithdraw,
    ] = await Promise.all([
        stakingContract.getWalletBalance(config.stakingContractAddress),
        stakingContract.getWalletBalance(config.liquidityContractAddress),
        stakingContract.balanceOf(config.liquidityContractAddress),
        liquidityContract.getAvailableEthForValidator(),
        stakingContract.getWalletBalance(config.withdrawContractAddress),
        withdrawContract.totalPendingWithdraw()
    ])

    return {
        staking: stakingBalance,
        liquidity: liqBalance,
        liquidityMpEth: liqMpEthBalance,
        liquidityMpEthInEth: await convertMpEthToEth(liqMpEthBalance),
        liqAvailableEthForValidators: liqAvailableEthForValidators,
        withdrawBalance: withdrawBalance,
        totalPendingWithdraw: await totalPendingWithdraw,
    }
}