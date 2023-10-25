import { readFileSync, writeFileSync } from "fs"
import { getBeaconChainEpoch } from "./services/beaconcha/beaconcha"
import { IEpochResponse } from "./services/beaconcha/entities"
import { etow, wtoe } from "./utils/numberUtils"

interface Donation {
    beaconEpoch: number,
    depositAmountWei: string,
    transactionHash: string
}

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

async function createDonationFileUntilDonationAmount() {
    const donationsInfo = await getDonationsInfo()

    const weeklyDonationsInETH = 0.45
    const dailyDonationsInETH = weeklyDonationsInETH / 7
    const hourlyDonationsInETH = dailyDonationsInETH / 24
    const hourlyDonationsInWei = etow(hourlyDonationsInETH)

    const now = Date.now()
    const from = donationsInfo.lastDonationDate
    const fromDate = new Date(from)
    const msLeftUntilFromDateEpoch = fromDate.getTime() - now
    if(msLeftUntilFromDateEpoch < 0) throw new Error(`From date is previous than now ${fromDate.getMilliseconds()}, ${now}`)

    const finalDonationsETH = 15
    
    const currentBeaconChainEpochData: IEpochResponse = await getBeaconChainEpoch()
    const currentBeaconChainEpoch: number = currentBeaconChainEpochData.data.epoch

    const startEpoch = donationsInfo.lastDonation.beaconEpoch + 1
    
    const epochsInHour = 60 / 6.4
    const output = []
    let epochIndex = startEpoch
    let donationTotal = 0
    const neededDonations = finalDonationsETH - donationsInfo.totalDonations
    while(donationTotal < neededDonations) {
        epochIndex += epochsInHour
        const newDonations = Math.min(hourlyDonationsInETH, neededDonations - donationTotal)
        const newDonationsCeil = (Math.floor(newDonations * 10**18) + 1) / 10 ** 18
        donationTotal += newDonationsCeil
        output.push(
            {
                beaconEpoch: Math.floor(epochIndex),
                depositAmountWei: etow(newDonationsCeil).toString(),
                transactionHash: ""
            }
        )
    }
    console.log("Total donation", donationTotal)
    writeFileSync(`./db/donations_${fromDate.toISOString().slice(0, 10)}_${donationTotal}ETH.json`, JSON.stringify(output))
}

async function getDonationsInfo() {
    const donationsFile: Donation[] = JSON.parse(readFileSync(`./db/donations.json`).toString())
    // const donationsFile: Donation[] = JSON.parse(readFileSync(`./db/donations_2023-11-20_4.046428571428551ETH.json`).toString())
    
    const totalDonations = donationsFile.reduce((sum: number, donation: Donation) => {
        return sum + wtoe(donation.depositAmountWei)
    }, 0)

    console.log("Total donations", totalDonations)

    const currentBeaconChainEpoch = await getBeaconChainEpoch()
    const lastDonation = donationsFile[donationsFile.length - 1]
    const lastDonationEpoch = lastDonation.beaconEpoch

    const epochsUntilLastEpoch = lastDonationEpoch - currentBeaconChainEpoch.data.epoch
    const minutesUntilLastEpoch = epochsUntilLastEpoch * 6.4
    const now = new Date()
    const lastDonationDate = new Date(now.getTime() + minutesUntilLastEpoch * 60 * 1000)

    // console.log("Current beacon chain epoch", currentBeaconChainEpoch.data.epoch)
    // console.log("Last beacon chain donation epoch", lastDonationEpoch)
    // console.log("Minutes until last epoch", minutesUntilLastEpoch)
    console.log("Last donation date", lastDonationDate)

    return {
        totalDonations,
        lastDonationDate,
        lastDonation,
    }

}


function run() {
    getDonationsInfo().then((a) => console.log(a))
}

run()
