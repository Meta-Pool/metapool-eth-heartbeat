import { BareWebServer, respond_error } from "../../bare-web-server";
import { loadJSON, saveJSON } from "./save-load-JSON"
import * as http from 'http';
import * as url from 'url';
import * as os from 'os';
import * as snapshot from './snapshot.js';
import { tail } from "./util/tail";
import { LiquidityData, StakingData } from "./contractData";
import { ethers } from "ethers";
import { StakingContract } from "../../ethereum/stakingContract";
import { LiquidityContract } from "../../ethereum/liquidity";
import { ZEROS_9, updateNodesBalance } from "../nodesBalance";
import { activateValidator } from "../activateValidator";
import { alertCreateValidators, getDeactivateValidatorsReport as alertDisassembleValidators, getDeactivateValidatorsReport } from "../validatorsAlerts";
import { getEnv } from "../../entities/env";
import { checkAuroraDelayedUnstakeOrders } from "../moveAuroraDelayedUnstakeOrders";
import { WithdrawContract } from "../../ethereum/withdraw";
import { getValidatorsData } from "../../services/beaconcha/beaconcha";
import { ValidatorDataResponse } from "../../services/beaconcha/beaconcha";
import { sendEmail } from "../../utils/mailUtils";
import { IDailyReportHelper } from "../../entities/emailUtils";

export let globalPersistentData: PersistentData
const NETWORK = getEnv().NETWORK
const hostname = os.hostname()
let server: BareWebServer;
let server80: BareWebServer;
const MONITORING_PORT = process.argv[2] != "debug" ? 7000 : 7001
let serverStartedTimestamp: number;
let executing: boolean = false
export let isDebug: boolean = false
let loopsExecuted = 0;
let globalStakingData: StakingData
let globalLiquidityData: LiquidityData
const stakingContract: StakingContract = new StakingContract()
const liquidityContract: LiquidityContract = new LiquidityContract()
const withdrawContract: WithdrawContract = new WithdrawContract()

//time in ms
const SECONDS = 1000
const MINUTES = 60 * SECONDS
const HOURS = 60 * MINUTES
const INTERVAL = 5 * MINUTES

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

export interface NodeBalance {
    validatorIndex: number
    balanceData: BalanceData[]
}

export interface PersistentData {
    lastSavedPriceDateISO: string
    beatCount: number
    timestamp: number
    mpEthPrices: PriceData[]
    lpPrices: PriceData[]
    mpethPrice: string
    lpPrice: string

    stakingBalances: BalanceData[]
    withdrawBalances: BalanceData[]
    liquidityBalances: BalanceData[]
    liquidityMpEthBalances: BalanceData[]
    // Key is node pub key
    nodesBalances: Record<string, BalanceData[]>
    requestedDelayedUnstakeBalances: BalanceData[]
}

function showWho(resp: http.ServerResponse) {
    // resp.write("Show who not implemented yet")
    resp.write(`<div class="top-info">Network:<b>${NETWORK}</b></div>`)
}

