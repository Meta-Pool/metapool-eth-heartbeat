import { readFileSync } from "fs"
import { ValidatorData } from "../../services/beaconcha/beaconcha"
import { AssignedOperatorsData, Operator, ValidatorsData } from "../assignOperatorsToValidator"
import operators from "../assignOperatorsToValidator/operators.json"
import { generateKeyshare } from "../commons/commons"

async function run(){
    if(process.argv.length != 4) throw new Error("Should have 2 extra parameters")
    const badOperatorId: number = Number(process.argv[2])
    const goodOperatorId: number = Number(process.argv[3])


    const assignedOperatorsArray: AssignedOperatorsData[] = JSON.parse((await readFileSync("assigned.json")).toString())
    const assignedOperatorsWithBadOperator: AssignedOperatorsData[] = assignedOperatorsArray.filter((assignedOperators: AssignedOperatorsData) => {
        return assignedOperators.ids.includes(badOperatorId)
    })

    const allKeysharesPromises = assignedOperatorsWithBadOperator.map(async (o: AssignedOperatorsData) => {
        const badIndex = o.ids.indexOf(badOperatorId)
        o.ids.splice(badIndex, 1)
        o.ids.push(goodOperatorId)
        const operatorsKeys: Operator[] = operators.filter((op: Operator) => o.ids.includes(op.id))
        const keyshares = o.validators_data.map(async (v: ValidatorsData) => {
            const keyShare = await generateKeyshare(v.keystore_file_name, o.ids, operatorsKeys)
            return keyShare
        })
        return keyshares
    })
    const allKeyshares = await Promise.all((await Promise.all(allKeysharesPromises)).flat())
    console.log(allKeyshares)
    

}

run().catch(err => console.error(err.message))