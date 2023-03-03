set +e

# Input variables
KEYSTORE_PATH=$1
ALL_JSONS_PATH=$2
PASSWD=$3

# Constants
VALIDATORS_PER_GROUP=4

# STEPS
# Get assigned validators amount from assigned.json
ASSIGNED_VALIDATORS=$(jq '.[].pubkeys' $ALL_JSONS_PATH/assigned.json | jq -s 'add | length')

# Get corresponding group from amount obtained before and groups.json considering every group should have 4 validators and no more
NEXT_GROUP_INDEX=$(echo $((ASSIGNED_VALIDATORS / VALIDATORS_PER_GROUP)))
OPERATOR_IDS=$(/usr/bin/jq --argjson NEXT_GROUP_INDEX "$NEXT_GROUP_INDEX" '.[$NEXT_GROUP_INDEX].ids[]' $ALL_JSONS_PATH/groups.json | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/')

# Get operators told by groups.json on operators.json
IFS=',' read -r -a OPERATOR_IDS_ARRAY <<< "$OPERATOR_IDS"
# FIX USE VALUES FROM ARRAY
echo $OPERATOR_IDS
echo ${OPERATOR_IDS_ARRAY[@]}
IFS="|"
# OPERATOR_KEYS_STRINGS=$(jq --argjson OPERATOR_IDS_ARRAY "$OPERATOR_IDS_ARRAY" '.[] | select( .id == $OPERATOR_IDS_ARRAY[0] or .id == $OPERATOR_IDS_ARRAY[1] or .id == $OPERATOR_IDS_ARRAY[2] or .id == $OPERATOR_IDS_ARRAY[3]) | .pubkey' src/bots/assignOperatorsToValidatorBot/operators.json)
OPERATOR_KEYS_STRINGS=$(jq --arg IDS "${OPERATOR_IDS[*]}" '($IDS | split(",") | map(tonumber)) as $PIDS | .[] | select( [.id] | index($PIDS[])).pubkey' $ALL_JSONS_PATH/operators.json)
OPERATOR_KEYS=$(echo $OPERATOR_KEYS_STRINGS | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/;s/"//g;s/ /,/g')

# Run command below
$ALL_JSONS_PATH/ssv-keys-lin ksh --ksv=3 --keystore=$KEYSTORE_PATH --password=$PASSWD --operator-ids=$OPERATOR_IDS --operator-keys=$OPERATOR_KEYS --ssv-token-amount=0 --output-folder=./src/validatorsData/keyshares

# Update assigned.json adding validator pubkey from keystore
PUB_KEY=$(jq '.pubkey' $KEYSTORE_PATH | /usr/bin/sed -z 's/"//g')
ASSIGNED_GROUPS=$(/usr/bin/jq '. | length' $ALL_JSONS_PATH/assigned.json)
if [[ $ASSIGNED_GROUPS -eq $NEXT_GROUP_INDEX ]]; then
    # Creates new group with no validators assigned, ready to assign one on next step
    echo $(/usr/bin/jq --arg OPERATOR_IDS "$OPERATOR_IDS" --arg ALL_JSONS_PATH "$ALL_JSONS_PATH" '.[.|length] |= . + {"ids":[$OPERATOR_IDS], "pubkeys":[]}' $ALL_JSONS_PATH/assigned.json) > $ALL_JSONS_PATH/assigned.json
fi
echo $(/usr/bin/jq --arg PUB_KEY "$PUB_KEY" --arg ALL_JSONS_PATH "$ALL_JSONS_PATH" '.[length-1].pubkeys |= . + [$PUB_KEY]' $ALL_JSONS_PATH/assigned.json) > $ALL_JSONS_PATH/assigned.json

# Send the keyshare to the ssv contract via js
KEYSHARE_PATH=/home/calcifer/ssv-keys/keyshares-20230213_043527.json
# TODO SELECT PROPER PATH FOR KEYSHARE
KEY_SHARE_PUB_KEY=$(jq '.data.publicKey' $KEYSHARE_PATH)
SHARES_PUB_KEYS=$(jq '.data.shares.publicKey' $KEYSHARE_PATH)
SHARES_ENCRYPTED=$(jq '.data.shares.encryptedKeys' $KEYSHARE_PATH)
AMOUNT=$(jq '.data.publicKey' $KEYSHARE_PATH)
node dist/bots/assignOperatorsToValidatorBot/index.js $KEY_SHARE_PUB_KEY $OPERATOR_IDS $SHARES_PUB_KEYS $SHARES_ENCRYPTED $AMOUNT