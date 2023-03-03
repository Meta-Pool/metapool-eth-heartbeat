import { BareWebServer, respond_error } from "../../bare-web-server";
import { loadJSON } from "./save-load-JSON"
import * as http from 'http';
import * as url from 'url';
import * as os from 'os';
import * as snapshot from './snapshot.js';
import { tail } from "./util/tail";

export let globalPersistentData: PersistentData
const hostname = os.hostname()
let server: BareWebServer;
let server80: BareWebServer;
const MONITORING_PORT = 7000
let serverStartedTimestamp: number;
let executing: boolean = false
let loopsExecuted = 0;

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
    timestamp: number
    price: string
}

export interface PersistentData {
    timestamp: number
    mpEthPrices: PriceData[]
    lpPrices: PriceData[]
}

function showWho(resp: http.ServerResponse) {
    resp.write("Show who not implemented yet")
    // resp.write(`<div class="top-info">Network:<b>${network.current}</b> - contract:<b>${CONTRACT_ID}</b> - ` +
    //   `operator:<b>${OPERATOR_ACCOUNT}</b> Balance ${globalOperatorAccountInfo ? yton(globalOperatorAccountInfo.amount) : null} - ` +
    //   `Aurora: admin:${globalPersistentData.auroraSwapContractData.adminBalanceEth} direct/withd:${globalPersistentData.auroraSwapContractData.withdrawBalanceEth} inverse/refill:${globalPersistentData.auroraSwapContractData.refillBalanceEth}` +
    //   `</div>`)
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

//utility
async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function beat() {

    // TotalCalls.beats++;
    // console.log("-".repeat(80))
    // console.log(new Date().toString());
    // console.log(`BEAT ${TotalCalls.beats} (${globalPersistentData.beatCount})`);

    // globalLastBlock = await near.latestBlock()
    // epoch.update(globalLastBlock);

    // globalOperatorAccountInfo = await near.queryAccount(OPERATOR_ACCOUNT)

    // console.log(`-------------------------------`)
    // console.log(`${OPERATOR_ACCOUNT} Balance ${yton(globalOperatorAccountInfo.amount)}`)
    // //console.log(`last_block:${globalLastBlock.header.height}`)

    // //if the epoch ended, compute the new one
    // if (new Date().getTime() >= epoch.ends_dtm.getTime()) {
    //     //epoch ended
    //     console.log("COMPUTING NEW EPOCH")
    //     await computeCurrentEpoch();
    //     console.log(JSON.stringify(epoch));
    // }

    // //refresh contract state
    // console.log("refresh metrics")
    // await refreshMetrics();

    // console.log("Epoch:", globalContractState.env_epoch_height, " hs.from start:", asHM(epoch.hours_from_start()), " hs.to end:", asHM(epoch.hours_to_end()));
    // console.log("Epoch", globalContractState.env_epoch_height)
    // loga("total_for_staking", yton(globalContractState.total_for_staking))
    // loga("total_actually_staked", yton(globalContractState.total_actually_staked))
    // const diff = BigInt(globalContractState.total_for_staking) - BigInt(globalContractState.total_actually_staked);
    // loga("Differ", yton(diff.toString()))
    // const epoch_stake_orders = BigInt(globalContractState.epoch_stake_orders)
    // const epoch_unstake_orders = BigInt(globalContractState.epoch_unstake_orders)
    // loga("Epoch Stake Orders", yton(globalContractState.epoch_stake_orders))
    // loga("Epoch Unstake Orders", yton(globalContractState.epoch_unstake_orders))
    // loga("Differ", yton((epoch_stake_orders - epoch_unstake_orders).toString()))
    // let delta = 0n
    // if (diff >= 0) {
    //     delta = (epoch_stake_orders < diff) ? epoch_stake_orders : diff;
    // }
    // else {
    //     delta = (epoch_unstake_orders < -diff) ? -epoch_unstake_orders : diff;
    // }
    // loga("Delta stake", yton(delta.toString()))
    // // TODO CHECK correct sums to be performed
    // // loga("contract_account_balance", yton(globalContractState.contract_account_balance));
    // // loga("nslp_liquidity", yton(globalContractState.nslp_liquidity));
    // // loga("reserve_for_unstake_claims", yton(globalContractState.reserve_for_unstake_claims));
    // // loga("Epoch Stake Orders",yton(globalContractState.epoch_stake_orders))
    // // loga("diff", yton((
    // //   BigInt(globalContractState.contract_account_balance)
    // //     -BigInt(globalContractState.nslp_liquidity)
    // //     -BigInt(globalContractState.reserve_for_unstake_claims)
    // //     -epoch_stake_orders
    // //   ).toString()));

    // console.log(JSON.stringify(globalContractState));

    // // Force test price udpdate in Aurora
    // // if (testnetMode) {
    // //   const testPrice = "15"+"0".repeat(23)
    // //   console.log("TEST auroraCopyStNearPrice",testPrice)
    // //   await auroraCopyStNearPrice(testPrice)
    // // }

    // // 3 Tasks for end-of-epoch: 
    // // *if the epoch is ending*, stake-unstake AND do end_of_epoch clearing
    // if (epoch.hours_to_end() <= 1.5 || debugMode) {
    //     //epoch is about to end (1.5 hours left)

    //     //END_OF_EPOCH Task 1: check if there is the need to stake
    //     if (BigInt(globalContractState.total_for_staking) > BigInt(globalContractState.total_actually_staked)) {
    //         //loop staking
    //         for (let i = 0; i < 50; i++) {
    //             console.log("CALL distribute_staking")
    //             TotalCalls.stake++;
    //             try {
    //                 const result = await metaPool.call("distribute_staking", {});
    //                 consoleLogLastTxEvents()
    //                 console.log("more Staking to do? ", result);
    //                 if (result === false) break;
    //             }
    //             catch (ex) {
    //                 console.error(ex);
    //             }
    //             await sleep(3 * SECONDS)
    //         }
    //     }

    //     //END_OF_EPOCH Task 2: check if there is the need to un-stake
    //     if (BigInt(globalContractState.total_actually_staked) > BigInt(globalContractState.total_for_staking)) {
    //         //loop unstaking 
    //         for (let i = 0; i < 50; i++) {
    //             console.log("CALL distribute_unstaking")
    //             TotalCalls.unstake++;
    //             try {
    //                 const result = await metaPool.call("distribute_unstaking", {});
    //                 consoleLogLastTxEvents()
    //                 console.log("more Unstaking to do? ", result);
    //                 if (result === false || metaPool.dryRun) break;
    //             }
    //             catch (ex) {
    //                 console.error(ex);
    //             }
    //             await sleep(5 * SECONDS)
    //         }
    //     }

    //     //END_OF_EPOCH Task 3:stake|unstake ORDERS CLEARING => reserve for unstake claims
    //     //refresh contract state
    //     await refreshGlobalContractState();
    //     console.log(`end of epoch: epoch_stake_orders:${yton(globalContractState.epoch_stake_orders)} epoch_unstake_orders:${yton(globalContractState.epoch_unstake_orders)}`);
    //     if (globalContractState.epoch_stake_orders != "0" || globalContractState.epoch_unstake_orders != "0") {
    //         await metaPool.call("end_of_epoch_clearing", {}, 50);
    //     }
    // }

    // // MIDDLE_EPOCH: 
    // if (!debugMode && (epoch.hours_from_start() > 0.25 && epoch.hours_to_end() > 1)) {

    //     //which epoch are we now
    //     const epochNow = BigInt(globalContractState.env_epoch_height);

    //     // get all the pools
    //     const pools = await metaPool.get_staking_pool_list();
    //     let poolsPinged = 0;
    //     //console.log("MIDDLE_EPOCH, check ", pools.length, "pools")

    //     //for each pool, ping and compute rewards if needed, and retrieve funds if waiting period is over
    //     for (let inx = 0; inx < pools.length; inx++) {
    //         const pool = pools[inx];

    //         // MIDDLE_EPOCH Task 1: Check if we must ping & compute rewards (epoch started recently)
    //         if (BigInt(pool.staked) >= ONE_NEAR / 100n && pool.last_asked_rewards_epoch_height != globalContractState.env_epoch_height) {
    //             //The pool has some staked and we didn't ask & distribute rewards in this epoch yet
    //             //ping on the pool so it calculates rewards
    //             console.log(`about to call PING & DISTRIBUTE on pool[${inx}]:${JSON.stringify(pool)}`)
    //             console.log(`pool.PING`)
    //             TotalCalls.ping++;
    //             poolsPinged++;
    //             try {
    //                 await near.call(pool.account_id, "ping", {}, OPERATOR_ACCOUNT, credentials.private_key, 200);
    //                 //calculates rewards now in the meta for that pool
    //                 //pub fn distribute_rewards(&mut self, sp_inx: u16) -> void 
    //                 console.log(`meta.DISTR`)
    //                 TotalCalls.distribute_rewards++;
    //                 await metaPool.call("distribute_rewards", { sp_inx: inx });
    //                 // distribute_rewards returns -> void
    //                 // if distribute_rewards executes ok, let's extract from the logs the amounts: prev, after and rewards 
    //                 // fs.writeFileSync("tx-results.txt", JSON.stringify(near.last_tx_result)+',\n',{flag:'a+'})
    //                 let logs = near.extractLogsAndErrorsFromTxResult(near.last_tx_result)
    //                 for (let line of logs) {
    //                     if (line.startsWith("sp:")) {
    //                         // line-example: `sp:dexagon.poolv1.near old_balance:114164485558789007071764711806 new_balance:114186493485904339552607427902 rewards:22007927115332480842716096` 
    //                         console.log(line)
    //                         // save also in a file per epoch
    //                         fs.writeFileSync(`${globalContractState.env_epoch_height.padStart(6, "0")}-rewards.txt`, line + '\n', { flag: 'a+' })
    //                     }
    //                 }
    //                 //----------
    //                 // distribute_rewards cause a price-update, so we update stNear-in-Aurora swap-contract too
    //                 globalContractState = await metaPool.get_contract_state();
    //                 await auroraCopyStNearPrice(globalContractState.st_near_price)
    //             }
    //             catch (ex) {
    //                 console.error(ex);
    //             }
    //             await sleep(5 * SECONDS)
    //         }

    //         // MIDDLE_EPOCH Task 2, for the same pool, check if we must RETRIEVE UNSTAKED FUNDS
    //         // that is if the unstake-wait-period has ended
    //         //only the the amount unstaked justified tx-cost, only if amount > 10Tgas
    //         if (BigInt(pool.unstaked) > TEN_TGAS && pool.unstaked_requested_epoch_height != "0") {
    //             let whenRequested = BigInt(pool.unstaked_requested_epoch_height);
    //             if (whenRequested > epochNow) whenRequested = 0n; //pool.unstaked_requested_epoch_height has bad data or there was a *hard-fork*
    //             if (epochNow >= whenRequested + NUM_EPOCHS_TO_UNLOCK) {
    //                 //try RETRIEVE UNSTAKED FUNDS
    //                 console.log(`about to try RETRIEVE UNSTAKED FUNDS on pool[${inx}]:${JSON.stringify(pool)}`)
    //                 TotalCalls.retrieve++;
    //                 try {
    //                     console.log("first sync unstaked balance")
    //                     await metaPool.sync_unstaked_balance(inx);
    //                     //now retrieve unstaked
    //                     const result = await metaPool.retrieve_funds_from_a_pool(inx);
    //                     if (result == undefined) {
    //                         console.log(`retrieve_funds_from_a_pool RESULT is undefined`)
    //                     }
    //                     else {
    //                         console.log(`retrieve_funds_from_a_pool RESULT:${yton(result)}N`)
    //                     }
    //                 }
    //                 catch (ex) {
    //                     console.error(ex);
    //                 }
    //                 await sleep(5 * SECONDS)
    //             }
    //         }

    //     } //end loop for each pool

    //     //console.log("poolsPinged ", poolsPinged)
    //     if (poolsPinged == 0) {
    //         // all pools ok, check if we need to realize_meta_massive this epoch
    //         await try_realize_meta_massive();
    //     }

    // } //end middle-epoch tasks


    // const summary = await linearProtocol.get_summary()
    // console.log(ytonFull(summary.ft_price))

    // // keep record of stNEAR & LP price to compute APY%
    // const currentDateISO = new Date().toISOString().slice(0, 10)
    // if (globalPersistentData.lastSavedPriceDateISO != currentDateISO) {
    //     if (!globalPersistentData.LpPrices) {
    //         globalPersistentData.LpPrices = []
    //     }
    //     globalPersistentData.LpPrices.push({
    //         dateISO: currentDateISO,
    //         priceYocto: globalContractState.nslp_share_price
    //     });
    //     if (!globalPersistentData.stNearPrices) {
    //         globalPersistentData.stNearPrices = []
    //     }
    //     globalPersistentData.stNearPrices.push({
    //         dateISO: currentDateISO,
    //         priceYocto: globalContractState.st_near_price
    //     });
    //     globalPersistentData.lastSavedPriceDateISO = currentDateISO
    //     if (globalPersistentData.stNearPrices.length > 3 * 365) {
    //         globalPersistentData.stNearPrices.splice(0, 30);
    //     }
    //     if (globalPersistentData.LpPrices.length > 3 * 365) {
    //         globalPersistentData.LpPrices.splice(0, 30);
    //     }

    //     // get & store historic liNEAR price
    //     try {
    //         if (!globalPersistentData.linearPrices) {
    //             globalPersistentData.linearPrices = []
    //         }
    //         const summary = await linearProtocol.get_summary()
    //         // console.log(ytonFull(summary.ft_price))
    //         globalPersistentData.linearPrices.push({
    //             dateISO: currentDateISO,
    //             priceYocto: summary.ft_price
    //         });
    //         if (globalPersistentData.linearPrices.length > 3 * 365) {
    //             globalPersistentData.linearPrices.splice(0, 30);
    //         }
    //     } catch (ex) {
    //         console.error("reading linear prices")
    //         console.error(ex)
    //     }

    // } // if current date price not set

    // // save epoch info
    // if (!globalPersistentData.epochs) {
    //     globalPersistentData.epochs = []
    // }
    // let currentEpoch = Number(globalContractState.env_epoch_height);
    // if (currentEpoch > 0) {
    //     // make sure current epoch record exists
    //     if (globalPersistentData.epochs.length == 0 || globalPersistentData.epochs[globalPersistentData.epochs.length - 1].epoch != currentEpoch) {
    //         globalPersistentData.epochs.push({
    //             epoch: currentEpoch,
    //             start_ts: epoch.start_timestamp,
    //             duration_ms: epoch.prev_epoch_duration_ms // initial valur
    //         });
    //     }
    //     // if prev epoch record exists, update exact duration
    //     if (globalPersistentData.epochs.length > 1) {
    //         let prevEpochRecord = globalPersistentData.epochs[globalPersistentData.epochs.length - 2]
    //         if (prevEpochRecord.epoch == currentEpoch - 1) {
    //             prevEpochRecord.duration_ms = epoch.prev_epoch_duration_ms
    //         }
    //     }
    //     // keep size controlled
    //     if (globalPersistentData.epochs.length > 3 * 365) {
    //         globalPersistentData.epochs.splice(0, 30);
    //     }

    // }

    // // ------------------------------
    // // stNEAR-in-Aurora Conveyor belt
    // // ------------------------------
    // console.log("--CONVEYOR BELT Start")
    // // refresh settings from toml file
    // readAndParseGlobalSettingsToml();
    // // update price in Aurora if needed
    // await refreshGlobalContractState();
    // await auroraCopyStNearPrice(globalContractState.st_near_price)
    // await auroraCopyGetWnearFee(globalContractState.nslp_current_discount_basis_points)
    // // informative: check stBalance in Aurora
    // await auroaGetSwapContractPriceAndBalances();

    // // Direct, high traffic route: move wNEAR thru the bridge, stake in Metapool and bridge stNEAR back to aurora
    // await auroraConvertwNEARintoStNEAR()
    // // Inverse, no-high traffic expected route: move stNEAR thru the bridge, liquid-unstake in Metapool and bridge NEAR back to aurora
    // await auroraRefillwNEARifNeeded()
    // console.log("--CONVEYOR BELT End")

    // //every 10 minutes try skywards batched transfers
    // // COMMENTED WE NO LONGER USE SKYWARDS
    // // await try_skyward_transfers_massive();

    // //END OF BEAT
    // globalPersistentData.beatCount++;
    // saveJSON(globalPersistentData);

}

async function heartLoop() {
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


async function run() {

    globalPersistentData = loadJSON()

    if (process.argv.includes("also-80")) {
        try {
            server80 = new BareWebServer('../public_html', appHandler, 80) // also start one on port 80 to be able to grab stats from a PHP script in narwallets.com
            server80.start()
        } catch (ex) {
            console.error(ex)
        }
    }
    server = new BareWebServer('../public_html', appHandler, MONITORING_PORT)
    server.start()

    //start loop calling heartbeat 
    serverStartedTimestamp = Date.now();
    await heartLoop();
}

run().catch((reason: any) => console.error("Main err", JSON.stringify(reason)));