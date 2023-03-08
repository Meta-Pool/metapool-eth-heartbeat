import stakingAbi from "./abi/Staking.json"
import { EthContract } from "./contracts"

export interface Node {
    pubkey: string
    withdrawCredentials: string
    signature: string
    depositDataRoot: string
}
export const STAKING_CONTRACT_ADDRESS = "0xd2275C1bc599BcDf21985a9cF810eFB0fEe0CE5f"

export class StakingContract extends EthContract {

    constructor() {
        super(STAKING_CONTRACT_ADDRESS, stakingAbi.abi)
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



