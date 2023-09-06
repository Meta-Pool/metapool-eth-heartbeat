####### 
#######   When adding a new cluster, create a file with the operator ids separated with commas, as a txt file
#######   For example, if you have operators 14, 22, 32 and 65, create a file called 14,22,32,65.txt without any spaces
####### 
#######   SSV_SCANNER  
#######   See docs: https://ssv-network.gitbook.io/docs-v4/tools/ssv-scanner/ssv-scanner-cli
#######   Procedure:
#######        1 git clone https://github.com/bloxapp/ssv-scanner.git
#######        2 cd ssv-scanner
#######        3 yarn
#######   This SSV_SCANNER allows to get the data necessary to call ssv contracts
####### 


set -o allexport
source .env set # Loads NETWORK
set +o allexport

if [ "$NETWORK" = "mainnet" ]; then
    echo 'Ssv not implemented on mainnet yet'
    exit 0
    URL=
    CONTRACT_ADDRESS=0xDD9BC35aE942eF0cFa76930954a156B3fF30a4E1
    OWNER_WALLET=
else
    URL=https://goerli.infura.io/v3/9bdd9b1d1270497795af3f522ad85091
    CONTRACT_ADDRESS=0xC3CD9A0aE89Fff83b71b58b6512D43F8a41f363D
    OWNER_WALLET=0xba013e942abbeb7c6a2d597c61d65fdc14c0fee6
fi

dir="./db/clustersDataSsv/$NETWORK"
for f in "$dir"/*; do
    operators=$(basename "$f")
    operators=${operators%.*}

    # See above SSV_SCANNER
    [ ! -d "../ssv-scanner/" ] && echo "Directory ../ssv-scanner/ DOES NOT exists." && exit 1
    cd ../ssv-scanner/
    
    OUTPUT_PATH=../metapool-eth-heartbeat/db/clustersDataSsv/$NETWORK/$operators.txt
    output=$(yarn cli cluster -n $URL -ca $CONTRACT_ADDRESS -oa $OWNER_WALLET -oids $operators)}
    echo $output > $OUTPUT_PATH
    cd ../metapool-eth-heartbeat
done



