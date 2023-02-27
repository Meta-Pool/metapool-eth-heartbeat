import { registerValidator } from "../../ethereum/ssv"
import { Command } from 'commander'

// Call the corresponding ssv function to confirm the operators, sending the keyshare file
async function run() {
    // if(process.argv.length != 7) throw new Error("Be sure to send all the parameters")
    let pubkey = process.argv[2]
    let operatorIds = process.argv[3].split(",").map(Number)
    let sharesPubKeys  = process.argv[4]
    let sharesEncrypted  = process.argv[5]
    let amount  = process.argv[6]
    
    console.log(operatorIds)
    // registerValidator()

}

run()