import { ENV, getEnv } from "../entities/env"

export interface EthConfig {
    network: string
    stakingContractAddress: string
    liquidityContractAddress: string
    ssvContractAddress: string
    validatorOwnerAddress: string
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    stakingContractAddress: "0x1AE3B4577Af51A6A1aBf376d952D10eAfe9B9eaC",
    liquidityContractAddress: "0xf069Acbda35eBd65F7D53639e839D4a4b54A7807",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x3a48D9b035A13d4eE77171DfEf9f219892bc9DCb",
}

export function getConfig(network?: string): EthConfig {
    if(!network) {
        const env: ENV = getEnv()
        network = env.NETWORK
    }
    switch(network) {
        case 'mainnet':
            throw new Error("Mainnet is not implemented yet")
        case 'goerli':
        case 'testnet':
            return GOERLI_CONFIG
        default: 
            throw new Error(`${network} defined`)
    }
}