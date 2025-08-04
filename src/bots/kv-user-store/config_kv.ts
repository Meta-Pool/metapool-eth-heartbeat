import os from "os";

type Environment = "testnet" | "mainnet";

const env: Environment = "testnet";

const CONFIGS = {
    testnet: {
        voteContractId: "kv-user-store.testnet",
        folderContractId: "dev-1686255629935-21712092475027",
        rpcUrl: "https://rpc.testnet.near.org",
        isTest: true,
        networkId: "testnet",
        signerAccountId: "bot-account.testnet",
        methodName: "remove_vote_events_batch",
        credentialsPath: `${os.homedir()}/.near-credentials/testnet/bot-account.testnet.json`,
        metavoteContractId: "mpdao-vote-v004.testnet",
    },
    mainnet: {
        voteContractId: "kv-user-store.near",
        folderContractId: "campaigns.meta-vote.near",
        rpcUrl: "https://rpc.mainnet.near.org",
        isTest: false,
        networkId: "mainnet",
        signerAccountId: "bot-account.near",
        methodName: "purge_votes_by_list",
        credentialsPath: `${os.homedir()}/.near-credentials/mainnet/bot-account.near.json`,
        metavoteContractId: "xxx.app",
    },
};

export const CONFIG = CONFIGS[env];
export const NETWORK_ID = CONFIG.networkId;
