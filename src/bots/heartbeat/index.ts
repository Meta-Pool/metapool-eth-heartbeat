import { BareWebServer, respond_error } from "../../bare-web-server";
import { loadJSON, saveJSON } from "./save-load-JSON"
import * as http from 'http';
import * as url from 'url';
import * as os from 'os';
import * as snapshot from './snapshot.js';
import { tail } from "./util/tail";
import { LiquidityData, StakingData, WithdrawData } from "./contractData";
import { StakingContract } from "../../ethereum/stakingContract";
import { LiquidityContract } from "../../ethereum/liquidity";
import { ZEROS_9, getNodesBalance } from "../nodesBalance";
import { activateValidator } from "../activateValidator";
import { alertCreateValidators, getDeactivateValidatorsReport as getDeactivateValidatorsReport } from "../validatorsAlerts";
import { getEnv } from "../../entities/env";
import { checkAuroraDelayedUnstakeOrders } from "../moveAuroraDelayedUnstakeOrders";
import { WithdrawContract } from "../../ethereum/withdraw";
import { BASE_BEACON_CHAIN_URL_SITE, getIncomeDetailHistory, getValidatorProposal, sumPenalties, sumRewards } from "../../services/beaconcha/beaconcha";
import { ValidatorDataResponse } from "../../services/beaconcha/beaconcha";
import { sendEmail } from "../../utils/mailUtils";
import { IMailReportHelper, Severity } from "../../entities/emailUtils";
import { IBeaconChainHeartBeatData, IIncomeDetailHistoryData, IIncomeDetailHistoryResponse, IValidatorProposal } from "../../services/beaconcha/entities";
import { calculateEstimatedMpEthPrice, calculateLpPrice, calculateMpEthPrice } from "../../utils/priceUtils";
import { getAllValidatorsIDH, refreshBeaconChainData as refreshBeaconChainData, setIncomeDetailHistory } from "../../services/beaconcha/beaconchaHelper";
import { alertCheckProfit } from "../profitChecker";
import { U128String } from "./snapshot.js";
import { checkForPenalties, reportWalletsBalances } from "../reports/reports";
import { StakingManagerContract } from "../../ethereum/auroraStakingManager";
import path from "path";
import { ethToGwei, etow, weiToGWei, wtoe } from "../../utils/numberUtils";

export let globalPersistentData: PersistentData
export let globalBeaconChainData: IBeaconChainHeartBeatData
export let idhBeaconChainCopyData: Record<number, IIncomeDetailHistoryData[]>
const NETWORK = getEnv().NETWORK
const hostname = os.hostname()
let server: BareWebServer;
let server80: BareWebServer;
let MONITORING_PORT = 7010
let serverStartedTimestamp: number;
let executing: boolean = false
export let isDebug: boolean = false
export let isTestnet: boolean = false
let loopsExecuted = 0;
let blockedExecutionCount = 0;
const MAX_BLOCKED_EXECUTION_COUNT = 3;
export let globalStakingData: StakingData
export let globalLiquidityData: LiquidityData
export let globalWithdrawdata: WithdrawData
export const stakingContract: StakingContract = new StakingContract()
export const liquidityContract: LiquidityContract = new LiquidityContract()
export const withdrawContract: WithdrawContract = new WithdrawContract()

//time in ms
export const MS_IN_SECOND = 1000
export const MS_IN_MINUTES = 60 * MS_IN_SECOND
export const MS_IN_HOUR = 60 * MS_IN_MINUTES
export const MS_IN_DAY = 24 * MS_IN_HOUR
const INTERVAL = 5 * MS_IN_MINUTES

const TotalCalls = {
    beats: 0,
    stake: 0,
    unstake: 0,
    ping: 0,
    distribute_rewards: 0,
    retrieve: 0
}

export interface PriceData {
    dateISO: string
    price: string
    assets: string
    supply: string
}

export interface BalanceData {
    dateISO: string
    balance: string
}

export interface SimpleNumberRecord {
    dateISO: string
    number: number
}

export interface NodeBalance {
    validatorIndex: number
    balanceData: BalanceData[]
}

export interface PersistentData {
    // Time data
    lastSavedPriceDateISO: string
    beatCount: number
    timestamp: number
    delayedUnstakeEpoch: number
    lastValidatorCheckProposalTimestamp: number

    // Price data
    mpEthPrices: PriceData[]
    lpPrices: PriceData[]
    mpethPrice: string
    estimatedMpEthPrice: string
    lpPrice: string

    // Historical data
    stakingBalances: BalanceData[]
    stakingTotalSupplies: BalanceData[]
    withdrawBalances: BalanceData[]
    liquidityBalances: BalanceData[]
    liquidityMpEthBalances: BalanceData[]
    liqTotalSupplies: BalanceData[]
    historicalNodesBalances: Record<string, BalanceData[]> // Key is node pub key
    requestedDelayedUnstakeBalances: BalanceData[]
    historicalActiveValidators: SimpleNumberRecord[]
    incomeDetailHistory: IIncomeDetailHistoryData[]

    // Current data
    stakingBalance: string
    mpTotalAssets: string
    stakingTotalSupply: string
    liqBalance: string
    liqMpEthBalance: string
    liqTotalSupply: string
    withdrawBalance: string
    totalPendingWithdraws: string
    withdrawAvailableEthForValidators: string
    activeValidatorsQty: number
    createdValidatorsLeft: number
    nodesBalances: Record<string, string> // Key is node pub key
    validatorsLatestProposal: { [validatorIndex: number]: number }
    timeRemainingToFinishMetapoolEpoch: number
    rewardsPerSecondsInWei: string
    lastRewards: U128String
    lastPenalties: U128String
    ethBotBalance: U128String
    aurBotBalance: U128String

