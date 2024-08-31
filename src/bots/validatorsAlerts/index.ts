import { ethers } from 'ethers'
import { ValidatorData, getActiveValidatorsData, getProposalLuck, getValidatorsData } from '../../services/beaconcha/beaconcha'
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
    const previousEpoch = globalPersistentData.delayedUnstakeEpoch
    const balances: Balances = await getBalances()
    const balancesBody = `
            Staking balance: ${ethers.formatEther(balances.staking)} ETH
            Withdraw balance: ${ethers.formatEther(balances.withdrawBalance)} ETH
            Liq available balance: ${ethers.formatEther(balances.liqAvailableEthForValidators)} ETH
            Total pending withdraw: ${ethers.formatEther(balances.totalPendingWithdraw)} ETH
        `
    let wasDisassembleApiCalled = false
    try {
        console.log("Running", functionName)
        const withdrawContract = new WithdrawContract()
        const currentEpoch = await withdrawContract.getEpoch()
        console.log("Current epoch", currentEpoch)

        const output: IMailReportHelper = { ...EMPTY_MAIL_REPORT, function: functionName }
        
        // Epoch hasn't change, so there is nothing to do
        if (currentEpoch === globalPersistentData.delayedUnstakeEpoch) {
            console.log("Epoch hasn't changed")
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
            console.error("SEVERE: Epoch went backwards")
            return {
                ...output,
                ok: false,
                subject: "Withdrawal epoch backwards",
                body: `Withdraw contract went backwards from epoch ${globalPersistentData.delayedUnstakeEpoch} to ${currentEpoch}`,
                severity: Severity.ERROR
            }
        }
        // Update epoch
        console.log("Updating epoch")
        globalPersistentData.delayedUnstakeEpoch = currentEpoch

        const epochInfoBody = `
            Previous epoch: ${previousEpoch}
            Current epoch: ${currentEpoch}
        `
        const validatorsData = await getValidatorsData()
        const exitedValidators = validatorsData.filter((validator: ValidatorData) => {
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
            console.log("Withdraw balance is enough to cover")
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
            console.log("Staking with withdraw balance is enough to cover")
            console.log("")
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
            console.log("Staking with liquidity and withdraw balance is enough to cover. Transferring from liquidity to stake")
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
        let validatorsToDisassemble = 0
        let ethToTransferFromLiq = neededEth
        while (ethToTransferFromLiq > liqAvailableEthForValidators) {
            validatorsToDisassemble++
            ethToTransferFromLiq -= 32
        }
        console.log("Disassembling", validatorsToDisassemble, "validators")

        if (ethToTransferFromLiq > 0) {
            await stakingContract.requestEthFromLiquidPoolToWithdrawal(ethers.parseEther(ethToTransferFromLiq.toString()))
        }

        const vIndexes: string[] = await getValidatorsRecommendedToBeDisassembled(validatorsToDisassemble)
        
        wasDisassembleApiCalled = true
        const disassembleApiResponse = await callDisassembleApi(vIndexes)

        ethToTransferFromLiq = Math.max(0, ethToTransferFromLiq)
        const subject = "Disassemble validators"
        let body = `
            VALIDATORS TO DISASSEMBLE: ${validatorsToDisassemble}
            ${balancesBody}
            ${epochInfoBody}
            Needed ETH: ${neededEth}
            ETH provided from liq: ${ethToTransferFromLiq}
            Recommended validators to disassemble: ${vIndexes.join(", ")}
        `

        let severity: Severity
        if (disassembleApiResponse.isSuccess) {
            severity = Severity.IMPORTANT
        } else {
            severity = Severity.ERROR
            body =
                `${disassembleApiResponse.message}${body}`
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
        if(!wasDisassembleApiCalled) {
            // Reset to previous epoch if error ocurrs and haven't called api. It might not be related to this, but it still needs to be rechecked
            globalPersistentData.delayedUnstakeEpoch = previousEpoch
        }
        
        return {
            ok: false,
            function: functionName,
            subject: "Disassemble validator error",
            body: `There was an error checking if a validator should be disassembled: ${err.message}
                ${err.stack}
                Check following for quick manual check. ${wasDisassembleApiCalled ? '' : "This validation will be called again"}
                ${balancesBody}
                `,
            severity: Severity.ERROR
        }
    }
}

export async function callDisassembleApi(vIndexes: string[]) {
    try {
        const config = getConfig()
        if(config.network === "testnet") {
            return {
                isSuccess: true,
                message: "Api is not in testnet yet"
            }
        }
        const data = await encrypt(vIndexes.join(","))

        const baseUrl = config.disassembleBotBaseUrl
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
        const errMessage = `Unexpected error while calling disassemble api ${err.message}`
        console.error(errMessage)
        return {
            isSuccess: false,
            message: errMessage
        }
    }
}

function getSenseiActiveValidatorsData(): ValidatorData[] {
    const activatedSenseiValidatorsPubKeys = [
        "0xafb05b66a8bed736084542f85e6ff692a04ecd043feff5ab1b380bb798768253a9fde77f6b2f1d4d654a9039f11017c6",
        "0x87e57cf6e9f0629ba87d923c233f468770f495f744327a1c4ba35a42a3eb707f14eb9a6454da921269f1d8924affe0c3",
        "0x96138fb23f13df39d13917f9bef5849bbe999f99e0da27ca56e6c0e1c2809c4886efb1edf27ba77adfe2d87423220129",
        "0x8d45e58cb392af0f7533ce50e6774031e9d141ec134dbf2da12634fca175e8adf4b1eb7e73c3930473de0fd96dd70996",
        "0xae41d26cdaf5fb186063238c71c5bcb08f93544fde6e91c455331a755f74fff54e4beb10d728942f9671e12f79f5ceef",
        "0xa49d06a3ad510dba1f13b1dbb62ccb9db9bec998048ed5f038591f57a707309d4e61cab6ead89d35becb97fe7034b8e2",
        "0x984024c053a3b6a3f507b70f01a23a6708db79b9ff12a90cd587e2151ece43821a3773c348551d70809c79ff78ff2646",
        "0xa6c7c72e656264a78dc11116b0eb9d3a3ec648fc0e7347271aa0de0489868f0823332134b1fa7b9dcbf28e5c15615616",
        "0x8744f7d5cdb4f1b40e83f19880efb00c7cb911ac9f56098c8337a0e5ef35670e28c69d4592fc65f4f2c74e84c6cef1f9",
        "0xb707ac879ce6ef3693912b0cac56e1c77589877829e89feb407378cb17b29a7e1db48510b755760c8958afb2f47d755c",
        "0xb0260dd2d3007f08a00f9d299cff8c160c0625e7447d7a5df26206ecb4b965c3f1286ce9bdc2bdde187f04643fc9c467",
        "0xb535a7f5222cc204660f8cc64fb0e95cb53cee62acbd33d40989cdbd4d6ffb41bd0c56d3c3118627028bc871f09a2590",
        "0x94b19b888ee64dccfa123fdd7cc72b3580ed3dd6b05166a0563bb93c3dc6e98e0946e3d0240042424f8c9b9a3773a3af",
        "0xb06ffd238f7632deeffc29413e182dccde94027c6a091d6e1548d2fab990e4d43cc6923927a21bf0f3996ad59c98f6bc",
    ]
    const activeValidatorsData = getActiveValidatorsData()
    return activeValidatorsData.filter((validatorData: ValidatorData) => {
        return activatedSenseiValidatorsPubKeys.includes(validatorData.pubkey)
    })
}

export async function getValidatorsRecommendedToBeDisassembled(amount: number) {
    if(amount === 0) return []

    const activeValidatorsData = getActiveValidatorsData()
    const senseiActiveValidators = getSenseiActiveValidatorsData()
    const senseiActivePubKeys = senseiActiveValidators.map((v) => v.pubkey)
    
    activeValidatorsData.sort((first: ValidatorData, second: ValidatorData) => {
        // First, we look to disassemble sensei validators
        const isFirstASenseiValidatorNumber = senseiActivePubKeys.includes(first.pubkey) ? 1 : 0
        const isSecondASenseiValidatorNumber = senseiActivePubKeys.includes(second.pubkey) ? 1 : 0
        if(isFirstASenseiValidatorNumber - isSecondASenseiValidatorNumber !== 0) {
            return isSecondASenseiValidatorNumber - isFirstASenseiValidatorNumber
        }

        // If both validators belong to the same provider, we try to disassemble first the one that proposed a block latest
        // Some validators have not proposed, so we take that like they proposed a block on block 0
        const firstValidatorLatestProposal = globalPersistentData.validatorsLatestProposal[first.validatorindex!] ?? 0
        const secondValidatorLatestProposal = globalPersistentData.validatorsLatestProposal[second.validatorindex!] ?? 0
        return secondValidatorLatestProposal - firstValidatorLatestProposal
    })

    return activeValidatorsData.slice(0, amount).map((v) => v.validatorindex!.toString())
}