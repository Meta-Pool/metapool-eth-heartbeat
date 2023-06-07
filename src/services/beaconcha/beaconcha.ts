import { isDebug } from "../../bots/heartbeat"
import { getConfig } from "../../ethereum/config"
import { IValidatorProposal } from "./entities"

const BASE_URL = "https://prater.beaconcha.in/api/v1/"
const VALIDATOR_ID_FINDER_BASE_URL = BASE_URL + "validator/eth1/"
const VALIDATOR_DATA_BASE_URL = BASE_URL + "validator/"

const VALIDATOR_HISTORY_URL = BASE_URL + "validator/{index_or_pubkey}/balancehistory"

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

export interface IEpochResponse {
    status: string
    data: IEpochData
}

export interface IEpochData {
    attestationscount: number
    attesterslashingscount: number
    averagevalidatorbalance: number
    blockscount: number
    depositscount: number
    eligibleether: number
    epoch: number
    finalized: boolean
    globalparticipationrate: number
    missedblocks: number
    orphanedblocks: number
    proposedblocks: number
    proposerslashingscount: number
    rewards_exported: boolean
    scheduledblocks: number
    totalvalidatorbalance: number
    ts: string
    validatorscount: number
    voluntaryexitscount: number
    votedether: number
    withdrawalcount: number
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
            pubkey: basicData.publickey
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
export function getEpoch(epoch: string): Promise<any> {
    const url = BASE_URL + "epoch/" + epoch
    return fetch(url).then(r => r.json().then(json => json.data))
}

export function getValidatorProposal(validatorIndex: number): Promise<IValidatorProposal> {
    const url = BASE_URL + `validator/${validatorIndex}/proposals`
    if(isDebug) console.log("Validator proposal url", url)
    return fetch(url).then(r => r.json())
}