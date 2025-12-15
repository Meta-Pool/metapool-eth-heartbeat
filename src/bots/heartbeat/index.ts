import { readdirSync } from "fs";
import * as http from 'http';
import * as os from 'os';
import * as url from 'url';
import { buildStakingRewardsProvider, StakingRewardsProvider } from "../../api/stakingRewards";
import { BareWebServer, respond_error } from "../../bare-web-server";
import { getConfig } from "../../crypto/config";
import { StakedQVaultContract } from "../../crypto/q/stakedQVault";
import { IIncomeDetailHistoryData, IValidatorProposal } from "../../entities/beaconcha/beaconChainEntities";
import { ValidatorData } from "../../entities/beaconcha/beaconChainValidator";
import { IMailReportHelper, Severity } from "../../entities/emailUtils";
import { getEnv } from "../../entities/env";
import { BalanceData, globalBeaconChainData, globalLiquidityData, globalPersistentData, globalQData, globalSsvData, globalStakingData, setGlobalBeaconChainData, setGlobalPersistentData, setGlobalSsvData, TotalCalls } from "../../globals/globalMetrics";
import { isDebug, isTestnet, setIsDebug, setIsTestnet } from "../../globals/globalUtils";
import { BASE_BEACON_CHAIN_URL_SITE, getValidatorProposal, sumPenalties, sumRewards } from "../../services/beaconcha/beaconcha";
import { getValidatorData, refreshBeaconChainData, setIncomeDetailHistory } from "../../services/beaconcha/beaconchaHelper";
import { getEstimatedEthForCreatingValidator } from "../../utils/businessUtils";
import { sleep } from "../../utils/executionUtils";
import { sendEmail } from "../../utils/mailUtils";
import { ethToGwei, weiToGWei, wtoe } from "../../utils/numberUtils";
import { calculateLpPrice, calculateMpEthPrice } from "../../utils/priceUtils";
import { checkDeposit, getEstimatedRunwayInDays, refreshSsvData } from "../../utils/ssvUtils";
import { differenceInDays, sLeftToTimeLeft } from "../../utils/timeUtils";
import { activateValidator } from "../activateValidator";
import { refreshContractData, refreshLiquidityData, refreshOtherMetrics, refreshQVaultMetrics, refreshStakedQVaultMetrics, refreshStakingData, refreshWithdrawData } from "../metricsRefresher";
import { checkAuroraDelayedUnstakeOrders } from "../moveAuroraDelayedUnstakeOrders";
import { alertCheckProfit } from "../profitChecker";
import { checkForPenalties, reportCloseToActivateValidators, reportWalletsBalances } from "../reports/reports";
import { alertCreateValidators, getDeactivateValidatorsReport, getValidatorsRecommendedToBeDisassembled } from "../validatorsAlerts";
import { loadJSON, saveJSON } from "./save-load-JSON";
import * as snapshot from './snapshot.js';
import { tail } from "./util/tail";
import { MS_IN_DAY, MS_IN_HOUR, MS_IN_MINUTES, MS_IN_SECOND, stakingContract } from "../../globals/globalVariables";

// export let globalPersistentData: PersistentData
// export let globalStakingData: StakingData = {} as StakingData
// export let globalLiquidityData: LiquidityData = {} as LiquidityData
// export let globalWithdrawData: WithdrawData = {} as WithdrawData
// export let globalBeaconChainData: IBeaconChainHeartBeatData
// export let globalSsvData: SsvData
// export let globalQData: QHeartBeatData = {} as QHeartBeatData
export let idhBeaconChainCopyData: Record<number, IIncomeDetailHistoryData[]>
const NETWORK = getEnv().NETWORK
const hostname = os.hostname()
let server: BareWebServer;
let server80: BareWebServer;
let MONITORING_PORT = 7010
let serverStartedTimestamp: number;
let executing: boolean = false

