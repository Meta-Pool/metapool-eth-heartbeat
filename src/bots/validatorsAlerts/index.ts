import { ethers } from 'ethers'
import { ENV, getEnv } from '../../entities/env'
import { ValidatorDataResponse, getValidatorsData } from '../../services/beaconcha/beaconcha'
import { sendEmail } from '../../utils/mailUtils'
import depositData from '../../validator_data/deposit_data-1677016004.json'
import { Balances, ETH_32, getBalances } from '../activateValidator'
import { EMPTY_DAILY_REPORT, IDailyReportHelper, Severity } from '../../entities/emailUtils'

const THRESHOLD: number = 5

enum PossibleValidatorStatuses {
    ACTIVE_ONLINE = "active_online",
    EXITED = "exited"
}

function getValidatorsQtyByType(validators: ValidatorDataResponse[]) {
    let qty: { [key: string]: number } = {}
    
    Object.values(PossibleValidatorStatuses).forEach((v: string) => {
        qty[v] = 0
    })

    validators.forEach((v: ValidatorDataResponse) => {
        if(!v.data.status) return
        qty[v.data.status] += 1
    })

    return qty
}

export async function alertCreateValidators(): Promise<IDailyReportHelper> {
    let output: IDailyReportHelper = {...EMPTY_DAILY_REPORT, function: "alertCreateValidators"}
    console.log("Getting validators data")
    const validatorsData: ValidatorDataResponse[] = await getValidatorsData()

    const validatorsQtyByType = getValidatorsQtyByType(validatorsData)
    // const activatedValidatorsAmount = validatorsData.length
    const activatedValidatorsAmount = validatorsQtyByType[PossibleValidatorStatuses.ACTIVE_ONLINE]

    const createdValidatorsAmount = depositData.length
    console.log("Should send alert?", createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD)
    if(createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD) {
        // Send alert to create new validators if we have less than threshold
        console.log("Sending email alerting to create new validators")
        output.ok = false
        output.subject = "Create new validators"
        output.body = `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
        output.severity = Severity.IMPORTANT
        return output
    } 
    
    output.ok = true
    output.subject = "No need to create new validators"
    output.body = `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
    output.severity = Severity.OK
    return output
    
}

export async function getDeactivateValidatorsReport(): Promise<IDailyReportHelper> {
    const functionName = "getDeactivateValidatorsReport"
    // TODO validate close to withdraw date
    const balances: Balances = await getBalances()

    const balancesBody = `
        Staking balance: ${balances.staking}
        Withdraw balance: ${balances.withdrawBalance}
        Total pending withdraw: ${balances.totalPendingWithdraw}
    `

    if(balances.ethAvailableForStakingInWithdraw > 0) {
        return {
            ok: true, 
            function: functionName,
            subject: "",
            body: `Withdraw contract has enough to cover for delayed unstake.
         ${balancesBody}`,
            severity: 0
        }
    }

    const neededWei = balances.totalPendingWithdraw - (balances.staking + balances.withdrawBalance)
    const neededEth = Number(ethers.formatEther(neededWei.toString()))
    if(neededEth === 0) {
        return {
            ok: true, 
            function: functionName,
            subject: "",
            body: `Staking and withdraw contracts have enough ETH to cover for delayed unstake.
            ${balancesBody}`,
            severity: 0
        }
    }

    console.log("Calculating validators to disassemble")
    console.log("Needed eth", neededEth)
    const validatorsQtyToDisassemble = Math.ceil(neededEth / 32)

    const subject = "[IMPORTANT] Disassemble validators"
    const body = `
        ${balancesBody}
        Needed ETH: ${neededEth}
        Validators to disassemble: ${validatorsQtyToDisassemble}
    `

    sendEmail(subject, balancesBody)
    return {
        ok: false, 
        function: functionName,
        subject,
        body,
        severity: 1
    }
}