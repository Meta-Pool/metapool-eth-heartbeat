import { JsonRpcProvider, Provider } from "@near-js/providers";
import { CONFIG } from "../config_kv";
import { InMemoryKeyStore } from "@near-js/keystores";
import { KeyPair } from "@near-js/crypto";
import { KeyPairSigner } from "@near-js/signers";
import { Account } from "@near-js/accounts";
import * as fs from "fs";

// ========================
// ===== Types Section ====
// ========================

interface Folder {
    name: string;
    folder_id: number;
    end_vote_timestamp: number;
    [key: string]: any;
}

interface VoteRecord {
    voter_id: string;
    timestamp: number;
    contract_address: string;
    votable_object_id: string;
    voting_power: string;
    action: string;
}

// ========================
// ===== Types Section ====
// ========================


// ============================
// ===== Helper Functions =====
// ============================

/**
 * Parses the raw response from a NEAR view function call,
 * decoding Base64 into UTF-8 and then parsing it as JSON.
 */
function parseQueryResponse(response: any): any[] {
    const rawJson = Buffer.from(response.result).toString("utf-8");
    return JSON.parse(rawJson);
}

/**
 * Transforms raw vote records (received as [accountId, record] tuples)
 * into a normalized array of VoteRecord objects.
 */
function extractVoteRecords(rawRecords: [string, any][]): VoteRecord[] {
    return rawRecords.map(([accountId, record]) => ({
        voter_id: accountId,
        timestamp: record.timestamp,
        contract_address: record.contract_address,
        votable_object_id: record.votable_object_id,
        voting_power: record.voting_power,
        action: record.action,
    }));
}

/**
 * Attempts to extract a project name from a votable_object_id.
 * Returns null if the format doesn't include a valid `.near` or `.testnet` suffix.
 */
function extractProjectName(votable_object_id: string): string | null {
    const [, full] = votable_object_id.split("|");
    if (!full) return null;
    const parts = full.split("-");
    const nameCandidate = parts.slice(0, -1).join("-").trim();
    const accountPart = parts[parts.length - 1];
    if (!accountPart?.endsWith(".near") && !accountPart?.endsWith(".testnet")) return null;
    return nameCandidate;
}

/**
 * Returns a dynamic number of milliseconds based on network type:
 * - In testnet, returns `testMinutes` converted to ms.
 * - In mainnet, returns `realDays` converted to ms.
 */
function dynamicMs(realDays: number, testMinutes: number): number {
    return CONFIG.isTest ? minutesToMs(testMinutes) : daysToMs(realDays);
}

/**
 * Converts days into milliseconds.
 */
function daysToMs(days: number): number {
    return days * 24 * 60 * 60 * 1000;
}

/**
 * Converts minutes into milliseconds.
 */
function minutesToMs(minutes: number): number {
    return minutes * 60 * 1000;
}

/**
 * Separates the full list of vote records into two subsets:
 * - Initiatives votes
 * - Metastaking votes
 */
function splitByContract(voteRecords: VoteRecord[]) {
    const initiativesVotes = voteRecords.filter((r) => r.contract_address === "initiatives");
    const metastakingVotes = voteRecords.filter((r) => r.contract_address === "metastaking.app");
    return { initiativesVotes, metastakingVotes };
}

/**
 * Devuelve una instancia de Account autenticada con el signer local.
 */
async function getAuthenticatedAccount(provider: JsonRpcProvider): Promise<Account> {
    const keyFile = JSON.parse(fs.readFileSync(CONFIG.credentialsPath, "utf-8"));
    const keyPair = KeyPair.fromString(keyFile.private_key);

    const keyStore = new InMemoryKeyStore();
    await keyStore.setKey(CONFIG.networkId, CONFIG.signerAccountId, keyPair);

    const signer = new KeyPairSigner(keyPair);
    return new Account(CONFIG.signerAccountId, provider as unknown as Provider, signer); // ✅ bypass de tipos

}

function accumulateReasons(reasons: string[], counts: Record<string, number>) {
    for (const reason of reasons) {
        counts[reason] = (counts[reason] || 0) + 1;
    }
}



// ============================
// ===== Helper Functions =====
// ============================

// ============================
// ===== Fetch Functions =====
// ============================

/**
 * Queries the vote contract to retrieve all registered vote records
 * across all users. Parses and normalizes them into VoteRecord[].
 */
async function fetchVoteRecords(provider: JsonRpcProvider): Promise<VoteRecord[]> {
    const response: any = await provider.query({
        request_type: "call_function",
        account_id: CONFIG.voteContractId,
        method_name: "get_all_vote_records",
        args_base64: Buffer.from("{}").toString("base64"),
        finality: "optimistic",
    });

    const rawRecords = parseQueryResponse(response);
    return extractVoteRecords(rawRecords);
}

/**
 * Queries the folder contract to fetch the list of campaign folders.
 * Each folder includes a name and an end_vote_timestamp.
 */
