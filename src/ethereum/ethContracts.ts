import { Contract, ethers } from "ethers";
import { ENV, getEnv } from "../entities/env";
import { GenericContract } from "./contract";

export class EthContract extends GenericContract {


    constructor(address: string, abi: ethers.InterfaceAbi, network: string = "goerli") {
        super(address, abi, network)
    }

    getProvider(network: string, apiKey: string) {
        return new ethers.AlchemyProvider(
            network,
            apiKey
          );
    }
    
}




