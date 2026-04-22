import { globalSsvData, setGlobalSsvData } from "../globals/globalMetrics"
import { existsSync } from "fs"
import { homedir } from "os"
import path from "path"
import process from "process"

const mailUtils = require("../utils/mailUtils") as {
    sendEmail: (subject: string, body: string, to?: string[]) => void
    sendEmail2: (args: {subject: string, body: string, to?: string[]}) => void
}

async function run() {
    const network = process.env.NETWORK || "mainnet"
    const ethBotPath = path.join(homedir(), `.config/${network}/ethBot.txt`)
    const ssvBotPath = path.join(homedir(), `.config/${network}/ssvBot.txt`)
    if (!existsSync(ethBotPath)) {
        console.log(`Skipping refreshSsvData test. Missing local secret file: ${ethBotPath}`)
        return
    }
    if (!existsSync(ssvBotPath)) {
        console.log(`Skipping refreshSsvData test. Missing local secret file: ${ssvBotPath}`)
        return
    }

    process.chdir(path.resolve(__dirname, ".."))

    mailUtils.sendEmail = (subject: string, body: string) => {
        console.log(`[TEST] sendEmail suppressed: ${subject}`)
        console.log(body)
    }
    mailUtils.sendEmail2 = ({subject, body}: {subject: string, body: string}) => {
        console.log(`[TEST] sendEmail2 suppressed: ${subject}`)
        console.log(body)
    }

    setGlobalSsvData({
        clusterInformationRecord: {}
    })

    const { refreshSsvData } = await import("../utils/ssvUtils")
    await refreshSsvData()

    const clustersLoaded = Object.keys(globalSsvData.clusterInformationRecord || {}).length
    console.log("refreshSsvData test completed")
    console.log("Clusters loaded:", clustersLoaded)
}

run().catch((err: any) => {
    console.error("refreshSsvData test failed", err.message)
    console.error(err.stack)
    process.exit(1)
})
