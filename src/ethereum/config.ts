import { ENV, getEnv } from "../entities/env"

export interface EthConfig {
    network: string
    // Ethereum
    stakingContractAddress: string
    liquidityContractAddress: string
    withdrawContractAddress: string
    ssvContractAddress: string
    validatorOwnerAddress: string
    // Aurora
    stakingManagerAddress: string
}

const MAINNET_CONFIG: EthConfig = {
    network: 'mainnet',
    // Ethereum
    stakingContractAddress: "0xACF87D0920e0866bCe1B4C3766D24EE743BCe68b",
    liquidityContractAddress: "0xEa6718D15cF41CCcc12Ba6D5409A7bF11a3903f6",
    withdrawContractAddress: "0x5ba5414Da3bbE6002DB68094887CfF52ee5bF8Bd",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x73e1bc24d12e642Ed648De1B951c0F318489b521",
    // Aurora
    stakingManagerAddress: "0x69e3a362ffD379cB56755B142c2290AFbE5A6Cc8",
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    // Ethereum
    stakingContractAddress: "0xACF87D0920e0866bCe1B4C3766D24EE743BCe68b",
    liquidityContractAddress: "0xEa6718D15cF41CCcc12Ba6D5409A7bF11a3903f6",
    withdrawContractAddress: "0x5ba5414Da3bbE6002DB68094887CfF52ee5bF8Bd",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x73e1bc24d12e642Ed648De1B951c0F318489b521",
    // Aurora
    stakingManagerAddress: "0x2da4A45AE7f78EABce1E3206c85383E9a98529d2",
}

export function getConfig(network?: string): EthConfig {
    if(!network) {
        const env: ENV = getEnv()
        network = env.NETWORK
    }
    switch(network) {
        case 'mainnet':
            return MAINNET_CONFIG
        case 'goerli':
        case 'testnet':
            return GOERLI_CONFIG
        default: 
            throw new Error(`${network} defined`)
    }
}