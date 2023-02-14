Para tener un validador hay que hacer 3 pasos

1) Crearlo
2) Distribuirlo en ssv 
3) Activarlo


[PASOS MANUALES]
1) La creación es netamente manual. Se hace con una mnemonic y esto genera 2 archivos por validador: el `keystore` y el `deposit_data`. 

[PASOS AUTOMÁTICOS]
2) Una vez creado el validador, se toma el `keystore` para poder asignarle operadores al validador, haciendo un split de la key en 4 partes. Esto da como resultado un archivo llamado `keyshares`. Este archivo `keyshares` se envía al contrato de ssv a través de una transacción. Con esto, el validador queda configurado, esperando a ser activado. Este paso sería automatizado.

3) Se realiza una transferencia de 32 ETH al contrato de depósito de ethereum con la información del archivo de `deposit_data`. 12 horas después, el validador está funcionando. Este paso también es automatizado.


El paso 3, queda pendiente de revisar si se dispara automáticamente desde el contrato cuando se recibe un depósito o si es necesario que el contrato tenga una interacción con un bot que le de la orden (charlar con Lean)



DETALLES
Paso 1)
1) Ingresar a https://github.com/ethereum/staking-deposit-cli/releases y descargar la última versión
2) Descomprimir el tar.gz
3) En el CLI, ir a la ruta donde está el archivo `deposit` que estaba dentro del tar.gz
4) Correr `./deposit --new-mnemonic --withdrawal-address 0x...` (reemplazar por una wallet real)
Más adelante se conseguirá un ledger para correrlo con un mnemonic que obtener del ledger


Paso 2)
1) Descargar de https://github.com/bloxapp/ssv-keys/releases la versión correspondiente.
2) Correr el comando `ssv-keys-lin ksh --ksv=3 --keystore=keystore.json --password=test --operator-ids=1,2,3,4 --operator-keys=LS..,LS..,LS..,LS.. --ssv-token-amount=0 --output-folder=./` reemplazando los parámetros correspondientes (keystore, passowrd, operator-ids, operator-keys)
3) En el output folder figurará el archivo `keystores` mencionado anteriormente
4) Mandar este archivo al contrato de ssv mediante la función https://goerli.etherscan.io/address/0xb9e155e65B5c4D66df28Da8E9a0957f06F11Bc04#writeProxyContract#F9 con la información que se obtiene del archivo `keyshares`


Paso 3)
1) Correr la función https://goerli.etherscan.io/address/0xff50ed3d0ec03ac01d4c79aad74928bff48a7b2b#writeContract#F1 con la data del archivo `deposit_data`
2) Fundamental que este paso nunca se ejecute sin haber ejecutado el paso 2. 
Charlar con Lean si realmente puede quedar para ser ejecutado desde el lado del contrato. 