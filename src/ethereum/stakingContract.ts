// import { isDebug } from "../bots/heartbeat"
import stakingAbi from "./abi/Staking.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"
import { max, min } from "../utils/numberUtils"
import { ethers } from "ethers"
import { Report } from "../entities/staking"

export interface Node {
    pubkey: string
    // withdrawCredentials: string
    signature: string
    depositDataRoot: string
}

export class StakingContract extends EthContract {

    constructor() {
        super(getConfig().stakingContractAddress, stakingAbi.abi)
    }

    balanceOf(address: string): Promise<bigint> {
        return this.contract.balanceOf(address)
    }
    
    pushToBeacon(node: Node[], ethFromLiq: BigInt, withdrawEthAvailableForStaking: bigint) {
        const ethToRequestFromWithdraw = min(ethers.parseEther("32"), withdrawEthAvailableForStaking)
        return this.call("pushToBeacon", node, ethFromLiq, ethToRequestFromWithdraw)
    }
    
    totalSupply(): Promise<bigint> {
        return this.contract.totalSupply()
    }
    
    totalAssets(): Promise<bigint> {
        return this.contract.totalAssets()
    }

    totalUnderlying(): Promise<bigint> {
        return this.contract.totalUnderlying()
    }
    
    // updateNodesBalance(balance: String, rewardsPerSecond: bigint) {
    //     return this.call("updateNodesBalance", balance, max(0n, rewardsPerSecond))
    // }

    requestEthFromLiquidPoolToWithdrawal(amount: bigint) {
        return this.call("requestEthFromLiquidPoolToWithdrawal", amount)
    }

    estimatedRewardsPerSecond(): Promise<bigint> {
        return this.call("estimatedRewardsPerSecond")
    }

    submitReportUnlockTime(): Promise<bigint> {
        return this.call("submitReportUnlockTime")
    }
    
    nodesAndWithdrawalTotalBalance(): Promise<bigint> {
        return this.call("nodesAndWithdrawalTotalBalance")
    }

    reportEpochs(report: Report, rewardsPerSecond: bigint): Promise<any> {
        return this.call("reportEpochs", report, rewardsPerSecond)
    }

    lastEpochReported(): Promise<bigint> {
        return this.contract.lastEpochReported()
    }

    decimals(): Promise<bigint> {
        return this.contract.decimals()
    }

    name(): Promise<string> {
        return this.contract.name()
    }

    rewardsFee(): Promise<bigint> {
        return this.contract.rewardsFee()
    }

    symbol(): Promise<string> {
        return this.contract.symbol()
    }

    totalNodesActivated(): Promise<bigint> {
        return this.contract.totalNodesActivated()
    }

    whitelistEnabled(): Promise<boolean> {
        return this.contract.whitelistEnabled()
    }

    depositFee(): Promise<bigint> {
        return this.contract.depositFee()
    }

    submitReportTimelock(): Promise<bigint> {
        return this.contract.SUBMIT_REPORT_TIMELOCK()
    }

    minDeposit(): Promise<bigint> {
        return this.contract.MIN_DEPOSIT()
    }

    allowance(owner: string, spender: string): Promise<bigint> {
        return this.call("allowance", owner, spender)
    }
}



