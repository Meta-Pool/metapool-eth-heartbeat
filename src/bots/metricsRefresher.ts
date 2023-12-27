import { StakedQVaultContract } from "../crypto/q/stakedQVault"
import { globalQData } from "./heartbeat"

export async function refreshStakedQVaultMetrics() {

    const stakedQVaultContract = new StakedQVaultContract()
    const [
        totalAssets,
        totalSupply,
    ] = await Promise.all([
        stakedQVaultContract.totalAssets(),
        stakedQVaultContract.totalSupply(),
    ])

    globalQData.totalAssets = totalAssets
    globalQData.totalSupply = totalSupply
}