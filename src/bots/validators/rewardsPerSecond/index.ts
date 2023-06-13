import { IBalanceHistory } from "../../../entities/beaconcha/validator";
import { IBalanceHistoryData, ValidatorDataResponse } from "../../../services/beaconcha/beaconcha";
import { MINUTES, SECONDS, beaconChainData, globalPersistentData } from "../../heartbeat";

export const epochDurationMs = 6 * MINUTES + 24 * SECONDS

export function getRewardsPerSecond() {

    const validatorsBalanceHistory: Record<string, IBalanceHistoryData[]> = beaconChainData.validatorsBalanceHistory


}