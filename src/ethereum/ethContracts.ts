import { ethers } from "ethers";
import { getEnv } from "../entities/env";
import { GenericContract } from "./contract";

export class EthContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi, network: string = "goerli") {
        super(address, abi, getEnv().ACCOUNT_PRIVATE_KEY, network)
    }

    getProvider(network: string, apiKey: string) {
        return new ethers.AlchemyProvider(
            network,
            apiKey
          );
    }
    
}




