import { ethers } from "ethers"

export function max(a: bigint, b: bigint) {
    return a > b ? a : b
}

export function min(a: bigint, b: bigint) {
    return a < b ? a : b
}

export function wtoe(wei: bigint|string): number {
    return Number(ethers.formatEther(wei))
}

export function etow(eth: number|string): bigint {
    return ethers.parseEther(eth.toString())
}

export function weiToGWei(wei: bigint|string): number {
    return wtoe(wei) * 10 ** 9
}

export function ethToGwei(eth: number): number {
    return eth * (10 ** 9)
}