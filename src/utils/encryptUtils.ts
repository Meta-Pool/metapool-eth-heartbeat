import { readFileSync } from 'fs'
import path from 'path'
import os from 'os'
import EthCrypto from 'eth-crypto'
import { getConfig } from '../crypto/config'

function getPubKey() {
    const config = getConfig()
    const pubkeyPath = path.join(os.homedir(), `.config/${config.network}/disassemblePubkey.txt`)
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