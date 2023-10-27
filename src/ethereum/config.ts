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

    // SSV
    ssvNetworkViews: string
    ssvOwnerAddress: string

    // Q
    qVaultAddress: string
}

const MAINNET_CONFIG: EthConfig = {
    network: 'mainnet',
    // Ethereum
    stakingContractAddress: "0x48AFbBd342F64EF8a9Ab1C143719b63C2AD81710",
    liquidityContractAddress: "0xdF261F967E87B2aa44e18a22f4aCE5d7f74f03Cc",
    withdrawContractAddress: "0xE55E5fDe6C25ac4AD75D867817D2d8a45836Af49",
    validatorOwnerAddress: "0x52e5219EF6Af019776c0a64925370f92caB282EC",
    // Aurora
    stakingManagerAddress: "0xfbC1423a2A4453E162cDd535991bCC4143E5d336",
    oldStakingManagerAddress: "0x69e3a362ffD379cB56755B142c2290AFbE5A6Cc8",
    
    // SSV
    ssvNetworkViews: "0xafE830B6Ee262ba11cce5F32fDCd760FFE6a66e4",
    ssvContractAddress: "0xDD9BC35aE942eF0cFa76930954a156B3fF30a4E1",
    ssvOwnerAddress: "0xDd1CD16F95e44Ef7E55CC33Ee6C1aF9AB7CEC7fC",

    // Q
    qVaultAddress: "0x13364EaDf6e73b4478734242fC32f1DdD7BC0828"
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    // Ethereum
    stakingContractAddress: "0x748c905130CC15b92B97084Fd1eEBc2d2419146f",
    liquidityContractAddress: "0x37774000C885e9355eA7C6B025EbF1704141093C",
    withdrawContractAddress: "0x1A8c25ADc96Fb62183C4CB5B9F0c47746B847e05",
    validatorOwnerAddress: "0x52e5219EF6Af019776c0a64925370f92caB282EC",
    // Aurora
    stakingManagerAddress: "0x2da4A45AE7f78EABce1E3206c85383E9a98529d2",
    
    // SSV
    ssvNetworkViews: "0xAE2C84c48272F5a1746150ef333D5E5B51F68763",
    ssvContractAddress: "0xc3cd9a0ae89fff83b71b58b6512d43f8a41f363d",
    ssvOwnerAddress: "0xba013e942abbeb7c6a2d597c61d65fdc14c0fee6",

    // Q
    qVaultAddress: "0x00000000000000000000000000000000000000000"
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