    // Chain data
    latestEpochCheckedForReport: number
    latestEpochCheckedForPenalties: number
    latestBeaconChainEpochRegistered: number

    // Testnet helper data
    lastIDHTs?: number
}

function showWho(resp: http.ServerResponse) {
    // resp.write("Show who not implemented yet")
    resp.write(`<div class="top-info">Network:<b>${NETWORK}</b></div>`)
}

function showStats(resp: http.ServerResponse) {
    resp.write("Show stats not implemented yet")
}

function showContractState(resp: http.ServerResponse) {
    resp.write("Show contract state not implemented yet")
}

function showPoolPerformance(resp: http.ServerResponse, jsonOnly?: boolean) {
    try {
        const epochsToDisplay = 10
        let latestCheckedEpoch = Number(globalPersistentData.latestBeaconChainEpochRegistered)

        const idh = globalBeaconChainData.incomeDetailHistory
        const validatorsData = globalBeaconChainData.validatorsData.filter((validatorData: ValidatorDataResponse) => {
            return validatorData.data.status !== "exited"
        })

        // console.log(4, idh)
        console.log(5, latestCheckedEpoch)

        const idhFilteredByEpochDisplay = idh.filter((idhRegistry: IIncomeDetailHistoryData) => {
            return idhRegistry.epoch > latestCheckedEpoch - epochsToDisplay
        })

        const validatorsWithIndex = validatorsData.filter((validatorData: ValidatorDataResponse) => {
            return validatorData.data.validatorindex
        })

        const epochsInYear = 365 * 24 * 60 / 6.4
        let apySum = 0
        let apyCount = 0
        

        const asArray = validatorsWithIndex.map((validatorData: ValidatorDataResponse) => {
            const validatorIndex = validatorData.data.validatorindex

            const idhForValidator = idhFilteredByEpochDisplay.filter((idhRegistry: IIncomeDetailHistoryData) => {
                return idhRegistry.validatorindex === validatorIndex
            })
            
            const epochsData: Record<number, any> = {}
            idhForValidator.forEach((currentIDH: IIncomeDetailHistoryData) => {
                const rewards = weiToGWei(sumRewards(currentIDH.income))
                const penalties = weiToGWei(sumPenalties(currentIDH.income))
                const apy = (((rewards - penalties) * epochsInYear + ethToGwei(32)) / ethToGwei(32) - 1) * 100
                apySum += apy
                apyCount++
                epochsData[currentIDH.epoch] = {
                    rewards,
                    penalties,
                    apy,
                }
            })

            return {
                name: validatorIndex!,
                data: epochsData
            }
        })

        const estimatedAvgApy = apySum / apyCount

        const olderReadEpoch = latestCheckedEpoch - epochsToDisplay + 1
        if (resp) {
            resp.write(`<h3>Rewards and penalties are in gWei (1gWei = 1e9 wei = 1e-9 ETH)</h3>`)
            resp.write(`<div class="perf-table"><table><thead>`);
            resp.write(`
          <tr>
          <th colspan=1>Pool</th>
          `);
            const COLSPAN = 3
            for (let epoch = olderReadEpoch; epoch < latestCheckedEpoch; epoch++) {
                resp.write(`<th colspan=${COLSPAN}>${epoch}</th>`);
            }
            resp.write(`
        <th colspan = 11 >Current ${latestCheckedEpoch} (KEth)</th>
        </tr>
        `);
            resp.write(`
          <tr>
          <th colspan=1></th>
          `);
            for (let epoch = olderReadEpoch; epoch < latestCheckedEpoch; epoch++) {
                //resp.write(`<th>stake</th><th>rewards</th><th>apy</th>`);
                resp.write(`<th>rewards</th><th>penalties</th><th>apy</th>`);
            }
            resp.write(`<th>rewards</th>`);
            resp.write(`<th>penalties</th>`);
            resp.write(`<th>apy</th>`);
            //   resp.write(`<th>mp Stake</th>`);
            //   resp.write(`<th>mp Unstk</th>`);
            //   resp.write(`<th>Unstk epoch</th>`);
            //   resp.write(`<th>Depo/ Wtdr</th>`);
            //   resp.write(`<th>Total stake</th> <th>Bl prod</th> <th>Fee</th>`);
            resp.write(`<th style="text-align:left">Pool</th>`);

            resp.write(`
        </tr></thead>
        `);

            for (let item of asArray) {
                resp.write(`
          <tr>
          <td><a href=${path.join(BASE_BEACON_CHAIN_URL_SITE, item.name.toString())} target="_blank">${item.name}</a></td>
          `);
                for (let epoch = olderReadEpoch; epoch <= latestCheckedEpoch; epoch++) {
                    const info = item.data[epoch]
                    if (!info) {
                        resp.write(`<td></td>`.repeat(COLSPAN));
                    }
                    else {
                        let rewardsText = info.rewards.toFixed(0)
                        if (rewardsText == "0") rewardsText = "-";
                        // if (info.monitoredBalance && yton(info.monitoredBalance) >= 10) {
                        //   valueText += `<br><span style="font-size:75%;color:dark-gray">/${(yton(info.monitoredBalance) / 1e3).toFixed(4)}</span>`;
                        // }
                        resp.write(`<td>${rewardsText}</td>`);

                        let penaltiesText = info.penalties.toFixed(0)
                        if (penaltiesText == "0") penaltiesText = "-";
                        // if (info.monitoredBalance && yton(info.monitoredBalance) >= 10) {
                        //   valueText += `<br><span style="font-size:75%;color:dark-gray">/${(yton(info.monitoredBalance) / 1e3).toFixed(4)}</span>`;
                        // }
                        resp.write(`<td>${penaltiesText}</td>`);

                        //resp.write(`<td>${pctInterestEpoch.toFixed(5)}%</td>`);
                        //const apy = ((1 + pctInterestEpoch / 100) ** (epochsInYear) - 1) * 100
                        let apy = info.apy
                        if (isNaN(apy)) {
                            apy = 0
                        }
                        
                        let bgTone = 64 + (apy - estimatedAvgApy) * 128
                        if (bgTone > 255) bgTone = 255;
                        if (bgTone < -255) bgTone = -255;
                        bgTone = Math.trunc(bgTone)
                        if (bgTone >= 0) {
                            resp.write(`<td style="background-color:rgb(${255 - bgTone},255,${255 - bgTone})">${apy.toFixed(2)}%</td>`);
                        }
                        else {
                            resp.write(`<td style="background-color:rgb(255,${255 + bgTone / 2},${255 + bgTone})">${apy.toFixed(2)}%</td>`);
                        }
                    }

                    if (epoch === latestCheckedEpoch) {
                        resp.write(`
                            <td><a href=${path.join(BASE_BEACON_CHAIN_URL_SITE, item.name.toString())} target="_blank">${item.name}</a></td>
                            </tr>
                        `);
                    }
                }

                // last column, current info from near core + info from sp in contract
                //     const sp = globalPools.find(asp => asp.account_id == item.name)
                //       || {
                //         inx: -1,
                //         account_id: item.name,
                //         weight_basis_points: 0,
                //         staked: "0",//u128
                //         unstaked: "0",//u128
                //         unstaked_requested_epoch_height: "0", //U64String, 
                //         last_asked_rewards_epoch_height: "0", //U64String,
                //       } as StakingPoolJSONInfo;

                //     // try to get current total stake from current+next validators list
                //     const val = perfData.ncore[item.name]
                //     let totalStakeString = "--"
                //     let monitoredStakeString = "--"
                //     let blockProductionPctString = "--"
                //     let closeToSeatString = ""
                //     let totalStakeStyle = `font-size:small`
                //     let blockProductionStyle = ""
                //     if (val) {
                //       totalStakeString = (val.stake / 1000).toFixed(2)
                //       blockProductionPctString = val.isCurrent ? val.blockProductionPct.toFixed() + "%" : "next"
                //       if (val.isCurrent && val.blockProductionPct <= 92) blockProductionStyle = "background-color:orange"
                //       if (globalSeatPrices && val.stake < globalSeatPrices.seatNextPrice * 1.1) {
                //         const diff = val.stake - globalSeatPrices.seatNextPrice
                //         closeToSeatString = (Math.sign(diff) == -1 ? "" : "+") + (diff / 1000).toFixed(2)
                //         if (diff <= 0) {
                //           totalStakeStyle += `;background-color:lightyellow`
                //         }
                //       }
                //     }
                //     if (totalStakeString == "--") {
                //       const lastEpochData = item.data[latestCheckedEpoch - 1]
                //       if (lastEpochData && lastEpochData.totalStake != "") totalStakeString = (yton(lastEpochData.totalStake) / 1000).toFixed(2)
                //     }
                //     // check if we have last performance data
                //     const lpd = globalPersistentData.lastPerformanceCalculation.find(i => i.name == item.name)
                //     const lpdText = lpd ? ((lpd.bp / 100).toFixed(2) + "%") : ""
                //     resp.write(
                //       `<td><small>${lpdText}</small></td>` +
                //       `<td><small>${(sp.weight_basis_points / 100).toFixed(2)}%</small></td>` +
                //       `<td>${asNearK((BigInt(globalContractState.total_for_staking) * BigInt(sp.weight_basis_points) / BigInt(10000)).toString())}</td>` +
                //       `<td>${asNearK(sp.staked)}</td>` +
                //       `<td>${asNearK(sp.unstaked)}</td>` +
                //       `<td>${sp.unstaked_requested_epoch_height == "0" ? "" : Number(sp.unstaked_requested_epoch_height) - latestCheckedEpoch}</td>` +
                //       `<td>${asNearK((BigInt(sp.staked) - BigInt(lastEpochStake) + BigInt(sp.unstaked)).toString())}</td>` +
                //       `<td style="${totalStakeStyle}">${totalStakeString}</td>` +
                //       //`<td style="${totalStakeStyle}">${closeToSeatString}</td>` +
                //       `<td style="${blockProductionStyle}">${blockProductionPctString}</td>` +
                //       `<td>${item.data[latestCheckedEpoch] ? item.data[latestCheckedEpoch].fee.toFixed() : "--"}</td>`
                //     );
                //     // pool name again
                //     resp.write(`<td style="text-align:left">${item.name}</td>`)
                //     resp.write(`</tr>`)
            }

            //   resp.write(`</tbody></table></div>`);
            //   resp.write(`<p>Total old balance:${yton(perfData.oldBalance)}, Total rewards:${yton(perfData.totalRewards)},` +
            //     ` Metapool epoch APY:${perfData.apy}, AVG Apy: ${perfData.avgApy}</p>`);
            //   const epochsInYear = 365 * 24 / (epochInfo.prev_epoch_duration_ms / HOURS) // an epoch is 15 hs approx
            //   resp.write(`<p>Last epoch:${Number(globalContractState.env_epoch_height) - 1}, duration:${(epochInfo.prev_epoch_duration_ms / HOURS).toFixed(2)} hs, Epochs per year:${epochsInYear.toFixed(2)}` +
            //     `, Management Fee:${globalContractParams.operator_rewards_fee_basis_points / 100}%</p>`);

            //   writeExtraStats(resp)
            // resp.write(`<script>
            // let table = document.querySelector(".perf-table")
            // table.querySelectorAll("th").forEach((th, position) => {
            //    th.addEventListener("click", evt => sortTable(table, position));
            //   });
            // </script>
            // `);
        }

    } catch (ex: any) {
        resp.write("<pre>" + ex.message + "</pre>");
    }
}

