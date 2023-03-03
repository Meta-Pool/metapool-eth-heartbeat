import dotenv from "dotenv"
import path from "path"

export interface ENV {
    ACCOUNT_PRIVATE_KEY: string;
    KEYSTORE_PASSWORD: string;
}

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export function getConfig(): ENV {
    return {
        ACCOUNT_PRIVATE_KEY: process.env.ACCOUNT_PRIVATE_KEY!,
        KEYSTORE_PASSWORD: process.env.KEYSTORE_PASSWORD!
    };
  };