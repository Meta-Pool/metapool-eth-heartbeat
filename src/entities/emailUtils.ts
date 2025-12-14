export enum Severity {
    OK = 0,
    IMPORTANT = 1,
    ERROR = 2
}

export interface IMailReportHelper {
    ok: boolean
    function: string
    subject: string
    body: string
    severity: Severity
    step?: string
}

export const EMPTY_MAIL_REPORT: IMailReportHelper = {
    ok: false,
    function: "EMPTY_MAIL_REPORT",
    subject: "",
    body: "",
    severity: Severity.ERROR,
}