import { beaconChainData } from "../../bots/heartbeat";
import { ValidatorDataResponse, getValidatorBalanceHistory, getValidatorWithrawalInEpoch, getValidatorsData } from "./beaconcha";
import { EMPTY_BEACON_CHAIN_DATA, IBeaconChainHeartBeatData } from "./entities";



export async function setBeaconchaData() {
    beaconChainData.validatorsData = await getValidatorsData()

    beaconChainData.validatorsBalanceHistory = {}
    await Promise.all(beaconChainData.validatorsData.map(async (v: ValidatorDataResponse) => {
        if(v.data.status && v.data.status !== "exited") {
            beaconChainData.validatorsBalanceHistory[v.data.pubkey] = await getValidatorBalanceHistory(v.data.pubkey)
            // beaconChainData.validatorsBalanceHistory = await getValidatorWithrawalInEpoch(v.data.pubkey)

        }
    }))

    beaconChainData.validatorsStatusesQty = beaconChainData.validatorsData.reduce((acc: Record<string, number>, curr: ValidatorDataResponse) => {
        if(!curr.data.status) return acc
        if(!acc[curr.data.status]) acc[curr.data.status] = 0
        acc[curr.data.status] += 1
        return acc
    }, {})
}