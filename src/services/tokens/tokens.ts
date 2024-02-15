import { readFileSync } from "fs";
import { getConfig } from "../../crypto/config";
import { homedir } from "os";
import path from "path";

export async function getPrice(token: string): Promise<number> {
    const response = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${token}&tsyms=USD`)
    const json = await response.json()
    return json.USD
}

export async function getTokenHoldersQty(address: string): Promise<number> {
    const config = getConfig()
    const network = config.network
    const chainbaseApiKey = readFileSync(path.join(homedir(), `.config/${network}/chainbaseApiKey.txt`)).toString().trim()
    const network_id = config.networkId; 

    const response = await fetch(`https://api.chainbase.online/v1/token/holders?chain_id=${network_id}&contract_address=${address}&page=1&limit=20`, {
        method: 'GET',
        headers: {
            'x-api-key': chainbaseApiKey,
            'accept': 'application/json'
        }
    })
    const json = await response.json()
    return json.count
}