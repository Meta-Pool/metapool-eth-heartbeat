import { readFileSync } from 'fs'
import path from 'path'
import os from 'os'
import EthCrypto from 'eth-crypto'

function getPubKey() {
    const pubkeyPath = path.join(os.homedir(), ".config/goerli/dissasemblePubkey.txt")
    const pubKey = readFileSync(pubkeyPath).toString()
    return pubKey
}

export async function encrypt(payload: string) {
    const pubKey = getPubKey()
    console.log(pubKey)
    const encrypted = await EthCrypto.encryptWithPublicKey(pubKey, payload);
    const stringify = EthCrypto.cipher.stringify(encrypted)
    const base64 = EthCrypto.hex.compress(stringify, true)
    return base64
}