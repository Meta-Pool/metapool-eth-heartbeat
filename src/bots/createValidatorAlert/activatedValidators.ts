import { getValidatorsData } from "../../services/beaconcha/beaconcha"


// This file feeds a bash script, so the only console.log that should remain is the one returned by the function run.
async function run() {
    const validatorsData = await getValidatorsData()
    return validatorsData.length
}

run().then(l => console.log(l))
