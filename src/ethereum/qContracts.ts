import { ethers } from "ethers";
import { getEnv } from "../entities/env";
import { GenericContract } from "./contract";
import { readFileSync } from "fs";
import path from "path";
import os from "os";

export class QContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi, walletPk?: string) {
        const network = getEnv().NETWORK ?? "goerli"
        const pk = walletPk ? walletPk : readFileSync(path.join(os.homedir(), `.config/${network}/aurBot.txt`)).toString().trim()
        super(address, abi, pk, network)
    }

    getProvider(network: string, apiKey: string) {
        if(network === "goerli") throw new Error("Goerli not implemented for Q yet")
        return new ethers.JsonRpcProvider("https://rpc.q.org")
    }
    
}




