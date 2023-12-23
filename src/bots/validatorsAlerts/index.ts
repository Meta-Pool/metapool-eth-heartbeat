import { ethers } from 'ethers'
import { ValidatorData, getProposalLuck, getValidatorsData } from '../../services/beaconcha/beaconcha'
import depositData from '../../validator_data/deposit_data-1677016004.json'
import { Balances, getBalances, getDepositData } from '../activateValidator'
import { EMPTY_MAIL_REPORT, IMailReportHelper as IMailReportHelper, Severity } from '../../entities/emailUtils'
import { WithdrawContract } from '../../crypto/withdraw'
import { globalBeaconChainData, globalPersistentData, sleep, stakingContract } from '../heartbeat'
import { getValidatorData } from '../../services/beaconcha/beaconchaHelper'
import { ZEROS_9 } from '../nodesBalance'
import { wtoe } from '../../utils/numberUtils'
import { getConfig } from '../../crypto/config'
import { encrypt } from '../../utils/encryptUtils'
import { ILuckResponse } from '../../entities/beaconcha/validator'

const THRESHOLD: number = 5

enum PossibleValidatorStatuses {
    ACTIVE_ONLINE = "active_online",
    ACTIVE_OFFLINE = "active_offline",
    EXITED = "exited"
}

// function getValidatorsQtyByType(validators: ValidatorDataResponse[]) {
//     let qty: { [key: string]: number } = {}

//     Object.values(PossibleValidatorStatuses).forEach((v: string) => {
//         qty[v] = 0
//     })

//     validators.forEach((v: ValidatorDataResponse) => {
//         if(!v.data.status) return
//         qty[v.data.status] += 1
//     })

//     return qty
// }

