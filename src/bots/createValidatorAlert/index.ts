import { ENV, getEnv } from '../../entities/env'
import { ValidatorDataResponse, getValidatorsData } from '../../services/beaconcha/beaconcha'
import { sendEmail } from '../../utils/mailUtils'
import depositData from '../../validator_data/deposit_data-1677016004.json'

const THRESHOLD: number = 5

enum PossibleValidatorStatuses {
    ACTIVE_ONLINE = "active_online",
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

export async function alertCreateValidators(shouldSendReport: boolean = false) {
    console.log("Getting validators data")
    const validatorsData: ValidatorDataResponse[] = await getValidatorsData()

    const validatorsQtyByType = getValidatorsQtyByType(validatorsData)
    // const activatedValidatorsAmount = validatorsData.length
    const activatedValidatorsAmount = validatorsQtyByType[PossibleValidatorStatuses.ACTIVE_ONLINE]

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