export function appHandler(server: BareWebServer, urlParts: url.UrlWithParsedQuery, req: http.IncomingMessage, resp: http.ServerResponse) {

    resp.on("error", (err) => { console.error(err) })

    const SLASH_METRICS = "/metrics"

    //urlParts: the result of nodejs [url.parse] (http://nodejs.org/docs/latest/api/url.html)
    //urlParts.query: the result of nodejs [querystring.parse] (http://nodejs.org/api/querystring.html)

    try {
        const pathname: string = urlParts.pathname || "/";
        // no favicon, no directory navigation
        if (pathname === '/favicon.ico' || pathname.includes("..")) {
            respond_error(404, "", resp)
            return true;
        }
        else if (pathname === '/index.css') {
            server.writeFileContents('index.css', resp);
        }
        else if (pathname.endsWith('.js')) {
            resp.setHeader("content-type", "application/javascript")
            server.writeFileContents(pathname.slice(1), resp);
        }
        else if (pathname === '/ping') {
            resp.end("pong");
        }
        else if (pathname === '/epoch') {
            resp.setHeader("Access-Control-Allow-Origin", "*")
            // CHECK
            // resp.end(JSON.stringify(epoch));
        }
        // /metrics*
        else if (pathname.startsWith(SLASH_METRICS)) {
            resp.setHeader("Access-Control-Allow-Origin", "*")
            const snap = snapshot.fromGlobalState()
            const rest = pathname.slice(SLASH_METRICS.length)
            if (rest === "_json") {
                // metrics_json
                resp.setHeader("content-type", 'application/json; version=0.0.4; charset=utf-8')
                resp.write(JSON.stringify(snap))
                resp.end()
                return true;
            }
            if (rest === "_hr") {
                // metrics_hr human readable
                resp.setHeader("content-type", 'application/json; version=0.0.4; charset=utf-8')
                resp.write(JSON.stringify(snapshot.fromGlobalStateForHuman()))
                resp.end()
                return true;
            }
            if (rest === "_front") {
                // metrics_hr human readable
                resp.setHeader("content-type", 'application/json; version=0.0.4; charset=utf-8')
                resp.write(JSON.stringify(snapshot.forFront()))
                resp.end()
                return true;
            }
            // let assume all responses are text
            resp.setHeader("content-type", 'text/plain; version=0.0.4; charset=utf-8')
            if (rest === "") {
                // just /metrics
                for (const key in snap) {
                    let value = snap[key as keyof snapshot.Snapshot]
                    if (value == null || value == undefined) { value = 0 }
                    resp.write(`metapool_eth_${key} ${value}\n`)
                }
                resp.end()
                return true;
            }
            else if (rest === '/price/stnear-near') {
                //   resp.end(ytonFull(globalContractState.st_near_price));
            }
            else if (rest === '/price/stnear-usd') {
                resp.end(snap.st_near_price_usd.toString());
            }
            else if (rest === '/supply/stnear') {
                //   resp.end(ytonFull(globalContractState.total_stake_shares));
            }
            else if (rest === '/price/meta-stnear') {
                resp.end(snap.ref_meta_price.toString())
            }
            else if (rest === '/price/meta-usd') {
                resp.end(snap.ref_meta_price_usd.toString())
            }
            else if (rest === '/supply/meta') {
                resp.end(snap.meta_token_supply.toString())
            }
            else {
                respond_error(404, "invalid url " + pathname, resp)
                return true;
            }
        }
        else if (pathname === '/perf_json') {
            // showPoolPerformance(resp, true);
        }
        else {
            if (req.socket.localPort == 80) {
                resp.end();
                return true;
            }
            //--------------
            //HTML RESPONSE
            //--------------

            //base header
            server.writeFileContents('index1-head.html', resp, { hostname });

            //config info
            showWho(resp)

            //base center
            server.writeFileContents('index2-center.html', resp);

            //GET / (root) adds stats
            if (pathname === '/') { //stats
                showStats(resp);
            }

            //GET /state show contract state
            else if (pathname === '/state') {
                showContractState(resp);
            }

            //GET /perf show pools performance
            else if (pathname === '/perf') {
                showPoolPerformance(resp);
            }

            //GET /log show process log
            else if (pathname === '/log') {
                resp.write("<pre>");
                resp.write(tail("main.log"));
                resp.write("</pre>");
                server.writeFileContents('index3-footer.html', resp);
            }
            else {
                // GET /yyy
                resp.write(`<p>invalid path ${pathname}</p>`);
            }

            //close </html> response page
            server.writeFileContents('index3-footer.html', resp);
        }

        resp.end();

    }

    catch (ex: any) {
        try {
            respond_error(505, ex.message, resp)
        }
        catch (ex2) { console.log(ex2) }
        console.log(ex)
    }

    return true;
}

