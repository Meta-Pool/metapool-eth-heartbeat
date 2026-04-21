import { createTransport, SentMessageInfo } from "nodemailer"
import { MailOptions } from "nodemailer/lib/json-transport"
import { ENV, getEnv } from "../entities/env"
import { isDebug } from "../globals/globalUtils"
import { MS_IN_HOUR } from "../globals/globalVariables"

const DEBUG_RESPONSIBLES = [
    "daniel@metapool.app",
]

const MAINNET_RESPONSIBLES = [
    "daniel@metapool.app",
    "arkuhk@gmail.com",
    "agustin@metapool.app",
]

const EMAIL_THROTTLE_COOLDOWN_MS = MS_IN_HOUR
const lastEmailTimestamps: Record<string, number> = {}

export function getResponsibles() {
    return isDebug ? DEBUG_RESPONSIBLES : MAINNET_RESPONSIBLES
}

/**
 * Check if an email with the given key should be sent based on throttling (once per hour per key).
 * Returns true if email should be sent, false if it's being throttled.
 * Also logs throttle information when skipping.
 */
export function shouldSendEmail(throttleKey: string): boolean {
    const now = Date.now()
    const lastEmailTime = lastEmailTimestamps[throttleKey] ?? 0
    const timeSinceLastEmail = now - lastEmailTime
    
    if (timeSinceLastEmail >= EMAIL_THROTTLE_COOLDOWN_MS) {
        lastEmailTimestamps[throttleKey] = now
        return true
    } else {
        const minutesUntilNextEmail = Math.ceil((EMAIL_THROTTLE_COOLDOWN_MS - timeSinceLastEmail) / 60000)
        console.log(`Email throttled for key "${throttleKey}" - last sent ${Math.floor(timeSinceLastEmail / 60000)} minutes ago. Next eligible in ${minutesUntilNextEmail} minutes`)
        return false
    }
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

export function sendEmail2({subject, body, to}: {subject: string, body: string, to?: string[]}) {
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

