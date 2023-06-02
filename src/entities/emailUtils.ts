export enum Severity {
    OK = 0,
    IMPORTANT = 1,
    ERROR = 2
}

export interface IDailyReportHelper {
    ok: boolean
    function: string
    subject: string
    body: string
    severity: Severity
}

export const EMPTY_DAILY_REPORT: IDailyReportHelper = {
    ok: false,
    function: "EMPTY_DAILY_REPORT",
    subject: "",
    body: "",
    severity: Severity.ERROR,
}