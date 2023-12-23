import abi from "./abi/StakedQVault.json"
import { getConfig } from "./config"
import { QContract } from "./qContracts"

export class StakedQVaultContract extends QContract {

    constructor() {
        super(getConfig().stakedQVaultAddress, abi)
    }

    claimStakeDelegatorReward(): Promise<any> {
        return this.contract.claimStakeDelegatorReward({ gasLimit: 6000000 })
    }
}
