import { createTransport, SentMessageInfo } from "nodemailer"
import { MailOptions } from "nodemailer/lib/json-transport"
import { ENV, getEnv } from "../entities/env"

const responsibles = [
    "danieljseidler@gmail.com",
    // "arkuhk@gmail.com"
]

export function sendEmail(subject: string, body: string) {
    const env: ENV = getEnv()

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