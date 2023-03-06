import ssvAbi from "./abi/ssvAbi.json"
import { EthContract } from "./contracts"

export const SSV_CONTRACT_ADDRESS = "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04"

export class SsvContract extends EthContract {

    constructor() {
        super(SSV_CONTRACT_ADDRESS, ssvAbi)
    }
    
    registerValidator(pubkey: string, operatorIds: string, sharesPubKeys: string[], sharesEncrypted: string[], amount: number) {
        return this.getWritableContract().registerValidator(pubkey, operatorIds.split(",").map(Number), sharesPubKeys, sharesEncrypted, amount)
    }
    
    updateValidator(pubkey: string, operatorIds: string, sharesPubKeys: string[], sharesEncrypted: string[], amount: number) {
        return this.getWritableContract().updateValidator(pubkey, operatorIds.split(",").map(Number), sharesPubKeys, sharesEncrypted, amount)
    }
    
    getOperatorsByValidator(address: string): Promise<number[]> {
        return this.getReadableContract().getOperatorsByValidator(address)
    }
    
}