async function refreshOtherMetrics() {
    const aurContract = new StakingManagerContract()
    const [
        ethBotWalletBalance,
        aurBotWalletBalance,
    ] = await Promise.all([
        stakingContract.getWalletBalance(stakingContract.connectedWallet.address),
        aurContract.getWalletBalance(aurContract.connectedWallet.address),
    ])

    globalPersistentData.ethBotBalance = ethBotWalletBalance.toString()
    globalPersistentData.aurBotBalance = aurBotWalletBalance.toString()

    if (isDebug) console.log("Other metrics refreshed")
}

async function refreshStakingData() {
    const [
        stakingBalance,
        totalAssets,
        totalSupply,
        totalUnderlying,
        estimatedRewardsPerSecond,
        submitReportUnlockTime, // Last time updateNodesBalanceWasCalled
        // nodesAndWithdrawalTotalBalance,
        decimals,
        name,
        rewardsFee,
        symbol,
        totalNodesActivated,
        whitelistEnabled,
        depositFee,
        submitReportTimelock,
        minDeposit
    ] = await Promise.all([
        stakingContract.getWalletBalance(stakingContract.address),
        stakingContract.totalAssets(),
        stakingContract.totalSupply(),
        stakingContract.totalUnderlying(),
        stakingContract.estimatedRewardsPerSecond(),
        stakingContract.submitReportUnlockTime(),

        stakingContract.decimals(),
        stakingContract.name(),
        stakingContract.rewardsFee(),
        stakingContract.symbol(),
        stakingContract.totalNodesActivated(),
        stakingContract.whitelistEnabled(),
        stakingContract.depositFee(),
        stakingContract.submitReportTimelock(),
        stakingContract.minDeposit(),
    ])

    globalStakingData = {
        stakingBalance,
        totalAssets,
        totalSupply,
        totalUnderlying,
        estimatedRewardsPerSecond,
        submitReportUnlockTime,

        decimals: Number(decimals),
        name,
        rewardsFee: Number(rewardsFee),
        symbol,
        totalNodesActivated: Number(totalNodesActivated),
        whitelistEnabled,
        depositFee: Number(depositFee),
        submitReportTimelock: Number(submitReportTimelock),
        minDeposit
    }

    if (isDebug) console.log("Staking data refreshed")
}