async function fetchCampaignFolders(provider: JsonRpcProvider): Promise<Folder[]> {
    const response: any = await provider.query({
        request_type: "call_function",
        account_id: CONFIG.folderContractId,
        method_name: "get_folders",
        args_base64: Buffer.from("{}").toString("base64"),
        finality: "optimistic",
    });

    return JSON.parse(Buffer.from(response.result).toString());
}

// ============================
// ===== Fetch Functions =====
// ============================


// ============================
// ===== Logic Functions =====
// ============================

/**
 * Determines whether a vote related to the "initiatives" contract should be purged.
 * This function evaluates the age of the vote, checks if it belongs to a known campaign,
 * and ensures a grace period has passed since the campaign ended.
 *
 * @param vote - The vote record to evaluate.
 * @param projectName - The extracted project name from the votable_object_id.
 * @param campaignMap - A map of project names to their campaign end timestamps (in ms).
 * @param now - Current timestamp in milliseconds.
 * @param thresholds - An object containing:
 *   - `age`: minimum age required for a vote to be eligible for purging.
 *   - `grace`: minimum time (after campaign end) before a vote can be purged.
 * @param isCorrectMonth - Whether the current purge logic is being executed in a valid month window.
 *
 * @returns An object:
 *   - `purge`: boolean indicating if the vote should be purged.
 *   - `reasons`: array of human-readable reasons explaining why a vote was not purged.
 *   - `flags`: diagnostic flags showing which conditions were met or not.
 */
function shouldPurgeInitiativesVote(
    vote: VoteRecord,
    projectName: string | null,
    campaignMap: Map<string, number>,
    now: number,
    thresholds: { age: number; grace: number },
    isCorrectMonth: boolean
): { purge: boolean; reasons: string[]; flags: any } {
    const reasons: string[] = [];
    const flags = {
        passedThreshold: false,
        projectInMap: false,
        passedCampaignEnd: false,
        isCorrectMonth,
    };

    if (vote.timestamp < now - thresholds.age) {
        flags.passedThreshold = true;

        if (projectName && campaignMap.has(projectName)) {
            flags.projectInMap = true;
            const campaignEnd = campaignMap.get(projectName)!;

            if (isCorrectMonth && now > campaignEnd + thresholds.grace) {
                flags.passedCampaignEnd = true;
                return { purge: true, reasons, flags };
            }

            if (!isCorrectMonth) reasons.push("Not a valid month");
            if (now <= campaignEnd + thresholds.grace) {
                reasons.push("Less than 20 days (or 5 min testnet) since campaign ended");
            }
        } else {
            reasons.push("Project not found in campaign map");
        }
    } else {
        reasons.push("Vote too recent (<30 days or <1 min testnet)");
    }

    return { purge: false, reasons, flags };
}

/**
 * Determines whether a vote related to the "metastaking.app" contract should be purged.
 * A vote is purgeable only if it exceeds the minimum age AND the current month is even.
 *
 * @param vote - The vote record to evaluate.
 * @param now - Current timestamp in milliseconds.
 * @param threshold - Minimum age (in ms) a vote must reach to be considered for purging.
 * @param isEvenMonth - Boolean flag indicating if the current month is even (0 = Jan).
 *
 * @returns An object:
 *   - `purge`: boolean indicating if the vote should be purged.
 *   - `reasons`: array of human-readable reasons explaining why the vote was skipped.
 *   - `flags`: diagnostic flags showing which conditions were met.
 */
function shouldPurgeMetastakingVote(
    vote: VoteRecord,
    now: number,
    threshold: number,
    isEvenMonth: boolean
): {
    purge: boolean;
    reasons: string[];
    flags: {
        passedThreshold: boolean;
        isEvenMonth: boolean;
    };
} {
    const reasons: string[] = [];
    const passedThreshold = vote.timestamp < now - threshold;

    if (!passedThreshold) {
        reasons.push("Vote too recent for metastaking (<60 days or <2 min testnet)");
    }

    if (!isEvenMonth) {
        reasons.push("Not an even month");
    }

    const purge = passedThreshold && isEvenMonth;

    return {
        purge,
        reasons,
        flags: {
            passedThreshold,
            isEvenMonth,
        },
    };
}


// ============================
// ===== Logic Functions =====
// ============================


// =======================
// ==== Send Transactions ===
// =======================

/**
 * Sends a purge request transaction to the vote contract.
 * This transaction removes expired vote positions based on the given list.
 * Authenticates using a key pair loaded from a local credentials file.
 */
async function sendPurgeToKvStore(provider: JsonRpcProvider, purgeRequests: [string, string, string][]) {
    const account = await getAuthenticatedAccount(provider);

    const result = await account.functionCall({
        contractId: CONFIG.voteContractId,
        methodName: CONFIG.methodName,
        args: {
            purge_requests: purgeRequests.map(([voter_id, contract_address, votable_object_id]) => ({
                voter_id,
                contract_address,
                votable_object_id,
            })),
        },
        gas: 300_000_000_000_000n,
        attachedDeposit: 0n,
    });

    console.log("✅ Transaction sent successfully to kv-user-store. Hash:", result.transaction.hash);
}


