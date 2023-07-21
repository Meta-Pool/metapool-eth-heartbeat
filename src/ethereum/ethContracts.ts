import { ethers } from "ethers";
import { getEnv } from "../entities/env";
import { GenericContract } from "./contract";
import { readFileSync } from "fs";
import path from "path";
import os from "os";

export class EthContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi) {
        const filename = getEnv().NETWORK === "mainnet" ? "ethBot" : "testEthBot"
        const pk = readFileSync(path.join(os.homedir(), `.config/${filename}.txt`)).toString()
        super(address, abi, pk, getEnv().NETWORK ?? "goerli")
    }

    getProvider(network: string, apiKey: string) {
        return new ethers.AlchemyProvider(
            network,
            apiKey
          );
    }
    
}




