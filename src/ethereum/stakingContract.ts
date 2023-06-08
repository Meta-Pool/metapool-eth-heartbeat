import { isDebug } from "../bots/heartbeat"
import stakingAbi from "./abi/Staking.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"

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
    
    pushToBeacon(node: Node, ethFromLiq: BigInt, withdrawEthAvailableForStaking: BigInt) {
        if(isDebug) console.log("Activating node. ethFromLiq", ethFromLiq, "ethFromWith", withdrawEthAvailableForStaking)
        return this.contract.pushToBeacon([node], ethFromLiq, withdrawEthAvailableForStaking)
    }
    
    totalSupply(): Promise<bigint> {
        return this.contract.totalSupply()
    }
    
    totalAssets(): Promise<bigint> {
        return this.contract.totalAssets()
    }
    
    updateNodesBalance(balance: String) {
        return this.contract.updateNodesBalance(balance)
    }
}