function showStats(resp: http.ServerResponse) {
    resp.write("Show stats not implemented yet")
    // const hoursFromStart = epoch.hours_from_start()
    // const hoursToEnd = epoch.hours_to_end()
    // const hoursFromStartPct = hoursFromStart / (epoch.prev_epoch_duration_ms / HOURS) * 100;
    // resp.write(`
    //   <dl>
    //     <dt>Server Started</dt><dd>${StarDateTime.toString()}</dd>
    //     <dt>Total Calls</dt><dd>${util.inspect(TotalCalls)}</dd>
    //     <dt>Accum</dt><dd>${globalPersistentData.beatCount}</dd>
    //   </dl>

    //   <dl>
    //     <dt>Contract State Epoch</dt><dd>${globalContractState.env_epoch_height}</dd>
    //     <dt>Prev epoch duration</dt><dd>${asHM(epoch.prev_epoch_duration_ms / HOURS)}</dd>
    //     <dt>Epoch start height </dt><dd>${epoch.start_block_height}</dd>
    //     <dt>last_block_height</dt><dd>${globalLastBlock.header.height}</dd>
    //     <dt>Epoch blocks elapsed </dt><dd>${globalLastBlock.header.height - epoch.start_block_height}</dd>
    //     <dt>Epoch advance</dt><dd>${Math.round((globalLastBlock.header.height - epoch.start_block_height) / epoch.length * 100)}%</dd>

    //     <dt>Epoch started</dt><dd>${epoch.start_dtm.toString()} => ${asHM(hoursFromStart)} ago</dd>
    //     <dt>Epoch ends</dt><dd>${epoch.ends_dtm.toString()} => in ${asHM(hoursToEnd)}</dd>
    //   </dl>

    //   <div class="progress">
    //     <div class="elapsed" style="width:${hoursFromStartPct}%">
    //     ${asHM(hoursFromStart)}
    //     </div>
    //     <div class="remaining" style="width:${100 - hoursFromStartPct}%">
    //     ${asHM(hoursToEnd)}
    //     </div>
    //   </div>
    //   `);

}

function showContractState(resp: http.ServerResponse) {
    resp.write("Show contract state not implemented yet")
    // try {
    //   const lines = fs.readFileSync('state.log', 'utf-8').split(/\r?\n/);

    //   resp.write(`<div class="table-wrapper"><table><thead>`);
    //   resp.write(`
    //     <tr>
    //     <th colspan=5>Step</th>

    //     <th colspan=3>LIQUID</th>

    //     <th colspan=2>ORDERS</th>

    //     <th colspan=4>STAKING</th>

    //     <th colspan=2>control</th>

    //     <th colspan=3>external</th>

    //     </tr>
    //   `);
    //   resp.write(`
    //     <tr>
    //     <th>epoch</th>
    //     <th>Step</th>
    //     <th>user</th>
    //     <th>ACTION</th>
    //     <th>amount</th>

    //     <th>contract account balance</th>
    //     <th>reserve for D-WITHDRAW</th>
    //     <th>Total Available</th>

    //     <th>epoch STK orders</th>
    //     <th>epoch UNSTAKE orders</th>

    //     <th>Accum TFS</th>
    //     <th>Accum TAS</th>
    //     <th>to-stake Delta</th>
    //     <th>T.unstake.& waiting</th>

    //     <th>Unstake Claims</th>	
    //     <th>U.Claim avail sum</th>	
    //     <th>staked in pools</th>	
    //     <th>unstake in pools</th>	
    //     <th>total in pool</th>

    //     </tr></thead>
    //     <tbody>
    //   `);

    //   globalStep = 0;
    //   let prevStateString = ""
    //   let prevState: ComposedState | undefined = undefined;

    //   for (let inx = 0; inx < lines.length; inx++) {
    //     const line = lines[inx];
    //     if (line.startsWith('"{')) { //event
    //       const jsonFriendly = line.slice(1, -1).replace(/\\/g, "");
    //       const data: Record<string, any> = JSON.parse(jsonFriendly)
    //       resp.write(`
    //       <tr>
    //       <td></td>
    //       <td>${globalStep++}</td>
    //       <td>${data.account || data.account_id || data.sp || "bot"}</td>
    //       <td>${data.event}</td>
    //       <td>${ytonFormat(data.amount)}</td>
    //       <tr>
    //       `)
    //     }
    //     else if (line.startsWith("--")) {
    //       const code = line.slice(2, 6)
    //       switch (code) {
    //         case "PRE ": case "POST": case "DIFF": case "SAMP": {
    //           const state = parseComposedState(line.slice(6))
    //           const stateString = JSON.stringify(state);
    //           if (stateString !== prevStateString) {
    //             if (prevState) {
    //               const diff = computeStateDiff(prevState, state);
    //               writeStateHTMLRow(globalStep, "DIFF", diff, resp);
    //             }
    //             writeStateHTMLRow(globalStep, code, state, resp);
    //             prevStateString = stateString;
    //             prevState = Object.assign({}, state);
    //           }
    //           globalStep++;
    //           break;
    //         }
    //       }
    //     }
    //   }

    //   resp.write(`</tbody></table></div>`);

    // } catch (ex) {
    //   resp.write("<pre>" + JSON.stringify(ex) + "</pre>");
    // }
}

