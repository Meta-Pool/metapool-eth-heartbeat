REMOTE_USER=test-metapool-evm
REMOTE_SERVER=eth-test.narwallets.com
rsync -auv --rsh='ssh -p2022' ~/.config/goerli $REMOTE_USER@$REMOTE_SERVER:/home/$REMOTE_USER/.config

