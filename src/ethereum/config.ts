import { ENV, getEnv } from "../entities/env"

export interface EthConfig {
    network: string
    stakingContractAddress: string
    liquidityContractAddress: string
    withdrawContractAddress: string
    ssvContractAddress: string
    validatorOwnerAddress: string
}

const GOERLI_CONFIG: EthConfig = {
    network: 'goerli',
    stakingContractAddress: "0x7BA5EA4C1e1EE3d965ee1f54C6574b0E8EFF8eB4",
    liquidityContractAddress: "0xef46F998303E8B67DAe5722123662e2B28180FF5",
    withdrawContractAddress: "0x5A4966a4ecf7E2200657cE15F15Bc236d00731aA",
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