import { Contract, Provider, Wallet, ethers } from "ethers";
import { ENV, getEnv } from "../entities/env";
import stakingAbi from "./abi/Staking.json"
import liquidityAbi from "./abi/LiquidUnstakePool.json"
import withdrawAbi from "./abi/withdrawAbi.json"
import ssvNetworkViewsAbi from "./abi/ssvNetworkViews.json"
import ssvBaseNetworkViewsAbi from "./abi/ssvBaseNetworkViews.json"
import { parse } from "path";
import { wtoe } from "../utils/numberUtils";

// TODO regenerate private data and get from .env
const API_KEY = "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy"
const INFURA_API_KEY = "2dd8a76e1c2842c19115ed0212375464"

const abis = [
    ssvNetworkViewsAbi,
    ssvBaseNetworkViewsAbi,
    stakingAbi.abi,
    liquidityAbi.abi,
    withdrawAbi.abi,
]

export abstract class GenericContract {

    address: string
    abi: ethers.InterfaceAbi
    network: string
    contract: Contract
    connectedWallet: Wallet

    constructor(address: string, abi: ethers.InterfaceAbi, pk: string, network: string = "goerli") {
        this.address = address
        this.abi = abi
        this.network = network
        const wallet = this.getWallet(pk)
        this.connectedWallet = wallet
        this.contract = new Contract(this.address, this.abi, wallet)
    }

    abstract getProvider(network: string, apiKey: string): Provider;
    
    getWalletBalance(address: string) {
        return this.getProvider(this.network, INFURA_API_KEY).getBalance(address)
        // return this.getProvider(this.network, API_KEY).getBalance(address)
    }
    
    getWallet(privateKey: string) {
        const provider = this.getProvider(this.network, INFURA_API_KEY)
        // const provider = this.getProvider(this.network, API_KEY)
        return new ethers.Wallet(privateKey, provider)
    }

    decodeError(err: any): any {
        const data = err.data
        for(let i = 0; i < abis.length; i++) {
            const inter = new ethers.Interface(abis[i])
            const parsedError = inter.parseError(data)
            if(parsedError !== null) {
                console.error(parsedError)
                throw new Error(`
                    Abi with index ${i}. 
                    Name: ${parsedError.name}. 
                    Args: ${parsedError.args}
                `)
            }
        }
        err.message = "Unknown error"
        throw err
    }

    async view(fnName: string, ...args: any[]): Promise<any> {
        try {
            console.log("Viewing", fnName, "with args", ...args)
            const tx = await this.contract[fnName](...args)            
            return tx
        } catch(err: any) {
            console.error("ERR viewing", fnName, err.message)
            this.decodeError(err)   
        }
    }
    
    async call(fnName: string, ...args: any[]): Promise<any> {
        try {
            const tx = await this.contract[fnName](...args)
            const gasInWei: bigint = 100000000n
            const walletBalance = await this.getWalletBalance(this.connectedWallet.address)
            if(wtoe(gasInWei) > wtoe(walletBalance)) {
                throw new Error(`Not enough balance to cover gas. Wallet balance: ${walletBalance.toString()}. Gas needed: ${gasInWei.toString()}`)
            } else {
                await tx.wait()
            }
            return tx
        } catch(err: any) {
            console.error("ERR calling", fnName, err.message)
            this.decodeError(err)   
        }
    }
    
}




