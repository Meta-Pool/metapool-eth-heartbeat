REMOTE_USER=eth-metapool
rsync -auv --rsh='ssh -p2022' $REMOTE_USER@eth-metapool.narwallets.com:/home/$REMOTE_USER/.config/mainnet ~/.config/
