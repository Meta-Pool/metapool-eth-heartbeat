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
#######   All this time, this script ran using commit from 2023-06-14 with commit hash 872355cdecfab99606cedd077d1ff61ce95f4f04. 
#######   On 2026-04-18 a pull is being made to commit hash 8f075cd3995ea2b63355952b7f6a39626f53ed4b

set -o allexport
source .env set # Loads NETWORK
set +o allexport

current_date=$(date +"%Y-%m-%d %H:%M")
echo $current_date
echo "Loading cluster for $NETWORK"
echo "Node path: $(which node)"
echo "Node version $(node -v)"

INFURA_API_KEY_FILE="$HOME/.config/$NETWORK/infuraApiKey.txt"
if [ ! -f "$INFURA_API_KEY_FILE" ]; then
    echo "Infura API key file not found: $INFURA_API_KEY_FILE"
    exit 1
fi

INFURA_API_KEYS_RAW=$(tr -d '[:space:]' < "$INFURA_API_KEY_FILE")
if [ -z "$INFURA_API_KEYS_RAW" ]; then
    echo "Infura API key file is empty: $INFURA_API_KEY_FILE"
    exit 1
fi

# Split comma-separated keys into an array
IFS=',' read -ra INFURA_API_KEYS <<< "$INFURA_API_KEYS_RAW"

if [ "$NETWORK" = "mainnet" ]; then
    BASE_URL=https://mainnet.infura.io/v3
    OWNER_WALLET=0xDd1CD16F95e44Ef7E55CC33Ee6C1aF9AB7CEC7fC
else
    BASE_URL=https://goerli.infura.io/v3
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

    success=false
    for key in "${INFURA_API_KEYS[@]}"; do
        URL="$BASE_URL/$key"
        echo "Calling with url $URL, network $NETWORK, owner wallet $OWNER_WALLET and operators $operators"
        output=$(yarn cli cluster -n "$URL" -nw "$NETWORK" -oa "$OWNER_WALLET" -oids "$operators" 2>&1)
        echo "Output: $output"
        if [ $? -ne 0 ]; then
            echo "Key ending in ...${key: -4} failed (non-zero exit), trying next key..."
            continue
        fi
        if echo "$output" | grep -qi "Too Many Requests"; then
            echo "Key ending in ...${key: -4} failed (429 rate limit), trying next key..."
            continue
        fi
        success=true
        break
    done

    if [ "$success" = false ]; then
        echo "Failed to fetch cluster data for operators $operators with all keys"
        cd ../$dirName
        exit 1
    fi

    echo "$output" > "$OUTPUT_PATH"
    cd ../$dirName
done