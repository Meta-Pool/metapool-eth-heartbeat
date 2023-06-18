import { isDebug } from "../bots/heartbeat"
import stakingAbi from "./abi/Staking.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"
import { ETH_32 } from "../bots/activateValidator"
import { max, min } from "../utils/numberUtils"
import { ethers } from "ethers"

export interface Node {
    pubkey: string
    withdrawCredentials: string
    signature: string
    depositDataRoot: string
}

export class StakingContract extends EthContract {

    constructor() {
        super(getConfig().stakingContractAddress, stakingAbi.abi)
    }

    balanceOf(address: string) {
        return this.contract.balanceOf(address)
    }
    
    pushToBeacon(node: Node, ethFromLiq: BigInt, withdrawEthAvailableForStaking: bigint) {
        if(isDebug) console.log("Activating node. ethFromLiq", ethFromLiq, "ethFromWith", withdrawEthAvailableForStaking)
        const ethToRequestFromWithdraw = min(ethers.parseEther("32"), withdrawEthAvailableForStaking)
        // const ethToRequestFromWithdraw = ethers.parseEther("32")
        return this.contract.pushToBeacon([node], ethFromLiq, ethToRequestFromWithdraw).catch(this.decodeError)
    }
    
    totalSupply(): Promise<bigint> {
        return this.contract.totalSupply()
    }
    
    totalAssets(): Promise<bigint> {
        return this.contract.totalAssets()
    }
    
    updateNodesBalance(balance: String, rewardsPerSecond: bigint) {
        return this.contract.updateNodesBalance(balance, max(0n, rewardsPerSecond)).catch(this.decodeError)
    }

    requestEthFromLiquidPoolToWithdrawal(amount: bigint) {
        return this.contract.requestEthFromLiquidPoolToWithdrawal(amount).catch(this.decodeError)
    }
}



