import { IBalanceHistoryData } from "../../../services/beaconcha/beaconcha";
import { MS_IN_MINUTES, MS_IN_SECOND, globalBeaconChainData } from "../../heartbeat";

export const epochDurationMs = 6 * MS_IN_MINUTES + 24 * MS_IN_SECOND

export function getRewardsPerSecond() {

    const validatorsBalanceHistory: Record<string, IBalanceHistoryData[]> = globalBeaconChainData.validatorsIncomeDetailHistory


}