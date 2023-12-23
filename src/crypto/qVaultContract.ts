import abi from "./abi/VQToken.json"
import { getConfig } from "./config"
import { QContract } from "./qContracts"

export class QValutContract extends QContract {

    constructor() {
        super(getConfig().qVaultAddress, abi)
    }

    getDelegationsList(address: string): Promise<any[]> {
        return this.contract.getDelegationsList(address)
    }
}



