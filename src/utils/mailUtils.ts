import { createTransport, SentMessageInfo } from "nodemailer"
import { MailOptions } from "nodemailer/lib/json-transport"
import { ENV, getEnv } from "../entities/env"
import { isDebug } from "../bots/heartbeat"

const TESTNET_RESPONSIBLES = [
    "danieljseidler@gmail.com",
]

const MAINNET_RESPONSIBLES = [
    "danieljseidler@gmail.com",
    "arkuhk@gmail.com",
    "agustin@metapool.app",
]

// const responsibles = isDebug ? TESTNET_RESPONSIBLES : MAINNET_RESPONSIBLES

function getResponsibles() {
    return isDebug ? TESTNET_RESPONSIBLES : MAINNET_RESPONSIBLES
}

export function sendEmail(subject: string, body: string) {
    const env: ENV = getEnv()

    const options: MailOptions = {
        from: env.MAIL_USER,
        cc: getResponsibles(),
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