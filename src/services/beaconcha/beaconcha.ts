import { isDebug, isTestnet } from "../../bots/heartbeat"
import { ZEROS_9 } from "../../bots/nodesBalance"
import { getEnv } from "../../entities/env"
import { getConfig } from "../../ethereum/config"
import { IEpochResponse, IIncomeData, INCOME_DATA_KEYS as INCOME_DATA_KEYS, IIncomeDetailHistoryData, IIncomeDetailHistoryResponse, IValidatorProposal, MiniIDHReport } from "./entities"

const MAINNET_BASE_URL_SITE = "https://beaconcha.in/validator/"
const TESTNET_BASE_URL_SITE = "https://prater.beaconcha.in/validator/"
export const BASE_BEACON_CHAIN_URL_SITE = getEnv().NETWORK == "mainnet" ? MAINNET_BASE_URL_SITE : TESTNET_BASE_URL_SITE

const MAINNET_BASE_URL = "https://beaconcha.in/api/v1/"
const TESTNET_BASE_URL = "https://prater.beaconcha.in/api/v1/"
const BASE_URL = getEnv().NETWORK == "mainnet" ? MAINNET_BASE_URL : TESTNET_BASE_URL

const VALIDATOR_DATA_BASE_URL = BASE_URL + "validator/"
const VALIDATOR_ID_FINDER_BASE_URL = VALIDATOR_DATA_BASE_URL + "eth1/"
const VALIDATOR_HISTORY_URL = VALIDATOR_DATA_BASE_URL + "{index_or_pubkey}/balancehistory"
const VALIDATOR_INCOME_DETAIL_HISTORY_URL = VALIDATOR_DATA_BASE_URL + "{indexes}/incomedetailhistory?latest_epoch={latest_epoch}&limit={limit}"

export interface DeployerDataResponse {
    status: string
    data: ValidatorBasicData[]
}

