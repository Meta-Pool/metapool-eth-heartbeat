import { ethers } from "ethers";
import { getEnv } from "../entities/env";
import { GenericContract } from "./contract";

export class EthContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi) {
        super(address, abi, getEnv().ACCOUNT_PRIVATE_KEY, getEnv().NETWORK ?? "goerli")
    }

    getProvider(network: string, apiKey: string) {
        return new ethers.AlchemyProvider(
            network,
            apiKey
          );
    }
    
}




