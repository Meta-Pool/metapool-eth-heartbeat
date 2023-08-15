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
} 