function showPoolPerformance(resp: http.ServerResponse, jsonOnly?: boolean) {
    resp.write("Show pool performance not implemented yet")
    // try {

    //   let currEpoch = Number(globalContractState.env_epoch_height)
    //   if (debugMode) currEpoch = 1247;

    //   // store by poolId an array[epoch] of RewardsInfo
    //   let inMemoryData: Record<string, RewardsInfo[]> = {}
    //   let jsonData: Record<string, EpochRewardsInfo[]> = {}

    //   const managementFee = globalContractParams.operator_rewards_fee_basis_points / 100 // default is 50 => 0.5%
    //   const epochsInYear = 365 * 24 / (epoch.prev_epoch_duration_ms / HOURS) // an epoch is 15 hs approx

    //   let olderReadEpoch: number = currEpoch + 1;
    //   for (let epoch = currEpoch; epoch >= currEpoch - 10; epoch--) {
    //     const epochFilename = epochRewardsFilename(epoch)
    //     if (!fs.existsSync(epochFilename)) break;
    //     olderReadEpoch = epoch
    //     const lines = fs.readFileSync(epochFilename, 'utf-8').split(/\r?\n/);
    //     for (let line of lines) {
    //       if (line.startsWith("sp:")) {
    //         // line-example: `sp:dexagon.poolv1.near old_balance:114164485558789007071764711806 new_balance:114186493485904339552607427902 rewards:22007927115332480842716096` 
    //         const parts = line.split(/ /)
    //         const poolId = parts[0].split(/:/)[1]
    //         if (!inMemoryData[poolId]) inMemoryData[poolId] = [];
    //         const values = {
    //           oldBalance: parts[1].split(/:/)[1],
    //           newBalance: parts[2].split(/:/)[1],
    //           rewards: parts[3].split(/:/)[1]
    //         }
    //         inMemoryData[poolId][epoch] = values

    //         // json data
    //         let jsonDataPoolItem = jsonData[poolId]
    //         if (!jsonDataPoolItem) {
    //           jsonData[poolId] = []
    //         }
    //         jsonData[poolId].push({
    //           epoch: epoch,
    //           apy: computeApy(yton(values.oldBalance), yton(values.rewards), epochsInYear, managementFee),
    //           oldBalance: values.oldBalance,
    //           newBalance: values.newBalance,
    //           rewards: values.rewards
    //         })
    //       }
    //     }
    //   }

    //   // convert to array
    //   type asArayItem = { name: string; data: RewardsInfo[] }
    //   let asArray: asArayItem[] = []
    //   for (let key in inMemoryData) {
    //     asArray.push({ name: key, data: inMemoryData[key] })
    //   }
    //   // sort by stake at last epoch
    //   asArray.sort((r1, r2) => {
    //     try {
    //       return Number(r2.data[currEpoch].oldBalance) - Number(r1.data[currEpoch].oldBalance)
    //     } catch (ex) { return 0 }
    //   });
    //   let totalOldBalance = BigInt(0);
    //   let totalRewards = BigInt(0);
    //   let sumApy = 0
    //   let apyDataPoints = 0
    //   try {
    //     for (let item of asArray) if (item.data[currEpoch]) {
    //       const data = item.data[currEpoch]
    //       totalOldBalance += BigInt(data.oldBalance)
    //       totalRewards += BigInt(data.rewards)
    //       const apy = computeApy(yton(data.oldBalance), yton(data.rewards), epochsInYear, managementFee)
    //       sumApy += apy;
    //       apyDataPoints++;
    //     }
    //   }
    //   catch (ex) { console.error(ex) }
    //   //console.log(`Total old balance:${yton(totalOldBalance.toString())}, Total rewards:${yton(totalRewards.toString())}`);
    //   //const pctInterestEpoch = yton(totalRewards.toString()) * (100 - pct) / )
    //   const avgApy = Number((sumApy / apyDataPoints).toFixed(4));
    //   const totalApyEpoch = computeApy(yton(totalOldBalance.toString()), yton(totalRewards.toString()), epochsInYear, managementFee)
    //   //console.log(`Interest epoch ${currEpoch}:${pctInterestEpoch}, Avg.APY:${avgApy}`);

    //   if (jsonOnly) {
    //     resp.write(JSON.stringify({
    //       apy: totalApyEpoch,
    //       avgApy: avgApy,
    //       oldBalance: totalOldBalance.toString(),
    //       totalRewards: totalRewards.toString(),
    //       data: jsonData
    //     }));
    //     return;
    //   }

    //   resp.write(`<div class="perf-table"><table><thead>`);
    //   resp.write(`
    //     <tr>
    //     <th colspan=1>Pool</th>
    //     `);
    //   const COLSPAN = 2
    //   for (let epoch = olderReadEpoch; epoch <= currEpoch; epoch++) {
    //     resp.write(`<th colspan=${COLSPAN}>${epoch}</th>`);
    //   }
    //   resp.write(`
    //   </tr>
    //   `);
    //   resp.write(`
    //     <tr>
    //     <th colspan=1></th>
    //     `);
    //   for (let epoch = olderReadEpoch; epoch <= currEpoch; epoch++) {
    //     //resp.write(`<th>stake</th><th>rewards</th><th>apy</th>`);
    //     resp.write(`<th>stake</th><th>apy</th>`);
    //   }
    //   resp.write(`
    //   </tr>
    //   `);

    //   for (let item of asArray) {
    //     resp.write(`
    //     <tr>
    //     <td>${item.name}</td>
    //     `);
    //     for (let epoch = olderReadEpoch; epoch <= currEpoch; epoch++) {
    //       const info = item.data[epoch]
    //       if (!info) {
    //         resp.write(`<td></td>`.repeat(COLSPAN));
    //       }
    //       else {
    //         resp.write(`<td>${(yton(info.oldBalance) / 1e3).toFixed(2)}k</td>`);
    //         //resp.write(`<td>${pctInterestEpoch.toFixed(5)}%</td>`);
    //         //const apy = ((1 + pctInterestEpoch / 100) ** (epochsInYear) - 1) * 100
    //         const apy = computeApy(yton(info.oldBalance), yton(info.rewards), epochsInYear, managementFee)
    //         let bgtone = 64 + (apy - avgApy) * 128
    //         if (bgtone > 255) bgtone = 255;
    //         if (bgtone < -255) bgtone = -255;
    //         bgtone = Math.trunc(bgtone)
    //         if (bgtone >= 0) {
    //           resp.write(`<td style="background-color:rgb(${255 - bgtone},255,${255 - bgtone})">${apy.toFixed(2)}%</td>`);
    //         }
    //         else {
    //           resp.write(`<td style="background-color:rgb(255,${255 + bgtone / 2},${255 + bgtone})">${apy.toFixed(2)}%</td>`);
    //         }
    //       }
    //     }
    //     resp.write(`</tr>`)
    //   }

    //   resp.write(`</tbody></table></div>`);
    //   resp.write(`<p>Total old balance:${yton(totalOldBalance.toString())}, Total rewards:${yton(totalRewards.toString())},` +
    //     ` Metapool epoch APY:${totalApyEpoch}, AVG Apy: ${avgApy}</p>`);
    //   resp.write(`<p>Last epoch:${Number(globalContractState.env_epoch_height) - 1}, duration:${(epoch.prev_epoch_duration_ms / HOURS).toFixed(2)} hs, Epochs per year:${epochsInYear.toFixed(2)}` +
    //     `, Management Fee:${managementFee}%</p>`);

    //   // resp.write(`<script>
    //   // let table = document.querySelector(".perf-table")
    //   // table.querySelectorAll("th").forEach((th, position) => {
    //   //    th.addEventListener("click", evt => sortTable(table, position));
    //   //   });
    //   // </script>
    //   // `);

    // } catch (ex) {
    //   resp.write("<pre>" + JSON.stringify(ex) + "</pre>");
    // }
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
            // let assume all responses are text
            resp.setHeader("content-type", 'text/plain; version=0.0.4; charset=utf-8')
            if (rest === "") {
                // just /metrics
                for (const key in snap) {
                    let value = snap[key as keyof snapshot.Snapshot]
                    if (value == null || value == undefined) { value = 0 }
                    resp.write(`metapool_${key} ${value}\n`)
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

async function refreshStakingData() {
    const stakingTotalAssets = await stakingContract.totalAssets()
    const stakingTotalSupply = await stakingContract.totalSupply()
    globalStakingData = {
        totalAssets: stakingTotalAssets,
        totalSupply: stakingTotalSupply
    }

    globalPersistentData.mpethPrice = calculateMpEthPrice().toString()
}

async function refreshLiquidityData() {
    const liquidityTotalAssets = await liquidityContract.totalAssets()
    const liquidityTotalSupply = await liquidityContract.totalSupply()

    globalLiquidityData = {
        totalAssets: liquidityTotalAssets,
        totalSupply: liquidityTotalSupply
    }

    globalPersistentData.lpPrice = calculateLpPrice().toString()
}

async function refreshBalances() {
    const [
        stakingBalance,

        liquidityBalance,
        liquidityMpEthBalance,

        withdrawBalance,
        totalPendingWithdraw,

        nodesBalances
    ] = await Promise.all([
        // Staking balances
        stakingContract.getWalletBalance(stakingContract.address),

        // Liquidity balances
        liquidityContract.getWalletBalance(liquidityContract.address),
        stakingContract.balanceOf(liquidityContract.address),

        // Withdraw balances
        withdrawContract.getWalletBalance(withdrawContract.address),
        withdrawContract.totalPendingWithdraw(),

        // Nodes balances
        getValidatorsData()
    ])

    if(!globalPersistentData.stakingBalances) globalPersistentData.stakingBalances = []
    if(!globalPersistentData.liquidityBalances) globalPersistentData.liquidityBalances = []
    if(!globalPersistentData.liquidityMpEthBalances) globalPersistentData.liquidityMpEthBalances = []
    if(!globalPersistentData.withdrawBalances) globalPersistentData.withdrawBalances = []
    if(!globalPersistentData.requestedDelayedUnstakeBalances) globalPersistentData.requestedDelayedUnstakeBalances = []
    if(!globalPersistentData.nodesBalances) globalPersistentData.nodesBalances = {}

    const date = new Date().toISOString()
    globalPersistentData.stakingBalances.push({
        dateISO: date,
        balance: stakingBalance.toString()
    })
    globalPersistentData.liquidityBalances.push({
        dateISO: date,
        balance: liquidityBalance.toString()
    })
    globalPersistentData.liquidityMpEthBalances.push({
        dateISO: date,
        balance: liquidityMpEthBalance.toString()
    })
    globalPersistentData.withdrawBalances.push({
        dateISO: date,
        balance: withdrawBalance.toString()
    })

    globalPersistentData.requestedDelayedUnstakeBalances.push({
        dateISO: date,
        balance: totalPendingWithdraw.toString()
    })
    

    // console.log("Nodes balances", globalPersistentData.nodesBalances.has(nodesBalances[0].data.pubkey))
    nodesBalances.forEach((node: ValidatorDataResponse) => {
        if(!globalPersistentData.nodesBalances[node.data.pubkey]) {
            globalPersistentData.nodesBalances[node.data.pubkey] = []
        }
        const nodeBalances = globalPersistentData.nodesBalances[node.data.pubkey]!
        nodeBalances.push({
            dateISO: date,
            balance: node.data.balance.toString() + ZEROS_9
        })

        globalPersistentData.nodesBalances[node.data.pubkey] = nodeBalances
    })



    
}

//utility
async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loga(label:string, amount:number){
    console.log(label.padEnd(26),":",amount.toFixed(5).padStart(16))
}

async function refreshMetrics() {
    await Promise.all([
        refreshStakingData(),
        refreshLiquidityData(),
        refreshBalances(),
    ])
    
}

function divide(a: string, b: string): string {
    return (Number(a) / Number(b)).toString()
}

function calculateLpPrice(): BigInt {
    if(globalLiquidityData.totalSupply == 0n) return ethers.parseEther("1")
    return ethers.parseEther(divide(globalLiquidityData.totalAssets.toString(), globalLiquidityData.totalSupply.toString()))
}

function calculateMpEthPrice(): BigInt {
    if(globalStakingData.totalSupply == 0n) return ethers.parseEther("1")

    const totalAssets = ethers.formatEther(globalStakingData.totalAssets.toString())
    const totalSupply = ethers.formatEther(globalStakingData.totalSupply.toString())

    return ethers.parseEther(divide(totalAssets, totalSupply))
}

async function beat() {

    TotalCalls.beats++;
    console.log("-".repeat(80))
    console.log(new Date().toString());
    console.log(`BEAT ${TotalCalls.beats} (${globalPersistentData.beatCount})`);

    //refresh contract state
    console.log("Refresh metrics")
    await refreshMetrics();
    console.log("Metrics refreshed successfully")

    // keep record of stNEAR & LP price to compute APY%
    const currentDateISO = new Date().toISOString().slice(0, 10)
    const isFirstCallOfTheDay: boolean = globalPersistentData.lastSavedPriceDateISO != currentDateISO
    console.log(globalPersistentData.lastSavedPriceDateISO, currentDateISO, isFirstCallOfTheDay)
    if (isFirstCallOfTheDay) {
        globalPersistentData.lastSavedPriceDateISO = currentDateISO

        if (!globalPersistentData.lpPrices) {
            globalPersistentData.lpPrices = []
        }
        globalPersistentData.lpPrices.push({
            dateISO: currentDateISO,
            // price: globalContractState.nslp_share_price,
            price: calculateLpPrice().toString(),
            assets: globalLiquidityData.totalAssets.toString(),
            supply: globalLiquidityData.totalSupply.toString(),
        });
        if (!globalPersistentData.mpEthPrices) {
            globalPersistentData.mpEthPrices = []
        }
        globalPersistentData.mpEthPrices.push({
            dateISO: currentDateISO,
            price: calculateMpEthPrice().toString(),
            assets: globalStakingData.totalAssets.toString(),
            supply: globalStakingData.totalSupply.toString(),
        });

        if (globalPersistentData.mpEthPrices.length > 3 * 365) {
            globalPersistentData.mpEthPrices.splice(0, 30);
        }
        if (globalPersistentData.lpPrices.length > 3 * 365) {
            globalPersistentData.lpPrices.splice(0, 30);
        }
        await runDailyActionsAndReport()
        // await updateNodesBalance()

        
    } // Calls made once a day

    // ------------------------------
    // Check if a validator can be activated an do it
    // ------------------------------
    console.log("--Checking if a validator can be activated")
    const wasValidatorCreated = await activateValidator()
    console.log("Was validator created?", wasValidatorCreated)

    // ------------------------------
    // Check if should alert for creating validators
    // ------------------------------
    console.log("--Checking if validators should be created")
    await alertCreateValidators(isFirstCallOfTheDay || wasValidatorCreated)


    // Aurora
    console.log("--Checking if order queue should be moved")
    const wasDelayedUnstakeOrderQueueRun = await checkAuroraDelayedUnstakeOrders()
    console.log("Order queue moved?", wasDelayedUnstakeOrderQueueRun)
    
    //END OF BEAT
    globalPersistentData.beatCount++;
    saveJSON(globalPersistentData);

}

async function runDailyActionsAndReport() {
    console.log("Sending daily report")
    const reportHelpersPromises: Promise<IDailyReportHelper>[] = [
        updateNodesBalance(),
        getDeactivateValidatorsReport()
    ];

    const reports: IDailyReportHelper[] = await Promise.all((await reportHelpersPromises).map((promise: Promise<IDailyReportHelper>, index: number) => {
        return promise.catch((err: any) => {
            return {
                ok: false,
                function: `Index ${index}`,
                subject: `Error on index ${index}`,
                body: `Error running function for daily action and report with index ${index}. ${err.message}`,
                severity: 2
            }
        })
    }))

    buildDailyReport(reports)    
}

function buildDailyReport(reports: IDailyReportHelper[]) {
    const body = reports.reduce((acc: string, curr: IDailyReportHelper) => {
        return `
            ${acc}
            Function: ${curr.function}
            Report: ${curr.body}
            ${"-".repeat(100)}
        `
    }, "")

    const severity: number = reports.reduce((max: number, currReport: IDailyReportHelper) => Math.max(max, currReport.severity), 0)
    let subject: string = reports.reduce((acc: string, currReport: IDailyReportHelper) => {
        if(currReport.ok) {
            return acc 
        } else {
            return acc + " - " + currReport.subject
        }
    }, "Daily report")

    switch(severity) {
        case 0:
            subject = `[OK] ${subject}`
            break
        case 1:
            subject = `[IMPORTANT] ${subject}`
            break
        case 2:
            subject = `[ERROR] ${subject}`
            break
    }

    sendEmail(subject, body)
}

async function heartLoop() {
    console.log("Running heartLoop")
    if (executing) {
        console.error("heartLoop, executing=true, missing await")
        return; // in case there's a missing `await`
    }
    const beatStartMs = Date.now();
    try {
        executing = true;
        await beat();
    }
    catch (ex) {
        console.log("ERR", JSON.stringify(ex))
        console.error("ERR", JSON.stringify(ex))
    }
    finally {
        executing = false;
    }

    loopsExecuted++;
    // 2022-4-4, 24 executions => 2 hs
    if (Date.now() >= serverStartedTimestamp + 2 * HOURS) {
        // 2 hs loops cycle finished- gracefully end process, pm2 will restart it
        console.log(loopsExecuted, "cycle finished- gracefully end process")
        if (server80 != undefined) {
            try { server80.close() } catch (ex) {
                console.error("server80.close", JSON.stringify(ex))
            }
        }
        try { server.close() } catch (ex) {
            console.error("server.close", JSON.stringify(ex))
        }
        // 2022-4-4 make sure program ends
        await sleep(2000);
        process.exit(0);
        return;
    }
    else {
        const elapsedMs = Date.now() - beatStartMs
        //check again in INTERVAL minutes from the start of the beat. Minimun is 20 seconds
        let nextBeatIn = atLeast(20 * SECONDS, INTERVAL - elapsedMs);
        console.log("next beat in", Math.trunc(nextBeatIn / SECONDS), "seconds")
        setTimeout(heartLoop, nextBeatIn)
    }
}

function atLeast(a: number, b: number): number { return Math.max(a, b) }

function processArgs() {
    for(let i = 2; i < process.argv.length; i++) {
        switch(process.argv[i]) {
            case "--debug":
                isDebug = true
                break
            default:
                throw new Error(`Unknown arg ${process.argv[i]}`)
        }
    }
}

async function run() {
    processArgs()
    globalPersistentData = loadJSON()

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
    await heartLoop();
}

run().catch((reason: any) => console.error("Main err", JSON.stringify(reason)));