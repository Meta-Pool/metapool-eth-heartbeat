After some validators are activated, we may be in a situation where there are a few validators created that are not activated. When this happens, we need to be alerted of this situation and create more.

It will be monitred here

1) Calling "https://prater.beaconcha.in/api/v1/validator/eth1/" and "https://prater.beaconcha.in/api/v1/validator/" we will get the amount of validators activated. From the `deposit_data` files, we will get the amount of validators created. 
2) By substracting both we get the amount of validators left to be activated. When this number reaches some threshold, an email should be sent to all alerting us to create some new validators. 