import { Contract, ethers } from "ethers";
import { ENV, getEnv } from "../entities/env";
import { GenericContract } from "./contract";

const NETWORK = 'goerli'
const RPC_URL = "https://goerli.infura.io/v3/"
// TODO regenerate private data and get from .env
const API_KEY = "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy"

export class AurContract extends GenericContract {

    constructor(address: string, abi: ethers.InterfaceAbi, network: string = "goerli") {
        super(address, abi, network)
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
    
    // getWalletBalance(address: string) {
    //     return this.getProvider(this.network, API_KEY).getBalance(address)
    // }
    
    // getWallet(privateKey: string) {
    //     const provider = this.getProvider(this.network, API_KEY)
    //     return new ethers.Wallet(privateKey, provider)
    // }
    
    // getReadableContract() {
    //     const provider = this.getProvider(this.network, API_KEY)
    //     console.log(2, this.network, this.address)
    //     return new Contract(this.address, this.abi, provider)
    // }
    
    // getWritableContract() {
    //     const env: ENV = getEnv()
    //     const pk: string = env.ACCOUNT_PRIVATE_KEY as string
    //     const wallet = this.getWallet(pk)
    //     return new Contract(this.address, this.abi, wallet)
    // }
    
}