let loopsExecuted = 0;
let blockedExecutionCount = 0;
const MAX_BLOCKED_EXECUTION_COUNT = 3;

const INTERVAL = 5 * MS_IN_MINUTES

const CALL_SERVICES_PERIOD = 3 * MS_IN_DAY
export interface NodeBalance {
    validatorIndex: number
    balanceData: BalanceData[]
}

function showWho(resp: http.ServerResponse) {
    // resp.write("Show who not implemented yet")
    resp.write(`<div class="top-info">Network:<b>${NETWORK}</b> - Eth for next validator: <b>${getEstimatedEthForCreatingValidator()}</b></div>`)
}

function showStats(resp: http.ServerResponse) {
    resp.write("Show stats not implemented yet")
}

function showContractState(resp: http.ServerResponse) {
    resp.write("Show contract state not implemented yet")
}

async function showQPerformance(resp: http.ServerResponse) {

    const maxDaysToDisplay = 10
    let datesToDisplay: string[] = []
    const qValidatorsWithNoBalance: string[] = []

    const data = globalPersistentData.qBalancesByAddress

    // Keep data to be displayed
    const dataToDisplay: Record<string, BalanceData[]> = {}
    const todayISO = new Date().toISOString().substring(0, 10)

    Object.keys(data).forEach((validatorAddress: string, index: number) => {
        const historicBalances = data[validatorAddress]
        dataToDisplay[validatorAddress] = historicBalances.filter((b: BalanceData) => {
            const difference = differenceInDays(todayISO, b.dateISO)
            return difference < maxDaysToDisplay + 1
        }) // One more to have the apy of the first

        if (index === 0) {
            datesToDisplay = dataToDisplay[validatorAddress].map((balanceData: BalanceData) => balanceData.dateISO)
        }
    })

    // Calculate APY
    let apySum = 0
    let apyCount = 0
    const finalDataToDisplay: Record<string, any[]> = {}
    Object.keys(dataToDisplay).forEach((validatorAddress: string) => {
        const historicBalances = dataToDisplay[validatorAddress]
        finalDataToDisplay[validatorAddress] = historicBalances.map((balanceData: BalanceData, index: number) => {
            if (index === 0) return {
                balance: wtoe(balanceData.balance),
                dateISO: balanceData.dateISO,
                apy: 0
            }
            apyCount++

            const prevBalance = wtoe(historicBalances[index - 1].balance)
            const currBalance = wtoe(balanceData.balance)
            const dailyRewards = currBalance - prevBalance
            const apy = ((dailyRewards * 365 / prevBalance) * 100)

            apySum += apy
            return {
                balance: currBalance,
                dateISO: balanceData.dateISO,
                apy
            }


        }).slice(-maxDaysToDisplay)



        Object.keys(finalDataToDisplay).forEach((validatorAddress: string) => {
            const currentValidator = finalDataToDisplay[validatorAddress]
            const todayDataCurrentValidator = currentValidator.find((data: any) => {
                return data.dateISO === todayISO
            })
            if (!todayDataCurrentValidator) {
                qValidatorsWithNoBalance.push(validatorAddress)
                return
            }
            if (currentValidator.length < datesToDisplay.length) {
                const pendingLength = datesToDisplay.length - currentValidator.length
                const filling = Array.from({ length: pendingLength }).fill({
                    balance: "-",
                    dateISO: "",
                    apy: 0
                })
                finalDataToDisplay[validatorAddress] = filling.concat(finalDataToDisplay[validatorAddress])
            }
        })
    })

    qValidatorsWithNoBalance.forEach((address: string) => {
        delete finalDataToDisplay[address]
    })

    const avgApy = apySum / apyCount

    resp.write(`<div class="perf-table"><table>`)
    resp.write("<thead>")
    resp.write("<tr>")
    resp.write("<th>Validator address</th>")
    datesToDisplay.forEach((date: string) => {
        resp.write(`<th colspan='2'>${date}</th>`)
    })
    resp.write("</tr>")

    resp.write("<tr>")
    resp.write("<th></th>")
    datesToDisplay.forEach((_) => {
        resp.write(`<th>Balance</th>`)
        resp.write(`<th>APY</th>`)
    })
    resp.write("</tr>")
    resp.write("</thead>")

    resp.write("<tbody>")
    Object.keys(finalDataToDisplay).forEach((validatorAddress: string) => {
        const balances = finalDataToDisplay[validatorAddress]

        resp.write("</tr>")
        resp.write(`<td>${validatorAddress}</td>`)

        balances.forEach((balanceData: any) => {
            const balance = isNaN(balanceData.balance) ? "-" : balanceData.balance.toFixed(4)
            resp.write(`<td>${balance}</td>`)

            const apy: number = balanceData.apy as number
            const bgTone = getBgTone(apy, avgApy)
            if (bgTone >= 0) {
                resp.write(`<td style="background-color:rgb(${255 - bgTone},255,${255 - bgTone})">${apy.toFixed(2)}%</td>`);
            }
            else {
                resp.write(`<td style="background-color:rgb(255,${255 + bgTone / 2},${255 + bgTone})">${apy.toFixed(2)}%</td>`);
            }
        })
        resp.write("</tr>")

    })
    resp.write("</tbody>")
    resp.write("</table>")
    resp.write("</div>")
}

