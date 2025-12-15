import { globalPersistentData } from "../globals/globalMetrics";
import { multiply } from "./mathUtils";

export async function convertMpEthToEth(value: bigint): Promise<bigint> {
    return multiply(value, BigInt(globalPersistentData.mpethPrice))
}