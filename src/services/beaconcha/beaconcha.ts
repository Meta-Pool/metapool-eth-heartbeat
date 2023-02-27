const VALIDATOR_ID_FINDER_BASE_URL = "https://prater.beaconcha.in/api/v1/validator/eth1/"
const VALIDATOR_DATA_BASE_URL = "https://prater.beaconcha.in/api/v1/validator/"

const DEPLOYER_ACCOUNT = "0x6f740267703D5E91F3a6937679c1d7Cb4b430a0F"

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
    activationeligibilityepoch: number
    activationepoch: number
    balance: number
    effectivebalance: number
    exitepoch: number
    lastattestationslot: number
    name: string | null
    pubkey: string
    slashed: boolean
    status: string
    validatorindex: number
    withdrawableepoch: number
    withdrawalcredentials: string
}

export async function getValidatorsData(): Promise<ValidatorDataResponse[]> {
    const validatorsDataResponse = await fetch(`${VALIDATOR_ID_FINDER_BASE_URL}${DEPLOYER_ACCOUNT}`)
    const validatorData: DeployerDataResponse = await validatorsDataResponse.json()

    const validatorIds: number[] = validatorData.data.map((v: ValidatorBasicData) => v.validatorindex)
    const responses = await Promise.all(validatorIds.map(id => fetch(`${VALIDATOR_DATA_BASE_URL}${id}`)))
    const jsons: ValidatorDataResponse[] = await Promise.all(responses.map(r => r.json()))

    return jsons
}