import { ethers } from 'ethers'
import { ValidatorDataResponse } from '../../services/beaconcha/beaconcha'
import depositData from '../../validator_data/deposit_data-1677016004.json'
import { Balances, ETH_32, getBalances } from '../activateValidator'
import { EMPTY_MAIL_REPORT, IMailReportHelper as IMailReportHelper, Severity } from '../../entities/emailUtils'
import { WithdrawContract } from '../../ethereum/withdraw'
import { beaconChainData, globalPersistentData, stakingContract } from '../heartbeat'
import { etow } from '../../utils/numberUtils'

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

export async function alertCreateValidators(): Promise<IMailReportHelper> {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: "alertCreateValidators"}
    console.log("Getting validators data")
    const validatorsData: ValidatorDataResponse[] = beaconChainData.validatorsData

    const validatorsQtyByType = beaconChainData.validatorsStatusesQty
    const activatedValidatorsAmount = validatorsData.length
    // const activatedValidatorsAmount = validatorsQtyByType[PossibleValidatorStatuses.ACTIVE_ONLINE]

    const createdValidatorsAmount = depositData.length
    const validatorsToActivateLeft = createdValidatorsAmount - activatedValidatorsAmount
    globalPersistentData.createdValidatorsLeft = validatorsToActivateLeft
    // saveJSON(globalPersistentData)
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

export async function getDeactivateValidatorsReport(): Promise<IMailReportHelper> {
    const functionName = "getDeactivateValidatorsReport"
    try {
        const withdrawContract = new WithdrawContract()
        const currentEpoch = await withdrawContract.getEpoch()
        
        const output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: functionName}
        const balances: Balances = await getBalances()

        const balancesBody = `
            Staking balance: ${ethers.formatEther(balances.staking)} ETH
            Withdraw balance: ${ethers.formatEther(balances.withdrawBalance)} ETH
            Liq available balance: ${ethers.formatEther(balances.liqAvailableEthForValidators)} ETH
            Total pending withdraw: ${ethers.formatEther(balances.totalPendingWithdraw)} ETH
        `
        // Epoch hasn't change, so there is nothing to do
        if(currentEpoch === globalPersistentData.delayedUnstakeEpoch) {
            return {
                ...output,
                ok: true, 
                body: `Epoch hasn't changed so there is nothing to do
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
        
        const withdrawAvailableEthForValidators = balances.withdrawBalance - balances.totalPendingWithdraw
        if(withdrawAvailableEthForValidators > 0) {
            return {
                ...output,
                ok: true, 
                body: `Withdraw contract has enough to cover for delayed unstake.
            ${balancesBody}
            ${epochInfoBody}`,
                severity: Severity.OK
            }
        } // Check if withdraw balance is enough to cover

        const neededWei = balances.totalPendingWithdraw - (balances.staking + balances.withdrawBalance)
        const neededEth = Number(ethers.formatEther(neededWei.toString()))
        if(neededEth <= 0) {
            return {
                ...output,
                ok: true, 
                body: `Staking and withdraw contracts have enough ETH to cover for delayed unstake.
                ${balancesBody}
                ${epochInfoBody}`,
                severity: Severity.OK
            }
        } // Check if staking with withdraw are enough to cover

        const liqAvailableEthForValidators = Number(ethers.formatEther(balances.liqAvailableEthForValidators.toString()))
        if(liqAvailableEthForValidators >= neededEth) {
            try {
                await stakingContract.requestEthFromLiquidPoolToWithdrawal(neededWei)
                return {
                    ...output,
                    ok: true, 
                    body: `Staking with withdraw and liquidity contracts have enough ETH to cover for delayed unstake.
                    ${balancesBody}
                    ${epochInfoBody}`,
                    severity: Severity.OK
                }
            } catch(err: any) {
                const message = `There was a problem moving eth from liq to withdraw ${err.message}`
                console.error(message)
                return {
                    ...output,
                    ok: false, 
                    body: `${message}.
                    ${balancesBody}
                    ${epochInfoBody}`,
                    severity: Severity.ERROR
                }
            }
            
        } // Staking with withdraw and liquidity are enough to cover

        // It is necessary to dissasemble at least one validator
        console.log("Calculating validators to disassemble")
        console.log("Needed eth", neededEth)
        console.log("Available eth from liq", liqAvailableEthForValidators)
        let validatorsToDissasemble = 0
        let ethToTransferFromLiq = neededEth
        while(ethToTransferFromLiq > liqAvailableEthForValidators) {
            validatorsToDissasemble++
            ethToTransferFromLiq -= 32
        }

        if(ethToTransferFromLiq > 0) {
            await stakingContract.requestEthFromLiquidPoolToWithdrawal(ethers.parseEther(ethToTransferFromLiq.toString()))
        }

        const vIndexes: string[] = getValidatorsRecommendedToBeDisassemled(validatorsToDissasemble)

        ethToTransferFromLiq = Math.max(0, ethToTransferFromLiq)
        const subject = "[IMPORTANT] Disassemble validators"
        const body = `
            VALIDATORS TO DISASSEMBLE: ${validatorsToDissasemble}
            ${balancesBody}
            ${epochInfoBody}
            Needed ETH: ${neededEth}
            ETH provided from liq: ${ethToTransferFromLiq}
            Recommended validators to disassemble: ${vIndexes.join(", ")}
        `
        return {
            ...output,
            ok: false, 
            subject,
            body,
            severity: Severity.IMPORTANT
        }
    } catch(err: any) {
        console.error("ERROR", err.message, err.stack)
        return {
            ok: false, 
            function: functionName,
            subject: "Disassemble validator error",
            body: `There was an error checking if a validator should be disassembled: ${err.message}`,
            severity: Severity.ERROR
        }
    }
}

function getValidatorsRecommendedToBeDisassemled(amount: number): string[] {
    const validatorsProposalsArray: [string, number][] = Object.keys(globalPersistentData.validatorsLatestProposal).map((validatorIndex: string) => {
        return [validatorIndex, globalPersistentData.validatorsLatestProposal[Number(validatorIndex)]]
    })

    validatorsProposalsArray.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    return validatorsProposalsArray.map((v: [string, number]) => v[0]).slice(0, amount)
}