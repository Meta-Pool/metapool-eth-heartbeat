import { isDebug, isTestnet } from "../../bots/heartbeat"
import { ZEROS_9 } from "../../bots/nodesBalance"
import { IBalanceHistory } from "../../entities/beaconcha/validator"
import { getEnv } from "../../entities/env"
import { getConfig } from "../../ethereum/config"
import { IEpochResponse, IIncomeData, INCOME_DATA_KEYS as INCOME_DATA_KEYS, IIncomeDetailHistoryData, IIncomeDetailHistoryResponse, IValidatorProposal, MiniIDHReport } from "./entities"

const MAINNET_BASE_URL = "https://beaconcha.in/api/v1/"
const TESTNET_BASE_URL = "https://prater.beaconcha.in/api/v1/"
const BASE_URL = getEnv().NETWORK == "mainnet" ? MAINNET_BASE_URL : TESTNET_BASE_URL

const VALIDATOR_DATA_BASE_URL = BASE_URL + "validator/"
const VALIDATOR_ID_FINDER_BASE_URL = VALIDATOR_DATA_BASE_URL + "eth1/"
const VALIDATOR_HISTORY_URL = VALIDATOR_DATA_BASE_URL + "{index_or_pubkey}/balancehistory"
const VALIDATOR_INCOME_DETAIL_HISTORY_URL = VALIDATOR_DATA_BASE_URL + "{indexes}/incomedetailhistory?latest_epoch={epoch}"

export interface DeployerDataResponse {
    status: string
    data: ValidatorBasicData[]
}

export interface ValidatorBasicData {
    publickey: string
    valid_signature: boolean
    validatorindex: number
}

export interface ValidatorDataResponse {
    status: string
    data: ValidatorData
}

export interface ValidatorData {
    activationeligibilityepoch?: number
    activationepoch?: number
    balance: number
    effectivebalance: number
    exitepoch?: number
    lastattestationslot?: number
    name?: string | null
    pubkey: string
    slashed?: boolean
    status?: string
    validatorindex?: number
    withdrawableepoch?: number
    withdrawalcredentials?: string
}

export interface BalanceHistory {
    status: string
    data: IBalanceHistoryData[]
}

export interface IBalanceHistoryData {
    balance: number
    effectivebalance: number
    epoch: number
    validatorindex: number
    week: number
    week_start: string
    week_end: string
}

export async function getValidatorsData(): Promise<ValidatorDataResponse[]> {
    const validatorOwnerAddress = getConfig().validatorOwnerAddress
    const validatorsDataResponse = await fetch(`${VALIDATOR_ID_FINDER_BASE_URL}${validatorOwnerAddress}`)
    
    const validatorData: DeployerDataResponse = await validatorsDataResponse.json()
    // When a validator is getting activated, the validator id is temporary null, so it has the 32 ETH
    const nonNullValidatorIds: number[] = validatorData.data.map((v: ValidatorBasicData) => v.validatorindex).filter(id => id != null)
    const nullValidatorsData: ValidatorDataResponse[] = validatorData.data.filter((v: ValidatorBasicData) => v.validatorindex == null).map((v: ValidatorBasicData) => generateValidatorDataForActivatingValidators(v))
    
    const responses = await Promise.all(nonNullValidatorIds.map(id => fetch(`${VALIDATOR_DATA_BASE_URL}${id}`)))
    const jsons: ValidatorDataResponse[] = await Promise.all(responses.map(r => r.json()))
    
    return [jsons, nullValidatorsData].flat()
}

function generateValidatorDataForActivatingValidators(basicData: ValidatorBasicData) {
    return {
        status: 'Pending',
        data: {
            effectivebalance: 32000000000,
            balance: 32000000000,
            pubkey: basicData.publickey,
            status: "pending"
        }
    }
}

export function getValidatorBalanceHistory(indexOrPubkey: string|number): Promise<IBalanceHistoryData[]> {
    const url = VALIDATOR_HISTORY_URL.replace("{index_or_pubkey}", indexOrPubkey.toString())
    return fetch(url).then(r => r.json().then(json => json.data))
}

/**
 * 
 * @param epoch Epoch number, the string latest or the string finalized
 */
