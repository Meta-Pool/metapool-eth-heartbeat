import { Contract, ethers } from "ethers";
import { ENV, getEnv } from "../entities/env";
import { GenericContract } from "./contract";

const NETWORK = 'goerli'
const RPC_URL = "https://goerli.infura.io/v3/"
// TODO regenerate private data and get from .env
const API_KEY = "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy"

export class AurContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi, network: string = "goerli") {
        super(address, abi, getEnv().AURORA_ACCOUNT_PRIVATE_KEY, network)
    }

    getProvider(network: string, apiKey: string) {
        switch(network) {
            case 'mainnet':
                console.log("Getting provider from mainnet")
                return new ethers.JsonRpcProvider("https://mainnet.aurora.dev")
            case 'goerli':
                console.log("Getting provider from goerli")
                return new ethers.AlchemyProvider(
                    network,
                    apiKey
                );
            default:
                throw new Error(`Network ${network} not defined for aurora`)
        }
    }
    
}




