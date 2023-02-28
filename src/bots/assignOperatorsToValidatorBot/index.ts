import { readFileSync, writeFileSync } from "fs"
import { ISharesKeyPairs, SSVKeys } from "ssv-keys"
import { ENV, getConfig as getEnv } from "../../entities/env"
import { registerValidator } from "../../ethereum/ssv"
import assignedOperatorsJson from "./assigned.json"
import groups from "./groups.json"
import operators from "./operators.json"

interface AssignedOperatorsData {
    ids: number[]
    pubkeys: string[]
}

interface Group {
    ids: number[]
}

interface Operator {
    id: number
    pubkey: string
}

const VALIDATORS_PER_GROUP = 4
const EXPECTED_ARGS = 1

// Call the corresponding ssv function to confirm the operators, sending the keyshare file
async function run() {
    // if(process.argv.length != 2 + EXPECTED_ARGS) throw new Error(`Should send ${EXPECTED_ARGS} parameters`)
    const operatorIds = getOperators()
    if(operatorIds.length != 4) throw new Error(`There should be 4 operators. ${operatorIds.length} found`)

    const operatorKeys = getOperatorsKeys(operatorIds)
    if(operatorKeys.length != 4) throw new Error(`There should be 4 operator keys. ${operatorKeys.length} found`)
    // console.log(operatorIds, operatorKeys)

    const ssvKeys = new SSVKeys()
    const env: ENV = getEnv()
    // const keystorePath = process.argv[2]
    const keystorePath = "/data/mnt/Juegos/Programacion/Workspaces/Proyectos/metapool/meta-pool-ssv-bots/dist/validator_keys/keystore-m_12381_3600_0_0_0-1677015951.json"
    const keystore = JSON.parse(await readFileSync(keystorePath, "utf-8"))
    const privateKey = await ssvKeys.getPrivateKeyFromKeystoreData(keystore, env.KEYSTORE_PASSWORD)

    const threshold: ISharesKeyPairs = await ssvKeys.createThreshold(privateKey, operatorIds)
    const shares = await ssvKeys.encryptShares(operatorKeys.map((o: Operator) => o.pubkey), threshold.shares)

    // const payload = await ssvKeys.buildPayload(
    //     threshold.validatorPublicKey,
    //     operatorIds,
    //     shares,
    //     0
    // )
    // console.log(payload)

    // await registerValidator(threshold.validatorPublicKey, operatorIds, operatorKeys, shares, 0)

    let groupAlreadyAssigned = false
    for(let i = 0; i < assignedOperatorsJson.length; i++) {
        const operatorsWithValidators = assignedOperatorsJson[i]
        // @ts-ignore
        if(operatorsWithValidators.ids.sort().join(",") === operatorIds.sort().join(",")) {
            groupAlreadyAssigned = true
            console.log("Group already assigned")
            // @ts-ignore
            operatorsWithValidators.pubkeys.push(threshold.validatorPublicKey)
            break
        }
    }
    if(!groupAlreadyAssigned) {
        // @ts-ignore
        assignedOperatorsJson.push({
            ids: operatorIds,
            pubkeys: [threshold.validatorPublicKey]
        })
    }
    // console.log(__dirname)
    await writeFileSync(__dirname + "/assigned.json", JSON.stringify(assignedOperatorsJson))


}

function getOperators() {
    const operatorsData: AssignedOperatorsData[] = Array.from(assignedOperatorsJson) as AssignedOperatorsData[]
    const totalActivatedValidators = operatorsData.reduce((activatedValidators: number, d: AssignedOperatorsData) => {
        return activatedValidators + d.pubkeys.length
    }, 0)

    const nextGroupIndex = Math.floor(totalActivatedValidators / VALIDATORS_PER_GROUP)
    return groups[nextGroupIndex].ids
}

function getOperatorsKeys(operatorsIds: number[]) {
    return operators.filter((o: Operator) => operatorsIds.includes(o.id))
}

// function getRegisterPayload: Promise<

run()