export function getEpoch(epoch: string = "finalized"): Promise<IEpochResponse> {
    const url = BASE_URL + "epoch/" + epoch
    return fetch(url).then(r => r.json().then(json => json))
}

export function getValidatorProposal(validatorIndex: number): Promise<IValidatorProposal> {
    const url = BASE_URL + `validator/${validatorIndex}/proposals`
    if(isDebug) console.log("Validator proposal url", url)
    return fetch(url).then(r => r.json())
}

/**
 * 
 * @param indexOrPubKey 
 * @param epoch If no epoch is sent, assumes latest epoch
 * @returns 
 */
export function getValidatorWithrawalInEpoch(indexOrPubKey: string|number, epoch?: number) {
    const url = BASE_URL + `validator/${indexOrPubKey}/withdrawals` + epoch ? `?epoch=${epoch}` : ""
    if(isDebug) console.log("Withrawal url:", url)
    return fetch(url).then(r => r.json())
}

export async function getValidatorsIncomeDetailHistory(indexes: number[], firstEpoch: number, lastEpoch: number): Promise<Record<number, MiniIDHReport>> {
    const validatorsUrl = VALIDATOR_INCOME_DETAIL_HISTORY_URL.replace("{indexes}", indexes.join(","))
    let output: Record<number, any> = {}
    indexes.forEach((index: number) => {
        output[index] = {
            lastCheckedEpoch: lastEpoch + 1,
            rewards: 0n,
            penalties: 0n
        }
    })

    let queryEpoch = lastEpoch
    while(queryEpoch > firstEpoch) {
        const epochIDHUrl = validatorsUrl.replace("{epoch}", queryEpoch.toString())
        const idhResponse: IIncomeDetailHistoryResponse = await (await fetch(epochIDHUrl)).json()
        output = await processIDHResponse(output, idhResponse, firstEpoch)
        queryEpoch -= 100
    }

    return output
}

async function processIDHResponse(output: Record<string|number, MiniIDHReport>, idhResponse: IIncomeDetailHistoryResponse, firstEpoch: number): Promise<Record<string|number, any>> {
    const errorMessages: string[] = []
    idhResponse.data.forEach((data: IIncomeDetailHistoryData) => {
        if(data.epoch < firstEpoch) return
        const validatorIDH = output[data.validatorindex]

        const incomeResponseProperties = Object.keys(data.income)
        const isIncluded = incomeResponseProperties.some((e: string) => INCOME_DATA_KEYS.includes(e))
        if(!isIncluded) {
            const message = `Response contains keys not managed by bot. Either a reward or a penalty may be overlooked.`
            errorMessages.push(message)
            throw new Error(message)
        }
        validatorIDH.lastCheckedEpoch--
        validatorIDH.rewards += sumRewards(data.income)
        validatorIDH.penalties += sumPenalties(data.income)

        output[data.validatorindex] = {...validatorIDH}
    })
    return output
}

function sumRewards(data: IIncomeData): bigint {
    return BigInt((data.attestation_head_reward|| 0) + ZEROS_9)
        + BigInt((data.attestation_source_reward|| 0) + ZEROS_9)
        + BigInt((data.attestation_target_reward|| 0) + ZEROS_9)
        + BigInt((data.proposer_attestation_inclusion_reward|| 0) + ZEROS_9)
        + BigInt((data.proposer_slashing_inclusion_reward|| 0) + ZEROS_9)
        + BigInt((data.proposer_sync_inclusion_reward|| 0) + ZEROS_9)
        + BigInt((data.slashing_reward|| 0) + ZEROS_9)
        + BigInt((data.sync_committee_reward|| 0) + ZEROS_9)
        + BigInt(data.tx_fee_reward_wei || 0)
}

function sumPenalties(data: IIncomeData): bigint {
    return BigInt((data.attestation_source_penalty|| 0) + ZEROS_9)
        + BigInt((data.attestation_target_penalty|| 0) + ZEROS_9)
        + BigInt((data.finality_delay_penalty|| 0) + ZEROS_9)
        + BigInt((data.slashing_penalty|| 0) + ZEROS_9)
        + BigInt((data.sync_committee_penalty|| 0) + ZEROS_9)
}