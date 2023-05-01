import { ENV, getEnv } from "../entities/env"

export interface EthConfig {
    network: string
    stakingContractAddress: string
    liquidityContractAddress: string
    withdrawContractAddress: string
    ssvContractAddress: string
    validatorOwnerAddress: string
    stakingManagerAddress: string
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    stakingContractAddress: "0x1e3Ad098876d6619f3741D489456Da283891E814",
    liquidityContractAddress: "0x122975b3E5282d76F6d4F5564cC7b22b836107a1",
    withdrawContractAddress: "0xda4BbaA32dF0002614fd1155B6e0463a55CB9126",
    ssvContractAddress: "0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04",
    validatorOwnerAddress: "0x7d8e91b6C393c02Ef83473E8000b3883e655a761",
    stakingManagerAddress: "0x2da4A45AE7f78EABce1E3206c85383E9a98529d2",
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