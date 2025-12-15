import { readFileSync } from "fs"
import { ClusterData } from "../entities/ssvEntities"
import ssvAbi from "./abi/ssvAbi.json"
import { getConfig } from "./config"
import { EthContract } from "./ethContracts"
import path from "path"
import os from "os"
import { getEnv } from "../entities/env"

export class SsvContract extends EthContract {

    constructor() {
        const network = getEnv().NETWORK ?? "goerli"
        // const filename = getEnv().NETWORK === "mainnet" ? "ssvBot" : "testSsvBot"
        const pk = readFileSync(path.join(os.homedir(), `.config/${network}/ssvBot.txt`)).toString().trim()
        super(getConfig().ssvContractAddress, ssvAbi, pk)
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

    deposit(clusterOwner: string, operatorIds: string, amount: bigint, cluster: ClusterData): Promise<any> {
        return this.call("deposit", clusterOwner, operatorIds.split(",").map(Number), amount, cluster)
    }
    
}

