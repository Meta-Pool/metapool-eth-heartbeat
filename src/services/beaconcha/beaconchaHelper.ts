import { ValidatorDataResponse, getValidatorBalanceHistory, getValidatorsData } from "./beaconcha";
import { EMPTY_BEACON_CHAIN_DATA, IBeaconChainHeartBeatData } from "./entities";

export let beaconChainData: IBeaconChainHeartBeatData = EMPTY_BEACON_CHAIN_DATA

export async function setBeaconchaData() {
    beaconChainData.validatorsData = await getValidatorsData()

    beaconChainData.validatorsBalanceHistory = {}
    await Promise.all(beaconChainData.validatorsData.map(async (v: ValidatorDataResponse) => {
        beaconChainData.validatorsBalanceHistory[v.data.pubkey] = await getValidatorBalanceHistory(v.data.pubkey)
    }))
}