import { SERVFAIL } from "dns";
import { EMPTY_MAIL_REPORT, IMailReportHelper, Severity } from "../../entities/emailUtils";
import { StakingManagerContract } from "../../ethereum/auroraStakingManager";
import { StakingContract } from "../../ethereum/stakingContract";
import { BASE_URL_SITE } from "../../services/beaconcha/beaconcha";
import { getValidatorsIDH } from "../../services/beaconcha/beaconchaHelper";
import { MiniIDHReport } from "../../services/beaconcha/entities";
import { wtoe } from "../../utils/numberUtils";
import { beaconChainData, globalPersistentData } from "../heartbeat";

// In ETH
const ETH_MIN_BALANCE = 0.1
const AUR_MIN_BALANCE = 0.01

export async function reportWalletsBalances(): Promise<IMailReportHelper> {
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

export async function checkForPenalties(): Promise<IMailReportHelper> {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: checkForPenalties.name}
    try {
        if(beaconChainData.currentEpoch === globalPersistentData.latestEpochCheckedForPenalties) {
            output.severity = Severity.OK
            output.subject = "Epoch hasn't changed"
            return output
        }

        const fromEpoch = globalPersistentData.latestEpochCheckedForPenalties
        const toEpoch = beaconChainData.currentEpoch
        console.log(1, fromEpoch, toEpoch)

        const validatorsIDH: Record<number, MiniIDHReport> = await getValidatorsIDH(fromEpoch, toEpoch)
        const indexesWithPenalties: string[] = Object.keys(validatorsIDH).filter((validatorIndex: string) => {
            const indexAsNum = Number(validatorIndex)
            const report = validatorsIDH[indexAsNum]
            return report.penalties > 0n
        })

        globalPersistentData.latestEpochCheckedForPenalties = beaconChainData.currentEpoch

        if(indexesWithPenalties.length) {
            console.log("Validators with penalties")
            output.subject = "Validators with penalties"
            output.severity = Severity.ERROR
            const errorBody = indexesWithPenalties.map((validatorIndex: string) => {
                const indexAsNum = Number(validatorIndex)
                const report = validatorsIDH[indexAsNum]
                return `${indexAsNum} has ${wtoe(report.penalties)} penalties: ${BASE_URL_SITE}${indexAsNum}`
            })
            output.body = `
                The following validators have penalties between epochs ${fromEpoch} and ${toEpoch}:
                ${errorBody.join("\n")}
            `
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