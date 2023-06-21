import { etow, wtoe } from "./numberUtils"

export function divide(a: string, b: string): string {
    return (Number(a) / Number(b)).toString()
}

/**
 * Multiply 2 numbers with 18 decimals
 * @param a number with 18 decimals
 * @param b another number with 18 decimals
 * @returns the product of the numbers without the decimals, with 18 decimals
 */
export function multiply(a: bigint, b: bigint): bigint {
    console.log(21, a)
    console.log(22, b)
    console.log(23, etow(wtoe(a) * wtoe(b)))
    return etow(wtoe(a) * wtoe(b))
}