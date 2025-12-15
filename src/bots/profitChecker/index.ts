import { EMPTY_MAIL_REPORT, IMailReportHelper, Severity } from "../../entities/emailUtils";
import { globalPersistentData } from "../../globals/globalMetrics";
// import { globalPersistentData } from "../heartbeat";
import { wtoe } from "../../utils/numberUtils";

export function alertCheckProfit(): IMailReportHelper {
    let output: IMailReportHelper = { ...EMPTY_MAIL_REPORT, function: "alertCheckProfit" }
    if(globalPersistentData.mpEthPrices.length < 2) return {...output, ok: true, body: "Not enough prices to calculate", severity: Severity.OK}
    const lastPrice = wtoe(globalPersistentData.mpethPrice)
    const priceBefore = wtoe(globalPersistentData.mpEthPrices[globalPersistentData.mpEthPrices.length - 2].price)

    const minExpectedDailyPercentageIncrease = 2 / 365 // Validators give normally 2% 
    const maxExpectedDailyPercentageIncrease = 15 / 365 // With donations, the APY increases to 11% currently
    const minExpectedValue = (1 + minExpectedDailyPercentageIncrease / 100) * priceBefore
    const maxExpectedValue = (1 + maxExpectedDailyPercentageIncrease / 100) * priceBefore

    if (minExpectedValue > lastPrice) {
        output.ok = false
        output.subject = "Strange mpeth update"
        output.body = `
            The price update of mpeth was low
            Price now: ${lastPrice}
            Price before: ${priceBefore}
            Min expected increase: ${minExpectedDailyPercentageIncrease}%
            Min expected value: ${minExpectedValue}
        `
        output.severity = Severity.ERROR
        return output
    } // Price didn't increase enough

    if (maxExpectedValue < lastPrice) {
        output.ok = false
        output.subject = "Strange mpeth update"
        output.body = `
            The price update of mpeth was high
            Price now: ${lastPrice}
            Price before: ${priceBefore}
            Max expected increase: ${maxExpectedDailyPercentageIncrease}%
            Max expected value: ${maxExpectedValue}
        `
        output.severity = Severity.IMPORTANT
        return output
    } // Price increased a lot

    output.ok = true
    output.subject = ""
    output.body = `
            The price update of mpeth was as expected
            Price now: ${lastPrice}
            Price before: ${priceBefore}
            Min expected value: ${minExpectedValue}
            Max expected value: ${maxExpectedValue}
        `
    output.severity = Severity.OK

    return output
}