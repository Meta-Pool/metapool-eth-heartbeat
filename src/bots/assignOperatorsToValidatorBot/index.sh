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
OPERATOR_KEYS_STRINGS=$(jq --argjson OPERATOR_IDS_ARRAY "$OPERATOR_IDS_ARRAY" '.[] | select( .id == 57 or .id == 211 or .id == 885 or .id == 10) | .pubkey' src/bots/assignOperatorsToValidatorBot/operators.json)
OPERATOR_KEYS=$(echo $OPERATOR_KEYS_STRINGS | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/;s/"//g;s/ /,/g')

# Run command below
ssv-keys-lin ksh --ksv=3 --keystore=$KEYSTORE_PATH --password=$PASSWD --operator-ids=$OPERATOR_IDS --operator-keys=$OPERATOR_KEYS --ssv-token-amount=0 --output-folder=./src/validatorsData/keyshares

# Update assigned.json adding validator pubkey from keystore
PUB_KEY=$(jq '.pubkey' $KEYSTORE_PATH | /usr/bin/sed -z 's/"//g')
ASSIGNED_GROUPS=$(/usr/bin/jq '. | length' $ALL_JSONS_PATH/assigned.json)
if [[ $ASSIGNED_GROUPS -eq $NEXT_GROUP_INDEX ]]; then
    # Creates new group with no validators assigned, ready to assign one on next step
    echo $(/usr/bin/jq --arg OPERATOR_IDS "$OPERATOR_IDS" --arg ALL_JSONS_PATH "$ALL_JSONS_PATH" '.[.|length] |= . + {"ids":[$OPERATOR_IDS], "pubkeys":[]}' $ALL_JSONS_PATH/assigned.json) > $ALL_JSONS_PATH/assigned.json
fi
echo $(/usr/bin/jq --arg PUB_KEY "$PUB_KEY" --arg ALL_JSONS_PATH "$ALL_JSONS_PATH" '.[length-1].pubkeys |= . + [$PUB_KEY]' $ALL_JSONS_PATH/assigned.json) > $ALL_JSONS_PATH/assigned.json

# Send the keyshare to the ssv contract via js
# node dist/bots/assignOperatorsToValidatorBot/index.js $pubkey$ $OPERATOR_IDS






# We will take the operator ids from a groups.json file. First we'll check how many validators have operators assignated depending on assigned.json
# s/\n/,/g;s/,$/\n/ is used to replace the character "new_line" with ",". For some reason, using a variable doesn't produce the desired output
#OPERATOR_IDS=$(/usr/bin/jq '.[].id' $PATH | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/')
# s/\n/,/g;s/,$/\n/;s/"//g is the same as above, but adds replacing "\"" for nothing
#OPERATOR_KEYS=$(/usr/bin/jq '.[].pubkey' $PATH | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/;s/"//g')

# echo $ASSIGNED_VALIDATORS
# echo $NEXT_GROUP_INDEX
echo $OPERATOR_IDS
echo $OPERATOR_KEYS
# echo $PUB_KEY


#node index.js