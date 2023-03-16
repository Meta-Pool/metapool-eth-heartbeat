import ssvAbi from "./abi/ssvAbi.json"
import { getConfig } from "./config"
import { EthContract } from "./contracts"

export class SsvContract extends EthContract {

    constructor() {
        super(getConfig().ssvContractAddress, ssvAbi)
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

