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

INFURA_API_KEY=$(tr -d '[:space:]' < "$INFURA_API_KEY_FILE")
if [ -z "$INFURA_API_KEY" ]; then
    echo "Infura API key file is empty: $INFURA_API_KEY_FILE"
    exit 1
fi

MAX_RETRIES=5
BASE_RETRY_SECONDS=15

if [ "$NETWORK" = "mainnet" ]; then
    URL=https://mainnet.infura.io/v3/$INFURA_API_KEY
    OWNER_WALLET=0xDd1CD16F95e44Ef7E55CC33Ee6C1aF9AB7CEC7fC
else
    URL=https://goerli.infura.io/v3/$INFURA_API_KEY
    OWNER_WALLET=0xba013e942abbeb7c6a2d597c61d65fdc14c0fee6
fi

if command -v curl >/dev/null 2>&1; then
    echo "Checking RPC endpoint health..."
    rpc_http_code=$(curl -sS -o /tmp/infura_rpc_health.$$ -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -X POST \
        --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        "$URL")
    rpc_response_body=$(cat /tmp/infura_rpc_health.$$)
    rm -f /tmp/infura_rpc_health.$$
    echo "RPC health check status: $rpc_http_code"
    if [ "$rpc_http_code" = "429" ]; then
        echo "RPC endpoint is returning 429 before cluster calls. This is usually Infura throughput throttling (requests/sec), not daily credit usage."
    fi
    echo "RPC health check body: $rpc_response_body"
fi

run_cluster_with_retry() {
    local operators="$1"
    local attempt=1
    local wait_seconds=$BASE_RETRY_SECONDS
    local cmd_output=""
    local exit_code=0

    while [ "$attempt" -le "$MAX_RETRIES" ]; do
        echo "Running ssv-scanner for operators $operators (attempt $attempt/$MAX_RETRIES)"
        cmd_output=$(yarn cli cluster -n "$URL" -nw "$NETWORK" -oa "$OWNER_WALLET" -oids "$operators" 2>&1)
        exit_code=$?

        if [ "$exit_code" -eq 0 ] && ! echo "$cmd_output" | grep -qiE "429|too many requests"; then
            echo "$cmd_output"
            return 0
        fi

        echo "ssv-scanner call failed (attempt $attempt/$MAX_RETRIES)."
        echo "Output: $cmd_output"

        if [ "$attempt" -lt "$MAX_RETRIES" ]; then
            echo "Waiting ${wait_seconds}s before retry..."
            sleep "$wait_seconds"
            wait_seconds=$((wait_seconds * 2))
        fi

        attempt=$((attempt + 1))
    done

    return 1
}

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
    output=$(run_cluster_with_retry "$operators") || {
        echo "Failed to fetch cluster data for operators $operators after $MAX_RETRIES attempts"
        cd ../$dirName
        exit 1
    }
    echo "$output" > "$OUTPUT_PATH"
    cd ../$dirName
done