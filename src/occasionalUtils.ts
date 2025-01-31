import { existsSync, readFileSync, writeFileSync } from "fs"
import { ValidatorData, getBeaconChainEpoch, getIncomeDetailHistory, getValidatorsData, sumPenalties, sumRewards } from "./services/beaconcha/beaconcha"
import { IEpochResponse, IIncomeData, IIncomeDetailHistoryData, IIncomeDetailHistoryResponse } from "./services/beaconcha/entities"
import { etow, wtoe } from "./utils/numberUtils"
import { callDisassembleApi } from "./bots/validatorsAlerts"
import { sleep } from "./bots/heartbeat"

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
    const weeklyDonationsInETH = 0.1
    const dailyDonationsInETH = weeklyDonationsInETH / 7
    const hourlyDonationsInETH = dailyDonationsInETH / 24
    const hourlyDonationsInWei = etow(hourlyDonationsInETH.toFixed(18))

    const now = Date.now()
    const from = "2024/04/08 16:30:00"
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
    console.log("Final donation date", toDate.toISOString())
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


async function run() {
    const args = process.argv
    if(args.length < 3) throw new Error("Use npm run utils --args ${method}")
    const fn = args[2]
    switch(fn) {
        case "disassemble":
            console.log("Calling disassemble")
            callDisassembleValidators()
            break
        case "apy": 
            await calculateAproxRewardsData()
            await calculateExactAPYData()
            break
        case "donationFile": 
            createDonationFile()
            break
        default:
            throw new Error(`Function ${fn} not found`)
    }
    
}

function callDisassembleValidators() {
    const args = process.argv
    if(args.length < 4) throw new Error("Use npm run utils --args disassemble validatorsPubKey1 ... validatorsPubKeyN")
    const validatorsPubKeys: string[] = []
    for(let i = 3; i < args.length; i++) {
        validatorsPubKeys.push(args[i])
    }
    callDisassembleApi(validatorsPubKeys)
}

function getValidatorsGroups(validatorIndexes: number[]): number[][] {
    let i = 0
    const output = []
    while (i < validatorIndexes.length) {
        output.push(validatorIndexes.slice(i, i + 100))
        i += 100
    }
    return output
}


function joinMultipleIDH(idhArray: IIncomeDetailHistoryResponse[]) {
    const finalIDH: IIncomeDetailHistoryResponse = {
        status: "OK",
        data: []
    }
    idhArray.forEach((idh: IIncomeDetailHistoryResponse) => {
        if(idh.status !== "OK") {
            finalIDH.status = idh.status
        }
        try {
            finalIDH.data.push(...idh.data)
        } catch(err) {
            console.error("Error appending idh", idh)
            throw err
        }
    })
    return finalIDH
}

function sortIDH(idh: IIncomeDetailHistoryResponse) {
    idh.data.sort((data1: IIncomeDetailHistoryData, data2: IIncomeDetailHistoryData) => {
        if(data1.epoch === data2.epoch) {
            return data1.validatorindex - data2.validatorindex
        }
        return data1.epoch - data2.epoch
    })
    return idh
}

async function getAllValidatorsIDH(validatorsData: ValidatorData[], fromEpoch: number, toEpoch: number): Promise<IIncomeDetailHistoryResponse> {
    console.log("Getting validators IDH from", fromEpoch, "to", toEpoch)
    if(fromEpoch === toEpoch) return {status: "OK", data: []}
    const validatorIndexes: number[] = validatorsData
        .map((v: ValidatorData) => v.validatorindex)
        .filter((index: number | undefined) => index !== undefined) as number[]// If it's undefined, it hasn't been fully activated yet

    // Splitting active validators in groups of 100 and getting IDH, since beacon chain doesn't allow more
    const validatorsGroups = getValidatorsGroups(validatorIndexes)
    const validatorsIDHArray: IIncomeDetailHistoryResponse[] = await Promise.all(validatorsGroups.map(async (validatorsGroup: number[]) => {
        const limits: number[] = [ fromEpoch ]
        let auxFrom = fromEpoch
        while(auxFrom < toEpoch) {
            auxFrom = Math.min(toEpoch, auxFrom + 100)
            limits.push(auxFrom)
        }
        
        const idhResponses: IIncomeDetailHistoryResponse[] = (await Promise.all(limits.map(async (limitFrom: number, index: number) => {
            if(index + 1 === limits.length) return undefined
            const limitTo = limits[index + 1]
            await sleep(index * 800)
            return getIncomeDetailHistory(validatorsGroup, limitFrom, limitTo)
        }))).filter((idh: IIncomeDetailHistoryResponse|undefined) => idh !== undefined) as IIncomeDetailHistoryResponse[]
        return joinMultipleIDH(idhResponses as IIncomeDetailHistoryResponse[])
    }))


    const unsortedIDHs: IIncomeDetailHistoryResponse = joinMultipleIDH(validatorsIDHArray)
    const sortedIDH  = sortIDH(unsortedIDHs)
    return sortedIDH
}

async function storeAllValidatorsIDH(filename: string) {
    const currentBeaconChainEpochResponse: IEpochResponse = await getBeaconChainEpoch()
    const currentBeaconChainEpoch = currentBeaconChainEpochResponse.data.epoch

    const validatorsData: ValidatorData[] = await getValidatorsData()
    console.log(validatorsData)
    const firstEpoch = 223200
    const finalEpoch = Math.min(firstEpoch + 3000, currentBeaconChainEpoch - 2)
    const allValidatorsIDH = await getAllValidatorsIDH(validatorsData, firstEpoch, finalEpoch)
    writeFileSync(`${filename}_${firstEpoch}_${finalEpoch}.json`, JSON.stringify(allValidatorsIDH))
}

async function calculateExactAPYData() {
    const refetch = true
    const filename = "delete_me_idh"
    if(refetch || !existsSync(filename)) {
        await storeAllValidatorsIDH(filename)
    }
}

async function calculateAproxRewardsData() {
    const validatorsData: ValidatorData[] = await getValidatorsData()
    const indexRewards = validatorsData.map((v: ValidatorData) => {
        return [v.validatorindex, v.total_withdrawals! / 1e9]
    })

    console.log("Index aprox rewards", indexRewards)
}

run()
