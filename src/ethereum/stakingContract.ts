import { getReadableContract, getWritableContract } from "./contracts";
import stakingAbi from "./abi/Staking.json"

export interface Node {
    pubkey: string
    withdrawCredentials: string
    signature: string
    depositDataRoot: string
}

export const STAKING_CONTRACT_ADDRESS = "0xd2275C1bc599BcDf21985a9cF810eFB0fEe0CE5f"

export function getReadableStakingContract() {
    return getReadableContract(STAKING_CONTRACT_ADDRESS, stakingAbi.abi)
}

export function getWritableStakingContract() {
    return getWritableContract(STAKING_CONTRACT_ADDRESS, stakingAbi.abi)
}

export function balanceOf(address: string) {
    return getReadableStakingContract().balanceOf(address)
}

export function pushToBeacon(node: Node, ethFromLiq: BigInt) {
    console.log(Object.values(node))
    // return getWritableStakingContract().pushToBeacon([Object.values(node)], ethFromLiq)
    return getWritableStakingContract().pushToBeacon([node], ethFromLiq)
    // return getWritableStakingContract().pushToBacon([node], ethFromLiq, {value: "0"})
}