async function refreshLiquidityData() {
    const [
        totalAssets,
        totalSupply,

        mpEthBalance,
        name,
        symbol,
        // MAX_FEE,
        // MIN_FEE,
        targetLiquidity,
        decimals,
        minDeposit,
        liquidityBalance,
        minFee,
        maxFee,
    ] = await Promise.all([
        liquidityContract.totalAssets(),
        liquidityContract.totalSupply(),

        stakingContract.balanceOf(liquidityContract.address),
        liquidityContract.name(),
        liquidityContract.symbol(),
        // liquidityContract.MAX_FEE(),
        // liquidityContract.MIN_FEE(),
        liquidityContract.targetLiquidity(),
        liquidityContract.decimals(),
        liquidityContract.minDeposit(),
        liquidityContract.getWalletBalance(liquidityContract.address),
        liquidityContract.minFee(),
        liquidityContract.maxFee(),
    ])


    globalLiquidityData = {
        totalAssets,
        totalSupply,

        liquidityBalance,
        mpEthBalance,
        name,
        symbol,
        // MAX_FEE: Number(MAX_FEE),
        // MIN_FEE: Number(MIN_FEE),
        targetLiquidity,
        decimals: Number(decimals),
        minDeposit,
        minFee: Number(minFee),
        maxFee: Number(maxFee),
    }

    globalPersistentData.lpPrice = calculateLpPrice().toString()
    if (isDebug) console.log("Liq data refreshed")
}

async function refreshWithdrawData() {
    const [
        balance,
        epoch,
        epochTimeLeft,
        startTimestamp,
        totalPendingWithdraw,
        withdrawalsStartEpoch,
        validatorsDisassembleTime
    ] = await Promise.all([
        withdrawContract.getWalletBalance(withdrawContract.address),
        withdrawContract.getEpoch(),
        withdrawContract.getEpochTimeLeft(),
        withdrawContract.startTimestamp(),
        withdrawContract.totalPendingWithdraw(),
        withdrawContract.withdrawalsStartEpoch(),
        withdrawContract.validatorsDisassembleTime(),
    ])


    globalWithdrawdata = {
        balance,
        epoch: Number(epoch),
        epochTimeLeft: Number(epochTimeLeft),
        startTimestamp: Number(startTimestamp),
        totalPendingWithdraw,
        withdrawalsStartEpoch: Number(withdrawalsStartEpoch),
        validatorsDisassembleTime,
    }
    if (isDebug) console.log("Withdraw data refreshed")
}

