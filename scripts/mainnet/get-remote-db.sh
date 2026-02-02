REMOTE_USER=eth-metapool
REMOTE_SERVER=eth-metapool.narwallets.com
REMOTE_SOURCE_PATH=/home/$REMOTE_USER/repos/metapool/metapool-eth-heartbeat
# /db is in /dist/db in the remote
rsync -auv --rsh='ssh -p2022' $REMOTE_USER@$REMOTE_SERVER:$REMOTE_SOURCE_PATH/dist/db dist
