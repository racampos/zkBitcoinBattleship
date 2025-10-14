# Github Gist

Testnet faucets:

- Starknet sepolia: https://starknet-faucet.vercel.app/
- Bitcoin testnet3: https://bitcoinfaucet.uo1.net/

Explorer links:

- Starknet sepolia: https://sepolia.voyager.online/
- Mempool testnet3: https://mempool.space/testnet

Cashu lightning wallet: https://wallet.cashu.me/

## Setup

Install typescript 4: `npm i -g typescript@4`

Initialize the directory with npm: `npm init`

Create `src` directory: `mkdir src`

Use the following `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "declaration": true,
    "outDir": "./dist",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true
  },
  "include": ["./src/**/*"]
}
```

Install the following packages:

- `npm i @atomiqlabs/chain-starknet`
- `npm i @atomiqlabs/sdk`
- `npm i @scure/btc-signer@1`
- `npm i starknet@7`

Additional dependencies when working in NodeJS (backend, non-browser environment)

- `npm i @atomiqlabs/storage-sqlite` (by default the SDK uses browser storage, which is not available in non-browser - i.e. backend environments, hence we have to use a custom sqlite storage)

Additional dev dependencies when working in NodeJS (backend) and typescript:

- `npm i --save-dev @types/node`

## Code

Rpcs testnet

```typescript
const starknetRpc = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
});
const bitcoinRpc = new MempoolBitcoinRpc("https://mempool.space/testnet/api/");
```

Rpcs mainnet

```typescript
const starknetRpc = new RpcProvider({
  nodeUrl: "https://starknet-mainnet.public.blastapi.io/rpc/v0_8",
});
const bitcoinRpc = new MempoolBitcoinRpc("https://mempool.space/api/");
```

Wallets

```typescript
//Starknet wallet setup - here a simple OZ account (provided for convinience by the SDK itself) is used with the randomly generated private key that is saved to starknet.key file
const starknetKey = fs.existsSync("starknet.key")
  ? fs.readFileSync("starknet.key").toString()
  : StarknetKeypairWallet.generateRandomPrivateKey();
const starknetWallet = new StarknetKeypairWallet(starknetRpc, starknetKey);
//You can also pass the account from the @starknet-io/get-starknet SWO - starknet wallet object (in browsers)
// const starknetWallet = await WalletAccount.connect(starknetRpc, swo);
const starknetSigner = new StarknetSigner(starknetWallet);
fs.writeFileSync("starknet.key", starknetKey);
console.log("Starknet wallet address: " + starknetSigner.getAddress());

//Bitcoin wallet setup - a simple single address bitcoin wallet with a randomly generated private key that is saved to the bitcoin.key file
const bitcoinKey = fs.existsSync("bitcoin.key")
  ? fs.readFileSync("bitcoin.key").toString()
  : SingleAddressBitcoinWallet.generateRandomPrivateKey();
const bitcoinSigner = new SingleAddressBitcoinWallet(
  bitcoinRpc,
  TEST_NETWORK,
  bitcoinKey
);
fs.writeFileSync("bitcoin.key", bitcoinKey);
console.log("Bitcoin wallet address: " + bitcoinSigner.getReceiveAddress());
```

SDK factory and swapper

```typescript
//Create atomiq SDK factory and get the swapper
const Factory = new SwapperFactory<[StarknetInitializerType]>([
  StarknetInitializer,
]);
const Tokens = Factory.Tokens; //So we can more easily access the tokens
const swapper = Factory.newSwapper({
  chains: {
    STARKNET: {
      rpcUrl: starknetRpc,
    },
  },
  bitcoinNetwork: BitcoinNetwork.TESTNET,

  //By default the SDK uses browser storage, so we need to explicitly specify the sqlite storage for NodeJS (non-browser environments),
  // leave this lines out in browser environment
  swapStorage: (chainId) =>
    new SqliteUnifiedStorage("CHAIN_" + chainId + ".sqlite3"),
  chainStorageCtor: (name) =>
    new SqliteStorageManager("STORE_" + name + ".sqlite3"),
});
```

Initialize the SDK and perform a BTC -> STRK swap

```typescript
//Initialize the swapper (only do this once!)
await swapper.init();
console.log("atomiq SDK swapper initialized!");

//Swap from BTC (L1) -> STRK
const swap = await swapper.swap(
  Tokens.BITCOIN.BTC, //From BTC
  Tokens.STARKNET.STRK, //To STRK
  3000n, //3000 sats - 0.00003 BTC
  true, //Whether we defined an input or the output amount - here input amount
  bitcoinSigner.address, //Source bitcoin address for the swap
  starknetSigner.getAddress() //Destination starknet address
);

console.log(`Swapping ${swap.getInput()} to ${swap.getOutput()}`);

//Send out the transaction on the bitcoin side
const btcTxId = await swap.sendBitcoinTransaction(bitcoinSigner);
//Or use this if you are using the SDK with browser based wallet like unisat or xverse
// const {psbt, signInputs} = await swap.getFundedPsbt({
//     address: bitcoinSigner.address,
//     publicKey: Buffer.from(bitcoinSigner.pubkey).toString("hex")
// }); //Get the PSBT that should be signed by the wallet
// //Sign the PSBT with the wallet (the actual wallet might have a slightly different API)
// const signedPsbt = await bitcoinSigner.signPsbt(psbt, signInputs);
// const btcTxId = await swap.submitPsbt(signedPsbt); //Submit the signed PSBT
console.log("Bitcoin transaction broadcasted: ", btcTxId);

//Wait for the swap to execute - this needs to wait till the bitcoin on-chain transaction confirms (might take a while)
await swap.waitTillExecuted(
  undefined,
  5,
  (txId, confirmations, targetConfirmations, txEtaMs) => {
    //Here is the callback which will let us know the confirmation progress of the transaction
    if (txId == null || txEtaMs === -1) return;
    console.log(
      "Swap transaction " +
        txId +
        " (" +
        confirmations +
        "/" +
        targetConfirmations +
        ") ETA: " +
        txEtaMs / 1000 +
        "s"
    );
  }
);

console.log(
  `Swap successfully executed, txId on starknet: ${swap.getOutputTxId()}`
);

//Stop the swapper after we are done with all the swapping
await swapper.stop();
```

Initialize the SDK and perform STRK -> BTC swap

