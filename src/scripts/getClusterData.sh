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

current_date=$(date +"%Y-%m-%d %H:%M")
echo $current_date
echo "Loading cluster for $NETWORK"
echo "Node path: $(which node)"
echo "Node version $(node -v)"

if [ "$NETWORK" = "mainnet" ]; then
    URL=https://mainnet.infura.io/v3/9bdd9b1d1270497795af3f522ad85091
    CONTRACT_ADDRESS=0xDD9BC35aE942eF0cFa76930954a156B3fF30a4E1
    OWNER_WALLET=0xDd1CD16F95e44Ef7E55CC33Ee6C1aF9AB7CEC7fC
else
    URL=https://goerli.infura.io/v3/9bdd9b1d1270497795af3f522ad85091
    CONTRACT_ADDRESS=0xC3CD9A0aE89Fff83b71b58b6512D43F8a41f363D
    OWNER_WALLET=0xba013e942abbeb7c6a2d597c61d65fdc14c0fee6
fi

dir="./dist/db/clustersDataSsv/$NETWORK"
file_count=$(find $dir -type f | wc -l)
echo "File count $file_count"
if [ $file_count -eq 0 ]; then
    echo "Clusters declared. Exiting"
    exit 0  # You can use a different exit code if desired
fi

dirName=$(basename $(pwd))
echo "Project directory name $dirName"
for f in "$dir"/*; do
    echo $f
    # See above SSV_SCANNER
    [ ! -d "../ssv-scanner/" ] && echo "Directory ../ssv-scanner/ DOES NOT exists." && exit 1

    operators=$(basename "$f")
    operators=${operators%.*} # Removes extension
    echo "Getting $operators" >> dist/main.log
    
    cd ../ssv-scanner/
    OUTPUT_PATH=../$dirName/dist/db/clustersDataSsv/$NETWORK/$operators.txt
    output=$(yarn cli cluster -n $URL -ca $CONTRACT_ADDRESS -oa $OWNER_WALLET -oids $operators)}
    echo $output > $OUTPUT_PATH
    cd ../$dirName
done