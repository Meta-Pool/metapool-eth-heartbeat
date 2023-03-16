import { getConfig } from "../../ethereum/config"

const VALIDATOR_ID_FINDER_BASE_URL = "https://prater.beaconcha.in/api/v1/validator/eth1/"
const VALIDATOR_DATA_BASE_URL = "https://prater.beaconcha.in/api/v1/validator/"

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
    data: ValidatorData[]
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
        data: [{
            effectivebalance: 32000000000,
            balance: 32000000000,
            pubkey: basicData.publickey
        }]
    }
}