```typescript
await swapper.init();
console.log("atomiq SDK swapper initialized!");

const swap = await swapper.swap(
  Tokens.STARKNET.STRK,
  Tokens.BITCOIN.BTC,
  fromHumanReadableString("15", Tokens.STARKNET.STRK),
  true,
  starknetSigner.getAddress(),
  bitcoinSigner.getReceiveAddress()
);

console.log(`Swapping ${swap.getInput()} to ${swap.getOutput()}`);
swap.getFeeBreakdown().forEach((value) => {
  console.log(` - ${FeeType[value.type]} fee: ${value.fee.amountInSrcToken}`);
});

//Send out the transaction on the starknet side
console.log("Sending starknet transaction...");
const txId = await swap.commit(starknetSigner);
// //Or if you want to extract the actual transactions which needs to be sent and sign them manually
// const txns = await swap.txsCommit();
// let txId: string;
// for(let tx of txns) {
//     if(tx.type==="INVOKE") txId = (await starknetSigner.account.execute(tx.tx, tx.details)).transaction_hash;
//     if(tx.type==="DEPLOY_ACCOUNT") await starknetSigner.account.deployAccount(tx.tx, tx.details);
// }
// console.log(`Starknet transaction sent: ${txId}`);
// //After the transaction is sent we need to wait till the SDK detects that the swap was initiated
// await swap.waitTillCommited();
console.log(`Starknet transaction confirmed: ${txId}`);

const success = await swap.waitForPayment();
if (!success) {
  //Swap failed, we can refund now
  console.log("Swap failed, refunding back to ourselves!");
  const refundTxId = await swap.refund(starknetSigner);
  console.log(`Swap failed and refunded, txId: ${refundTxId}`);
  return;
}

console.log(
  `Swap successfully executed, txId on bitcoin: ${swap.getOutputTxId()}`
);

//Stop the swapper after we are done with all the swapping
await swapper.stop();
```

Initialize the SDK and perform STRK -> BTC-LN swap

```
await swapper.init();
console.log("atomiq SDK swapper initialized!");

const lightningNetworkInvoice = "lnbc10u1p5v67avpp5aq8hnjcljfu50cgc3ysgeeqf3j8aragfpd2cz50tw9c7j5prufvqdqdf3s5x6rfwdcxzcqzzsxqrrsssp5vcj27nfa5ygkhh3pnrk7xk79x3pumnsueqt260eqyzx9n3wctz7s9qxpqysgqakv5gck3k5y2eyrwaxatzse70089gdgjv3twl4e6he2k563cdwhk2mu0jhvnm6pe3rqna7w9qcvu8528p7qgtx97t72dqvpkd0g20ksp37xu93";

const swap = await swapper.swap(
    Tokens.STARKNET.STRK,
    Tokens.BITCOIN.BTCLN,
    undefined,
    false,
    starknetSigner.getAddress(),
    lightningNetworkInvoice
);

console.log(`Swapping ${swap.getInput()} to ${swap.getOutput()}`);
swap.getFeeBreakdown().forEach(value => {
    console.log(` - ${FeeType[value.type]} fee: ${value.fee.amountInSrcToken}`)
});

//Send out the transaction on the starknet side
console.log("Sending starknet transaction...");
const txId = await swap.commit(starknetSigner);
console.log(`Starknet transaction confirmed: ${txId}`);

const success = await swap.waitForPayment();
if(!success) {
    //Swap failed, we can refund now
    console.log("Swap failed, refunding back to ourselves!");
    const refundTxId = await swap.refund(starknetSigner);
    console.log(`Swap failed and refunded, txId: ${refundTxId}`);
    return;
}

console.log(`Swap successfully executed, lightning network payment hash: ${swap.getOutputTxId()}`);

//Stop the swapper after we are done with all the swapping
await swapper.stop();
```

Initialize the SDK and perform BTC-LN -> STRK swap:

```typescript
await swapper.init();
console.log("atomiq SDK swapper initialized!");

const swap = await swapper.swap(
  Tokens.BITCOIN.BTCLN,
  Tokens.STARKNET.STRK,
  1000n, //1000 sats = 0.00001 BTC
  true,
  undefined,
  starknetSigner.getAddress()
);

console.log(`Swapping ${swap.getInput()} to ${swap.getOutput()}`);
swap.getFeeBreakdown().forEach((value) => {
  console.log(` - ${FeeType[value.type]} fee: ${value.fee.amountInSrcToken}`);
});
console.log("Lightning network invoice - pay here: " + swap.getAddress()); //Address/lightning network invoice to pay

//Start listening to incoming lightning network payment
const success = await swap.waitForPayment();
if (!success) {
  console.log(
    "Lightning network payment not received in time and quote expired!"
  );
  return;
}

//Claim the funds on starknet's side
await swap.commit(starknetSigner);
await swap.claim(starknetSigner);

console.log(
  `Swap successfully executed, txId on starknet: ${swap.getOutputTxId()}`
);
```

# Transcript

