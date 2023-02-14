#Configuration
THRESHOLD=5

# First builds the js script in case there are changes and obtain the amount of activated validators
npx tsc
ACTIVATED_VALIDATORS=$(node ./dist/bots/createValidatorAlert/activatedValidators.js)

# List of deposit_data files that contained the created validators
FILES=(
    deposit_data-1676316121.json
)

# Get the amount of created validators
CREATED_VALIDATORS=0
for filename in "${FILES[@]}"
do
    CREATED_VALIDATORS_IN_FILE=$(cat src/validatorsData/validator_keys/"$filename" | jq '. | length')
    CREATED_VALIDATORS=$((CREATED_VALIDATORS + CREATED_VALIDATORS_IN_FILE))
done

echo $CREATED_VALIDATORS
echo $ACTIVATED_VALIDATORS
echo $(($CREATED_VALIDATORS - $ACTIVATED_VALIDATORS))

REMAINING_VALIDATORS=$(($CREATED_VALIDATORS - $ACTIVATED_VALIDATORS))

if (( $REMAINING_VALIDATORS < $THRESHOLD )); then
    echo Send email
else
    echo Don\'t send email
fi