function getBgTone(num: number, avgNum: number) {
    let bgTone = 64 + (num - avgNum) * 128
    if (bgTone > 255) bgTone = 255;
    if (bgTone < -255) bgTone = -255;
    bgTone = Math.trunc(bgTone)
    return bgTone
}

async function showSsvPerformance(resp: http.ServerResponse) {
    try {
        const network = getConfig().network
        var files: string[] = readdirSync(`db/clustersDataSsv/${network}`);

        resp.write(`<div class="perf-table"><table>`)
        resp.write("<thead>")
        resp.write("<tr>")
        resp.write("<th>Cluster operator ids</th>")
        resp.write("<th>Validator Count</th>")
        resp.write("<th>Network Fee Index</th>")
        resp.write("<th>Index</th>")
        resp.write("<th>Balance (SSV)</th>")
        resp.write("<th>Estimated runway (Days)</th>")

        resp.write("</tr>")
        resp.write("</thead>")

        resp.write("<tbody>")
        files.forEach((filename: string) => {
            const operatorIds = filename.split(".")[0]
            const estimatedRunway = getEstimatedRunwayInDays(operatorIds)
            const {
                clusterData
            } = globalSsvData.clusterInformationRecord[operatorIds]
            // const clusterData: ClusterData = getClusterData(operatorIds)
            // const estimatedRunway = await getEstimatedRunwayInDays(operatorIds)

            resp.write("<tr>")
            resp.write(`<td>${operatorIds}</td>`)
            resp.write(`<td>${clusterData.validatorCount}</td>`)
            resp.write(`<td>${clusterData.networkFeeIndex}</td>`)
            resp.write(`<td>${clusterData.index}</td>`)
            resp.write(`<td>${wtoe(clusterData.balance).toFixed(2)}</td>`)
            resp.write(`<td>${Math.floor(estimatedRunway)}</td>`)
            resp.write("</tr>")
        })
        resp.write("</tbody>")
        resp.write("</table></div>")

    } catch (err: any) {
        resp.write("<pre>" + err.message + "</pre>");
    }
}