function refreshContractData() {
    globalPersistentData.stakingBalance = globalStakingData.stakingBalance.toString()
    globalPersistentData.liqBalance = globalLiquidityData.liquidityBalance.toString()
    globalPersistentData.liqMpEthBalance = globalLiquidityData.mpEthBalance.toString()
    globalPersistentData.withdrawBalance = globalWithdrawdata.balance.toString()
    globalPersistentData.totalPendingWithdraws = globalWithdrawdata.totalPendingWithdraw.toString()
    globalPersistentData.withdrawAvailableEthForValidators = (globalWithdrawdata.balance - globalWithdrawdata.totalPendingWithdraw).toString()
    globalPersistentData.timeRemainingToFinishMetapoolEpoch = Number(globalWithdrawdata.epochTimeLeft.toString())

    globalPersistentData.mpethPrice = calculateMpEthPrice().toString()
    globalPersistentData.estimatedMpEthPrice = calculateEstimatedMpEthPrice().toString()
    globalPersistentData.stakingTotalSupply = globalStakingData.totalSupply.toString()
    globalPersistentData.liqTotalSupply = globalLiquidityData.totalSupply.toString()
    globalPersistentData.rewardsPerSecondsInWei = globalStakingData.estimatedRewardsPerSecond.toString()

    globalPersistentData.activeValidatorsQty = globalBeaconChainData.validatorsData.reduce((acc: number, curr: ValidatorDataResponse) => {
        if (curr.data.status === "active" || curr.data.status === "active_offline" || curr.data.status === "active_online") {
            return acc + 1
        } else {
            return acc
        }
    }, 0)

    if (!globalPersistentData.nodesBalances) globalPersistentData.nodesBalances = {}
    globalBeaconChainData.validatorsData.forEach((node: ValidatorDataResponse) => {
        globalPersistentData.nodesBalances[node.data.pubkey] = node.data.balance.toString() + ZEROS_9
    })
    if (isDebug) console.log("Contract data refreshed")
}

//utility
async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loga(label: string, amount: number) {
    console.log(label.padEnd(26), ":", amount.toFixed(5).padStart(16))
}

async function refreshMetrics() {
    await Promise.all([
        refreshStakingData(),
        refreshLiquidityData(),
        refreshWithdrawData(),
        refreshBeaconChainData(),
        refreshOtherMetrics(),
    ]) // These calls can be executed in parallel
    refreshContractData() // Contract data depends on previous refreshes
    console.log("Metrics promises fullfilled")
}

async function initializeUninitializedGlobalData() {
    if (!globalPersistentData.lpPrices) {
        globalPersistentData.lpPrices = []
    }
    if (!globalPersistentData.mpEthPrices) {
        globalPersistentData.mpEthPrices = []
    }
    if (!globalPersistentData.delayedUnstakeEpoch) {
        globalPersistentData.delayedUnstakeEpoch = 0
    }
    if (!globalPersistentData.validatorsLatestProposal) {
        globalPersistentData.validatorsLatestProposal = {}
    }

    if (!globalPersistentData.stakingBalances) globalPersistentData.stakingBalances = []
    if (!globalPersistentData.liquidityBalances) globalPersistentData.liquidityBalances = []
    if (!globalPersistentData.liquidityMpEthBalances) globalPersistentData.liquidityMpEthBalances = []
    if (!globalPersistentData.withdrawBalances) globalPersistentData.withdrawBalances = []
    if (!globalPersistentData.requestedDelayedUnstakeBalances) globalPersistentData.requestedDelayedUnstakeBalances = []
    if (!globalPersistentData.stakingTotalSupplies) globalPersistentData.stakingTotalSupplies = []
    if (!globalPersistentData.liqTotalSupplies) globalPersistentData.liqTotalSupplies = []
    if (!globalPersistentData.historicalActiveValidators) globalPersistentData.historicalActiveValidators = []

    if (!globalPersistentData.historicalNodesBalances) globalPersistentData.historicalNodesBalances = {}

    if (!globalPersistentData.lastValidatorCheckProposalTimestamp) globalPersistentData.lastValidatorCheckProposalTimestamp = 0

    if (!globalPersistentData.lastIDHTs) {
        const now = new Date()
        const nowMinus6Hours = now.setHours(now.getHours() - 6)
        globalPersistentData.lastIDHTs = nowMinus6Hours
    }

    if (!globalPersistentData.lastRewards) globalPersistentData.lastRewards = "0"
    if (!globalPersistentData.lastPenalties) globalPersistentData.lastPenalties = "0"
    if (!globalPersistentData.latestEpochCheckedForPenalties) globalPersistentData.latestEpochCheckedForPenalties = 192000
    if (!globalPersistentData.latestBeaconChainEpochRegistered) globalPersistentData.latestBeaconChainEpochRegistered = 192000
    
    if (!globalBeaconChainData.incomeDetailHistory) globalBeaconChainData.incomeDetailHistory = []

    if (isDebug) console.log("Global state initialized successfully")
}

function updateDailyGlobalData(currentDateISO: string) {
    globalPersistentData.lpPrices.push({
        dateISO: currentDateISO,
        // price: globalContractState.nslp_share_price,
        price: calculateLpPrice().toString(),
        assets: globalLiquidityData.totalAssets.toString(),
        supply: globalLiquidityData.totalSupply.toString(),
    });

    globalPersistentData.mpEthPrices.push({
        dateISO: currentDateISO,
        price: calculateEstimatedMpEthPrice().toString(),
        assets: globalStakingData.totalAssets.toString(),
        supply: globalStakingData.totalSupply.toString(),
    });

    globalPersistentData.stakingBalances.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.stakingBalance
    })
    globalPersistentData.liquidityBalances.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.liqBalance
    })
    globalPersistentData.liquidityMpEthBalances.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.liqMpEthBalance
    })
    globalPersistentData.withdrawBalances.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.withdrawBalance
    })
    globalPersistentData.requestedDelayedUnstakeBalances.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.totalPendingWithdraws
    })
    globalPersistentData.stakingTotalSupplies.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.stakingTotalSupply
    })

    globalPersistentData.liqTotalSupplies.push({
        dateISO: currentDateISO,
        balance: globalPersistentData.liqTotalSupply
    })
    globalPersistentData.historicalActiveValidators.push({
        dateISO: currentDateISO,
        number: globalPersistentData.activeValidatorsQty
    })

    Object.keys(globalPersistentData.nodesBalances).forEach((pubKey: string) => {
        if (!globalPersistentData.historicalNodesBalances[pubKey]) globalPersistentData.historicalNodesBalances[pubKey] = []
        globalPersistentData.historicalNodesBalances[pubKey].push({
            dateISO: currentDateISO,
            balance: globalPersistentData.nodesBalances[pubKey]
        })
    });

    if (isDebug) console.log("Global data refreshed successfully")
}

