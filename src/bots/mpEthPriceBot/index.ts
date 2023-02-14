import { DeployerDataResponse, getValidatorsData, ValidatorDataResponse } from "../../services/beaconcha/beaconcha"


async function run() {
    // const validatorsDataResponse = await fetch(`${VALIDATOR_ID_FINDER_BASE_URL}${DEPLOYER_ACCOUNT}`)
    const validatorDataArray: ValidatorDataResponse[] = await getValidatorsData()

    
    console.log(validatorDataArray)
    const balances: number[] = validatorDataArray.map((v: ValidatorDataResponse) => v.data.balance)
    const totalBalance = balances.reduce((p: number, c: number) => p + c, 0)
    console.log("Total balance", totalBalance)

    // This is wrong. We should take the following value from the contract
    const mpEthTotalSupply = 32000000000

    const metaEthPrice = totalBalance / mpEthTotalSupply
    console.log("Meth price", metaEthPrice)
}

run()