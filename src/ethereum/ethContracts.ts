import { ethers } from "ethers";
import { getEnv } from "../entities/env";
import { GenericContract } from "./contract";
import { readFileSync } from "fs";
import path from "path";
import os from "os";

export class EthContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi, walletPk?: string) {
        const network = getEnv().NETWORK ?? "goerli"
        const pk = walletPk ? walletPk : readFileSync(path.join(os.homedir(), `.config/${network}/ethBot.txt`)).toString()
        super(address, abi, pk, network)
    }

    getProvider(network: string, apiKey: string) {
        return new ethers.AlchemyProvider(
            network,
            apiKey
          );
    }
    
}