from Atomic, which is one of the key sponsors that we have here in the StarkNet Hackathon, and I'm v- very, very happy to say that th- that, I think a lot of you are going to be using Atomic either you want it or not. Adam is such a crucial piece of infrastructure- infrastructure for us to build with Bitcoin and StarkNet. I mean, it's inevitable, so So yes, and so Adam, the- the workflow is like this, uh, feel free to talk. We have a around 30, 40 minutes, 45 minutes as you wish, as you prefer. No problem. Uh, we'll be recording YouTube. I will send whatever is said here, I will send the link to the resources of the hackathon so everyone can see it even if they don't if they don't came. So, uh, th- all- all the links, Adam, that you would post here in the chat, I will also send it to the- to the resources of the hackathon. And any questions that we have here or in YouTube or in X, I will I will give it to you Adam. I will interrupt you a couple times during the workshop to- to ask you some questions and yep, that's the workflow. Any question, Adam, before we kind of start? Okay. Yeah. No, no. This is this is all good. Sounds good. Uh, I will just share the- the guest I wrote, uh, for this- Excellent. session specifically, um, where there is like a bunch of things. Oh, was it- Uh, content links and resources. Excellent. We've got here we will share it probably more here, we will share it in the resources of the hackathon. So plea- please go into the Devpost, Devpost webpage, you know, where you register for the hackathon. There's a link to go in the main page, you will find a link to join the Telegram group. I think most of you are already in the Telegram group but either way, in the Telegram group we have a group sorry, a- a channel called Resources. In there you will find everything that Adam will be s- will be sending here and also in the- the- in the support and te- the technical support channel you will be able to tag Adam if you have any questions regarding Atomic. So, okay, sorry Adam, your the floor is yours. No. Great. Okay. Yeah. Thank you. Uh, so, uh, yeah, it's awesome to be here. Uh, so I'm Adam, I'm leading the- the tech side of- of Atomic. Uh, I'm the co-founder there and, uh, with Atomic we basically have an SDK that allows you to easily onboard Bitcoiners into StarkNet but also go the other way around so you can also go from BDC into StarkNet tokens and from StarkNet tokens into Bitcoin. On- on one side we support the Bitcoin, uh, L1 so- so the main chain but we also have, uh, support for this, uh, Bitcoin L2 solution that's called the Lightning Network that's kinda quickly becoming this, uh, kind of connecting- con- connective piece between all the different kind of L2s and other kind of scaling and other solutions that are built on top of, uh, Bitcoin. Um, and so today we'll go, uh, through a live coding session together where we, uh, create, uh, a script that will be able to swap between StarkNet and Bitcoin assets. We'll first do the- the on-chain swaps so go between Bitcoin, uh, L1, uh, and uh, StarkNet and then, uh, later on we will also try the- the Lightning Network swaps, uh, if there is time to do that. So, uh, without further ado I would start by, uh, sharing the screen here. We got already I mean, Adam, while you look for that don't worry about the questions I will be redirecting them to you. So while you look for what you're going to be sharing, there's a question by Kaleem. It- he says, "So we choose to use the Mainnet or Lightning Network or that is handled via the SDK?" Yeah. Uh, we will go through that. Uh, I just have trouble sharing the screen, I'm getting an error code there. Um, hmm. Wait, uh, okay, I will try to just restart the Zoom meeting. Okay. And see if that- that fixes that. No worries. We'll- we'll get- Yeah. We'll wait for you here. So guys, now that Adam is not here you need to choose between Garden and Atomic I think. Both are amazing technologies, to be honest. Using Atomic swap- swaps, which is a huge technology right now that we're using. So And yes, uh, we've got a couple options already for you. Atomic is an amazing company, Garden is also such. If you want to watch the Garden workshop, it was yesterday, you will find it in YouTube, also in the resources. And yes, Sergio indeed, both are using Atomic technology. To be honest I didn't know that- that Garden was using Atomic technology but seems like that. And so so yeah, this is very, very interesting. Uh, both are very trustless but w- we- we will see that in a minute, yeah. Here then we- Okay. Yeah, this- this is still not working. Uh, hmm. Maybe let me see if I can do something from my side. Okay. Does it work for you on- on your end? Like can you- can you do a screen share? Uh, let me see. I just changed something. Maybe- maybe you can now. Can you try again please? Yeah. Not working yet, right? No. We are still- still getting some- some error code. Yeah, but it seems like it's working on your end. Uh, there should be a way to join from the browser. I might actually try that. Uh- Okay. No worries then. All right, folks, so in the meantime, you know what? I'm going to get some water. So give me just 10 seconds please.All right. Yay. Great. So, uh, web is saving us, it seems, again, uh- All right. Uh, oh, it worked. Nice. Yeah, yeah. Uh, okay. So, uh, we'll like literally start with a completely new project. And so, and here are the, uh, notes. So, here are just some useful links on top. Uh, we'll need them as we go through the, through the steps here. Uh, so, uh, this, this example will be done in TypeScript. So, if you don't have TypeScript installed, just get it with this, this first command. I already have it, so I will just skip it. Um, then- Adam, sorry to interrupt you. Can you zoom in a little bit, please? Uh, for the, uh wait. Uh, just, um Is it, is it too blurry? Yeah, that's better. No, no. Blurry, no it's perfectly. It's just that it's a little bit zoom out, but now we can see it perfectly. Thank you. Okay, great. Yeah, okay. Uh, hopefully I can then yeah. All right. Yeah. Let's, let's care about this later. Okay. So, so TypeScript, uh, then, uh, create basically a new directory. Uh, here we just initialize it with, uh, npm init. And, yeah, just get through everything. Uh, then for the we just create a directory for the source, um, so SRC. Uh, and then we'll use the following, uh, DS config file, or at least that's what I'm using. I mean, if you're using something else, like, yes, also work. Uh, so here, just copy this in. Right. And so now we get into the actual, uh, packages that you need to install. Uh, so the first is, uh, we can start with the SDK one. So, we're gonna install the, SDK. Um, then we need, uh, a library that specifically, uh, handles the, uh, the Starknet, uh, network for the, for the SDK, which is the, this one, the first one. Install this one, and then we also need, um, to get this, uh, uh, BTC Signer for the Bitcoin side of things. And we'll also get the Starknet, uh, library version 7 for now. Um, so this currently, uh, our, our libraries work with the, uh, Starknet 7, uh, lib, StarknetJS 7. Uh, so that means you still have to use them with RPC version 8. Um, we have the, uh, version 9 support in beta now. So yeah, that will come shortly. Um, so now, um, because the SDK, uh, works in a peer-to-peer way, so there is like no central backend where there would be the, the swap data store. We need kind of, some kind of storage backend for the, uh, for the swaps to be saved to. Uh, and for browsers, you don't have to do this because by default it just uses the, uh, index DB of the, of the browser. But since we are now like doing an example in OJS, so in the backend we are not in a browser environment. We need to install this, uh, uh, SQlight, uh, storage adapter basically for, for, for, for the SDK. So we install that, and, uh, there is also additional, like dep- dependency when you're using, uh, uh, TypeScript for this. And, uh, also, uh, our in nodeJS environment, which we are, so we also get this, uh, types for the node. Um, all right. So now, with everything set up, um, we can create in the source, um, directory an index, uh, VS file. And yeah, now we are basically ready to, uh, start coding. Uh, so we will first do, uh, the- the swaps on testnet, uh, because this is completely fine for, uh, for the on-chain swaps. It's kind of tricky on the- on the- uh, for the lightning swaps because the, um, uh, yeah, there- there are like literally, like, no Lightnet wallets that are, uh, live on testnet. So we- we will- we will try that on- on- on Mainnet then, with some smaller amounts. Okay, so let's do the testnet RPCs first. So we have the, uh, RPC provider, just a regular, uh I- I can maybe try to zoom this. Uh, is this- is this visible enough? Maybe if you can zoom in, that would be a bit better. Command+ or Command+ or Control+, maybe. Okay, that's not working. Uh, wait. It's not bad, it's not bad. We can see it. Uh, just Yeah, here. If you can find it. I think it's this side. Ah, looks a bit better. Uh, it's Alt+Shift+. All right. Yeah, that also doesn't work. In- in the meantime, there's a question by Kaleem. Can we save the swaps to Google Cloud Storage via BigQuery? Uh, sure. Yeah. So there is, uh Exactly. So, uh, basically what happens, uh, w- wha- wha- what does So there is a standardized interface, uh, for this, like, storage adapter, and you can basically just extend it and save it wherever you like. Uh, you can, yeah, surely you can use, uh, cloud providers to store the data in. Uh, this is- this is especially useful if you kinda expect your users to not be on the same device and kinda have, like, multiple devices using the same wallet. Then you should have something like that with a shared storage space, which is somewhere in the cloud. Um, I can I- I will- I will go over that once- once we, like, kinda get to a point where we kinda use the storage adapter or once we pass it to the SDK. Um, but in the meantime, let's- let's continue, uh, with- with the- with the setup. So we import this, um, uh, Bitcoin RPC. So Mempool is basically, uh, uh, a provider of indexed Bitcoin data. So this allows us to query address balances, address UTXOs and- and transactions and oth- other things, which the Bitcoin core RPC doesn't allow us to. Uh, so we use that. Um, and Okay, so we have- we have the RPCs, uh, RPCs ready. Um, now there are, like, these kinda scary-looking things, but, uh, what they do is just load, uh, the wallet from, um So they either, uh, if the file exists, uh, with the- the key, with the StarkNet wallet key in it, they just load that and create a StarkNet wallet just from a, like a random private key, uh, there. And if it doesn't, uh So if it doesn't exist, it just generates a random private key of the file exists, uh, it just loads it. So- so this way we can have the same, uh, kinda key as we, like, run through multiple, uh, restart cycles of the application. So just need to import the relevant things here. Uh, and, uh, yeah. So- so this is basically using now the OpenZeppelin account, just a very simple, uh, simple one with just a single private key. Uh, if you were to use the SDK in the browser environment, you might do something like this, uh, which basically connects the, uh, StarkNet wallet object, uh, or creates, uh, like an account of the StarkNet wallet object. And then you can create Uh, then you can basically pass it into this, like, StarkNet signer. This StarkNet signer is Huh? Sorry to interrupt you, Adam. There's a- a quick question before going on. Uh- Mm-hmm. So the question regarding, can we save the swaps in Google Cloud Storage via BigQuery? Can we do it in Sanity Studio too? Sanity Studio. Can we do it in what? Uh Sanity Studio. Uh, Sanity, uh Oh, oh, Sanity Studio. Okay. Well, I don't know what Sanity Studio is. Oh, me neither. If Kaleem, if you could provide some more details, that would be amazing. Uh, sorry, Adam, I think we can go on and I will come back in a minute. Yeah, yeah. I mean, we- we are like Just- just in a minute, like, we can go over that, like, how- how would you go around, like, implementing, uh, like, your own, uh, uh, storage adapter if- if you need that. Uh, okay. So, uh, yes. So- so then you take the regular, uh, StarkNet wallet which is just this account type, and we can check this as just a regular StarkNetJS account type, and you kinda need to wrap it into this, uh, StarkNet signer object which is provided by the, uh, by the Atomic library. And this is just to make it easier with, uh to use the signer with all the things that we'll do with it, uh, in regards to the Atomic SDK. Um, so we have the StarkNet, uh, side of things. Now we're gonna add the- the Bitcoin side of things. Um, and this is ve- very s- the very same thing, like we just wanna have persistency, so, uh, we just generate, uh, a random private key for the Bitcoin address, uh, for the Bitcoin wallet, and, uh, we save it, and if it's already saved, we just load it such that again we get the same- same wallet every time we- we restart the application.Mm-hmm. Um, so here we have this, uh, single-address Bitcoin wallet object. This is, like, just provided by the SDK as, uh, um, yeah, uh, a- as, like, a quality of life thing where you can just simply use that. Uh, in general, if you were to use, uh I- if you were to in- integrate this on a front end, for example, you would have, um, uh, Xvers or UniSat or s- some kind of wallet like that, that, that would be would do s- similar things that this object is doing. All right. So, um, okay. And we need to here specify that we are using the, um, uh, the Testnet network, uh, for the wallet. Okay. Uh, I see we have a question as well. Yes. Uh, so regarding the Sanity Studio, Kalim mentions there is a DB, DB, uh, database like Mongo. Mm-hmm. Yeah. Uh, so yes, and that, that case, it, it works. I mean, uh, essentially, uh, what Uh, yeah. I guess what, what you need is just, uh, a database which ha- has indexes. Uh, so it, it's not It cannot be, like, a simple key-value thing, uh, because the, the SDK is also querying based on some kinda other parameters. So if you have something like, like Mongo, uh, and but if it allows I'm not sure if Mongo allows you, like, to do NoSQL queries or something. But, uh, if that, if that's, that works, then yeah, you can definitely use it, Perfect. Okay. Uh. I think we can go on for now, Alana. Okay. All right. All right. Um, okay. So we have the, the Bitcoin wallet, and actually now we can already, like, kinda run it and see that we will, uh, have the, uh, Bitcoin address and StarkNet address printed out. So we're gonna compile with TSC and then we're gonna run this. Uh, so it creates, uh, in the dist, dist folder, it creates this index JS, which we can just run it as a regular, uh, JavaScript. And here we have the, the generated StarkNet wallet address and Bitcoin wallet address. And if we run this again, it kind of still, like, uses the same wallet addresses because we have them saved now here in this, like, uh, bitcoin.key and starknet.key, um, folders. Uh, the, well, uh, files, I mean. Uh, okay. So, uh, now what we can do as we have the wallets, uh, we can go to the, um, to the faucets. So we're working with, with Testnet, so we can use just, uh, the faucets to, uh, get some funds. So, uh, there's, uh, one link to the, to the StarkNet faucet, which gives you StarkNet tokens, uh, on Testnet. So we just copy the, uh, StarkNet wallet address here. All right, so it should be there. And now we also do the same with the Bitcoin side, uh, where we just copy the address here. Uh, I mean, yeah, so we can get up to 4.0001. So we're gonna get as much as we can. Um, great. Uh, so that should be there and sending. Uh, so on Bitcoin, it might take, uh, some time till that, that, that's completed, but like a few minutes at most. So, uh, okay, so we have that s- uh, sorted. So now we can go back and we can basically continue with the, um actually finally initializing the, the SDK. Uh, so what we do first is to create this, um, uh, factory. So, so the, the SDK is, like, done, uh is, is, is made in, in such a way that it can be, like, modular, uh, such that if you wanna have, like, more chains, so we already support, for example, Solana as well. So you would just kinda here put more, um, like, chain-specific initializers. Uh, but here in this case, we're just using StarkNet, so it's just, uh, just a single one here. in this case, we're just using StarkNet so it's just, uh, just a single one here. Uh, we can, just as a quality of life thing, just kinda, uh, save the tokens to the tokens variable. This basically allows us to, uh, access the, uh, tokens that we have available. So we can see on Bitcoin we have the BTC LN which is Bitcoin Light Network. We have BTC which is the on-chain BTC, and on StarkNet we have, uh, start of token ETH and, and WBTC. All right. Um, and now we have the, we have the factory so now we can actually create a swapper. A swapper is, is an instance that will actually allow us to, uh, do swaps with, with, with Atomic. And, uh, and now comes the part where these, like, um, custom storage adapters come into play. Uh, so if you were to just use this in a browser, this kinda disappears and it's just this because it natively just automatically uses the, uh, index DP of the browser. But since, again, we are working in the backend environment, in the, in the non-browser environment, we need to use this, um, uh, S2Lite, uh, storage adapter which we wrote just as an example. Uh, and I mean, well, example, I mean, to, for, for, for you to be able to use the SDK in the, in the backends as well. Uh, and, uh, yes, basically how it works is you have this So how this is implemented is you have this iUnifiedStorageInterface and, uh, you basically just integrate this, uh, or implement this basically in, uh, whatever kind of, uh, for whatever backend you want. And I mean, it could be, like, Cosmos DB of, uh, of Azure. It could be the, uh, the database on, on AWS. It can be, uh, MongoDB. It can be a SQL, can be whatever. Um, so you just basically i- i- implement this and then you can pass it into the, um, into here like so. Um, and there are, like, 2 things. There is the unified storage for the, for the swaps, and then there is this, uh, storage manager as well which is, like, more simple, uh, thing where you just have kinda key value store, uh, for, like, other necessary things. All right? Uh, but I mean, if, if you just use this in the browser, you don't need to care about this at all. If you just use this in a, in a backend environment, just use this and it will work. Uh, and that if you wanna, like, really get fancy and wanna have, like, Azure, uh, like, the, the Cosmos DB in the, in the background, you need, you need to write your own, uh, connector All right. Thank you, Adam. There's a question if, if it's okay with you. So does the DOT key stores private keys DOT key? Yeah, yeah, exactly in this case. In this case, yeah, yeah. I mean, uh, this is just, like, so, so this part is basically for the sake that we are just not connecting any wallets to the solutions and we kinda need to create our own. So, so yeah, indeed, uh, these files are holding the keys for the, for the simple wallets that we have created. Yeah. Amazing. Uh, we've got a couple more questions, Adam- Mm-hmm. but I think it's better at the end of the workshop. Uh, okay. Uh, ƒ, uh, we can go on and All right. Yep. Uh, all right. So, so now we are basically all set to, uh, start swapping. Um, so, uh, we have, uh, the first case of swapping BDC to StarkNet which is, I guess, the most interesting here 'cause to basically allow Bitcoiners to access, uh, the, the StarkNet ecosystem. Um, so the first thing you need to do is, uh, I mean, we, this is, um, async thing, we using await so we need to wrap it inside an ASIC function. Um, so we're gonna do this like so. And, uh, first thing you need to do is to initialize the, the swapper instance. You just do this once. So, uh, if you, uh, if you have an application that's, like, like, using Atomic, you would just call this init when the application starts and then kinda, like, leave it initialized and kind of not having to initialize per swap basis. I mean, here we are just doing a single swap so we just initialize there, uh, do a swap and then just, uh, stop the, the instance after. Um, so once we have that initialized, we can actually perform, uh, a swap or we can actually get a quote. So the way this works, um, is there is, uh, basically, uh, a network of, uh, of LPs/market makers, uh, and you're gonna say, "Okay, I wanna swap from BDC into StarkNet. Uh, I'm, I'm go- I, I, I wanna pay 3,000 sats, so let's 0.00003 BDC." Um, here this just says, like, whether I am specifying the, the input or, or the output. So here I'm specifying the input, uh, in BDC, uh, and, uh, like, an address, the source address and the destination address, uh, of the, of the swap. Uh, and so what this does in the background, it sends a request, an RFQ request, so that's request, request for quote, uh, to the, to the market makers and they basically respond with, uh, with their quotes. So quote is basically a b- binding, um, uh, binding, is a b- basically a binding quote where the sparcially assigned by the, by the LP and allow, it allows you to initiate the swap, that specific LP at this, like, predif- pre, uh, predefined conditions as, as we return it, quote.And, uh, even though there are, like, multiple quotes returned in the, in the background, uh, the SDK abstracts it away and just returns you the best one. So, for you, it's just a single, uh, just a single quote which you can then check, um, which is actually the next thing, is to check the, um, input and output amount. And you can also, uh, print out the fees, which I forgot to include in that, in this example here. Uh, but it's, but it's right in, in the example underneath it. But, I mean, i- i- if you missed this, this, uh, it's no worries. It's just, uh, for, uh, for you to be able to see the, the actual fees associated with the specific swap. Um, all right. So, so now we will see, uh, and we can try to run it again. So, we can compile and we can try to run it to see that this will actually retur- return a quote like this, right? Uh, and yeah. So we see, we can swap this amount of BTC into this amount of StarkNet tokens and, uh, it's basically gonna cost us this much in swap fee and then the network output fee is actually 0 for, for StarkNet. Um, all right. So, uh, now, uh, if we are happy with this kind of quote that's, that's given to us, uh, we can actually start or, like, send out the Bitcoin transaction that then, uh, does the actual swap. Uh, so here there's, uh, like, uh, like a bunch of text here. But essentially, uh, because we are using this kind of object that's provided by the, uh, by the SDK, we can- that just do, like, this simple swap.sampitcointransaction and using the, the Bitcoin signer to do that. But in, in, in the usual case where you would use this for, uh, for uh, on, on the front end with, for example, UniSat or, or Xverse or something, you would actually use this. Uh, so you can call the getfundedPSBT. So PSBT is stands for partially signed Bitcoin transaction. And this is a common format for, um, basically saying, "Hey wallet, please sign this transaction for me on, on the Bitcoin side of things." And the, the wallet signs it and then, uh, you basically can pass it into the, uh, into the, back into the SDK, which is exactly what's happening here. So, you just, uh, call getfundedPSBT, you specify the, the Bitcoin address of the, of the source wallet, you specify the public key. So, this is something that all these browser-based wallets return to you, these 2 things, so you kind of need to pass them in. Uh, and then this returns the, the actual PSBT and the inputs. So, so a Bitcoin transaction is, it's a UTXO model, you have multiple inputs in the transaction and this is just tell the wallet which, uh, indices, which actual inputs should the wallet sign. Um, and this is and then you basically, with this information you can call the API of the wallet, be it Xverse, be it UniSat, um, and the wallet will then return back to you a signed version of this PSBT. And this one you can then just simply pass back to the swap, uh, and it will actually send it and, uh, uh, on the, on the Bitcoin main chain. And you will get the Bitcoin transaction ID from that. Uh, so, uh, let's comment this out. We'll use this simpler way because, uh, in this case we can. And continue. Um, so once the Bitcoin transaction is sent, uh, we have this kind of, uh, waitTillExecuted, uh, call, which basically waits for the Bitcoin, uh, on-chain transaction to confirm. Uh, this is, like, not as fast as on StarkNet, obviously. So, so this can take, like, literally, like, tens of minutes. Uh, thankfully on, on testnet it's, it's quite fast. So, for the sake of this demo we won't have to wait too long. So, so at least that's nice. Um, and yeah. basically, we await this. This basically waits till the Bitcoin transaction confirms and the swap settles. And you, you can pass here this, uh, this callback function here. Uh, and this is basically then called for, uh, every time there's kind of, like, a new update, uh, when it comes to number of confirmation that's the, that the transaction has and the targ- target number of confirmations that the transaction should actually get to be considered final and the swap to actually settle. Um, and then you have, uh, like, an ETA, uh, that's calculated as well and provided by the, by the SDK. So you can use this to get kind of feedback to the, back to the user saying, "Okay, like, uh, we are estimating that we're gonna wait this much for the transaction to confirm." Uh, and it has this many confirmations so far of, of, of, of this much, of this many. And, uh, yeah. This is, this is basically it. So you just await that and, uh, once that happens, uh, you should receive your funds automatically. And we're gonna print out here the, the output transaction ID of the, of the specific swap. And, uh, after that, uh, after we finish with the swap, we can, uh, we can stop the swapper, um, which because we won't need it anymore here. Uh, all right. So, uh, we can check that our Bitcoin wallet does have the, uh, necessary, uh, amount of BTC in it. Uh, so I also provided links to the explorers. Uh, so one is for starknet-sepholia, which is the StarkNet testnet. And, uh, yeah, this is the mempool explorer for the Bitcoin testnet. So we can check our wallet address on the Bitcoin side. And yeah, we see we have some amount of BTC there. So that's great. So, uh, now, uh, we should be able to just compile this and run it, run this. And, uh, it should actually go through and execute the swap. So we can see that it broadcasted, uh, a Bitcoin transaction now. So we can actually check that that happened. And yes, indeed, it's, it's there. Uh, it's, it's, it's waiting in a mempool now. And, uh, yeah, as I said, like, the blocks on testnet are, like, very fast compared to mainnet so it's gonna confirm in a short while. Uh, but as we wait, we can go through, uh, uh, the, some of the questions. In the meantime you can see here, these are, like, printed out, like- Okay. there's, there are some updates on the ETA. I mean, the ETA is Mm-hmm. Okay. Okay. So basically there's one main question here is, so there's, from what I can see, there's at least 2 people in here- On testnet, obviously, so. Uh, s- sorry, Adam, can you hear me? Yeah, right? Can you hear me? Yeah, yeah. No, no. Yeah. Oh, perfect, perfect. Okay. Yeah. So th- there's 2 teams here at least, and I know of more that are using Chippy Pay. Chippy Pay is basically, um, an invisible wallet. So it allows you to- Mm-hmm. log in with, for example, Goo- your Google account while keeping your, while keeping your, um, self-sovereignty of your funds. Mm-hmm. So it's like what we call an invisible wallet. It's for- Yeah. for applications that don't want to be seen as crypto. So it's beneath, beneath that you're using crypto. So a couple, a lot of people are thinking about using Chipy plus Atomic. Uh, any advice on what would be a good f- workflow for this? Uh, for example, Kaleem, Kaleem is asking, like, uh, so he wants to log in with Chipy and then Atomic will be implemented in the same flow. Actually s- uh, sorry, just a second. Maybe he's thinking about using Experts also there. Uh, so just, uh, what would be your, your advice on the workflow of using Chipy and Atomic? Um, also there is a question of where to use Atomic over Garden in here. Uh, s- so if you can give us a couple answers in there. Also, please, Kaleem, uh, if you can, uh, tell me a bit more details if that's, if, if you wish. And also Sal, if you want to give me some more details that I can ask Adam, that would be perfect. But yes, I don't know, Adam, if you understood the question, but, but- Yeah. I don't know for sure. I mean, it kinda depends. Uh, uh, it kind of depends on what you want to accomplish. Um, it's certainly, like, possible, and I think that's, that's a very good way to look at things, is to, like, kind of abstract away the StarkNet part there, especially if you want to do something for BTCfi. Uh, even the challenge that we, uh, we have in the, uh, in the hackathon is focused on, uh, to make it very simple for Bitcoiners to come, uh, into StarkNet without even knowing that they are on StarkNet, right? So exactly kind of what you say, like you use an invisible wallet, uh, in the background. So for the user it seems exactly like a centralized exchange or something. Uh, he can go in with his BTC. He can then do, uh, things, uh, like whatever y- you want him to do on, on, on StarkNet without knowing that he's on StarkNet. And then he can, uh, once, once he's done doing things there, he can just go back on the, on the main chain or on the light right? Um-So that's definitely possible and, and doable, and I would love to see, uh, a solution like this. Uh, when it comes to the, uh, differences between Garden and Atomic, uh, I mean th- so from the technical standpoint, it's um it's that, uh, we use a different kind of primitive for these trustless cross-chain swaps. Uh, we don't use atomic swaps or like the HTLC atomic swaps in, uh, that, that Garden uses for, for on-chain swaps because we deem them, uh, that they have like some inherent issues. Uh, first is the liveness required from the client. So if you're gonna go from, uh, Bitcoin on-chain to, uh, StarkNet, uh, it's, it's kinda like a bad experience if you require the users to kinda stay online un- un- until their Bitcoin transaction confirms. And this is something that you need to do with Garden. Uh, with our solution, this is not required, so you can actually have bit- uh, a user send the Bitcoin transaction and then clou- close the, close the browser and, or like the application and the swap will still go through and settle automatically. And, and this is especially important when you work with Bitcoin because, I mean, you, you have at, at sometimes you literally have like, you know, 2 hours there is no block, and just imagine the UX of that, of the user having to have the, the app open to- till, till that point, right? So, so this- Mm-hmm. is, uh, this is something that's kind of better with Atomic. Another f- thing which, uh, I actually didn't have in the, um, in the, um, uh, in the notes here, but what you can do with Atomic is basically, uh, if you swap from BTC to, uh, to StarkNet, I mean here in this case it doesn't make sense because you're swapping to a native token, but imagine that you're swapping from BTC, uh, to WBTC on StarkNet. Now the issue is you get, uh, you get WBTC but you get no kind of StarkNet tokens to, uh, you know, transact on, uh, on StarkNet, uh, which is, uh, a, a bit of an issue because, uh, as far as I know, if you wanna deploy an account, you actually need to do it without a paymaster. Uh, I'm not sure if, if that's still the case, but was until recently I think was the case that you kinda couldn't use a paymaster to, uh, to deploy the account. Uh, but maybe, maybe that's, that's, that's better here. So basically, uh, what, uh, Atomic allows you to do is, is, uh, with the WBTC token you can also get a little bit of StarkNet tokens, uh, such that you have then a native token to pay for gas on StarkNet, right? Um, yeah. So I would, I would, I would end it at that basically. Thank you. Thank you, Adam. That's extremely useful, extremely useful. So for the moment, there is no more questions, but I'm expecting some more questions in the telegram regarding this integration with Chippy, but I will, I will, I will share what you just mentioned about and yeah, hopefully- Yeah. So, so essentially if, if, if I mean, Chippy, uh, should actually expose something like, uh, uh, like this, so you have this wallet account for the browser thing, but you should also have this account object of Chippy. Uh, you would just pass it here into the StarkNet signer and then all things should just kind of work as, as they are right now with the OpenZeppelin account. So, uh, I mean now we can see that the swap went through. It, it actually went through quite fast. Uh, so we have this transaction which we already checked on the, on the Bitcoin side, uh, where I sent, uh, like 3,000 sats, this, this output here. Uh, and here is the, uh, StarkNet side of things, uh, which we can check here on Voyager. Uh, and- Amazing. yes, here we see that we received the StarkNet tokens on the StarkNet side. All right. So, okay, so this, this basically concludes the swapping from, uh, from Bitcoin into StarkNet. And now, we can do it the other way around, which is, um, also, like, a straightforward. So I will just remove this middle part and leave the, uh, initialization and the, the stop, uh, as is. And, uh, now we're gonna go through this flow, so starting with the BTC. Um- While you do that, Adam, just a reminder to foreign one that I will be showing this link to their repo, their repo in there resources, all right? So then you will be able to see Uh, all right. So, uh, okay, so now we are swapping from StarkNet token into, into Bitcoin, into, uh, one Bitcoin. Uh, here, uh, we also have this, uh, kind of again, like, quality of life, uh, function, uh, which basically is able to parse, uh, a human readable amount because usually, you just pass it as a, uh Oh, I, I deleted it now. But for the Bitcoin case, uh, you, we passed it in, like, you know, uh, the base units, which is Satoshis. So this would be, like, yeah, not as nice for StarkNet tokens because it would have just a, a lot of zeros. So ho- so here we are, here we are using this, like, quality of life function that is able to parse, um, a string amount and just, you just pass which token, uh, it's, it's in. And it just returns you the actual amount in the base units. Um, so okay, so, so amount, then the, uh Again, we are specifying it, uh, exact, uh, inputs, so, so we are gonna swap 15 StarkNet tokens into BTC. Um, and again, we pass in the source address and the destination address. And, uh, yep. And again, we can just print out the, uh, amounts and the, the fees. Uh, so now compile, and now we can run this and actually see the, the amounts. Yes, so we are swapping this much STARK into this much BTC, and these are the associated fees with that specific swap. Um, and yeah. So now, uh, if we are happy with the, with the amounts, we can actually go, uh, go through and with the swap. Uh, so as I said, like, uh, if you have the, uh, account, uh, kind of object for example, GPayPay or whatever else you, uh, would want to use, uh, you can just, like, down here, uh, you would just wrap it into this StarkNet signer object. And this allows you to just simply call, uh, swap the commit. So, so swap the commit means I'm committing the funds, so I'm actually, pulling, pushing the, the, the, the StarkNet fund on StarkNet into, into this escrow, uh, which will then allow me to, to swap it into, uh, into BTC. Uh, but again, if, if, if, you don't, uh, kind of want to use this, you can also, uh, go this route, uh, which basically allows you to get the transactions that, uh, you need to send for, for this to happen. And, uh, you can then just simply execute it with, with, uh, with the account. So you can just call account execute or account deploy count. Um, so usually, you would just have kind of the involved transaction here. But if, if it's the first interaction that you're doing, uh, from an account, you will prob- uh, the, the SDK is, like, smart enough to push, uh, a deploy account transaction here in the transactions as well. So, uh, that's why there is kind of this, like, gaps Uh, all right. So, okay, so, so, uh, either use this, which is simpler, or if you wanna have, like, more, uh, gra- granular control over, like, sending the transactions, use, use this side. Uh, but you gotta be careful. You need to kind of call this, uh, swapWaitTillCommitted, uh, such that the SDK actually, uh, waits, uh, such that it- you, you wait til the SDK actually detects that you did initiate, you did commit, you, you did initiate the swap basically, right? Um, so, uh, that's That is that. So okay, so now, uh, we have the signed transactions sent. Now comes the, the part where we wait for the actual payout to happen on the, on the Bitcoin side. So the way this works is, uh, it waits til the Bitcoin transaction is sent, uh, or if the, uh, other side, if the LP basically, uh, either refuses to proceed or just kinda Uh, yeah, basically if he refuses to proceed, uh, you will get the success false here. And what this allows you to do is to refund funds back to yourself, right? So this is kind of the way how, uh, we achieve, uh, atomicity of the swap. So if the, uh, LP refuses, you can just refund the, the funds on the StarkNet side back I mean, this usually never, never happens. It's just, you know, um, you should have it just for the, uh, SDK to kind of stay trustless for you to be able to refund in case something fails. Uh, and that's it. So, uh, we can then basically just print out, again, the, the transaction ID on, on the Bitcoin side. Um, all right. So, uh-We can check first if we have some, uh, balance on the, on the Starknet side. I mean, we should have. We did, we did, uh, uh, get, uh, some from the faucet and we see Yeah. So we have some balance here. So there should be plenty to, to swap, uh, of 15 STARK to, to, uh, to BTC. So, uh Ah, okay. Um, okay. So it seems like the, uh Hmm. Yeah. Uh, so, so this is just something that happens from time to time on, uh, Starknet Sepolia, uh, that you have kinda an L1 data gas fees going to Stratosfair, and then we kind of have a sanity check here to, uh, to not pay too much, but I think you can somehow you can override this. So usually, you, you, you wouldn't have to do this, uh, on, on, on mainnet. This is just because, uh I, I mean, in the end, I know what the cheapy people will tell you, "Just test in mainnet." It's- Yeah, yeah, yeah, right. exactly. I mean, we, we will do that with Lightning probably, but, uh, yeah. No, no. But it's okay. No, I understand. Yeah. Uh, let's do some higher amount, like so. Yeah. So hopefully this should resolve this. Oh, wait, I need to compile. So, okay. Uh Oh, now we're getting very low max prices .. Oh, of course, I mean, I'm just pressing in one here. Uh, so now this should actually work. Okay. Yeah. So now I think, uh, I think this is working. So I will, uh, will Where, where will I send it? I, I will just send it here in the chat so you can pass it into, uh, into the, uh, swapper constructor and use it. Oh, okay. Um, okay. Yeah, no, it, it went through. Great. Uh, okay. So, um, again, just some issues with, uh, Blast RPC. Um, but Okay, so, so it went through. So what happened is that first it sent a Starknet transaction here, which we can check, which put, uh, 15 Starknet tokens into the, into the escrow, and then on the other end, we got Bitcoin out on the Bitcoin network here, and it's already confirmed, right? So this, this first output is basically ours. Um, all right. So, uh, okay. So that, that basically concludes swaps to and from, uh, on chain. Uh, we if we have any questions, we can go over them now. Yes. Uh, we got a last question here then. "So this," Se, Sergio mentions, "This looks, looks way prag- way more pragmatic than Garden. No secrets, no need to have both wallets from both sides. That is Alice and Bob, right? N- no, wait. No, no need 2, uh, wallets? To have both wallets. Both wallets from both sides. Uh, I mean, you kind of do need to have wallets of both sides, right? Because you need to somehow send the BTC and or, or what, what, what is meant by that. Yeah. I know, like y- you still need the, yeah. You, you still need at least a source for it, right? So, so actually, if you, if you wanna go from Bitcoin to, to StarkNet, you need to have the, uh, experts or, you know, Unisat wallet or something that can, like sign PSBTs. Uh, but then you don't need to have the destination wallet connected per se, on the StarkNet side. You can just send to address basically. Uh, and the other way around is the same. So you only need to have the StarkNet wallet that can sign transactions, but the, uh, Bitcoin wallet you actually don't need to have. You just send to an address. And, uh, with the secrets, uh, yes, I mean, you're right. So, so, uh, with because of the way we handle on-chain swaps at Atomic, there is no, uh, no secret, uh, like with HTLC swaps for Garden. All right. Those are the questions, Adam. However, if someone else has questions, please, please, please ask them in Telegram. There is a support channel. You can tag Adam in there. Uh, you will find a his telegram in there. Uh, all right. So, uh, I mean, I had I had the, uh, Lightning swaps as well here, and, uh, I guess we can just quickly go through them. There is not much time, but I will just like quickly showcase how, how that's how that's done. Uh, so for, uh, Lightning, we are unfortunately forced to use HTLCs, so, so you kinda have to like mess with secrets there, uh, unfortunately. Uh, so, um, okay. Uh, what we gonna do is, we gonna switch this to main net because as I said, uh, Lightning on test net is like yeah, you cannot really find any, any wallet whatsoever. Um, so the, the Bitcoin wallet, we actually won't need anymore, so we can just remove that. Uh, we'll just use the StarkNet wallet and we'll then you just use an external, uh, Lightning wallet to pay for stuff and, uh, receive stuff. Um, okay, so this here we just set it to use the Bitcoin main net network. Uh, this we shouldn't need 'cause now we are on main net finally. Um, the, the, the key we can use the same. Uh, all right. So now I will remove this part. So, okay. So let me check the, uh, the addresses. So, okay, so this doctor address, I will send some funds, uh, to it from my, uh, from my Braavos. Okay. All right, so here they're basically sending 30 StarkNet tokens. Okay. Uh, so that's done. Uh, okay. So now to test, we gonna use this, uh, Cashu wallet. So, so as I was talking in the beginning, that Bitcoin is kind of this connecting piece between all the different scaling and other technologies on top of Bitcoin. This is actually not the Lightning wallet. This is a whatso- what's called an e-cash wallet. It's, it's a custodial solution, but it provides like a great level of privacy. Uh, I think there is like one project on StarkNet that also is building, uh, such a thing as well. Uh, however, I'm not exactly sure the name now. Um, so yeah. So this, this is what I also left the link for in the, uh, in, in the notes. Uh, so you can actually also, um, use it, uh, by, by clicking the, uh I mean, yeah, I will need that, uh okay. Uh, So, uh, I have that now. Um, and yeah. So I will just quickly copy the, uh, snippet that allows me to go from StarkNet to, to BTC Lightning. So this part. Um, so as I'm using an external wallet, I will basically need to paste in this, uh, Light Network invoice, which is kinda like an address, but I can, uh, add an amount to it. So I'd say I want to receive, uh, 1500 sats. Um, I create the invoice and I can copy it, uh, paste it here, and now when I run this, it should actually pay out the pay out the Lightning Network invoice. So it's sending the, the StarkNet transaction with lots of the, the StarkNet tokens.And, yeah, as soon as that confirms, then the, uh, Lightning network payment is initiated and, uh, then they kind of the, uh, the secret, uh, the pre-image to the Lighting, Lightning Network, um, payment can then allow the, the, uh, counterparty to unlock the, uh, the escrow on the StarkNet side. And this is how it's kinda ensured that like the LP can only take your funds once he, uh, actually pays out, uh, the Lightning Network, uh, uh, payment. Uh, so as, as you see, we, uh, successfully swapped from, uh, StarkNet to, uh, to the, to the Lightning Network wallet. And now we can also do the other way around, uh, which is here, the last case. Uh So I will just replace this again. And, um, yeah. So th- this is for now something which, uh, actually doesn't have that great of a, of a UX, and we are actually right now working on, on, on improving this and like, yeah, it's, it's probably gonna, uh, be live in a, in a, in a week or 2. Uh, because currently, uh, what you need to have to receive, uh, the Bitcoin Lightning Network payment, you need to have a funded, uh, account on the StarkNet side and on the first place which is, uh, not so great for the UX. And the reason you need to do that because you need to actually, uh, be able to send, uh, the transactions to claim the, the Lightning payment on the, on the StarkNet side. Uh, I mean, yeah, long story short, uh, bad UX, uh, we're working on improving that and should, should come, uh, should, should be much better in, in one to 2 weeks. Uh, but now this doesn't pose an issue because we still have some StarkNet tokens in this, in this wallet here. So we should be able to just, uh, compile and run it. And we're gonna get this, uh, Bitcoin Light Network invoice again which is like an address, uh, we had sent here Lightning, uh, pasted in here, uh, in this bank. And yeah, now it should be paying, uh, just takes a bit of time, but, um Yeah, in a short while we should actually be able to see here that we received the, received the funds on the StarkNet side. Yep. Uh Oh, yeah, I actually forgot to copy the last line which would log the output transaction ID. Uh, I mean, we'll just re-run it. Uh, okay. But, uh, I mean, as, as I'm re-running it, if there are, like, any last questions, um, I'm, like, happy to answer them. Sorry, Adam, there's no questions for the moment, no. Okay. Uh, there's people saying that they love the workshops. That's great. Nice. Awesome. Yeah, I mean, honestly, like, this is, like, me first time doing this kind of thing, so- It's very good. I was also a, a, a little bit nervous. Uh, so, yeah. It's, it's, it's great that, that people, people really liked it. Uh, okay. But yeah, now we can see that it was settled and there is a, a transaction ID on StarkNet printed out. And we can now just check it in the explorer and see. wait. Oh, okay. Yeah. Sorry. It's on, it's on Mainnet, so that's why we didn't see here. Uh So, yeah. We can see that we received the, the, the StarkNet tokens here. So, yeah. Uh, there is, there is no explorer for Lightning so we cannot really just showcase the, the Lightning payment. Uh, it's, it's Lightning Network in and of itself is, is a little bit, like, more private because it's an off-chain protocol, so you don't have like a blog explorer where you like immediately see all the transactions. So that's, that's why it's, it's also, um, kinda nice to use also from this privacy point of view. Okay. uh, but yeah, I mean, if, if anyone, uh, were to have, like, some questions when it come- came to the, uh, uh, the SDK, uh, just feel free to reach out. So, uh, the, the best source when it comes to, uh, Ato- Atomic, uh, SDK, it's just, uh, Atomic- Atomic Labs, it's just our SDK page on, on npm, uh, where we have, uh, basically a way how you can do swaps. Um, and, like, yeah, there are snippets, li- like, kind of exactly what we just went through here at the workshop. And we also have the, the example file here on GitHub which basically, uh, contains all the, uh, the different swaps that you can do, and all the different So there's also, like, a bunch of other things you can do with the SDK, and there's also a lot of utilities that, that, that you can use. So y- there is a, like, a general purpose address parser which can tell you if the address is Bitcoin, Lightning, LNURL, which is then an extension of Lightning, or if it's, uh, uh, a smart chain address, in case- this case either StartNet or Solana address. And then you have all the different kind of swap, uh, directions outlined here, uh, in a, in the separate functions. So, uh, this is really, like, a great place to, uh, you know, just check how things are, are working and just take something as an, uh, as, as a base and then kind of adjust as, as, as, as, as you need it. Perfect. All right, all right you- so now you know people how to get in there and any further question we can ask Adam, and I think it was an amazing workshop, great feedback from the audience, Adam. Yeah, yeah. All right. Okay. Yeah. Loved it. Okay, so see you guys and yeah, feel free to reach out. Thank you very much, Adam. Thank you very much for your time, for your knowledge and well, let's go hacking. See you guys.
