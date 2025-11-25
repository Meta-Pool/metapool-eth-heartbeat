import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { getConfig } from "../crypto/config"
import { getResponsibles, sendEmail2 } from "./mailUtils"

type HandleErrorParams = {
    err: any
    action: string
    extraMessage?: string
    params?: Record<string, any>
    steps?: string[]
    codeKey: string
    threshold: number
}

/**
 * Runs a function and counts errors using errorHandler methods
 * @param fn function that may fail and send email
 * @param codeKey key to identify the function in error counting
 * @param threshold number of errors before sending an email
 * @returns function output or null if it failed
 */
export function runFunctionCountingErrors<T>(fn: () => T | Promise<T>, codeKey: string, threshold: number): Promise<T | null> {
    return new Promise(async (resolve) => {
        try {
            const result = await fn()
            console.log("Resetting counter for", codeKey)
            updateGetErrorCounter(codeKey, true) // Reset counter on success
            resolve(result)
        } catch (err) {
            const params = { err, action: "Error in runFunctionCountingErrors", codeKey, threshold }
            await handleError(params)
            resolve(null)
        }
    })
}

export function updateGetErrorCounter(key: string, shouldReset: boolean) {
    const folder = `nonCriticalFlags`
    if(!existsSync(folder)) {
        mkdirSync(folder)
    }
    const filePath = `${folder}/errorCounter.json`
    if(!existsSync(filePath)) {
        const initialContent = {
            [key]: 0
        }
        writeFileSync(filePath, JSON.stringify(initialContent, null, 4))
    }
    const fileContent = JSON.parse(readFileSync(filePath, "utf-8"))
    if(!(key in fileContent)) {
        fileContent[key] = 0
    }
    if(shouldReset) {
        fileContent[key] = 0
    } else {
        fileContent[key] += 1
    }
    writeFileSync(filePath, JSON.stringify(fileContent, null, 4))
    return fileContent[key]
}

export function handleError({ err, action, extraMessage, params, steps, codeKey, threshold }: HandleErrorParams) {
    try {
        console.error(err)
        console.error("handleError", action)
        const { network } = getConfig()
        const to = getResponsibles()
        const title = extraMessage ?? action
        let content = `<h1>${title}</h1><h2>${err.message}</h2><p>${err}</p>`
        if (params) {
            content += `<h3>Function params</h3><p>${JSON.stringify(params, null, 4)}</p>`
        }
        if (steps) {
            const stepsHtml = steps.map(step => `<li>${step}</li>`).join("")
            content += `<h3>Recommended steps</h3><ol>${stepsHtml}</ol>`
        }

        const shouldSendEmail = updateGetErrorCounter(codeKey, false) >= threshold
        if(shouldSendEmail) {
            // Returns the promise so the caller can await it if desired
            return sendEmail2({
                to: to,
                subject: `[${network}] - Bitju error - ${action}`,
                body: content
            })
        }
    } catch (error2) {
        console.error(`Catch in fn handleError with action ${action}`)
        console.error(error2)
    }
}