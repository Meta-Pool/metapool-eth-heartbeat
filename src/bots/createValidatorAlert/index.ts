import { MailOptions } from 'nodemailer/lib/json-transport'
import { ENV, getEnv } from '../../entities/env'
import { getValidatorsData } from '../../services/beaconcha/beaconcha'
import { sendEmail } from '../../utils/mailUtils'
import depositData from '../../validator_data/deposit_data-1677016004.json'

const THRESHOLD: number = 5
const responsibles = [
    "danieljseidler@gmail.com",
    "arkuhk@gmail.com"
]

const env: ENV = getEnv()

export async function alertCreateValidators(shouldSendReport: boolean = false) {
    console.log("Getting validators data")
    const validatorsData = await getValidatorsData()
    const activatedValidatorsAmount = validatorsData.length

    const createdValidatorsAmount = depositData.length
    let mailOptions: MailOptions | undefined = undefined
    console.log("Should send alert?", createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD)
    console.log("Should send report?", shouldSendReport)
    if(createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD) {
        console.log("Sending email alerting to create new validators")
        mailOptions = {
            from: env.MAIL_USER,
            cc: responsibles,
            subject: "[ALERT] Create new validators",
            text: `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
        }
    } else if(shouldSendReport) {
        console.log("Sending daily report")
        mailOptions = {
            from: env.MAIL_USER,
            cc: responsibles,
            subject: "[OK] No need to create new validators",
            text: `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
        }
    }
    if(mailOptions) sendEmail(mailOptions)
    
}