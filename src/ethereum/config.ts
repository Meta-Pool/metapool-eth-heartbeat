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
    stakingContractAddress: "0xB38694ce9504eC3aB5D2d78c3a3E7bf41Dd1D76a",
    liquidityContractAddress: "0xE111B9617D5313aD074FdA6CE3F351aB47551783",
    withdrawContractAddress: "0xc03c4CeE4113d9BAFE899c67FDEB5ebc02184B18",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x7d8e91b6C393c02Ef83473E8000b3883e655a761",
    // Aurora
    stakingManagerAddress: "0x69e3a362ffD379cB56755B142c2290AFbE5A6Cc8",
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    // Ethereum
    stakingContractAddress: "0xB38694ce9504eC3aB5D2d78c3a3E7bf41Dd1D76a",
    liquidityContractAddress: "0xE111B9617D5313aD074FdA6CE3F351aB47551783",
    withdrawContractAddress: "0xc03c4CeE4113d9BAFE899c67FDEB5ebc02184B18",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x7d8e91b6C393c02Ef83473E8000b3883e655a761",
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