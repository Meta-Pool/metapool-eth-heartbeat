import { Contract, Provider, ethers } from "ethers";
import { ENV, getEnv } from "../entities/env";

const NETWORK = 'goerli'
const RPC_URL = "https://goerli.infura.io/v3/"
// TODO regenerate private data and get from .env
const API_KEY = "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy"

export abstract class GenericContract {

    address: string
    abi: ethers.InterfaceAbi
    network: string

    constructor(addess: string, abi: ethers.InterfaceAbi, network: string = "goerli") {
        this.address = addess
        this.abi = abi
        this.network = network
    }

    abstract getProvider(network: string, apiKey: string): Provider;
    
    getWalletBalance(address: string) {
        return this.getProvider(this.network, API_KEY).getBalance(address)
    }
    
    getWallet(privateKey: string) {
        const provider = this.getProvider(this.network, API_KEY)
        return new ethers.Wallet(privateKey, provider)
    }
    
    getReadableContract() {
        const provider = this.getProvider(this.network, API_KEY)
        console.log(2, this.network, this.address)
        return new Contract(this.address, this.abi, provider)
    }
    
    getWritableContract() {
        const env: ENV = getEnv()
        const pk: string = env.ACCOUNT_PRIVATE_KEY as string
        const wallet = this.getWallet(pk)
        return new Contract(this.address, this.abi, wallet)
    }
    
}




