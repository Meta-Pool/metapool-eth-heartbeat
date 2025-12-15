import { BalanceData, globalPersistentData, PriceData } from "../globals/globalMetrics";
import { ascDateSorter } from "./timeUtils";

/**
 * 
 * @returns an array containing PriceData objects. Even though it will not be used in it entirety, 
 * it is what computeRollingApy requires, even though it doesn't use params assets and supply
 */
export function groupQBalancesSortedByDate(): PriceData[] {
    const data = globalPersistentData.qBalancesByAddress

    const balancesByDate: Record<string, bigint> = {}
    Object.keys(data).forEach((pubkey: string) => {
        const balanceData: BalanceData[] = data[pubkey]
        balanceData.forEach((b: BalanceData) => {
            const date = b.dateISO
            if(!Object.keys(balancesByDate).includes(date)) {
                balancesByDate[date] = 0n
            }
            balancesByDate[date] += BigInt(b.balance)
        })
    })

    const balancesAsPriceData: PriceData[] = Object.keys(balancesByDate).map((date: string) => {
        return {
            dateISO: date,
            price: balancesByDate[date].toString(),
            assets: "0",
            supply: "0"
        }
    })

    balancesAsPriceData.sort((a: PriceData, b: PriceData) => {
        return ascDateSorter(a.dateISO, b.dateISO)
    })

    return balancesAsPriceData
}