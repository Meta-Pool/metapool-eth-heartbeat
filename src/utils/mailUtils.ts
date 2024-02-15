import { createTransport, SentMessageInfo } from "nodemailer"
import { MailOptions } from "nodemailer/lib/json-transport"
import { ENV, getEnv } from "../entities/env"
import { isDebug } from "../bots/heartbeat"

const DEBUG_RESPONSIBLES = [
    "daniel@metapool.app",
]

const MAINNET_RESPONSIBLES = [
    "daniel@metapool.app",
    "arkuhk@gmail.com",
    "agustin@metapool.app",
]

function getResponsibles() {
    return isDebug ? DEBUG_RESPONSIBLES : MAINNET_RESPONSIBLES
}

export function sendEmail(subject: string, body: string, to?: string[]) {
    const env: ENV = getEnv()
    const responsibles = to ? to : getResponsibles()
    console.log("Sending mails to", responsibles)
    const options: MailOptions = {
        from: env.MAIL_USER,
        cc: responsibles,
        subject,
    }
    if(body.includes("<")) {
        options.html = body
    } else {
        options.text = body
    }

    const transporter = createTransport({
        service: 'gmail',
        auth: {
            user: env.MAIL_USER,
            pass: env.MAIL_PASSWD
        }
    })

    transporter.sendMail(options, function(error: Error | null, info: SentMessageInfo) {
        if(error) {
            console.error(error)
        } else {
            console.log("Email sent: ", info.response)
        }
    })
}