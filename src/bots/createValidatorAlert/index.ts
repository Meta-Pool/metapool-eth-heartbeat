import { MailOptions } from 'nodemailer/lib/json-transport'
import { ENV, getConfig } from '../../entities/env'
import { getValidatorsData } from '../../services/beaconcha/beaconcha'
import { sendEmail } from '../../utils/mailUtils'
import depositData from '../../validator_data/deposit_data-1677016004.json'

const THRESHOLD: number = 5
const responsibles = [
    "danieljseidler@gmail.com"
]
let mailOptions: MailOptions
const env: ENV = getConfig()

export async function alertCreateValidators(shouldSendReport: boolean = false) {

    const validatorsData = await getValidatorsData()
    const activatedValidatorsAmount = validatorsData.length

    const createdValidatorsAmount = depositData.length

    if(createdValidatorsAmount - activatedValidatorsAmount <= THRESHOLD) {
        mailOptions = {
            from: env.MAIL_USER,
            cc: responsibles,
            subject: "[ALERT] Create new validators",
            text: `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
        }
    } else if(shouldSendReport) {
        mailOptions = {
            from: env.MAIL_USER,
            cc: responsibles,
            subject: "[OK] No need to create new validators",
            text: `There are ${createdValidatorsAmount} created validators and ${activatedValidatorsAmount} activated validators. There are ${createdValidatorsAmount - activatedValidatorsAmount} validators to activate left`
        }
    }
    if(mailOptions) sendEmail(mailOptions)
}