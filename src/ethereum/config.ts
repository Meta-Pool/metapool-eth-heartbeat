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
    oldStakingManagerAddress?: string
}

const MAINNET_CONFIG: EthConfig = {
    network: 'mainnet',
    // Ethereum
    stakingContractAddress: "0x748c905130CC15b92B97084Fd1eEBc2d2419146f",
    liquidityContractAddress: "0x37774000C885e9355eA7C6B025EbF1704141093C",
    withdrawContractAddress: "0x1A8c25ADc96Fb62183C4CB5B9F0c47746B847e05",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x52e5219EF6Af019776c0a64925370f92caB282EC",
    // Aurora
    stakingManagerAddress: "0xfbC1423a2A4453E162cDd535991bCC4143E5d336",
    oldStakingManagerAddress: "0x69e3a362ffD379cB56755B142c2290AFbE5A6Cc8",
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    // Ethereum
    stakingContractAddress: "0x748c905130CC15b92B97084Fd1eEBc2d2419146f",
    liquidityContractAddress: "0x37774000C885e9355eA7C6B025EbF1704141093C",
    withdrawContractAddress: "0x1A8c25ADc96Fb62183C4CB5B9F0c47746B847e05",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x52e5219EF6Af019776c0a64925370f92caB282EC",
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