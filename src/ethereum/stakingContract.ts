import stakingAbi from "./abi/Staking.json"
import { getConfig } from "./config"
import { EthContract } from "./contracts"

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
        return this.getReadableContract().balanceOf(address)
    }
    
    pushToBeacon(node: Node, ethFromLiq: BigInt) {
        return this.getWritableContract().pushToBeacon([node], ethFromLiq)
    }
    
    totalSupply(): Promise<BigInt> {
        return this.getReadableContract().totalSupply()
    }
    
    totalAssets(): Promise<BigInt> {
        return this.getReadableContract().totalAssets()
    }
    
    updateNodesBalance(balance: String) {
        return this.getWritableContract().updateNodesBalance(balance)
    }
}