function truncateLongGlobalArrays() {
    if (globalPersistentData.mpEthPrices.length > 3 * 365) {
        globalPersistentData.mpEthPrices.splice(0, 30);
    }
    if (globalPersistentData.lpPrices.length > 3 * 365) {
        globalPersistentData.lpPrices.splice(0, 30);
    }
}

async function registerValidatorsProposals() {
    globalPersistentData.lastValidatorCheckProposalTimestamp = Date.now()
    const validatorsData: ValidatorDataResponse[] = globalBeaconChainData.validatorsData
    validatorsData.map(async (v: ValidatorDataResponse) => {
        const index = v.data.validatorindex
        if (!index || v.data.status !== "active_online") return
        const proposalData: IValidatorProposal = await getValidatorProposal(index)
        if (proposalData.data && proposalData.data.length > 0) {
            globalPersistentData.validatorsLatestProposal[index] = proposalData.data[0].epoch
        }
    })
    saveGlobalPersistentData()
}

async function beat() {
    TotalCalls.beats++;
    console.log("-".repeat(80))
    console.log(new Date().toString());
    console.log(`BEAT ${TotalCalls.beats} (${globalPersistentData.beatCount ?? 0})`);

    //refresh contract state
    console.log("Refresh metrics")
    await initializeUninitializedGlobalData()
    await refreshMetrics();
    console.log("Metrics refreshed successfully")

    const mailReportsToSend: IMailReportHelper[] = []

    // keep record of stNEAR & LP price to compute APY%
    const currentDate = new Date(new Date().toLocaleString('en', { timeZone: 'America/New_York' })) // -0200. Moved like this so daily report is sent at 22:00 in Argentina
    const currentDateISO = currentDate.toISOString().slice(0, 10)
    const isFirstCallOfTheDay: boolean = globalPersistentData.lastSavedPriceDateISO != currentDateISO
    // if(!isFirstCallOfTheDay && getEnv().NETWORK === "goerli") {
    //     console.log("Ms since las IDH report", Date.now() - globalPersistentData.lastIDHTs!)
    //     const msLeft = 6 * MS_IN_HOUR + 5 * MS_IN_MINUTES - (Date.now() - globalPersistentData.lastIDHTs!)
    //     console.log("Time remaining for next IDH call", sLeftToTimeLeft(msLeft / 1000))
    //     if(Date.now() - globalPersistentData.lastIDHTs! >= 6 * MS_IN_HOUR + 5 * MS_IN_MINUTES) {
    //         console.log("Calling IDH in the middle of the day")
    //         globalPersistentData.lastIDHTs = Date.now()
    //         saveGlobalPersistentData()
    //         if(!isDebug) await setIncomeDetailHistory()
    //     }
    // }
    if (isFirstCallOfTheDay) {
        updateDailyGlobalData(currentDateISO)
        truncateLongGlobalArrays()
        globalPersistentData.lastSavedPriceDateISO = currentDateISO

        saveGlobalPersistentData()

        // ------------------------------
        // Check if a validator can be activated an do it
        // ------------------------------
        console.log("--Checking if a validator can be activated")
        const wasValidatorCreated = await activateValidator()
        console.log("Was validator created?", wasValidatorCreated)

        // if(!isDebug) {
        //     globalPersistentData.lastIDHTs = Date.now()
        //     await setIncomeDetailHistory()
        // }
        
        const dailyReports = await runDailyActionsAndReport()
        mailReportsToSend.push(...dailyReports)
    } // Calls made once a day

    if(Date.now() - globalPersistentData.lastValidatorCheckProposalTimestamp >= 6 * MS_IN_HOUR) { // Calls made every 6 hours
        await registerValidatorsProposals()
        const reportsMadeEvery6Hours: IMailReportHelper[] = await Promise.all([
            checkForPenalties(),
        ])
        mailReportsToSend.push(...reportsMadeEvery6Hours)        

    } // Calls made every 6 hours

    const reports: IMailReportHelper[] = await Promise.all([
        getDeactivateValidatorsReport(),
    ])

    const reportsWithErrors = reports.filter((r: IMailReportHelper) => r.severity !== Severity.OK)
    if(reportsWithErrors.length) {
        mailReportsToSend.push(...reportsWithErrors)
    }

    if(mailReportsToSend.length) {
        buildAndSendReport(mailReportsToSend)
    }

    // Aurora
    console.log("--Checking if order queue should be moved for new contract")
    const wasDelayedUnstakeOrderQueueRunForNewContract = await checkAuroraDelayedUnstakeOrders(false)
    console.log("Order queue moved?", wasDelayedUnstakeOrderQueueRunForNewContract)

    console.log("--Checking if order queue should be moved for old contract")
    const wasDelayedUnstakeOrderQueueRunForOldContract = await checkAuroraDelayedUnstakeOrders(true)
    console.log("Order queue moved?", wasDelayedUnstakeOrderQueueRunForOldContract)

    //refresh contract state
    console.log("Refresh metrics")
    await refreshMetrics();
    console.log("Metrics refreshed successfully")

    //END OF BEAT
    globalPersistentData.beatCount++;
    saveGlobalPersistentData()
}

function saveGlobalPersistentData() {
    saveJSON(globalPersistentData, "persistent.json");
    saveJSON(globalBeaconChainData, "beaconChainPersistentData.json");
}

