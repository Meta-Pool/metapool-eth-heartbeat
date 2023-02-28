import { registerValidator } from "../../ethereum/ssv"

// Call the corresponding ssv function to confirm the operators, sending the keyshare file
async function run() {
    // if(process.argv.length != 7) throw new Error("Be sure to send all the parameters")
    let pubkey = process.argv[2]
    let operatorIds = process.argv[3].split(",").map(Number)
    let sharesPubKeys: string[]  = process.argv[4].split(",")
    let sharesEncrypted: string[]  = process.argv[5].split(",")
    let amount: number = Number(process.argv[6])

    await registerValidator(pubkey, operatorIds, sharesPubKeys, sharesEncrypted, amount)
    
    
    // registerValidator()

}

run()