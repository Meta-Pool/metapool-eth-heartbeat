import { SERVFAIL } from "dns";
import { EMPTY_MAIL_REPORT, IMailReportHelper, Severity } from "../../entities/emailUtils";
import { StakingManagerContract } from "../../ethereum/auroraStakingManager";
import { StakingContract } from "../../ethereum/stakingContract";
import { BASE_BEACON_CHAIN_URL_SITE } from "../../services/beaconcha/beaconcha";
import { getValidatorsIDH } from "../../services/beaconcha/beaconchaHelper";
import { MiniIDHReport } from "../../services/beaconcha/entities";
import { wtoe } from "../../utils/numberUtils";
import { globalBeaconChainData, globalPersistentData } from "../heartbeat";
import { readdirSync } from "fs";
import { getConfig } from "../../ethereum/config";
import { MIN_DAYS_UNTIL_SSV_RUNWAY, getClustersThatNeedDeposit, getEstimatedRunwayInDays } from "../../utils/ssvUtils";
import { ClusterData, ClusterInformation } from "../../entities/ssv";
import { sLeftToTimeLeft } from "../../utils/timeUtils";

// In ETH
const ETH_ESTIMATED_COST_PER_DAY = 0.001
const AUR_ESTIMATED_COST_PER_DAY = 0.00001
const ETH_MIN_BALANCE = ETH_ESTIMATED_COST_PER_DAY * 60
const AUR_MIN_BALANCE = AUR_ESTIMATED_COST_PER_DAY * 60


export function reportWalletsBalances(): IMailReportHelper {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: reportWalletsBalances.name}
    console.log("Getting wallets balances")
    const ethWalletBalance = wtoe(globalPersistentData.ethBotBalance)
    const aurWalletBalance = wtoe(globalPersistentData.aurBotBalance)

    let shouldFondEthWalletBalance = false
    if(ethWalletBalance < ETH_MIN_BALANCE) {
        shouldFondEthWalletBalance = true
    }

    let shouldFondAurWalletBalance = false
    if(aurWalletBalance < AUR_MIN_BALANCE) {
        shouldFondAurWalletBalance = true
    }

    output.body = `
            ETH bot balance: ${ethWalletBalance}. 
            Min ETH bot balance: ${ETH_MIN_BALANCE}
            AUR bot balance: ${aurWalletBalance}. 
            Min AUR bot balance: ${AUR_MIN_BALANCE}
        `

    let shouldFundMessage = ""
    if(shouldFondEthWalletBalance || shouldFondAurWalletBalance) {
        shouldFundMessage = `WALLETS THAT NEED FUNDING: ${shouldFondEthWalletBalance ? "ETH, " : ""}${shouldFondAurWalletBalance ? "AUR" : ""} `

        output.ok = false
        output.body = `
            ${shouldFundMessage}
            ${output.body}
        `
        output.subject = "Fund bot wallets"
        output.severity = Severity.IMPORTANT
        return output
    }    
    
    output.ok = true
    output.subject = "No need fund bot wallets"
    output.severity = Severity.OK
    return output
}

export async function checkForPenalties(fromEpochAux?: number): Promise<IMailReportHelper> {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: checkForPenalties.name}
    try {
        if(globalBeaconChainData.currentEpoch === globalPersistentData.latestEpochCheckedForPenalties) {
            output.severity = Severity.OK
            output.subject = "Epoch hasn't changed"
            return output
        }

        const fromEpoch = fromEpochAux ?? globalPersistentData.latestEpochCheckedForPenalties
        const toEpoch = globalBeaconChainData.currentEpoch

        const validatorsIDH: Record<number, MiniIDHReport> = await getValidatorsIDH(fromEpoch, toEpoch)

        globalPersistentData.latestEpochCheckedForPenalties = globalBeaconChainData.currentEpoch

        
            
        const validatorsWithPenalties = Object.keys(validatorsIDH).filter((validatorIndex: string) => {
            const indexAsNum = Number(validatorIndex)
            const report: MiniIDHReport = validatorsIDH[indexAsNum]
            return report.penaltiesCount > 0
        }).map((validatorIndex: string) => {
            const indexAsNum = Number(validatorIndex)
            const report: MiniIDHReport = validatorsIDH[indexAsNum]
            return `${indexAsNum} has ${report.penaltiesCount} penalties: ${BASE_BEACON_CHAIN_URL_SITE}${indexAsNum}`
        })
        if(validatorsWithPenalties.length) {
            output.subject = "Validators with penalties"
            output.severity = Severity.ERROR
            output.body = `
                The following validators have penalties between epochs ${fromEpoch} and ${toEpoch}:
                
                ${validatorsWithPenalties.join("\n\n")}
            `.replace(/^ +/gm, "")
            return output
        }
        
        console.log("No validators with penalties")
        output.ok = true
        output.subject = "No validators have penalties"
        output.severity = Severity.OK
    } catch(err: any) {
        const errorMessage = `Unexpected error while checking for penalties ${err.message}`
        console.error("ERROR:", errorMessage)
        output.ok = false
        output.severity = Severity.ERROR
        output.subject = "Penalties check unexpected error"
        output.body = errorMessage
    }
    return output
    
}

