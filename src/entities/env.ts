import dotenv from "dotenv"
import path from "path"

export interface ENV {
    NETWORK: string
    ACCOUNT_PRIVATE_KEY: string;
    AURORA_ACCOUNT_PRIVATE_KEY: string;
    ALCHEMY_API_KEY: string;
    KEYSTORE_PASSWORD: string;
    MAIL_USER: string;
    MAIL_PASSWD: string
}

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export function getEnv(): ENV {
    return {
        NETWORK: process.env.NETWORK!,
        ACCOUNT_PRIVATE_KEY: process.env.ACCOUNT_PRIVATE_KEY!,
        AURORA_ACCOUNT_PRIVATE_KEY: process.env.AURORA_ACCOUNT_PRIVATE_KEY!,
        ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY!,
        KEYSTORE_PASSWORD: process.env.KEYSTORE_PASSWORD!,
        MAIL_USER: process.env.MAIL_USER!,
        MAIL_PASSWD: process.env.MAIL_PASSWD!,
    };
  };