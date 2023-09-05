import { getConfig } from "./config";
import { EthContract } from "./ethContracts";
import ssvViewsAbi from './abi/ssvNetworkViews.json'

export class SsvViewsContract extends EthContract {

    constructor() {
        super(getConfig().ssvNetworkViews, ssvViewsAbi)
    }

    getLiquidationThresholdPeriod() {
        return this.contract.getLiquidationThresholdPeriod()
    }

    getMinimumLiquidationCollateral() {
        return this.contract.getMinimumLiquidationCollateral()
    }

    getNetworkFee() {
        return this.contract.getNetworkFee()
    }

    getBalance(ownerAddress: string, operatorIds: number[], cluster: any): Promise<bigint> {
        return this.contract.getBalance(ownerAddress, operatorIds, cluster)
    }

    getBurnRate(ownerAddress: string, operatorIds: number[], cluster: any): Promise<bigint> {
        return this.contract.getBurnRate(ownerAddress, operatorIds, cluster)
    }
} 