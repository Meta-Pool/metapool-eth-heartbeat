import { EMPTY_MAIL_REPORT, IMailReportHelper, Severity } from "../../entities/emailUtils";
import { globalPersistentData } from "../heartbeat";
import { wtoe } from "../../utils/numberUtils";

// Done async to fit behaviour of daily reports
export function alertCheckProfit(): Promise<IMailReportHelper> {
    let output: IMailReportHelper = { ...EMPTY_MAIL_REPORT, function: "alertCheckProfit" }
    if(globalPersistentData.mpEthPrices.length < 2) return Promise.resolve({...output, ok: true, body: "Not enough prices to calculate", severity: Severity.OK})
    const lastPrice = wtoe(globalPersistentData.mpEthPrices[globalPersistentData.mpEthPrices.length - 1].price)
    const priceBefore = wtoe(globalPersistentData.mpEthPrices[globalPersistentData.mpEthPrices.length - 2].price)

    const minExpectedDailyPercentageIncrease = 0.01
    const maxExpectedDailyPercentageIncrease = 0.014
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
        return Promise.resolve(output)
    } // Price didn't increase enough

    if (maxExpectedValue > lastPrice) {
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
        return Promise.resolve(output)
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
    output.severity = Severity.IMPORTANT

    return Promise.resolve(output)
}