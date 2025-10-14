# Atomiq SDK Integration Issue on Starknet: Root Cause and Solutions

## Executive Summary

The **Atomiq Labs SDK initialization failure** in the browser stems from a misconfiguration or unsupported network setup for the Bitcoin–Starknet swap. The error `TypeError: Cannot read properties of undefined (reading 'find')` indicates that the SDK couldn't properly parse the Starknet contract's ABI during initialization. In practice, this is happening because the **Starknet Bitcoin Relay contract (StarknetBtcRelay)** isn't being recognized or found on the target network, leading to an undefined ABI.

Atomiq's SDK does support Starknet testnet environments (specifically Sepolia) as well as mainnet, but it expects the correct network selection and contract addresses to be provided. Currently, the SDK is likely looking for a contract that isn't deployed (or isn't configured) on Starknet Sepolia, causing the initialization to crash.

In short, the **root cause is a network/configuration mismatch**: the SDK's default settings are not aligning with Starknet Sepolia for the Bitcoin Testnet/Signet scenario. The solution is to adjust the configuration to point the SDK to the correct Starknet network and contract addresses or update to a version of the SDK that includes Sepolia support. If a quick fix isn't possible (given hackathon time constraints), a pragmatic workaround is to simulate or offload the swap logic (for example, using Atomiq's server component or a mock) so the demo can proceed without blocking on this issue.

## Technical Analysis

### Error Breakdown – ABI Parsing Failure

The stack trace indicates the failure occurs in Atomiq's Starknet integration when instantiating the `StarknetBtcRelay` contract. Specifically, the function `getAbiVersion` is throwing an error because it calls `.find` on an undefined value. This suggests that the ABI array for the contract is undefined, so `.find` cannot be executed. In Atomiq's code, `StarknetBtcRelay` extends a base Starknet contract class and passes in a contract ABI during construction. If that ABI isn't properly loaded or the contract address is wrong, the underlying Starknet library won't have an ABI to work with, hence the error.

Looking at Atomiq's open-source code, we see that `BtcRelayAbi` (the ABI for the Bitcoin relay contract) is defined as a Cairo 1 contract interface. The Starknet JS library tries to determine if this ABI is Cairo 0 or Cairo 1 by scanning the array (looking for markers like `l1_handler` functions, etc.). The function likely does something like `abi.find(...)`, which is exactly where it's crashing. Why would the ABI be undefined? The most likely cause is that the `StarknetBtcRelay` constructor was not given a valid ABI object. Atomiq's code expects `BtcRelayAbi` to be a constant, so one scenario is that the contract address being used is incorrect for the given network, causing a failure in the contract initialization logic. However, since the ABI is provided locally (not fetched from chain), a wrong address wouldn't nullify the ABI array immediately – but it could cause an internal call to fetch the contract's class/ABI from Starknet, which might return nothing if the contract isn't deployed.

**Key insight:** Atomiq's SDK maps Bitcoin networks to predetermined Starknet contract addresses for the BTC relay. In the `StarknetBtcRelay` source, we find:

```javascript
const btcRelayAddreses = {
    [BitcoinNetwork.TESTNET4]: "0x0099b6...490dbe",
    [BitcoinNetwork.TESTNET]: "0x068601c7...b8dbc8c",
    [BitcoinNetwork.MAINNET]: "0x057b14a4...861dbc"
};
```

These are the default Starknet addresses for the BTC relay contract, keyed by the Bitcoin network. `BitcoinNetwork.TESTNET4` presumably corresponds to Bitcoin Signet (Testnet4), `TESTNET` to Bitcoin Testnet (the legacy Testnet3), and `MAINNET` to Bitcoin mainnet. When you call `Factory.newSwapper({ bitcoinNetwork: ... })`, the SDK uses this mapping to know which Starknet contract to interact with.

Now, Starknet itself has multiple networks: Mainnet and Testnet (which, as of 2023–2025, is the Sepolia testnet; previously Goerli was used). The Atomiq SDK's initializer logic shows that it automatically chooses Starknet Sepolia for any non-mainnet Bitcoin network. In the `initializeStarknet` function, we see:

```javascript
const chainId = options.chainId ??
    (network === BitcoinNetwork.MAINNET
        ? constants.StarknetChainId.SN_MAIN
        : constants.StarknetChainId.SN_SEPOLIA);
```

This means if you use `BitcoinNetwork.TESTNET` or `TESTNET4`, the SDK will assume you want Starknet `SN_SEPOLIA` (the testnet chain). This is corroborated by a community example: an app initialization code where setting `bitcoinNetwork: BitcoinNetwork.TESTNET` is commented to indicate "this also sets Starknet (sepolia) for bitcoin testnet". So the intended usage is:

• **BitcoinNetwork.MAINNET** → Starknet Mainnet
• **BitcoinNetwork.TESTNET (or TESTNET4)** → Starknet Sepolia (Testnet)

Your configuration seems to follow this: you used `BitcoinNetwork.TESTNET` (value 1), which indeed should target Starknet Sepolia. That part is correct.

The problem lies with the contract addresses. The SDK's default for `BitcoinNetwork.TESTNET` is the address `0x068601c79da2...b8dbc8c`. That address was likely deployed on Starknet's old Goerli testnet (or an earlier environment). If the Atomiq team migrated to Sepolia, the BTC relay contract would have been redeployed on Sepolia, possibly at a different address. If the SDK wasn't updated or if you're using an older version, it might still be pointing to the Goerli address which on Sepolia is either empty or unrelated. This mismatch can cause the Starknet provider to return no class/ABI for that address, which might explain why the ABI parser is undefined.

It's worth noting that Atomiq's Starknet integration code allows overriding addresses. In the `StarknetInitializer` options, there are fields for `btcRelayContract`, `swapContract`, etc. If those are not provided, the system falls back to the defaults. We see that in the `StarknetBtcRelay` constructor, the contract address parameter has a default: `contractAddress: string = btcRelayAddreses[bitcoinNetwork]`. So, because your `newSwapper` config did not specify any contract addresses, it used the default mapping.

**Which Starknet networks are supported?** According to the code and config: Starknet Mainnet and Starknet Sepolia (Testnet) are supported out-of-the-box. The older Starknet Goerli is likely deprecated in newer SDK versions in favor of Sepolia. The Atomiq config files confirm this — for example, a `config.testnet.yaml` in their repo sets `CHAIN: "SEPOLIA"` for Starknet when `BITCOIN.NETWORK: "testnet"`. There's no separate config for Goerli, so Sepolia is the assumed testnet. This means if the SDK's addresses are correct, it should work on Sepolia.

However, there's a strong indication that the BTC relay address for testnet in the SDK might not match the deployed address on Sepolia. The absence of any explicit Sepolia address in the code (they keyed by Bitcoin network only, not by Starknet chain) suggests that they reused the same address on Sepolia as on Goerli – which is uncommon unless they managed to deploy with a specific salt to get the same address. It's possible this detail was overlooked, and thus the SDK might need a manual nudge.

**StarknetBtcRelay Contract:** To understand its role, this contract is essentially an on-chain Bitcoin light client. It stores Bitcoin block headers and provides methods to verify transactions (used for HTLCs and other cross-chain proofs). The SDK instantiates `StarknetBtcRelay` and uses it under the hood for any swap involving BTC. If this contract isn't initialized, none of the Bitcoin ↔ Starknet functionality will work (hence the failure early in `newSwapper()`).

From the code, the relay contract addresses are:
• **Bitcoin Mainnet ↔ Starknet Mainnet:** `0x057b...861dbc`
• **Bitcoin Testnet3 ↔ Starknet Testnet:** `0x0686...b8dbc8c`
• **Bitcoin Signet (Testnet4) ↔ Starknet Testnet:** `0x0099...490dbe`

(These are taken from the SDK source; they may be represented slightly differently in documentation.)

If the above Starknet addresses are not actually deployed on the Sepolia testnet, any calls to them would fail. The error arises so early likely because the Starknet.js `Contract` class, when given an address and ABI, might be trying to fetch the contract's class from the network to determine ABI version or to attach events. Indeed, the constructor of Starknet's `Contract` (v5) uses an ABI parser (via the `abi-wan-kanabi` library) to handle Cairo 1 vs Cairo 0 ABIs, and it may call `provider.getClassAt(address)` under the hood to check the class version if no explicit version is given. If `getClassAt` returns nothing (because the contract isn't there), some part of that process could be returning undefined, leading to the `.find` error when scanning the ABI.

## Network Compatibility and Deployments

To clarify the Starknet network support:

• **Starknet Mainnet** – Fully supported by Atomiq SDK. All core contracts (BTC Relay, Escrow, claim/refund handlers, etc.) are deployed on Starknet Mainnet. The SDK defaults correspond to mainnet addresses for these contracts.

• **Starknet Testnet (Sepolia)** – Supported by SDK (treated as the default "testnet" chain). Atomiq has deployed the necessary contracts on Sepolia as well, although the exact addresses might differ from the ones on mainnet. The SDK provides defaults for Sepolia in some places: for example, the Escrow (swap) contract address on Sepolia is `0x017bf5...f0413`, and various handler contracts (for HTLC, etc.) on Sepolia are listed in the SDK code. This shows they have indeed set up those contracts on Sepolia. Notably, the BTC Relay address is not listed here by Starknet chain – it's listed by Bitcoin network instead (as discussed). It's likely an oversight that they didn't also key those by Starknet chain, because conceptually one might want different addresses for Goerli vs Sepolia if they redeployed. However, since their testnet config uses Sepolia exclusively now, they might have reused the same address on Sepolia for continuity. It's possible the deployer was able to deploy the BTC relay at the same address on Sepolia (maybe by using the same private key and a deterministic deployment). We cannot confirm that without Atomiq's documentation or an explorer check, but if that was done, the SDK's default would actually be correct.

  ◦ If the address was correct, then why the error? In that case, the issue could be a bug in the ABI parsing with the Starknet.js version (though that is less likely, as this combination is presumably tested by Atomiq). Given that the error is exactly an undefined property access, a mis-deployed or missing contract is still the prime suspect.

• **Other networks:** The old Starknet Goerli testnet is not directly referenced in the latest SDK; presumably no longer used. Starknet's "integration" or local devnet are not mentioned – likely unsupported. Bitcoin Regtest or custom networks would require running Atomiq's infrastructure manually; not relevant for the browser SDK.

In summary, the **root cause** is likely that the **SDK's default configuration for Starknet Sepolia is incomplete or incorrect**, specifically regarding the BTC relay contract address. This is a configuration issue rather than a fundamental flaw in your environment. The evidence from Atomiq's own code and configs confirms that Sepolia testnet is intended to be supported (they use it themselves for testing), so either:

• You need to update to a version of the SDK that has the correct addresses for Sepolia, or
• Manually provide the correct addresses via the config.

Another angle to consider: **environment (browser) vs Node**. The Atomiq SDK is quite complex, and while it's designed to run in browsers (they have examples using Argent X, etc.), some polyfills are required. You already added `globalThis` (for the global object) and likely included Buffer polyfill. The code imports `Buffer from 'buffer'`, which should work if Vite's polyfill is in place. If anything like `process` is used, that might need addressing (though I didn't see obvious uses of `process` in the client-side code). Given the nature of the error, it doesn't appear to be a missing polyfill issue; it's specifically about an undefined property in ABI parsing, which circles back to the contract/ABI not being found.

### Bitcoin networks:
The Atomiq SDK distinguishes Bitcoin Mainnet, Testnet, and Signet. Both Testnet and Signet are treated as "test" for Starknet purposes (both map to Starknet Sepolia). The difference is primarily which BTC Relay contract (genesis and difficulty parameters) to use. If you intend to use Bitcoin Signet, you should use `BitcoinNetwork.TESTNET4` so that the SDK uses the Signet-specific relay address. Using `TESTNET` while actually interacting with Signet could cause issues in block verification (the relay might reject headers from the wrong network). For clarity:

◦ **BitcoinNetwork.TESTNET (value 1)** – use this for Bitcoin Testnet (Testnet3). Atomiq's relay contract for testnet has its own genesis block baked in.
◦ **BitcoinNetwork.TESTNET4 (value 2)** – use this for Bitcoin Signet, which has a different genesis and difficulty retarget schedule. Atomiq's relay contract for signet is separate.

Since you mentioned "Bitcoin Testnet4" explicitly, if you are indeed on Signet with Xverse, you should switch the config to `BitcoinNetwork.TESTNET4`. This ensures the SDK uses the Signet relay contract address (`0x0099...dbe`) and the correct validation rules. This could be a crucial correction: if you pass `BitcoinNetwork.TESTNET` but feed it Signet data, the relay's state might be inconsistent or not initialize properly. It's unclear if that would throw an error immediately, but it could at least be a logical flaw.

## Summary of Findings

1. **ABI Undefined Error** – Caused by the Starknet contract's ABI not being found/parsed. Likely due to an incorrect contract address for the StarknetBtcRelay on Sepolia, or using the wrong Bitcoin network constant (Testnet vs Signet).

2. **Starknet Network Support** – Atomiq supports Starknet Mainnet and Sepolia testnet. The SDK automatically chooses the chain based on BitcoinNetwork (mainnet vs testnets). There's no manual toggle for Goerli in current versions – Sepolia is the default testnet chain.

3. **StarknetBtcRelay** – A crucial contract that holds Bitcoin block headers on Starknet. The SDK must connect to a deployed instance of this contract. Its address must correspond to the Bitcoin network in use (different address for mainnet, testnet3, signet). If this address isn't deployed or is wrong for the chosen Starknet network, initialization fails.

4. **Additional Configuration** – The SDK provides for custom configuration (passing contract addresses, etc.), which can override defaults. This is how we can fix the issue by supplying the correct addresses if the defaults are wrong.

5. **Browser Environment** – Apart from the core issue, ensure all Node-specific requirements are handled (Buffer polyfill, etc.). This doesn't seem to be the source of the `.find` error, but it's necessary for the overall integration.

## Proposed Solution (Configuration and Fixes)

To resolve the initialization issue and get the Bitcoin↔Starknet swaps working, consider the following steps:

### 1. Use the Correct Bitcoin Network Enum

Double-check whether you're using Bitcoin Testnet or Signet, and use the corresponding `BitcoinNetwork` value:

• **For Bitcoin Testnet** (testnet3, usually connects to nodes on port 18332, Xverse testnet mode): use `BitcoinNetwork.TESTNET`. This will use the relay intended for testnet3.
• **For Bitcoin Signet** (if Xverse "Testnet4" means signet, which is likely the case given the name): use `BitcoinNetwork.TESTNET4`. This will tell the SDK to use the Signet relay parameters and address.

This distinction is important for the swap logic. If you set it incorrectly, the SPV proofs might not validate. It may not directly cause the `.find` error, but it's a necessary correction for the integration to function properly.

### 2. Override Starknet Contract Addresses in the Config

Given the uncertainty around the SDK's default addresses on Sepolia, a robust solution is to manually provide all relevant Starknet contract addresses to `newSwapper()`. The `chains.STARKNET` configuration can include an options object as per the `StarknetOptions` type. For example:

```typescript
import { constants } from "starknet"; // to get StarknetChainId constants
import { BitcoinNetwork } from "@atomiqlabs/sdk";

const STARKNET_RPC = "https://starknet-sepolia.g.alchemy.com/v2/[API_KEY]";

const swapper = Factory.newSwapper({
  chains: {
    STARKNET: {
      rpcUrl: STARKNET_RPC,
      chainId: constants.StarknetChainId.SN_SEPOLIA, // explicitly specify Sepolia
      btcRelayContract: "0x...", // ← Starknet BTC Relay contract address on Sepolia
      swapContract: "0x...", // ← Starknet Escrow contract (swap contract) on Sepolia
      handlerContracts: {
        refund: {
          timelock: "0x..." // ← Timelock refund handler contract on Sepolia
        },
        claim: {
          [ChainSwapType.HTLC]: "0x...", // Hashlock (HTLC) claim handler on Sepolia
          [ChainSwapType.CHAIN_TXID]: "0x...", // BTC TxID claim handler on Sepolia
          [ChainSwapType.CHAIN]: "0x...", // BTC output (no nonce) claim handler on Sepolia
          [ChainSwapType.CHAIN_NONCED]: "0x..." // BTC nonced output claim handler on Sepolia
        }
      }
    }
  },
  bitcoinNetwork: BitcoinNetwork.TESTNET // or TESTNET4 if using Signet
});
```

Replace the `0x...` with the actual contract addresses:

• **BtcRelayContract:** Atomiq's Bitcoin Relay on Starknet Sepolia. If not publicly documented, you might glean this from their Discord or by scanning Starknet Sepolia for contracts created by Atomiq. Since the SDK default for TESTNET was `0x068601...b8dbc8c`, there's a good chance this is the Sepolia address as well (they might have redeployed it there). You can try using `0x068601c79da2231d21e015ccfd59c243861156fa523a12c9f987ec28eb8dbc8c` (the full value from the SDK) as a guess – it might just work if that contract exists on Sepolia. If it's wrong, the SDK will likely throw a similar error or time out when syncing headers.

• **SwapContract (Escrow):** The EscrowManager contract address on Sepolia. From the SDK code, the default for Sepolia is `0x017bf50dd28b6d823a231355bb25813d4396c8e19d2df03026038714a22f0413`. This is the contract that holds funds during the atomic swap.

• **Handler contracts:** There are multiple handler contracts for different swap types (HTLC hashlocks, time-based refunds, etc.). The SDK should auto-fill these if not provided, using its defaults (it does so in the `StarknetSwapContract` constructor by merging `defaultClaimAddresses` and `defaultRefundAddresses` for the given chain). For Sepolia, those defaults are:
  - **Timelock refund:** `0x034b8f28b3ca979036cb2849cfa3af7f67207459224b6ca5ce2474aa398ec3e7`.
  - **Hashlock (HTLC) claim:** `0x04a57ea54d4637c352aad1bbee046868926a11702216a0aaf7eeec1568be2d7b`.
  - **BTC TxID claim:** `0x04c7cde88359e14b6f6f779f8b9d8310cee37e91a6f143f855ae29fab33c396e`.
  - **BTC output claim:** `0x051bef6f5fd12e2832a7d38653bdfc8eb84ba7eb7a4aada5b87ef38a9999cf17`.
  - **BTC nonced output claim:** `0x050e50eacd16da414f2c3a7c3570fd5e248974c6fe757d41acbf72d2836fa0a1`.

You can trust the SDK's defaults for these if your version has them; providing them explicitly isn't strictly necessary unless you suspect a version mismatch. It doesn't hurt to specify them to be sure the correct ones are used.

Providing all these addresses should eliminate any ambiguity – the SDK will use the addresses you supply instead of its possibly outdated internal defaults. This ensures that when `SwapperFactory.newSwapper()` calls `initializeStarknet`, it will find everything it needs. For instance, it will instantiate `StarknetBtcRelay` with the exact address you give (bypassing the faulty lookup).

### 3. Update to Latest Atomiq SDK Packages

Verify the version of `@atomiqlabs/sdk` and `@atomiqlabs/chain-starknet` in your project. As of now, you mentioned sdk v6.0.3 and chain-starknet v5.1.5. Check NPM or the Atomiq GitHub for any newer releases (e.g., 6.0.4 or 6.1.x) that might address testnet issues. If a newer version is available, upgrade and test the initialization again before applying manual overrides. It's possible that the maintainers have fixed the Sepolia address mapping or other bugs in a release after 6.0.3. Look at the CHANGELOG or commits around Starknet integration; for instance, support for `StarknetChainId.SN_SEPOLIA` might have been introduced around a certain version.

If upgrading, also ensure your Starknet.js (the `starknet` npm package) is compatible. Atomiq's package might pin a specific version. The error you saw (`.find` on undefined) is thrown from Starknet.js's internal ABI parser, which has evolved. Using a matching Starknet.js version as expected by Atomiq is important. (Your mention of "starknet v8.5.4" is a bit unclear, since starknet.js versions are around 5.x – possibly you meant 5.8.4. In any case, stick to the version Atomiq specifies to avoid new incompatibilities.)

### 4. Reinitialize and Test

With the correct configuration in place:

• Call `const swapper = Factory.newSwapper({...})` as above.
• Then call `await swapper.init()`. This is the step that was failing previously. If the config is correct, `swapper.init()` will:
  - Connect to the Starknet Sepolia RPC.
  - Instantiate the StarknetBtcRelay contract at the given address and possibly sync some Bitcoin header data.
  - Prepare the swap contracts and any needed state (no user funds are moved during init; it's just setup).

Monitor the browser console and network calls. On a successful init, you might see some RPC calls like `starknet_getClassAt` or `starknet_call` to read initial state (the SDK might check the relay's latest stored block). If using Bitcoin Testnet/Signet, it may also try to connect to a Bitcoin RPC (depending on how `bitcoinRpc` is provided under the hood – Atomiq might have a default public RPC or require one; ensure you provided a `BitcoinRpc` if needed, though in the browser they might not allow direct Bitcoin RPC calls and instead rely on the wallet for SPV proof via PSBT).

Once `swapper.init()` resolves, the SDK is ready to create swaps. You would then typically do something like:

```typescript
const starknetSwapper =
    swapper.withChain("STARKNET").withSigner(starknetSigner);
```

This attaches the Starknet wallet signer to the swapper (so it can sign Starknet transactions). In your case, `starknetSigner` would come from the connected Cartridge Controller wallet. The Atomiq example code from a community project shows obtaining a `StarknetSigner` by wrapping the wallet account, then doing `swapper.withChain("STARKNET").withSigner(walletSigner)`. Ensure that flow is followed – you might need to import `StarknetSigner` from `@atomiqlabs/chain-starknet` and wrap the `window.starknet` account.

### 5. Additional Environment Considerations

Even if the core issue is resolved, keep these points in mind for a smooth integration:

• **Polyfills:** You've added `globalThis` (for global) and likely included polyfills for `Buffer`. If not, include `import { Buffer } from 'buffer';` at the top of your app or configure Vite to polyfill Node globals. The Atomiq SDK uses Buffer (for binary data like block hashes) and possibly other Node built-ins. Also, verify that Vite isn't struggling with any WebAssembly dependencies (some cryptography libraries might use WASM, though nothing in the stack trace suggests a WASM issue).

• **Wallet Connections:** Make sure the Bitcoin wallet (Xverse via `sats-connect`) and Starknet wallet are connected before initiating a swap. The SDK might not strictly require the Bitcoin wallet for initialization (since it doesn't sign anything at init), but when creating a swap, it will likely need to produce a Bitcoin address or Lightning invoice via Xverse. Xverse through sats-connect provides methods to request an address, sign transactions, etc. Ensure you follow the sats-connect flow to get user approval for any Bitcoin action.

• **Network IDs:** Confirm that Xverse is indeed in testnet or signet mode and that Cartridge Controller is pointing to Starknet Sepolia. Mismatched network settings between the wallets and the SDK could cause silent failures. For instance, Cartridge will have a network selection (make sure it's on "Starknet Sepolia" and not Mainnet).

• **Testing with a Swap:** After `init`, try calling the SDK's swap creation to ensure end-to-end works:

```typescript
const swap = await starknetSwapper.create(
    Tokens.STARKNET.STRK, // or another Starknet token, as the asset to swap out
    Tokens.BITCOIN.BTCLN, // swapping into Bitcoin Lightning (BTCLN)
    amount, // amount in wei (BigInt) if STRK -> BTC, or `null` if BTC -> STRK to use invoice amount
    false, // `false` indicating it's not an instantaneous swap (true is for zero-conf, I believe)
    invoiceOrAddress // for BTC->Starknet, this would be a Lightning invoice or BTC address
);
```

Then `await swap.commit()` to initiate it, and `swap.waitForPayment()` for an async swap (like when waiting for BTC payment). The exact usage may vary, but that's the general idea gleaned from examples. Monitor each step for errors in case something still isn't configured right.

By implementing the above, you address the immediate cause of the failure – the SDK will no longer be "looking in the wrong place" for the contract, so the ABI should be found and the `.find` error should disappear.

## Alternative Approaches (Workarounds if SDK Issues Persist)

If after all the configuration changes the SDK still doesn't initialize (or if it initializes but you encounter other blockers), you may need to consider alternative strategies given your hackathon time constraints:

### A. Leverage Atomiq's Backend Service

Atomiq Labs provides a backend node (often referred to in their docs or repos as the "relay" or liquidity provider node) which handles all the blockchain interactions. In fact, the code we reviewed (like `StarknetChainInitializer` and config files) is part of that service. The idea is that instead of doing everything in the browser, you run a service that:

• Maintains a connection to Bitcoin (bitcoind or LND for Lightning)
• Maintains a connection to Starknet
• Runs the swap logic, watching for payments and submitting transactions on Starknet.

For a hackathon demo, setting up the full Atomiq relay node might be heavy, but you could try a slim approach: - Use Atomiq's API if one exists. (They might have a cloud service or at least the building blocks for an API.) - Or create a minimal backend using their packages: for example, a Node script that uses `@atomiqlabs/sdk` server-side (which might avoid some browser pitfalls) and exposes endpoints to your frontend. The snippet in the EgyptFi docs illustrates an approach where the frontend makes HTTP requests to a backend to initiate swaps and poll for status. In your case, you could have an endpoint like `/createSwap` that your React app calls; the backend (using the same SDK but in Node) would perform `Factory.newSwapper()` and handle the process, returning data (like a Lightning invoice or confirmation) to the client. This shifts the heavy lifting off the browser.

This approach could bypass any browser-specific bugs, since Node tends to handle dependencies more easily (no polyfills needed). However, the time to implement it and ensure security (you'd be holding keys or relying on a wallet on the backend) might be a concern.

### B. Mock the Swap for Demo Purposes

Given that the Bitcoin swap is a non-critical, nice-to-have feature for your hackathon project, the safest fallback is to simulate it. This means adjusting the scope: instead of a fully trustless swap, you demonstrate the flow with placeholders: - When a user wants to swap, present them with a dummy Lightning invoice or a message (instead of actually generating one via Xverse). - Simulate the "payment detection": after a timeout or on a button click, assume the payment was made and trigger the Starknet side (perhaps mint the game reward or simply log a success). - For Starknet → BTC swaps, you can just immediately show a fake transaction ID as if BTC was sent.

During the presentation, you can narrate that "under the hood this would be a Lightning network swap, but for the sake of the demo we simulate it." Judges are usually understanding if the core innovation (ZK Battleship, Dojo engine integration, etc.) is working and the peripheral feature is shown conceptually.

This approach has near-zero risk – it avoids dealing with two blockchains' complexity live – and lets you focus on demonstrating the rest of your project.

### C. Alternate Cross-Chain Solutions

If you still want a real Bitcoin integration but Atomiq's SDK is too troublesome, consider if there are other means: - Centralized bridge: e.g., have a trusted server or a third-party service do the conversion. For testnets, there's no readily available service to swap BTC for a Starknet token, so you'd likely have to DIY (which is essentially what Atomiq's backend is). - Other protocols: Starknet is new, and Atomiq is one of the first doing BTC Lightning swaps. Perhaps you could simplify to just handle on-chain BTC testnet in a centralized way: for instance, user sends BTC to a dev-controlled address, and your app, upon detecting it (via a block explorer API or bitcoind's RPC), then sends them test STRK on Starknet. This wouldn't be atomic or trustless, but it could be an interim demo solution. You'd have to pre-fund some STRK (or any Starknet token) to distribute on testnet.

Given hackathon constraints, if trustlessness is not being strictly judged, a candid approach is to say: "We didn't have time to fully integrate the BTC bridge, so we used a simplified approach which we plan to replace with Atomiq's trustless swap post-hackathon."

### D. Limit to Supported Network for Demo

As a last resort, you could attempt demonstrating the swap on Starknet Mainnet with small real amounts. Atomiq's SDK is more battle-tested on mainnet (their exchange product runs there). If Xverse and Cartridge can connect to mainnet, you could try a tiny swap of, say, a few sats for some STRK (or another token) on mainnet. The downside is you'll need a bit of actual ETH on Starknet mainnet and some BTC; and mainnet is slower and riskier for a live demo. But if everything fails on Sepolia, this is an option. Use caution with real funds and only do this if you're confident and have time to test beforehand.

## Timeline & Feasibility

Considering your hackathon timeline: - **Quick Fix (1-2 hours):** Adjusting config and updating the SDK as described is likely doable within a couple of hours. If it works, great – you get the live swap feature in your demo. - **Moderate (Half day):** If issues persist, implementing a mock or minimal backend might take a few more hours. It's doable within a hackathon if you allocate time to it, especially if you simplify the scope (e.g., only implement BTC→Starknet one-way flow for demo). - **Major Blocker:** If the SDK simply refuses to cooperate and time is nearly up, go with the mock strategy. It's better to have a functioning demo without real swaps than to have the app crash or the integration half-done.

Stay agile: you might try the fix, and if you don't see "Factory created" and a successful `swapper.init()` by a certain cutoff time, switch to plan B (mock or off-chain swap).

## Resources & References

• **Atomiq SDK Code – Network Configuration:** The open-source portions of Atomiq's SDK were invaluable in diagnosing this issue. For example, the mapping of Bitcoin networks to Starknet relay contract addresses is defined in their `StarknetBtcRelay.ts`. Additionally, the SDK's Starknet initializer shows that Starknet Sepolia is used for testnet swaps, confirming your environment alignment. The default Starknet contract addresses for Sepolia (Escrow, handlers) are listed in `StarknetSwapContract.ts`.

• **Atomiq Documentation & Discord:** While not directly accessed here, the official docs at docs.atomiq.io and their community channels likely have announcements about Sepolia support and contract addresses. If time allows, checking there or asking in Discord could quickly give the exact address for the BTC relay on Sepolia and any known issues. Sometimes other developers have encountered the same error, so a quick Discord query could confirm the fix (e.g., "use SDK v6.0.4 for Sepolia" or "here's the config snippet to use").

• **Example Integration (AFK Repo):** The AFK AlignedFamKernel monorepo's integration with Atomiq provides a working reference on how to initialize the swapper in a React app. Notably, they demonstrate using `BitcoinNetwork.MAINNET` (and mention TESTNET for Sepolia) and attaching the Starknet signer. This helped verify the correct sequence and the network-switch behavior of the SDK.

• **EgyptFi Swap Service Example:** The documentation from the EgyptFi project outlines a backend approach to using Atomiq (with an API endpoint for creating swaps and processing them). It's a different architecture (server-side), but it shows how one might structure the integration in a production setting, which informed our alternative approach suggestions.

• **Starknet & Bitcoin Dev Tools:** If debugging further, you might use Starknet block explorer (e.g., Voyager or StarkScan for Sepolia) to check if the contract address in question has code on Sepolia. Similarly, a Bitcoin testnet explorer can confirm if you're using testnet vs signet by looking at addresses or transactions from Xverse. Ensuring all networks line up is crucial.

Finally, keep in mind that hackathon demos often involve cutting a feature if it risks the stability of the presentation. You have a clear path to try and fix the Atomiq integration – and it's likely solvable – but have a contingency plan. Document what you tried, and if it comes to it, you can mention in your presentation that "we integrated the architecture for Bitcoin-Starknet swaps and have identified the remaining configuration steps (as detailed in our report), which we'll complete after the hackathon to realize the full trustless swap functionality." This shows foresight and honesty, and you still get credit for tackling a very advanced integration.

Good luck, and hopefully with the above steps, you'll be able to showcase a working Bitcoin ↔ Starknet swap in your ZK Battleship game!