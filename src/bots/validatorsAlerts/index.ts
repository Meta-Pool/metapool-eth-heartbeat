import { ethers } from 'ethers'
import { ValidatorDataResponse } from '../../services/beaconcha/beaconcha'
import depositData from '../../validator_data/deposit_data-1677016004.json'
import { Balances, ETH_32, getBalances } from '../activateValidator'
import { EMPTY_DAILY_REPORT as EMPTY_MAIL_REPORT, IDailyReportHelper, Severity } from '../../entities/emailUtils'
import { WithdrawContract } from '../../ethereum/withdraw'
import { globalPersistentData } from '../heartbeat'
import { saveJSON } from '../heartbeat/save-load-JSON'
import { beaconChainData } from '../../services/beaconcha/beaconchaHelper'

const THRESHOLD: number = 5

enum PossibleValidatorStatuses {
    ACTIVE_ONLINE = "active_online",
    ACTIVE_OFFLINE = "active_offline",
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
    let output: IDailyReportHelper = {...EMPTY_MAIL_REPORT, function: "alertCreateValidators"}
    console.log("Getting validators data")
    const validatorsData: ValidatorDataResponse[] = beaconChainData.validatorsData

    const validatorsQtyByType = getValidatorsQtyByType(validatorsData)
    const activatedValidatorsAmount = validatorsData.length
    // const activatedValidatorsAmount = validatorsQtyByType[PossibleValidatorStatuses.ACTIVE_ONLINE]

    const createdValidatorsAmount = depositData.length
    const validatorsToActivateLeft = createdValidatorsAmount - activatedValidatorsAmount
    globalPersistentData.createdValidatorsLeft = validatorsToActivateLeft
    saveJSON(globalPersistentData)
    output.body = `
            Created validators: ${createdValidatorsAmount}. 
            Activated validators: ${activatedValidatorsAmount}. 
            Validators left to activate: ${validatorsToActivateLeft}.
            ${Object.keys(validatorsQtyByType).map((type: string) => `${type.toUpperCase()}: ${validatorsQtyByType[type]}.`)
                .join("\n            ")}
        `

    console.log("Should send alert?", validatorsToActivateLeft <= THRESHOLD)
    if(validatorsToActivateLeft <= THRESHOLD) {
        // Send alert to create new validators if we have less than threshold
        console.log("Sending email alerting to create new validators")
        output.ok = false
        output.subject = "Create new validators"
        output.body = `CREATE NEW VALIDATORS ${output.body}`
        output.severity = Severity.IMPORTANT
        return output
    } 
    
    output.ok = true
    output.subject = "No need to create new validators"
    output.severity = Severity.OK
    return output
    
}

export async function getDeactivateValidatorsReport(): Promise<IDailyReportHelper> {
    const withdrawContract = new WithdrawContract()
    const currentEpoch = await withdrawContract.getEpoch()
    if(!globalPersistentData.delayedUnstakeEpoch) {
        globalPersistentData.delayedUnstakeEpoch = currentEpoch
    }
    const functionName = "getDeactivateValidatorsReport"
    const output: IDailyReportHelper = {...EMPTY_MAIL_REPORT, function: functionName}
    const balances: Balances = await getBalances()

    const balancesBody = `
        Staking balance: ${ethers.formatEther(balances.staking)} ETH
        Withdraw balance: ${ethers.formatEther(balances.withdrawBalance)} ETH
        Total pending withdraw: ${ethers.formatEther(balances.totalPendingWithdraw)} ETH
    `
    // Epoch hasn't change, so there is nothing to do
    if(currentEpoch === globalPersistentData.delayedUnstakeEpoch) {
        return {
            ...output,
            ok: true, 
            body: `Withdraw contract has enough to cover for delayed unstake.
         ${balancesBody}`,
            severity: Severity.OK
        }   
    }

    // Epoch went backwards. This error should never happen
    if(currentEpoch < globalPersistentData.delayedUnstakeEpoch) {
        return {
            ...output,
            ok: false, 
            subject: "Withdrawal epoch backwards", 
            body: `Withdraw contract went backwards from epoch ${globalPersistentData.delayedUnstakeEpoch} to ${currentEpoch}`,
            severity: Severity.ERROR
        }   
    }
    // Update epoch
    const previousEpoch = globalPersistentData.delayedUnstakeEpoch
    globalPersistentData.delayedUnstakeEpoch = currentEpoch

    const epochInfoBody = `
        Previous epoch: ${previousEpoch}
        Current epoch: ${currentEpoch}
    `

    // Witdraw balance is enough to cover    
    if(balances.ethAvailableForStakingInWithdraw > 0) {
        return {
            ...output,
            ok: true, 
            body: `Withdraw contract has enough to cover for delayed unstake.
         ${balancesBody}
         ${epochInfoBody}`,
            severity: Severity.OK
        }
    }

    const neededWei = balances.totalPendingWithdraw - (balances.staking + balances.withdrawBalance)
    const neededEth = Number(ethers.formatEther(neededWei.toString()))
    // Staking with withdraw are enough to cover
    if(neededEth <= 0) {
        return {
            ...output,
            ok: true, 
            body: `Staking and withdraw contracts have enough ETH to cover for delayed unstake.
            ${balancesBody}
            ${epochInfoBody}`,
            severity: Severity.OK
        }
    }

    console.log("Calculating validators to disassemble")
    console.log("Needed eth", neededEth)
    const validatorsQtyToDisassemble = Math.ceil(neededEth / 32)

    const subject = "[IMPORTANT] Disassemble validators"
    const body = `
        ${balancesBody}
        ${epochInfoBody}
        Needed ETH: ${neededEth}
        Validators to disassemble: ${validatorsQtyToDisassemble}
    `

    // sendEmail(subject, balancesBody)
    return {
        ...output,
        ok: false, 
        subject,
        body,
        severity: Severity.IMPORTANT
    }
}