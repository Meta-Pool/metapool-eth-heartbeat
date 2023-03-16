import { readFileSync } from "fs"
import { ISharesKeyPairs, SSVKeys } from "ssv-keys"
import { ENV, getEnv } from "../../entities/env"
import { Operator } from "../assignOperatorsToValidator"

/**
 * 
 * @param keystorePath 
 * @param operatorIds 
 * @param operatorKeys 
 * @returns validatorPublickey, operatorsIds, sharesPublickeys, sharesEncrypted, amount
 */
export async function generateKeyshare(keystorePath: string, operatorIds: number[], operatorKeys: Operator[]): Promise<any[]> {
    const ssvKeys = new SSVKeys()
    const env: ENV = getEnv()

    const keystore = JSON.parse(await readFileSync(keystorePath, "utf-8"))
    
    const privateKey = await ssvKeys.getPrivateKeyFromKeystoreData(keystore, env.KEYSTORE_PASSWORD)

    const threshold: ISharesKeyPairs = await ssvKeys.createThreshold(privateKey, operatorIds)
    const operatorsPubKeys = operatorKeys.map((o: Operator) => o.pubkey)
    const shares = await ssvKeys.encryptShares(operatorsPubKeys, threshold.shares)
    
    const keyshare = await ssvKeys.buildPayload(
        threshold.validatorPublicKey,
        operatorIds,
        shares,
        0
    )

    return keyshare
}