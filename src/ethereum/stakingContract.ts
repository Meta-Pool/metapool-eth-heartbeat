// import { isDebug } from "../bots/heartbeat"
import stakingAbi from "./abi/Staking.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"
import { max, min } from "../utils/numberUtils"
import { ethers } from "ethers"
import { Report } from "../entities/staking"
import { isDebug } from "../bots/heartbeat"

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
        return this.view("totalSupply")
    }
    
    totalAssets(): Promise<bigint> {
        return this.view("totalAssets")
    }

    totalUnderlying(): Promise<bigint> {
        return this.view("totalUnderlying")
    }

    requestEthFromLiquidPoolToWithdrawal(amount: bigint) {
        return this.call("requestEthFromLiquidPoolToWithdrawal", amount)
    }

    estimatedRewardsPerSecond(): Promise<bigint> {
        return this.view("estimatedRewardsPerSecond")
    }

    submitReportUnlockTime(): Promise<bigint> {
        return this.view("submitReportUnlockTime")
    }
    
    nodesAndWithdrawalTotalBalance(): Promise<bigint> {
        return this.view("nodesAndWithdrawalTotalBalance")
    }

    reportEpochs(report: Report, rewardsPerSecond: bigint): Promise<any> {
        return this.call("reportEpochs", report, rewardsPerSecond)
    }

    lastEpochReported(): Promise<bigint> {
        return this.view("lastEpochReported")
    }

    decimals(): Promise<bigint> {
        return this.view("decimals")
    }

    name(): Promise<string> {
        return this.view("name")
    }

    rewardsFee(): Promise<bigint> {
        return this.view("rewardsFee")
    }

    symbol(): Promise<string> {
        return this.view("symbol")
    }

    totalNodesActivated(): Promise<bigint> {
        return this.view("totalNodesActivated")
    }

    whitelistEnabled(): Promise<boolean> {
        return this.view("whitelistEnabled")
    }

    depositFee(): Promise<bigint> {
        return this.view("depositFee")
    }

    submitReportTimelock(): Promise<bigint> {
        return this.view("SUBMIT_REPORT_TIMELOCK")
    }

    minDeposit(): Promise<bigint> {
        return this.view("MIN_DEPOSIT")
    }

    allowance(owner: string, spender: string): Promise<bigint> {
        return this.call("allowance", owner, spender)
    }
}