export function alertCreateValidators(): IMailReportHelper {
    let output: IMailReportHelper = { ...EMPTY_MAIL_REPORT, function: "alertCreateValidators" }
    console.log("Getting validators data")
    const validatorsData: ValidatorData[] = globalBeaconChainData.validatorsData

    const validatorsQtyByType = globalBeaconChainData.validatorsStatusesQty
    const activatedValidatorsAmount = validatorsData.length
    // const activatedValidatorsAmount = validatorsQtyByType[PossibleValidatorStatuses.ACTIVE_ONLINE]

    const createdValidatorsAmount = getDepositData().length
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
    if (validatorsToActivateLeft <= THRESHOLD) {
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

        const output: IMailReportHelper = { ...EMPTY_MAIL_REPORT, function: functionName }
        const balances: Balances = await getBalances()

        const balancesBody = `
            Staking balance: ${ethers.formatEther(balances.staking)} ETH
            Withdraw balance: ${ethers.formatEther(balances.withdrawBalance)} ETH
            Liq available balance: ${ethers.formatEther(balances.liqAvailableEthForValidators)} ETH
            Total pending withdraw: ${ethers.formatEther(balances.totalPendingWithdraw)} ETH
        `
        // Epoch hasn't change, so there is nothing to do
        if (currentEpoch === globalPersistentData.delayedUnstakeEpoch) {
            return {
                ...output,
                ok: true,
                body: `Epoch hasn't changed so there is nothing to do
            ${balancesBody}`,
                severity: Severity.OK
            }
        }

        // Epoch went backwards. This error should never happen
        if (currentEpoch < globalPersistentData.delayedUnstakeEpoch) {
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
        const validatorsdata = await getValidatorsData()
        const exitedValidators = validatorsdata.filter((validator: ValidatorData) => {
            return validator.status === "exited"
        })
        // Status exited means it is not validating
        // In the meantime, a validator may still have balance, which will be used for delayed unstakes
        const exitedValidatorsBalance = exitedValidators.reduce((exitedValidatorsBalance: bigint, currValidator: ValidatorData) => {
            return exitedValidatorsBalance + BigInt(currValidator.balance + ZEROS_9)
        }, 0n)
        console.log("Exiting validators balance", wtoe(exitedValidatorsBalance))

        const withdrawAvailableEthForValidators = balances.withdrawBalance - balances.totalPendingWithdraw + exitedValidatorsBalance
        if (withdrawAvailableEthForValidators > 0) {            
            return {
                ...output,
                ok: true,
                body: `Withdraw contract and exiting validators have enough to cover for delayed unstake.
            ${balancesBody}
            ${epochInfoBody}`,
                severity: Severity.OK
            }
        } // Check if withdraw balance is enough to cover

        const neededWei = balances.totalPendingWithdraw - (balances.staking + balances.withdrawBalance + exitedValidatorsBalance)
        const neededEth = Number(ethers.formatEther(neededWei.toString()))
        if (neededEth <= 0) {
            return {
                ...output,
                ok: true,
                body: `Staking, withdraw contracts and exiting validators have enough ETH to cover for delayed unstake.
                ${balancesBody}
                ${epochInfoBody}`,
                severity: Severity.OK
            }
        } // Check if staking with withdraw are enough to cover

        const liqAvailableEthForValidators = Number(ethers.formatEther(balances.liqAvailableEthForValidators.toString()))
        if (liqAvailableEthForValidators >= neededEth) {
            try {
                await stakingContract.requestEthFromLiquidPoolToWithdrawal(neededWei)
                return {
                    ...output,
                    ok: true,
                    body: `Staking with withdraw, liquidity contracts and exiting validators have enough ETH to cover for delayed unstake.
                    ${balancesBody}
                    ${epochInfoBody}`,
                    severity: Severity.OK
                }
            } catch (err: any) {
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

        // It is necessary to disassemble at least one validator
        console.log("Calculating validators to disassemble")
        console.log("Needed eth", neededEth)
        console.log("Available eth from liq", liqAvailableEthForValidators)
        let validatorsToDissasemble = 0
        let ethToTransferFromLiq = neededEth
        while (ethToTransferFromLiq > liqAvailableEthForValidators) {
            validatorsToDissasemble++
            ethToTransferFromLiq -= 32
        }

        if (ethToTransferFromLiq > 0) {
            await stakingContract.requestEthFromLiquidPoolToWithdrawal(ethers.parseEther(ethToTransferFromLiq.toString()))
        }

        const vIndexes: string[] = await getValidatorsRecommendedToBeDisassembled(validatorsToDissasemble)
        
        const dissasembleApiResponse = await callDissasembleApi(vIndexes)

        ethToTransferFromLiq = Math.max(0, ethToTransferFromLiq)
        const subject = "Disassemble validators"
        let body = `
            VALIDATORS TO DISASSEMBLE: ${validatorsToDissasemble}
            ${balancesBody}
            ${epochInfoBody}
            Needed ETH: ${neededEth}
            ETH provided from liq: ${ethToTransferFromLiq}
            Recommended validators to disassemble: ${vIndexes.join(", ")}
        `

        let severity: Severity
        if (dissasembleApiResponse.isSuccess) {
            severity = Severity.IMPORTANT
        } else {
            severity = Severity.ERROR
            body =
                `${dissasembleApiResponse.message}${body}`
        }
        return {
            ...output,
            ok: false,
            subject,
            body,
            severity,
        }
    } catch (err: any) {
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

export async function callDissasembleApi(vIndexes: string[]) {
    try {
        const config = getConfig()
        if(config.network === "testnet") {
            return {
                isSuccess: true,
                message: "Api is not in testnet yet"
            }
        }
        const data = await encrypt(vIndexes.join(","))

        const baseUrl = config.dissasembleBotBaseUrl
        const response = await fetch(baseUrl, {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            // credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                //   'Content-Type': 'application/x-www-form-urlencoded',
            },
            // redirect: "follow", // manual, *follow, error
            // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify({ pubkeys: data }), // body data type must match "Content-Type" header
        });
        return response.json(); // parses JSON response into native JavaScript objects
    } catch (err: any) {
        const errMessage = `Unexpected error while calling dissasemble api ${err.message}`
        console.error(errMessage)
        return {
            isSuccess: false,
            message: errMessage
        }
    }
}

export async function getValidatorsRecommendedToBeDisassembled(amount: number): Promise<string[]> {
    const validatorsProposalsArray: [string, number][] = Object.keys(globalPersistentData.validatorsLatestProposal).map((validatorIndex: string) => {
        return [validatorIndex, globalPersistentData.validatorsLatestProposal[Number(validatorIndex)]]
    })

    validatorsProposalsArray.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    const validatorsToDissasemble = validatorsProposalsArray.map((v: [string, number]) => {
        const index = v[0]
        const validatorData = globalBeaconChainData.validatorsData.find((v: ValidatorData) => {
            return v.validatorindex === Number(index)
        })
        if(!validatorData) {
            throw new Error(`Validator with index ${index} not found`)
        }
        return validatorData?.pubkey
    }).slice(0, amount)

    let possibleValidators
    // Fill with validators by luck
    if (validatorsToDissasemble.length < amount) {
        possibleValidators = globalBeaconChainData.validatorsData.filter((v: ValidatorData) => {
            return !validatorsToDissasemble.includes(v.pubkey)
        })

        const validatorsLuck: [string, ILuckResponse][] = []
        for (let i = 0; i < possibleValidators.length; i++) {
            const pubkey = possibleValidators[i].pubkey
            validatorsLuck.push([pubkey, await getProposalLuck(pubkey)])
            await sleep(200) //To avoid `API rate limit exceeded` error
        }
        validatorsLuck.sort((luck1: [string, ILuckResponse], luck2: [string, ILuckResponse]) => {
            return luck2[1].data.next_proposal_estimate_ts - luck1[1].data.next_proposal_estimate_ts
        })

        const validatorQtyToAppend = amount - validatorsToDissasemble.length
        const validatorsToAppend = validatorsLuck.map((luck: [string, ILuckResponse]) => {
            return luck[0]
        }).slice(0, validatorQtyToAppend)
        validatorsToDissasemble.push(...validatorsToAppend)
    }
    return validatorsToDissasemble
}