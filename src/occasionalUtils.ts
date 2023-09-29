import { readFileSync, writeFileSync } from "fs"
import { getBeaconChainEpoch } from "./services/beaconcha/beaconcha"
import { IEpochResponse } from "./services/beaconcha/entities"
import { etow } from "./utils/numberUtils"

function testOperatorsRunway() {
    const clusterParams = [
        {
            balance: 8.56,
            validatorsCount: 4,
            expectedDays: 230,
            operatorsFees: [1,1,1,0]
        },
        {
            balance: 3.91,
            validatorsCount: 1,
            expectedDays: 354,
            operatorsFees: [1,0,0,2]
        },
    ]
    
    const networkFee = 0
    const LTP = 214800
    // const minimumLCC = 1000000000000000000
    const blocksPerDay = 7160
    const blocksPerYear = blocksPerDay * 365
    const minimumLCC = blocksPerYear

    const file = readFileSync("./db/clusterData.json").toString()
    const clusterSplitted = file.split("cluster")
    const cluster = clusterSplitted[clusterSplitted.length - 1].substring(2).split("}")[0]
    console.log(JSON.parse(cluster))
    
}

async function createDonationFile() {
    const weeklyDonationsInETH = 0.45
    const dailyDonationsInETH = weeklyDonationsInETH / 7
    const hourlyDonationsInETH = dailyDonationsInETH / 24
    const hourlyDonationsInWei = etow(hourlyDonationsInETH)

    const now = Date.now()
    const from = "2023/09/21 19:17:00"
    const fromDate = new Date(from)
    const msLeftUntilFromDateEpoch = fromDate.getTime() - now
    if(msLeftUntilFromDateEpoch < 0) throw new Error(`From date is previous than now ${fromDate.getMilliseconds()}, ${now}`)

    const days = 60
    let to: string = ""
    let toDate = new Date(to || from)

    if(to === "" && days <= 0) throw new Error("Set either 'days' or 'to'")
    if(to === "") {
        toDate.setDate(toDate.getDate() + days)
    }

    const msBetweenFromAndTo = toDate.getTime() - fromDate.getTime()
    if(msBetweenFromAndTo < 0) throw new Error("From date is previous than to date")
    
    const currentBeaconChainEpochData: IEpochResponse = await getBeaconChainEpoch()
    const currentBeaconChainEpoch: number = currentBeaconChainEpochData.data.epoch
    
    const epochsUntilStart = Math.round(msLeftUntilFromDateEpoch / 1000 / 60 / 6.4)
    const startEpoch = currentBeaconChainEpoch + epochsUntilStart
    
    const donationsEpochLength = Math.round(msBetweenFromAndTo / 1000 / 60 / 6.4)
    const finishEpoch = startEpoch + donationsEpochLength
    console.log(1, currentBeaconChainEpoch, startEpoch, finishEpoch)

    const epochsInHour = 60 / 6.4
    const output = []
    let epochIndex = startEpoch
    let donationTotal = 0
    while(epochIndex < finishEpoch) {
        epochIndex += epochsInHour
        donationTotal += hourlyDonationsInETH
        output.push(
            {
                beaconEpoch: Math.floor(epochIndex),
                depositAmountWei: hourlyDonationsInWei.toString(),
                transactionHash: ""
            }
        )
    }
    console.log("Total donation", donationTotal)
    writeFileSync(`./db/donations_${fromDate.toISOString().slice(0, 10)}_${toDate.toISOString().slice(0, 10)}.json`, JSON.stringify(output))
}


function run() {
    createDonationFile()
}

run()
