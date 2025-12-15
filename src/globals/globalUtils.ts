/**
 * IMPORTANT
 * In this file should go variables and functions that may cause circular dependencies. 
 * Make sure to not import from other files here.
 */

export let isTestnet: boolean = false
export let isDebug: boolean = false

export function setIsTestnet(testnet: boolean) {
    isTestnet = testnet
}

export function setIsDebug(debug: boolean) {
    isDebug = debug
}
