import dotenv from "dotenv"
import path from "path"

export interface ENV {
    NETWORK: string
    ALCHEMY_API_KEY: string;
    KEYSTORE_PASSWORD: string;
    MAIL_USER: string;
    MAIL_PASSWD: string
}

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export function getEnv(): ENV {
    return {
        NETWORK: process.env.NETWORK!,
        ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY!,
        KEYSTORE_PASSWORD: process.env.KEYSTORE_PASSWORD!,
        MAIL_USER: process.env.MAIL_USER!,
        MAIL_PASSWD: process.env.MAIL_PASSWD!,
    };
  };