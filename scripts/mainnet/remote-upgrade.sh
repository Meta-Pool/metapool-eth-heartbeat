#!/bin/bash

REMOTE_USER=eth-metapool
REMOTE_SERVER=eth-metapool.narwallets.com
REMOTE_PORT=2022
REMOTE_REPO=repos/metapool/metapool-eth-heartbeat

echo "This script will pull & compile $REMOTE_REPO on the remote server $REMOTE_SERVER"
echo "Remote user: $REMOTE_USER"
echo "Make sure you have committed & pushed the changes you want to deploy before running this script"
read -p "Press [ENTER] to continue or [CTRL+C] to abort"
echo "Connecting to $REMOTE_SERVER..."

ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_SERVER << EOF
set -ex
cd $REMOTE_REPO
pwd
git branch -vv
git status
git pull
npm i
npm start
pm2 log
EOF
