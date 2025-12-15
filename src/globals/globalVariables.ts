import { DepositContract } from "../crypto/ethereum/depositContract"
import { LiquidityContract } from "../crypto/liquidity"
import { SsvContract } from "../crypto/ssv"
import { SsvViewsContract } from "../crypto/ssvViews"
import { StakingContract } from "../crypto/stakingContract"
import { WithdrawContract } from "../crypto/withdraw"

export const stakingContract: StakingContract = new StakingContract()
export const liquidityContract: LiquidityContract = new LiquidityContract()
export const withdrawContract: WithdrawContract = new WithdrawContract()
export const ssvViewsContract: SsvViewsContract = new SsvViewsContract()
export const depositContract: DepositContract = new DepositContract()
export const ssvContract: SsvContract = new SsvContract()

//time in ms
export const MS_IN_SECOND = 1000
export const MS_IN_MINUTES = 60 * MS_IN_SECOND
export const MS_IN_HOUR = 60 * MS_IN_MINUTES
export const MS_IN_DAY = 24 * MS_IN_HOUR