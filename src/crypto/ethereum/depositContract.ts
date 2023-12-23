import depositContractAbi from "../abi/depositContract.json"
import { getConfig } from "../config";
import { EthContract } from "../ethContracts";

export class DepositContract extends EthContract {

    constructor() {
        super(getConfig().depositContractAddress, depositContractAbi)
    }

    getDepositRoot(): Promise<string> {
        return this.view("get_deposit_root")
    }

}