import { createTransport, SentMessageInfo } from "nodemailer"
import { MailOptions } from "nodemailer/lib/json-transport"
import { ENV, getEnv } from "../entities/env"

export function sendEmail(options: MailOptions) {
    const env: ENV = getEnv()

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