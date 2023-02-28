import { Contract, ethers } from "ethers";
import { ENV, getConfig } from "../entities/env";

const NETWORK = 'goerli'
const RPC_URL = "https://goerli.infura.io/v3/"
// TODO regenerate private data and get from .env
const API_KEY = "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy"



function getProvider(network: string, apiKey: string) {
    return new ethers.AlchemyProvider(
        network,
        apiKey
      );
}

export function getWalletBalance(address: string) {
    return getProvider(NETWORK, API_KEY).getBalance(address)
}

export function getWallet(privateKey: string) {
    const provider = getProvider(NETWORK, API_KEY)
    return new ethers.Wallet(privateKey, provider)
}

export function getReadableContract(address: string, abi: ethers.InterfaceAbi) {
    const provider = getProvider(NETWORK, API_KEY)
    return new Contract(address, abi, provider)
}

export function getWritableContract(address: string, abi: ethers.InterfaceAbi) {
    const env: ENV = getConfig()
    const pk: string = env.ACCOUNT_PRIVATE_KEY as string
    const wallet = getWallet(pk)
    return new Contract(address, abi, wallet)
}

