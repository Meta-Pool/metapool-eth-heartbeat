import { getConfig } from "./config";
import { EthContract } from "./ethContracts";
import ssvViewsAbi from './abi/ssvNetworkViews.json'

export class SsvViewsContract extends EthContract {

    constructor() {
        super(getConfig().ssvNetworkViews, ssvViewsAbi)
    }

    getLiquidationThresholdPeriod() {
        return this.view("getLiquidationThresholdPeriod")
        // return this.contract.getLiquidationThresholdPeriod()
    }

    getMinimumLiquidationCollateral() {
        return this.view("getMinimumLiquidationCollateral")

        // return this.contract.getMinimumLiquidationCollateral()
    }

    getNetworkFee() {
        return this.view("getNetworkFee")

        // return this.contract.getNetworkFee()
    }

    getBalanceSSV(ownerAddress: string, operatorIds: number[], cluster: any): Promise<bigint> {
        return this.view("getBalanceSSV", ownerAddress, operatorIds, cluster)

        // return this.contract.getBalance(ownerAddress, operatorIds, cluster)
    }

    getBurnRateSSV(ownerAddress: string, operatorIds: number[], cluster: any): Promise<bigint> {
        return this.view("getBurnRateSSV", ownerAddress, operatorIds, cluster)

        // return this.contract.getBurnRate(ownerAddress, operatorIds, cluster)
    }
} 