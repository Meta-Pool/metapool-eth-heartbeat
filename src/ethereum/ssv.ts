import ssvAbi from "./abi/ssvAbi.json"
import { getReadableContract, getWritableContract } from "./contracts"

export const SSV_CONTRACT_ADDRESS = "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04"

function getReadableSsvContract() {
    return getReadableContract(SSV_CONTRACT_ADDRESS, ssvAbi)
}

function getWritableSsvContract() {
    return getWritableContract(SSV_CONTRACT_ADDRESS, ssvAbi)
}

export function registerValidator(pubkey: string, operatorIds: string, sharesPubKeys: string[], sharesEncrypted: string[], amount: number) {
    return getWritableSsvContract().registerValidator(pubkey, operatorIds.split(",").map(Number), sharesPubKeys, sharesEncrypted, amount)
}

export function updateValidator(pubkey: string, operatorIds: string, sharesPubKeys: string[], sharesEncrypted: string[], amount: number) {
    return getWritableSsvContract().updateValidator(pubkey, operatorIds.split(",").map(Number), sharesPubKeys, sharesEncrypted, amount)
}

export function getOperatorsByValidator(address: string): Promise<number[]> {
    return getReadableSsvContract().getOperatorsByValidator(address)
}
