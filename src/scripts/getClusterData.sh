operators=$1
OUTPUT_PATH=../metapool-eth-heartbeat/db/clustersDataSsv/$operators.txt


cd ../ssv-scanner/
output=$(yarn cli cluster -n https://goerli.infura.io/v3/9bdd9b1d1270497795af3f522ad85091 -ca 0xC3CD9A0aE89Fff83b71b58b6512D43F8a41f363D -oa 0xba013e942abbeb7c6a2d597c61d65fdc14c0fee6 -oids $operators)}
echo $output >> $OUTPUT_PATH

cd ../metapool-eth-heartbeat
# cluster=$(echo "$output" | grep -o '"cluster": "[^"' | sed 's/.: "(.*){/\1/')
# echo $cluster