async function runDailyActionsAndReport(): Promise<IMailReportHelper[]> {
    console.log("Sending daily report")
    const reportHelpersPromises: Promise<IMailReportHelper>[] = [
        alertCreateValidators(),
        alertCheckProfit(),
        reportWalletsBalances(),
    ];
    console.log("--Checking if validators should be created")

    // Resolving reports and catching in case of an error
    const reports: IMailReportHelper[] = await Promise.all((reportHelpersPromises).map((promise: Promise<IMailReportHelper>, index: number) => {
        return promise.catch((err: any) => {
            return {
                ok: false,
                function: `Index ${index}`,
                subject: `Error on index ${index}`,
                body: `Error running function for daily action and report with index ${index}. ${err.message}`,
                severity: Severity.ERROR
            }
        })
    }))
    return reports
    // buildAndSendReport(reports)    
}

function getMetricsUrl() {
    return isDebug || isTestnet ? "https://eth-test.narwallets.com/metrics_hr" : "https://eth-metapool.narwallets.com/metrics_hr"
}

function buildAndSendReport(reports: IMailReportHelper[]) {
    const body = reports.reduce((acc: string, curr: IMailReportHelper) => {
        return `
            ${acc}
            ${"-".repeat(100)}
            Function: ${curr.function}
            Report: ${curr.body}
        `
    }, getMetricsUrl())

    const severity: number = reports.reduce((max: number, currReport: IMailReportHelper) => Math.max(max, currReport.severity), Severity.OK)
    let subject: string = reports.reduce((acc: string, currReport: IMailReportHelper) => {
        if (currReport.ok) {
            return acc
        } else {
            return acc + " - " + currReport.subject
        }
    }, "Daily report")

    // Enum[Enum.value] returns the Enum key
    subject = `[${Severity[severity]}] ${subject}`
    if (isTestnet || isDebug) subject = "[TESTNET]" + subject

    sendEmail(subject, body)
}

function heartLoop() {
    console.log("Running heartLoop")
    if (Date.now() >= serverStartedTimestamp + 2 * MS_IN_HOUR || blockedExecutionCount >= MAX_BLOCKED_EXECUTION_COUNT) {
        // 2 hs loops cycle finished- gracefully end process, pm2 will restart it
        console.log(loopsExecuted, "cycle finished- gracefully end process. BEC:", blockedExecutionCount)
        if (server80 != undefined) {
            try { server80.close() } catch (ex) {
                console.error("server80.close", JSON.stringify(ex))
            }
        }
        try { server.close() } catch (ex) {
            console.error("server.close", JSON.stringify(ex))
        }
        // 2022-4-4 make sure program ends
        setTimeout(() => {
            process.exit(0)
        }, 2000)
        return;
    }

    let nextBeatIn = atLeast(20 * MS_IN_SECOND, INTERVAL);
    console.log("next beat in", Math.trunc(nextBeatIn / MS_IN_SECOND), "seconds")
    setTimeout(heartLoop, nextBeatIn)

    if (executing) {
        blockedExecutionCount++
        console.error("heartLoop, executing=true, missing await")
        return; // in case there's a missing `await`
    }
    blockedExecutionCount = 0
    const beatStartMs = Date.now();
    executing = true;
    beat().catch((ex: any) => {
        console.error("ERR", JSON.stringify(ex))
        console.error("ERR", ex.message)
        console.error("ERR", ex.stack)
    }).finally(() => {
        executing = false;
        const elapsedMs = Date.now() - beatStartMs
        console.log("Beat finished after", elapsedMs, "ms")
        loopsExecuted++;
    })
}

function atLeast(a: number, b: number): number { return Math.max(a, b) }

function processArgs() {
    for (let i = 2; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case "--debug":
                isDebug = true
                MONITORING_PORT = 7011
                break
            default:
                throw new Error(`Unknown arg ${process.argv[i]}`)
        }
    }
    const network = getEnv().NETWORK
    if (network === "goerli") {
        isTestnet = true
        MONITORING_PORT = 7011
    }
}

function run() {
    processArgs()

    globalPersistentData = loadJSON("persistent.json")
    globalBeaconChainData = loadJSON("beaconChainPersistentData.json")
    idhBeaconChainCopyData = loadJSON("idhBeaconChainCopyData.json")
    // if(isDebug) {
    //     // const validatorsIndexes = [198491, 198492, 198493]
    //     const toEpoch = 193758
    //     const fromEpoch = toEpoch - 200
    //     getAllValidatorsIDH(fromEpoch, toEpoch).then((idh: IIncomeDetailHistoryResponse) => {
    //         saveJSON(idh, "idh_test.json")
    //         console.log(idh)
    //     })
    //     // getIncomeDetailHistory(validatorsIndexes, fromEpoch, toEpoch).then((idh: IIncomeDetailHistoryResponse) => {
    //     //     saveJSON(idh, "idh_test.json")
    //     //     console.log(idh)
    //     // })
    //     return
    // }

    if (process.argv.includes("also-80")) {
        try {
            server80 = new BareWebServer('public_html', appHandler, 80) // also start one on port 80 to be able to grab stats from a PHP script in narwallets.com
            server80.start()
        } catch (ex) {
            console.error(ex)
        }
    }
    server = new BareWebServer('public_html', appHandler, MONITORING_PORT)
    server.start()
    //start loop calling heartbeat 
    serverStartedTimestamp = Date.now();
    heartLoop();
}

run()//.catch((reason: any) => console.error("Main err", reason.message, reason.stack));