export function reportSsvClusterBalances(): IMailReportHelper  {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: reportSsvClusterBalances.name}
    const network = getConfig().network
    if(network === "mainnet") {
        return {
            ...output,
            ok: true,
            severity: Severity.OK,
            body: "Ssv is not yet set for mainnet"
        }
    }
    try {
        const clustersToReport: ClusterInformation[] = getClustersThatNeedDeposit()

        if(clustersToReport.length > 0) {
            output.ok = false
            output.severity = Severity.IMPORTANT
            output.subject = "Ssv cluster needs deposit"

            const body = clustersToReport.map((cluster: ClusterInformation) => {
                const estimatedRunway = getEstimatedRunwayInDays(cluster.operatorIds)
                return `${cluster.operatorIds}: ${Math.floor(estimatedRunway)} days remaining`
            })
            output.body = `
                The following operatorIds belong to clusters that need funding.
                ${body.join("\n                ")}
            `.trim()
            return output
        }

        output.ok = true
        output.severity = Severity.OK
        output.subject = ""
        output.body = "Ssv clusters have enough funding for more than 60 days"

        return output

    } catch(err: any) {
        const errorMessage = `Unexpected error while checking for reportSsvClusterBalances ${err.message}`
        console.error("ERROR:", errorMessage)
        output.ok = false
        output.severity = Severity.ERROR
        output.subject = "Ssv cluster balances check error"
        output.body = errorMessage

        return output
    }

}

export function reportCloseToActivateValidators() {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: reportCloseToActivateValidators.name}

    try {
        const currentEpoch = globalBeaconChainData.currentEpoch
        const estimatedActivationEpochs = globalPersistentData.estimatedActivationEpochs

        const pendingValidatorsPubKeys = Object.keys(estimatedActivationEpochs).filter((pubkey: string) => {
            const estimatedEpoch = estimatedActivationEpochs[pubkey]
            return currentEpoch <= estimatedEpoch
        })

        const MAX_DAYS = 5
        const MAX_DAYS_IN_EPOCHS = MAX_DAYS * 24 * 60 / 6.4

        const pubKeysToReport = pendingValidatorsPubKeys.filter((pubkey: string) => {
            const estimatedEpoch = estimatedActivationEpochs[pubkey]
            return currentEpoch + MAX_DAYS_IN_EPOCHS >= estimatedEpoch
        })

        if(pubKeysToReport.length > 0) {
            output.ok = false
            output.severity = Severity.IMPORTANT
            output.subject = "Close to activate validators"

            const body = pubKeysToReport.map((pubkey: string) => {
                const estimatedEpoch = estimatedActivationEpochs[pubkey]
                const pendingEpochs = estimatedEpoch - currentEpoch
                const pendingEpochsInSeconds = pendingEpochs * 6.4 * 60
                const timeLeft = sLeftToTimeLeft(pendingEpochsInSeconds)
                return `Pubkey: ${pubkey}. Time left: ${timeLeft}`
            })

            
            output.body = `
                The are validators that will be activated within the next ${MAX_DAYS} days
                ${body.join("\n")}
            `

            return output
        }

        output.ok = true
        output.severity = Severity.OK
        output.subject = ""
        output.body = `There are no validators activating in the following ${MAX_DAYS} days`

        return output
    } catch(err: any) {
        const errorMessage = `Unexpected error while checking for reportCloseToActivateValidators ${err.message}`
        console.error("ERROR:", errorMessage)
        output.ok = false
        output.severity = Severity.ERROR
        output.subject = "Close to activate validators"
        output.body = errorMessage

        return output
    }


}