import { Network, Alchemy } from 'alchemy-sdk';

async function run() {
    const settings = {
        apiKey: "mrTmFCjo_n7xJBq-V3Oli5AuQiqH3GEy",
        network: Network.ETH_GOERLI,
    };
    
    const alchemy = new Alchemy(settings);
    
    // Get the latest block
    const latestBlock = alchemy.core.getBlockNumber();
    
    // Get all outbound transfers for a provided address
    alchemy.core
        .getTokenBalances('0x994b342dd87fc825f66e51ffa3ef71ad818b6893')
        .then(console.log);
    
    // Get all the NFTs owned by an address
    const nfts = await alchemy.nft.getNftsForOwner("0x8DF3a720c7BDBCf47EFAd8F6158d9DB036b81349");
    
    console.log(nfts)
    
    // Listen to all new pending transactions
    // alchemy.ws.on(
    //     { method: "alchemy_pendingTransactions",
    //     fromAddress: "0xshah.eth" },
    //     (res) => console.log(res)
    // );
}

run()