export interface BeaconChainDataError {
    message: string
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

export async function getValidatorsData(): Promise<ValidatorData[]> {
    const validatorOwnerAddress = getConfig().validatorOwnerAddress
    const validatorsDataResponse = await fetch(`${VALIDATOR_ID_FINDER_BASE_URL}${validatorOwnerAddress}`)
    
    const validatorData: DeployerDataResponse|BeaconChainDataError = await validatorsDataResponse.json()
    
    if(validatorData && 'message' in validatorData) {
        throw new Error(validatorData.message)
    }
    // When a validator is getting activated, the validator id is temporary null, so it has the 32 ETH
    const nonNullValidatorIds: number[] = validatorData.data.map((v: ValidatorBasicData) => v.validatorindex).filter(id => id != null)
    const nullValidatorsDataResponse: ValidatorDataResponse[] = validatorData.data.filter((v: ValidatorBasicData) => v.validatorindex == null).map((v: ValidatorBasicData) => generateValidatorDataForActivatingValidators(v))
    
    // If there are more than 100 validators this will fail.
    const responses = await fetch(`${VALIDATOR_DATA_BASE_URL}${nonNullValidatorIds.join(",")}`)
    const jsons = await responses.json()
    // const responses = await Promise.all(nonNullValidatorIds.map(id => fetch(`${VALIDATOR_DATA_BASE_URL}${id}`)))
    // const jsons: ValidatorDataResponse[] = await Promise.all(responses.map(r => r.json()))
    const nonNullValidatorsData = jsons.data
    const nullValidatorsData = nullValidatorsDataResponse.map((v: ValidatorDataResponse) => v.data)
    const validatorsData = nonNullValidatorsData.concat(nullValidatorsData)

    
    return validatorsData
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
export function getBeaconChainEpoch(epoch: string = "finalized"): Promise<IEpochResponse> {
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

export async function getIncomeDetailHistory(indexes: number[], firstEpoch: number, lastEpoch: number): Promise<IIncomeDetailHistoryResponse> {
    if(lastEpoch - firstEpoch > 100) throw new Error("Max limit is 100")
    const validatorsUrl = VALIDATOR_INCOME_DETAIL_HISTORY_URL
        .replace("{indexes}", indexes.join(","))
        .replace("{limit}", (lastEpoch - firstEpoch).toString())
        .replace("{latest_epoch}", lastEpoch.toString())
    return (await fetch(validatorsUrl)).json()
    // let queryEpoch = lastEpoch
    // const output: IIncomeDetailHistoryResponse = {
    //     status: "OK",
    //     data: []
    // }
    // while(queryEpoch > firstEpoch) {
    //     const epochIDHUrl = validatorsUrl.replace("{latest_epoch}", queryEpoch.toString())
    //     const idhResponse: IIncomeDetailHistoryResponse = await (await fetch(epochIDHUrl)).json()
    //     if(idhResponse.status !== "OK") {
    //         output.status = idhResponse.status
    //     }
    //     output.data.push(...idhResponse.data)
    //     queryEpoch -= 100
    // }
    // output.data.sort((data1: IIncomeDetailHistoryData, data2: IIncomeDetailHistoryData) => {
    //     if(data1.validatorindex === data2.validatorindex) {
    //         return data1.epoch - data2.epoch
    //     }
    //     return data1.validatorindex - data2.validatorindex
    // })
    // return output
}

export async function  getValidatorsIncomeDetailHistory(indexes: number[], firstEpoch: number, lastEpoch: number): Promise<Record<number, MiniIDHReport>> {
    const validatorsUrl = VALIDATOR_INCOME_DETAIL_HISTORY_URL.replace("{indexes}", indexes.join(",")).replace("{limit}", "100")
    let output: Record<number, MiniIDHReport> = {}
    indexes.forEach((index: number) => {
        output[index] = {
            lastCheckedEpoch: lastEpoch + 1,
            rewards: 0n,
            penalties: 0n,
            penaltiesCount: 0,
        }
    })

    let queryEpoch = lastEpoch
    while(queryEpoch > firstEpoch) {
        const epochIDHUrl = validatorsUrl.replace("{latest_epoch}", queryEpoch.toString())
        console.log("Getting IDH", epochIDHUrl)
        const idhResponse: IIncomeDetailHistoryResponse = await (await fetch(epochIDHUrl)).json()
        output = await processIDHResponse(output, idhResponse, firstEpoch)
        queryEpoch -= 100
    }

    return output
}

export async function getValidatorsIncomeDetailHistoryCount(indexes: number[], firstEpoch: number, lastEpoch: number): Promise<Record<number, number>> {
    const validatorsUrl = VALIDATOR_INCOME_DETAIL_HISTORY_URL.replace("{indexes}", indexes.join(","))
    let penaltiesAmount: Record<number, number> = {}
    indexes.forEach((index: number) => {
        penaltiesAmount[index] = 0
    })

    let queryEpoch = lastEpoch
    while(queryEpoch > firstEpoch) {
        const epochIDHUrl = validatorsUrl.replace("{latest_epoch}", queryEpoch.toString())
        const idhResponse: IIncomeDetailHistoryResponse = await (await fetch(epochIDHUrl)).json()
        penaltiesAmount = await countTotalPenalties(penaltiesAmount, idhResponse, firstEpoch)
        queryEpoch -= 100
    }

    return penaltiesAmount
}

async function processIDHResponse(output: Record<string|number, MiniIDHReport>, idhResponse: IIncomeDetailHistoryResponse, firstEpoch: number): Promise<Record<string|number, MiniIDHReport>> {
    if(idhResponse.data === null) throw new Error(idhResponse.status)
    if(!idhResponse || !idhResponse.data) return output // If you request epochs which wasn't validating returns empty array
    const errorMessages: string[] = []
    idhResponse.data.forEach((data: IIncomeDetailHistoryData) => {
        if(data.epoch < firstEpoch) return
        const validatorIDH = output[data.validatorindex]

        const incomeResponseProperties = Object.keys(data.income)
        const isIncluded = incomeResponseProperties.some((e: string) => INCOME_DATA_KEYS.includes(e))
        if(!isIncluded && incomeResponseProperties.length > 0) {
            const message = `Response contains keys not managed by bot. Either a reward or a penalty may be overlooked. Expected keys:${INCOME_DATA_KEYS}. Response: ${incomeResponseProperties}`
            errorMessages.push(message)
            throw new Error(message)
        }
        validatorIDH.lastCheckedEpoch--
        validatorIDH.rewards += sumRewards(data.income)
        validatorIDH.penalties += sumPenalties(data.income)
        validatorIDH.penaltiesCount += countPenalties(data.income)

        output[data.validatorindex] = {...validatorIDH}
    })
    return output
}

async function countTotalPenalties(output: Record<string|number, number>, idhResponse: IIncomeDetailHistoryResponse, firstEpoch: number): Promise<Record<string|number, any>> {
    if(!idhResponse || !idhResponse.data) return output
    const errorMessages: string[] = []
    idhResponse.data.forEach((data: IIncomeDetailHistoryData) => {
        if(data.epoch < firstEpoch) return
        const validatorIDH = output[data.validatorindex]

        const incomeResponseProperties = Object.keys(data.income)
        const isIncluded = incomeResponseProperties.some((e: string) => INCOME_DATA_KEYS.includes(e))
        if(!isIncluded && incomeResponseProperties.length > 0) {
            const message = `Response contains keys not managed by bot. Either a reward or a penalty may be overlooked. Expected keys:${INCOME_DATA_KEYS}. Response: ${incomeResponseProperties}`
            errorMessages.push(message)
            throw new Error(message)
        }

        const penaltiesInData = countPenalties(data.income)
        output[data.validatorindex] = output[data.validatorindex] + penaltiesInData
    })
    return output
}

export function sumRewards(data: IIncomeData): bigint {
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

export function sumPenalties(data: IIncomeData): bigint {
    return BigInt((data.attestation_source_penalty || 0) + ZEROS_9)
        + BigInt((data.attestation_target_penalty || 0) + ZEROS_9)
        + BigInt((data.finality_delay_penalty || 0) + ZEROS_9)
        + BigInt((data.slashing_penalty || 0) + ZEROS_9)
        + BigInt((data.sync_committee_penalty || 0) + ZEROS_9)
}

function countPenalties(data: IIncomeData): number {
    let penalties = 0
    if(data.attestation_source_penalty) penalties++
    if(data.attestation_target_penalty) penalties++
    if(data.finality_delay_penalty) penalties++
    if(data.slashing_penalty) penalties++
    if(data.sync_committee_penalty) penalties++
    return penalties
}