import { Contract, ethers } from "ethers";
import abi from "./ethereum/abi/abi.json"
import rodriAbi from "./ethereum/abi/rodriAbi.json"

const RPC_URL = "https://goerli.infura.io/v3/"
const API_KEY = "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy"
const SIGNER_ACCOUNT = "0x8DF3a720c7BDBCf47EFAd8F6158d9DB036b81349"
const NETWORK = 'goerli'
const ACCOUNT_PRIVATE_KEY = "0x97ea350f26d4f33264db4b01c2f285ddfd4ba36cb188341d9b8027da3033ba0d"

const CONTRACT_ADDRESS = "0xff50ed3d0ec03aC01D4C79aAd74928BFF48a7b2b"
const RODRI_CONTRACT_ADDRESS = "0x1Bec291d3E59fa82EF499b35caD8F0695bcc7054"
// This file is just to call the function registerValidator: https://goerli.etherscan.io/address/0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04#writeProxyContract

async function run() {
    
    // If you don't specify a //url//, Ethers connects to the default 
    // (i.e. ``http:/\/localhost:8545``)
    const provider = new ethers.AlchemyProvider(
        NETWORK,
        API_KEY
      );

    // The provider also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, we need the account signer...
    // const signer = provider.getSigner(SIGNER_ACCOUNT)
    const wallet = new ethers.Wallet(ACCOUNT_PRIVATE_KEY, provider)
    
    // const bn = await provider.getBlockNumber()
    // console.log(bn)

    const contract = new Contract(RODRI_CONTRACT_ADDRESS, rodriAbi.abi, wallet)
    console.log("Contract created")
    // const tx = await contract.deposit({value: ethers.parseEther("1")})
    const tx = await contract.withdraw(ethers.parseEther("1"))
    console.log("Function called")

    await tx.wait()

    // const contract = new Contract(CONTRACT_ADDRESS, abi, provider)
    // const response = await contract.get_deposit_count()
    // console.log(response)



}

run()