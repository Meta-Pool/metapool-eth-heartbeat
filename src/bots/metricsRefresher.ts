import { StakedQVaultContract } from "../crypto/q/stakedQVault"
import { globalQData } from "./heartbeat"

export async function refreshStakedQVaultMetrics() {

    const stakedQVaultContract = new StakedQVaultContract()
    const [
        totalAssets,
        totalSupply,
        getStQPrice,
    ] = await Promise.all([
        stakedQVaultContract.totalAssets(),
        stakedQVaultContract.totalSupply(),
        stakedQVaultContract.getStQPrice(),
    ])

    globalQData.totalAssets = totalAssets
    globalQData.totalSupply = totalSupply
    globalQData.getStQPrice = getStQPrice
}