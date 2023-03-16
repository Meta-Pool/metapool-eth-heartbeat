import { readFileSync, writeFileSync } from "fs"
import { SsvContract } from "../../ethereum/ssv"
import { generateKeyshare } from "../commons/commons"
import groups from "./groups.json"
import operators from "./operators.json"

export interface AssignedOperatorsData {
    ids: number[]
    validators_data: ValidatorsData[]
}

export interface ValidatorsData {
    pubkey: string
    keystore_file_name: string
}

export interface Operator {
    id: number
    pubkey: string
}

const VALIDATORS_PER_GROUP = 4
const EXPECTED_ARGS = 1

// Call the corresponding ssv function to confirm the operators, sending the keyshare file
async function run() {
    if(process.argv.length != 2 + EXPECTED_ARGS) throw new Error(`Should send ${EXPECTED_ARGS} parameters`)
    const keystorePath = process.argv[2]

    const operator: Operator[] = await getOperators()
    let operatorIds: number[] = operator.map((o: Operator) => o.id)
    if(operatorIds.length != 4) throw new Error(`There should be 4 operators. ${operatorIds.length} found`)

    const operatorKeys = getOperatorsKeys(operatorIds)
    if(operatorKeys.length != 4) throw new Error(`There should be 4 operator keys. ${operatorKeys.length} found`)    
    
    console.log("Generating keyshare")
    const keyshare = await generateKeyshare(keystorePath, operatorIds, operatorKeys)
    const validatorPublicKey = keyshare[0]
    
    const ssvContract = new SsvContract()
    let operatorsInValidator = await ssvContract.getOperatorsByValidator(validatorPublicKey)
    console.log(operatorsInValidator)
    console.log(operatorIds)
    if([...operatorsInValidator].sort().join(",") !== [...operatorIds].sort().join(",")) {
        console.log("Assigning group")
        if(operatorsInValidator.length) {
            console.log("Updating")
            await ssvContract.updateValidator(keyshare[0], keyshare[1], keyshare[2], keyshare[3], keyshare[4])
        } else {
            console.log("Registering")
            await ssvContract.registerValidator(keyshare[0], keyshare[1], keyshare[2], keyshare[3], keyshare[4])
        }
    } else {
        console.log("Group unchanged")
    }
    console.log("Assigning operators to validator")
    await registerAssignedValidator(operatorIds, validatorPublicKey, keystorePath)

}

async function getOperators(): Promise<Operator[]> {
    const operatorsData: AssignedOperatorsData[] = await readAssignedOperators()
    const totalActivatedValidators = operatorsData.reduce((activatedValidators: number, d: AssignedOperatorsData) => {
        return activatedValidators + d.validators_data.length
    }, 0)

    const nextGroupIndex = Math.floor(totalActivatedValidators / VALIDATORS_PER_GROUP)
    const operatorsIndexes = groups[nextGroupIndex].indexes
    
    return operators.filter((_: Operator, index: number) => operatorsIndexes.includes(index))
}

function getOperatorsKeys(operatorsIds: number[]) {
    return operators.filter((o: Operator) => operatorsIds.includes(o.id))
}

async function registerAssignedValidator(operatorIds: number[], validatorPubkey: string, keystoreFilename: string) {
    const assignedOperatorsJson: AssignedOperatorsData[] = await readAssignedOperators()
    console.log(`There are ${assignedOperatorsJson.length} assigned operator groups so far`)
    let groupAlreadyAssigned = false
    for(let i = 0; i < assignedOperatorsJson.length; i++) {
        let operatorsWithValidators = assignedOperatorsJson[i]
        // @ts-ignore
        if(operatorsWithValidators.ids.sort().join(",") === operatorIds.sort().join(",")) {
            groupAlreadyAssigned = true
            console.log("Group already assigned")
            // @ts-ignore
            operatorsWithValidators.validators_data.push({
                pubkey: validatorPubkey,
                keystore_file_name: keystoreFilename
            })
            break
        }
    }
    if(!groupAlreadyAssigned) {

        // @ts-ignore
        assignedOperatorsJson.push({
            ids: operatorIds,
            validators_data: [{
                pubkey: validatorPubkey,
                keystore_file_name: keystoreFilename
            }]
        })
    }
    await writeFileSync("assigned.json", JSON.stringify(assignedOperatorsJson))
}

async function readAssignedOperators(): Promise<AssignedOperatorsData[]> {
    const assignedOperators = await readFileSync("assigned.json")
    return JSON.parse(assignedOperators.toString())
}

run()