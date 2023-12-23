import depositContractAbi from "../abi/depositContract.json"
import { getConfig } from "../config";
import { EthContract } from "../ethContracts";

export class DepositContract extends EthContract {

    constructor() {
        super(getConfig().depositContractAddress, depositContractAbi)
    }

}