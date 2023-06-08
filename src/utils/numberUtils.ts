import { ethers } from "ethers"

export function max(a: bigint, b: bigint) {
    return a > b ? a : b
}

export function min(a: bigint, b: bigint) {
    return a < b ? a : b
}

export function wton(wei: bigint|string) {
    return Number(ethers.formatEther(wei))
}