function showPoolPerformance(resp: http.ServerResponse, jsonOnly?: boolean) {
    try {
        const epochsToDisplay = 10
        let latestCheckedEpoch = Number(globalPersistentData.latestBeaconChainEpochRegistered)

        const idh = globalBeaconChainData.incomeDetailHistory.filter((idh: IIncomeDetailHistoryData) => {
            return idh.epoch > globalBeaconChainData.currentEpoch - 100
        })
        const validatorsData = globalBeaconChainData.validatorsData.filter((validatorData: ValidatorData) => {
            return validatorData.status !== "exited"
        })



        const idhFilteredByEpochDisplay = idh.filter((idhRegistry: IIncomeDetailHistoryData) => {
            return idhRegistry.epoch > latestCheckedEpoch - epochsToDisplay
        })

        const validatorsWithIndex = validatorsData.filter((validatorData: ValidatorData) => {
            return validatorData.validatorindex
        })

        const epochsInYear = 365 * 24 * 60 / 6.4
        let apySum = 0
        let apyCount = 0

        const asArray = validatorsWithIndex.map((validatorData: ValidatorData) => {
            const validatorIndex = validatorData.validatorindex

            const idhForValidator = idhFilteredByEpochDisplay.filter((idhRegistry: IIncomeDetailHistoryData) => {
                return idhRegistry.validatorindex === validatorIndex
            })

            const epochsData: Record<number, any> = {}
            idhForValidator.forEach((currentIDH: IIncomeDetailHistoryData) => {
                const rewards = weiToGWei(sumRewards(currentIDH.income))
                const penalties = weiToGWei(sumPenalties(currentIDH.income))
                const apy = ((rewards - penalties) * epochsInYear / ethToGwei(32)) * 100
                apySum += apy
                apyCount++
                epochsData[currentIDH.epoch] = {
                    rewards,
                    penalties,
                    apy,
                }
            })

            const { pubkey, status } = getValidatorData(validatorIndex!)
            const estimatedActivationData = globalPersistentData.estimatedActivationEpochs[pubkey]

            return {
                name: validatorIndex!,
                data: epochsData,
                pubkey,
                status,
                estimatedActivationData,
            }
        })

        const estimatedAvgApy = apySum / apyCount

        const olderReadEpoch = latestCheckedEpoch - epochsToDisplay + 1
        if (resp) {
            resp.write(`<h3>Rewards and penalties are in gWei (1gWei = 1e9 wei = 1e-9 ETH)</h3>`)
            resp.write(`<div class="perf-table"><table><thead>`);
            resp.write(`
          <tr>
          <th colspan=4>Pool</th>
          `);
            const COLSPAN = 3
            for (let epoch = olderReadEpoch; epoch < latestCheckedEpoch; epoch++) {
                resp.write(`<th colspan=${COLSPAN}>${epoch}</th>`);
            }
            resp.write(`
        <th colspan = 3>Current ${latestCheckedEpoch} (KEth)</th>
        <th colspan=2>Pool</th>
        </tr>
        `);
            resp.write(`
          <tr>
          <th colspan=1>Index</th>
          <th colspan=1>Status</th>
          <th colspan=1>Est. Act. Epoch</th>
          <th colspan=1>Time remaining for activation</th>
          `);
            for (let epoch = olderReadEpoch; epoch < latestCheckedEpoch; epoch++) {
                //resp.write(`<th>stake</th><th>rewards</th><th>apy</th>`);
                resp.write(`<th>rewards</th><th>penalties</th><th>apy</th>`);
            }
            resp.write(`<th>rewards</th>`);
            resp.write(`<th>penalties</th>`);
            resp.write(`<th>apy</th>`);

            resp.write(`<th>Index</th>`);
            resp.write(`<th>Pub key</th>`);

            resp.write(`
        </tr></thead>
        `);

            for (let item of asArray) {
                resp.write(`
                    <tr>
                    <td><a href="${BASE_BEACON_CHAIN_URL_SITE}${item.name.toString()}"} target="_blank">${item.name}</a></td>
                    <td>${item.status}</td>
                    <td>${item.estimatedActivationData ? item.estimatedActivationData.epoch : "-"}</td>
                    <td id="${item.pubkey}"></td>
                `);

                for (let epoch = olderReadEpoch; epoch <= latestCheckedEpoch; epoch++) {
                    const info = item.data[epoch]
                    if (!info) {
                        resp.write(`<td></td>`.repeat(COLSPAN));
                    }
                    else {
                        let rewardsText = info.rewards.toFixed(0)
                        if (rewardsText == "0") rewardsText = "-";
                        resp.write(`<td>${rewardsText}</td>`);

                        let penaltiesText = info.penalties.toFixed(0)
                        if (penaltiesText == "0") penaltiesText = "-";
                        resp.write(`<td>${penaltiesText}</td>`);

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
                            <td><a href="${BASE_BEACON_CHAIN_URL_SITE}${item.name.toString()}" target="_blank">${item.name}</a></td>
                            <td>${item.pubkey.slice(0, 6)}...${item.pubkey.slice(-5)}</td>
                            </tr>
                        `);
                    }
                }


            }

            const timestampObj: Record<string, number> = {}
            for (let item of asArray) {
                if (item.estimatedActivationData && item.estimatedActivationData.timestamp > Date.now()) {
                    timestampObj[item.pubkey] = item.estimatedActivationData.timestamp
                }
            }
            resp.write(`<script>
                const timestampObj = ${JSON.stringify(timestampObj)}
                Object.keys(timestampObj).forEach((pubkey) => {
                    const timestampTd = document.getElementById(pubkey)
                    const activationTimestamp = timestampObj[pubkey]
                    const intervalId = setInterval(() => {
                        const timeRemainingInSeconds = (activationTimestamp - Date.now()) / 1000
                        timestampTd.innerHTML = sLeftToTimeLeft(timeRemainingInSeconds)
                        if(Math.round(timeRemainingInSeconds) <= 0) {
                            clearInterval(intervalId)
                        }
                    }, 1000)
                    
                })
                
                const sLeftToTimeLeft = ${sLeftToTimeLeft}
                </script>
            `);
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
        } else if (pathname.startsWith("/stakingRewards")) {
            showStakingRewardsApiData(resp)
            return true
        } else {
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
            else if (pathname === '/perf_ssv') {
                showSsvPerformance(resp)
            }
            else if (pathname === '/perf_q') {
                showQPerformance(resp)
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

async function showStakingRewardsApiData(resp: http.ServerResponse) {
    try {
        const data: StakingRewardsProvider = buildStakingRewardsProvider()

        resp.setHeader("content-type", 'application/json; version=0.0.4; charset=utf-8')
        resp.write(JSON.stringify(data))
        resp.end()

    } catch (ex: any) {
        resp.write("<pre>" + ex.message + "</pre>");
    }

}



async function claimQRewards() {
    try {
        const stakedQVaultContract = new StakedQVaultContract()
        return stakedQVaultContract.claimStakeDelegatorReward()
    } catch (err: any) {
        console.error("Error claiming Q rewards", err.message)
        sendEmail("[ERR] Q Rewards", `Error while claiming Q rewards: \n ${err.message}`)
    }
}

function loga(label: string, amount: number) {
    console.log(label.padEnd(26), ":", amount.toFixed(5).padStart(16))
}

async function refreshMetrics() {

    await refreshStakingData()
    await refreshLiquidityData()
    await refreshWithdrawData()
    await refreshBeaconChainData()
    await refreshSsvData()
    await refreshQVaultMetrics()
    await refreshStakedQVaultMetrics()
    await refreshOtherMetrics()

    refreshContractData() // Contract data depends on previous refreshes
    console.log("Metrics promises fullfilled")
}

function initializeUninitializedGlobalData() {
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

    if (!globalSsvData) {
        setGlobalSsvData({
            clusterInformationRecord: {}
        })
        // globalSsvData = {
        //     clusterInformationRecord: {}
        // }
    }
    if (!globalPersistentData.estimatedActivationEpochs) globalPersistentData.estimatedActivationEpochs = {}

    if (!globalQData.validatorsBalancesByAddress) globalQData.validatorsBalancesByAddress = {}
    if (!globalPersistentData.qBalancesByAddress) globalPersistentData.qBalancesByAddress = {}

    if (!globalPersistentData.weeklyDelimiterDateISO) globalPersistentData.weeklyDelimiterDateISO = "2023/10/24"

    if (!globalPersistentData.blacklistedValidators) globalPersistentData.blacklistedValidators = []
    if (!globalPersistentData.lastContractUpdateISO) globalPersistentData.lastContractUpdateISO = "2024-03-08"

    if (!globalPersistentData.stQPrices) globalPersistentData.stQPrices = []

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
        price: calculateMpEthPrice().toString(),
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

    Object.keys(globalQData.validatorsBalancesByAddress).forEach((address: string) => {
        const balance = globalQData.validatorsBalancesByAddress[address]
        if (!globalPersistentData.qBalancesByAddress[address]) {
            globalPersistentData.qBalancesByAddress[address] = []
        }

        globalPersistentData.qBalancesByAddress[address].push({
            dateISO: currentDateISO,
            balance: balance.toString()
        })
    })

    globalPersistentData.stQPrices.push({
        dateISO: currentDateISO,
        price: globalQData.stQPrice.toString(),
        assets: globalQData.totalAssets.toString(),
        supply: globalQData.totalSupply.toString(),
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
    const validatorsData: ValidatorData[] = globalBeaconChainData.validatorsData
    validatorsData.map(async (v: ValidatorData) => {
        const index = v.validatorindex
        if (!index || v.status !== "active_online") return
        const proposalData: IValidatorProposal = await getValidatorProposal(index)
        if (proposalData.data && proposalData.data.length > 0) {
            globalPersistentData.validatorsLatestProposal[index] = proposalData.data[0].epoch
        }
    })
    saveGlobalPersistentData()
}

async function beat() {
    TotalCalls.beats++;
    TotalCalls.beaconChainApiCallsOnBeat = 0
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

    const lastContractUpdateTimestamp = new Date(globalPersistentData.lastContractUpdateISO).getTime()
    const currentDateTimestamp = new Date(currentDateISO).getTime()
    const shouldUpdateContract = currentDateTimestamp - CALL_SERVICES_PERIOD >= lastContractUpdateTimestamp
    console.log("Should update contract?", shouldUpdateContract)
    const isFirstCallOfTheDay: boolean = globalPersistentData.lastSavedPriceDateISO != currentDateISO
    if (isFirstCallOfTheDay) {
        updateDailyGlobalData(currentDateISO)
        truncateLongGlobalArrays()
        globalPersistentData.lastSavedPriceDateISO = currentDateISO

        saveGlobalPersistentData()
        if (shouldUpdateContract) {
            globalPersistentData.lastContractUpdateISO = currentDateISO
            saveGlobalPersistentData()
            if (!isDebug) {
                globalPersistentData.lastIDHTs = Date.now()
                await setIncomeDetailHistory()
            }
            const dailyReports = await runDailyActionsAndReport()
            mailReportsToSend.push(...dailyReports)
        }
    } // Calls made once a day

    if (Date.now() - globalPersistentData.lastValidatorCheckProposalTimestamp >= 6 * MS_IN_HOUR || isFirstCallOfTheDay) { // Calls made every 6 hours
        console.log("Sending report - 6 hours")
        await registerValidatorsProposals()
        const reportsMadeEvery6Hours: IMailReportHelper[] = [
            reportCloseToActivateValidators(),
            checkForPenalties(),
        ].filter((report: IMailReportHelper) => {
            console.log("Penalties report", report)
            return report.severity !== Severity.OK
        })
        mailReportsToSend.push(...reportsMadeEvery6Hours)

    } // Calls made every 6 hours

    if (new Date().getMinutes() < 5) {
        const reports: IMailReportHelper[] = await Promise.all([
            getDeactivateValidatorsReport(),
        ])

        // Pushing reports that are not OK
        const reportsWithErrors = reports.filter((r: IMailReportHelper) => r.severity !== Severity.OK)
        if (reportsWithErrors.length) {
            mailReportsToSend.push(...reportsWithErrors)
        }

    }
    if (mailReportsToSend.length) {
        buildAndSendReport(mailReportsToSend)
    }

    // Aurora
    console.log("--Checking if order queue should be moved for new contract")
    const wasDelayedUnstakeOrderQueueRunForNewContract = await checkAuroraDelayedUnstakeOrders(false)
    console.log("Order queue moved?", wasDelayedUnstakeOrderQueueRunForNewContract)

    //END OF BEAT
    globalPersistentData.beatCount++;
    saveGlobalPersistentData()

    console.log("Beacon chains API calls on beat", TotalCalls.beaconChainApiCallsOnBeat)
}

function saveGlobalPersistentData() {
    saveJSON(globalPersistentData, "persistent.json");
    saveJSON(globalBeaconChainData, "beaconChainPersistentData.json");
}

async function runDailyActionsAndReport(): Promise<IMailReportHelper[]> {
    console.log("Sending daily report")

    // Pushing reports that are not promises
    const reports = [
        await activateValidator(),
        alertCreateValidators(),
        alertCheckProfit(),
        reportWalletsBalances(),
        // reportSsvClusterBalances(),
        await checkDeposit(),
    ]

    return reports
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
            Step: ${curr.step}
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
    if (isTestnet || isDebug) subject = "TESTNET: " + subject

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
        buildAndSendMailForError(ex)
        console.error("ERR", ex.message)
        console.error("ERR", ex.stack)
        // console.error("ERR", JSON.stringify(ex))
    }).finally(() => {
        executing = false;
        const elapsedMs = Date.now() - beatStartMs
        console.log("Beat finished after", elapsedMs, "ms")
        loopsExecuted++;
    })
}

export function buildAndSendMailForError(err: any) {
    let subject = `[ERROR] Unexpected error - ${err.message}`
    if (isTestnet || isDebug) {
        subject = `TESTNET: ${subject}`
    }

    const body = `
        ${err.message}
        ${err.stack}
    `
    sendEmail(subject, body)
}

function atLeast(a: number, b: number): number { return Math.max(a, b) }

function processArgs() {
    for (let i = 2; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case "--debug":
                setIsDebug(true)
                MONITORING_PORT = 7011
                break
            default:
                throw new Error(`Unknown arg ${process.argv[i]}`)
        }
    }
    const network = getEnv().NETWORK
    if (network === "goerli") {
        setIsTestnet(true)
        MONITORING_PORT = 7011
    }
}

async function debugActions(runWhile: boolean) {
    initializeUninitializedGlobalData()
    await stakingContract.totalAssets()
    await refreshMetrics()
    // Add here
    while (runWhile) {
        const validatorsToDisassemble = await getValidatorsRecommendedToBeDisassembled(3)
        console.log(1, validatorsToDisassemble)
        await sleep(6.4 * MS_IN_MINUTES)
        await refreshMetrics()
    }
}

export async function run() {
    processArgs()

    setGlobalPersistentData(loadJSON("persistent.json"))
    setGlobalBeaconChainData(loadJSON("beaconChainPersistentData.json"))
    // globalPersistentData = loadJSON("persistent.json")
    // globalBeaconChainData = loadJSON("beaconChainPersistentData.json")
    idhBeaconChainCopyData = loadJSON("idhBeaconChainCopyData.json")

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

    console.log("Running debug?", isDebug)
    if (isDebug) {
        console.log("Running debug")
        const runWhile = true
        await debugActions(runWhile)
        return
    }

    //start loop calling heartbeat 
    serverStartedTimestamp = Date.now();
    heartLoop();
}

// run()//.catch((reason: any) => console.error("Main err", reason.message, reason.stack));