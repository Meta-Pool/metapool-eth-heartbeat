set +e

PATH=$1
PASSWD=$2
# s/\n/,/g;s/,$/\n/ is used to replace the character "new_line" with ",". For some reason, using a variable doesn't produce the desired output
OPERATOR_IDS=$(/usr/bin/jq '.[].id' $PATH | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/')
# s/\n/,/g;s/,$/\n/;s/"//g is the same as above, but adds replacing "\"" for nothing
OPERATOR_KEYS=$(/usr/bin/jq '.[].pubkey' $PATH | /usr/bin/sed -z 's/\n/,/g;s/,$/\n/;s/"//g')

echo $OPERATOR_IDS
#ssv-keys-lin ksh --ksv=3 --keystore=keystore.json --password=$PASSWD --operator-ids=$OPERATOR_IDS --operator-keys=$OPERATOR_KEYS --ssv-token-amount=0 --output-folder=./src/validatorsData/keyshares

#node index.js