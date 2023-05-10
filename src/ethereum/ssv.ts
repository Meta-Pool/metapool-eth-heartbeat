import ssvAbi from "./abi/ssvAbi.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"

export class SsvContract extends EthContract {

    constructor() {
        super(getConfig().ssvContractAddress, ssvAbi)
    }
    
    registerValidator(pubkey: string, operatorIds: string, sharesPubKeys: string[], sharesEncrypted: string[], amount: number) {
        return this.contract.registerValidator(pubkey, operatorIds.split(",").map(Number), sharesPubKeys, sharesEncrypted, amount)
    }
    
    updateValidator(pubkey: string, operatorIds: string, sharesPubKeys: string[], sharesEncrypted: string[], amount: number) {
        return this.contract.updateValidator(pubkey, operatorIds.split(",").map(Number), sharesPubKeys, sharesEncrypted, amount)
    }
    
    getOperatorsByValidator(address: string): Promise<number[]> {
        return this.contract.getOperatorsByValidator(address)
    }
    
}

