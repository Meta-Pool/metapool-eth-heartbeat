import { EMPTY_MAIL_REPORT, IMailReportHelper, Severity } from "../../entities/emailUtils";
import { StakingManagerContract } from "../../ethereum/auroraStakingManager";
import { StakingContract } from "../../ethereum/stakingContract";
import { wtoe } from "../../utils/numberUtils";
import { globalPersistentData } from "../heartbeat";

// In ETH
const ETH_MIN_BALANCE = 0.1
const AUR_MIN_BALANCE = 0.01

export async function reportWalletsBalances(): Promise<IMailReportHelper> {
    let output: IMailReportHelper = {...EMPTY_MAIL_REPORT, function: reportWalletsBalances.name}
    console.log("Getting wallets balances")
    const ethContract = new StakingContract()
    const ethWallet = ethContract.connectedWallet
    const ethWalletBalance = await ethContract.getWalletBalance(await ethWallet.getAddress())

    const aurContract = new StakingManagerContract()
    const aurWallet = aurContract.connectedWallet
    const aurWalletBalance = await aurContract.getWalletBalance(await aurWallet.getAddress())

    globalPersistentData.ethBotBalance = ethWalletBalance.toString()
    globalPersistentData.aurBotBalance = aurWalletBalance.toString()

    let shouldFondEthWalletBalance = false
    if(wtoe(ethWalletBalance) < ETH_MIN_BALANCE) {
        shouldFondEthWalletBalance = true
    }

    let shouldFondAurWalletBalance = false
    if(wtoe(aurWalletBalance) < AUR_MIN_BALANCE) {
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