/**
 * Sends a purge request to meta-vote.
 * This function removes vote positions from the main governance contract.
 * It does NOT perform cross-contract calls to kv-user-store unless the caller is the vote owner.
 */
async function sendPurgeToMetaVote(provider: JsonRpcProvider, purgeRequests: [string, string, string][]) {
    const keyFile = JSON.parse(fs.readFileSync(CONFIG.credentialsPath, "utf-8"));
    const keyPair = KeyPair.fromString(keyFile.private_key);

    const keyStore = new InMemoryKeyStore();
    await keyStore.setKey(CONFIG.networkId, CONFIG.signerAccountId, keyPair);

    const signer = new KeyPairSigner(keyPair);
    const account = new Account(CONFIG.signerAccountId, provider as unknown as Provider, signer);

    const result = await account.functionCall({
        contractId: CONFIG.metavoteContractId,
        methodName: "purge_votes_by_list",
        args: {
            purge_requests: purgeRequests.map(([voter_id, contract_address, votable_object_id]) => [
                voter_id,
                contract_address,
                votable_object_id,
            ]),
        },
        gas: 300_000_000_000_000n,
        attachedDeposit: 0n,
    });

    console.log("✅ Transaction sent successfully to meta-vote. Hash:", result.transaction.hash);
}


// =======================
// ==== Send Transactions ===
// =======================


// =======================
// ===== Main Program ====
// =======================

async function main() {
    const provider = new JsonRpcProvider({ url: CONFIG.rpcUrl });
    const voteRecords = await fetchVoteRecords(provider);
    console.log("Flattened vote records:");
    console.dir(voteRecords, { depth: null });
    console.log(`Total: ${voteRecords.length} records.\n`);

    const { initiativesVotes, metastakingVotes } = splitByContract(voteRecords);

    const folders = await fetchCampaignFolders(provider);
    const campaignMap = new Map<string, number>();
    folders.forEach((f) => {
        campaignMap.set(f.name.trim(), f.end_vote_timestamp * 1000);
    });

    // Capture the current timestamp and determine if the current month is even.
    // - `now`: current time in milliseconds (used for timestamp comparisons).
    // - `realMonthNumber`: month of the year as a 1-based index (January = 1, ..., December = 12).
    // - `isEvenMonth`: true if the current month number is even (used to restrict purging logic to even months only).

    const now = Date.now();
    const realMonthNumber = new Date().getMonth() + 1; // getMonth() is 0-based, so we add 1
    const isEvenMonth = realMonthNumber % 2 === 0;

    const isCorrectMonth = true;

    const AGE_THRESHOLD_INITIATIVES = dynamicMs(30, 1);
    const POST_ENDING_THRESHOLD_CAMPAING = dynamicMs(20, 5);
    const AGE_THRESHOLD_METASTAKING = dynamicMs(60, 2);

    const purgeRequests: [string, string, string][] = [];
    const reasonCounts: Record<string, number> = {};

    for (const vote of initiativesVotes) {
        const projectName = extractProjectName(vote.votable_object_id);
        const { purge, reasons, flags } = shouldPurgeInitiativesVote(
            vote,
            projectName,
            campaignMap,
            now,
            { age: AGE_THRESHOLD_INITIATIVES, grace: POST_ENDING_THRESHOLD_CAMPAING },
            isCorrectMonth
        );

        if (purge) {
            purgeRequests.push([vote.voter_id, vote.contract_address, vote.votable_object_id]);
        }

        console.log("Validation summary (grants & memes):", {
            vote_id: vote.votable_object_id,
            ...flags,
            addedToPurge: purge,
            reasons,
        });

        if (!purge) {
            accumulateReasons(reasons, reasonCounts);
        }

    }

    for (const vote of metastakingVotes) {
        const { purge, reasons, flags } = shouldPurgeMetastakingVote(
            vote,
            now,
            AGE_THRESHOLD_METASTAKING,
            isEvenMonth
        );

        if (purge) {
            purgeRequests.push([vote.voter_id, vote.contract_address, vote.votable_object_id]);
        }

        console.log("Validation summary (metastaking):", {
            vote_id: vote.votable_object_id,
            ...flags,
            addedToPurge: purge,
            reasons,
        });

        if (!purge) {
            accumulateReasons(reasons, reasonCounts);
        }

    }

    console.log(`\n Final purge list: ${purgeRequests.length}`);
    console.dir(purgeRequests, { depth: null });

    console.log("\nSummary of reasons for skipping purge:");
    for (const [reason, count] of Object.entries(reasonCounts)) {
        console.log(`${reason}: ${count}`);
    }

    if (purgeRequests.length > 0) {
        await sendPurgeToKvStore(provider, purgeRequests);
        await sendPurgeToMetaVote(provider, purgeRequests);
    } else {
        console.log("There are no votes to purge.");
    }
}

main().catch(console.error);
