REMOTE_USER=eth-metapool
REMOTE_SERVER=eth-metapool.narwallets.com
REMOTE_SOURCE_PATH=/home/$REMOTE_USER/repos/metapool/metapool-eth-heartbeat
REMOTE_FILE=src/services/beaconcha/beaconcha.ts
# /db is in /dist/db in the remote
rsync -auv --rsh='ssh -p2022' \
    $REMOTE_USER@$REMOTE_SERVER:$REMOTE_SOURCE_PATH/$REMOTE_FILE \
    private/
