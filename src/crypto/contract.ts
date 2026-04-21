import { Contract, Provider, Wallet, ethers } from "ethers";
import stakingAbi from "./abi/Staking.json"
import liquidityAbi from "./abi/LiquidUnstakePool.json"
import withdrawAbi from "./abi/withdrawAbi.json"
import ssvNetworkViewsAbi from "./abi/ssvNetworkViews.json"
import ssvBaseNetworkViewsAbi from "./abi/ssvBaseNetworkViews.json"
import { wtoe } from "../utils/numberUtils";
import { readFileSync } from "fs";
import path from "path";
import { homedir } from "os";
import { getConfig } from "./config";
import { isDebug } from "../globals/globalUtils";
import { sleep } from "../utils/executionUtils";

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

    getInfuraApiKeys(): string[] {
        const config = getConfig()
        return readFileSync(path.join(homedir(), `.config/${config.network}/infuraApiKey.txt`))
            .toString().trim().split(',').map(k => k.trim()).filter(k => k.length > 0)
    }

    private reconnectWithKey(key: string) {
        const provider = this.getProvider(this.network, key)
        this.connectedWallet = this.connectedWallet.connect(provider)
        this.contract = this.contract.connect(this.connectedWallet) as Contract
    }

    private async withKeyRotation<T>(fn: () => Promise<T>): Promise<T> {
        const keys = this.getInfuraApiKeys()
        let lastError: any
        for (const key of keys) {
            try {
                this.reconnectWithKey(key)
                return await fn()
            } catch(err: any) {
                lastError = err
                console.warn(`Infura key ending in ...${key.slice(-4)} failed: ${err.message}. Trying next key...`)
            }
        }
        throw lastError
    }

    async getWalletBalance(address: string) {
        console.log("Getting wallet balance from address", address)
        return await this.withKeyRotation(async () => {
            return await this.connectedWallet.provider!.getBalance(address)
        })
    }

    getWallet(privateKey: string) {
        const keys = this.getInfuraApiKeys()
        const provider = this.getProvider(this.network, keys[0])
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
            return await this.withKeyRotation(async () => {
                await sleep(1000) // Sleep to avoid hitting rate limits. Remove if you are sure you won't hit them
                console.log("Viewing", fnName, "with args", args)
                return await this.contract[fnName](...args)
            })
        } catch(err: any) {
            console.error("ERR viewing", fnName, err.message)
            this.decodeError(err)
        }
    }
    
    /**
     * When on debug mode, we don't want to make any actual call to the contract. If you happen to do, comment the first line and be very careful
     * @param fnName 
     * @param args 
     * @returns 
     */
    async call(fnName: string, ...args: any[]): Promise<any> {
        if(isDebug) {
            console.log("Trying to call contract function in debug mode. Not making the call.")
            return new Promise(() => {})
        }
        try {
            return await this.withKeyRotation(async () => {
                console.log("Calling", fnName, "with args", args)
                const tx = await this.contract[fnName](...args)
                const gasInWei: bigint = 100000000n
                const walletBalance = await this.connectedWallet.provider!.getBalance(this.connectedWallet.address)
                if(wtoe(gasInWei) > wtoe(walletBalance)) {
                    throw new Error(`Not enough balance to cover gas. Wallet balance: ${walletBalance.toString()}. Gas needed: ${gasInWei.toString()}`)
                } else {
                    await tx.wait()
                }
                return tx
            })
        } catch(err: any) {
            console.error("ERR calling", fnName, err.message)
            this.decodeError(err)
        }
    }
    
}




