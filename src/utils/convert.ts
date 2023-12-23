import { globalPersistentData } from "../bots/heartbeat";
import { StakingContract } from "../crypto/stakingContract";
import { multiply } from "./mathUtils";

export async function convertMpEthToEth(value: bigint): Promise<bigint> {
    return multiply(value, BigInt(globalPersistentData.mpethPrice))
}