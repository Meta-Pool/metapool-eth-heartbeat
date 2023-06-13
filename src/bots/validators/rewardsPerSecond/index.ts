import { IBalanceHistory } from "../../../entities/beaconcha/validator";
import { ValidatorDataResponse } from "../../../services/beaconcha/beaconcha";
import { beaconChainData } from "../../../services/beaconcha/beaconchaHelper";
import { MINUTES, SECONDS, globalPersistentData } from "../../heartbeat";

export const epochDurationMs = 6 * MINUTES + 24 * SECONDS

export function getRewardsPerSecond() {

    const validatorsBalanceHistory: Record<string, IBalanceHistory> = beaconChainData.validatorsBalanceHistory


}