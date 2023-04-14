import { ENV, getEnv } from '../../entities/env'
import { getValidatorsData } from '../../services/beaconcha/beaconcha'
import { sendEmail } from '../../utils/mailUtils'
import depositData from '../../validator_data/deposit_data-1677016004.json'

const THRESHOLD: number = 5

const env: ENV = getEnv()

export async function alertCreateValidators(shouldSendReport: boolean = false) {
    console.log("Getting validators data")
    const validatorsData = await getValidatorsData()
    const activatedValidatorsAmount = validatorsData.length

    const createdValidatorsAmount = depositData.length
    let mailSubject: string = ""
    let mailBody: string = ""
    console.log("Should send alert?", createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD)
    console.log("Should send report?", shouldSendReport)
    if(createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD) {
        // Send alert to create new validators if we have less than threshold
        console.log("Sending email alerting to create new validators")
        mailSubject = "[ALERT] Create new validators"
        mailBody = `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
    } else if(shouldSendReport) {
        // Send daily report
        console.log("Sending daily report")

        mailSubject = "[OK] No need to create new validators"
        mailBody = `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
    }
    if(mailSubject && mailBody) sendEmail(mailSubject, mailBody)
    
}