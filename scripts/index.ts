import { SendMode, TonClient, WalletContractV4, fromNano, internal } from "ton";
import { mnemonicNew, mnemonicToPrivateKey, mnemonicToWalletKey } from "ton-crypto";

async function transferJetton() {
    const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC';
    const apiKey = "874857e8d768c85113615bf3186d453ecfb9bf86a9354be0531d7add328fbd41";

    const client = new TonClient({ endpoint, apiKey });
    // Convert mnemonics to private key
    const mnemonics = "north,nuclear,wreck,dismiss,taste,cliff,cram,armor,lounge,pig,galaxy,hat,rich,smart,scare,sport,install,urban,bullet,expect,blind,mom,normal,pact".split(","); // your 24 secret words (replace ... with the rest of the words)
    // let mnemonics = "drama figure cupboard gloom bulk cool street cattle piano run quiz silver athlete rich occur hat prevent hybrid author cupboard nest high pupil vast".split(" ");
    let keyPair = await mnemonicToPrivateKey(mnemonics);

    // Create wallet contract
    let workchain = 0; // Usually you need a workchain 0
    let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log(wallet.address);

    const balance = await client.getBalance(wallet.address);
    console.log("balance:", fromNano(balance));

    let contract = client.open(wallet);

    // Create a transfer Jetton
    let seqno: number = await contract.getSeqno();
    console.log(seqno);
    await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [internal(
            
        )],
        sendMode: SendMode.NONE
    });
}

async function run() {
    await transferJetton();   
}

run().then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
