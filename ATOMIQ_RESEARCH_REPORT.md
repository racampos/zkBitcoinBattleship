# Atomiq Research Report

## EXECUTIVE SUMMARY

**Feasibility:** FEASIBLE – Integrating Atomiq for BTC↔Starknet swaps within a 10-day hackathon timeline is achievable. Atomiq provides a public, well-documented TypeScript SDK that supports Starknet Sepolia (testnet) and Bitcoin testnet, enabling development without real funds. Key technical pieces (Bitcoin light client contracts, Lightning HTLCs, etc.) are abstracted behind the SDK, so you won't need to implement low-level Bitcoin logic from scratch. The integration can be done in 3–4 days given the available examples, assuming you focus on the simpler Lightning Network flow for deposits (to avoid complex on-chain Bitcoin PSBT handling).

**Key Enablers:** The Atomiq SDK is open-source and does not require API keys or prior approval, which means you can start building immediately. Both Bitcoin testnet and Starknet testnet are supported, allowing end-to-end testing without mainnet BTC. Documentation and code samples are comprehensive (covering swap initialization, quote retrieval, payment monitoring, and finalization), and Atomiq's contracts have been audited (no known security breaches to date). Additionally, Atomiq's design is fully trustless – no custodial risk – which aligns well with a hackathon (no legal/KYC overhead).

**Potential Blockers:** The main challenge is integration complexity – handling cross-chain workflows and user experience. On-chain BTC swaps require constructing and signing PSBTs (Partially Signed Bitcoin Transactions) collaboratively with the Atomiq liquidity provider, which can be technically involved. However, this can be mitigated by leveraging Lightning Network swaps for the demo (Lightning flows are much simpler: just generate/display an invoice or QR code). Another consideration is Lightning testnet availability – you may need to set up a test Lightning node or use small mainnet invoices, since user-friendly LN wallets on testnet are limited. Also, swap finality time on Bitcoin can be slow (up to ~30-60 minutes for on-chain confirmations), so plan around that for your demo (Lightning resolves in seconds).

**Estimated Timeline:** Integration (~3 days): Day 1 – install SDK, get testnet wallets set up, and perform basic swap (e.g. Lightning invoice flow). Day 2 – build UI for deposit (QR code scanning, status updates) and handle callbacks or polling. Day 3 – testing edge cases (expiry, refund) and polishing. Buffer: 0.5–1 day for bugfixes. This fits within your 4-day budget.

**Alternative Options:** If unexpected issues arise (e.g. testnet instability or time running short), consider a minimal fallback: simulate the BTC swap off-chain for demo purposes (e.g. have users send test-BTC to a dev wallet and manually credit them in-game). Alternatively, Garden Finance (another Starknet BTC bridge) is an option to research, touting faster 30-second swaps – but it's newer and less documented for DIY integration. Overall, Atomiq is the recommended path given its maturity and the hackathon-friendly features (testnet support, no permissions needed, and ready-made SDK).

## SECTION-BY-SECTION FINDINGS

### 1: API Availability & Access

**Status:** CLEAR – Atomiq provides a public integration SDK and does not require special access.

**Key Findings:**

• **Public SDK (TypeScript):** Atomiq offers an official NPM package (`@atomiqlabs/sdk`) for developers. This SDK abstracts the cross-chain swap protocol (Bitcoin Light Client, Lightning, etc.) into simple methods. There is extensive documentation via README and a GitBook (docs.atomiq.exchange) covering usage for each chain.

• **No API Keys or Whitelisting:** The Atomiq SDK and protocol are open – no API key or signup is needed to use the swap functionality on testnet or mainnet. The integration in Braavos and hackathon guides confirms that developers can get started without any approval process. Atomiq Labs has open-sourced their code and even provides example integrations, indicating a developer-friendly approach.

• **Endpoints & Protocol:** Instead of a REST/GraphQL API, Atomiq uses a p2p RFQ (Request-for-Quote) model with liquidity provider nodes. All communication with Atomiq's network (getting quotes, monitoring Bitcoin transactions, etc.) is handled by the SDK internally (likely via WebSockets or similar), so you won't deal with raw HTTP endpoints.

• **Official Documentation:** Yes – official docs are available on their site (GitBook). These include conceptual overviews and step-by-step guides for each flow (Lightning swaps, on-chain SPV swaps, running an LP node, etc.). For quick reference, the NPM README also provides code snippets for common use cases. (Doc links: docs.atomiq.exchange, plus GitHub repositories for SDK and demo.)

• **Test/Sandbox Environment:** Atomiq supports Bitcoin Testnet and Starknet Sepolia out-of-the-box. By initializing the SDK with `BitcoinNetwork.TESTNET`, the SDK will target Starknet Sepolia and Bitcoin testnet automatically. This allows end-to-end testing without real BTC. No dedicated "sandbox" URL is needed – you just toggle the network in the SDK config.

• **Access Approval:** Not applicable – since no API key is needed, there's no approval wait. You can start integrating immediately. (Be mindful that on mainnet, liquidity might be limited initially, but for hackathon/testing this isn't an issue.)

**Confidence Level:** HIGH – Official docs and code confirm the open availability and ease of access.

### 2: Testnet Support

**Status:** CLEAR – Full support for Bitcoin test networks and Starknet testnet is confirmed.

**Key Findings:**

• **Bitcoin Testnet:** Atomiq explicitly supports Bitcoin testnet (often referred to as testnet3). The SDK's `BitcoinNetwork` enum includes `TESTNET` and even `TESTNET4` (likely signet) options. When set to TESTNET, the system expects testnet BTC and adjusts other networks accordingly (e.g. Solana devnet, Starknet Sepolia). This means you can swap using tBTC (test bitcoins) without risking real BTC.

• **Starknet Sepolia:** On the Starknet side, Atomiq uses Sepolia (the current Starknet testnet) in conjunction with Bitcoin testnet. The SDK automatically selects Starknet Sepolia when `BitcoinNetwork.TESTNET` is used. You will need a Starknet Sepolia wallet (e.g. Braavos or ArgentX pointed to testnet) and test tokens.

• **Test Tokens and Faucets:** For Bitcoin testnet, there are public faucets (e.g. testnetfaucet.mempool.co) to get tBTC. For Starknet Sepolia, you can obtain test ETH (for gas) from official Starknet faucets. Atomiq's wBTC on testnet and other tokens might also be available via faucets or by minting through the protocol. (No explicit mention of a dedicated Atomiq faucet, but since it's trustless, you get test wBTC by doing a swap with test BTC.)

• **Lightning on Testnet:** Atomiq's Lightning support extends to testnet as well. The SDK will presumably use the Bitcoin testnet Lightning network. Note that using Lightning on testnet can be tricky (fewer nodes); you may alternatively use the signet network for more reliability if they support it (the TESTNET4 constant might refer to signet). In any case, the SDK can generate testnet LN invoices and swaps just like mainnet.

• **Ability to Test Without Real Money:** Yes – you can run through the entire swap flow with test assets. For example, you can swap tBTC → testnet wBTC on Starknet and vice versa. This was a design goal: "developers can test swaps without real money." The SDK example explicitly sets `bitcoinNetwork: BitcoinNetwork.TESTNET` in the swapper initialization for this purpose.

• **Guidance for Testing:** The documentation suggests that when using testnet mode, Starknet Sepolia and Solana devnet are automatically used in tandem. This implies Atomiq's test mode is well-aligned with the broader ecosystem's test environments. No explicit step-by-step "testnet guide" was found, but given the straightforward config, it likely just works. During testing, watch for slower Bitcoin block times and use low amounts.

**Confidence Level:** HIGH – Confirmed by SDK config and official materials that testnets are supported out-of-the-box.

### 3: Technical Integration Complexity

**Status:** PARTIAL – The SDK simplifies most tasks, but cross-chain swaps inherently require multiple steps. Clear documentation exists, though on-chain flows are complex. Use Lightning to reduce complexity.

**Key Findings:**

• **Official SDK & Language:** The integration is done via Atomiq's TypeScript SDK, which is ideal for your stack (TypeScript/React). There's no low-level coding needed in Rust or Cairo for the cross-chain logic – the SDK handles generating addresses, monitoring Bitcoin transactions, and interacting with Starknet contracts. Atomiq Labs also provides an example dApp (atomiq-sdk-demo on GitHub) to demonstrate integration patterns.

• **Typical Swap Flow:** The swap process involves a few distinct steps:
  - **Quote Request:** You call `swapper.swap(fromToken, toToken, amount, exactIn, srcAddress, destAddress)` to get a binding quote. This connects to an LP node and locks in a rate (zero slippage – price is fixed in this quote). The result is a swap object.
  - **Commit Phase:** You then initiate the swap. For Starknet→BTC, this means the SDK will prompt you to sign a Starknet transaction to lock tokens in the Atomiq vault contract. For BTC→Starknet, the commit might involve preparing a Bitcoin address or PSBT for the user to fund. For example, in Lightning swaps, no on-chain commit tx is needed on Bitcoin – you just pay an invoice. In on-chain swaps, the commit is opening a Bitcoin escrow address (the SDK provides a PSBT that the user must fund and sign).
  - **User Payment:** The user then sends the funds on the source chain:
    ◦ On Starknet→BTC: user's Starknet tx is now on-chain (executed in step 2).
    ◦ On BTC→Starknet (on-chain): user must send BTC to the provided address (or sign the PSBT).
    ◦ On BTC→Starknet (Lightning): user pays the provided Lightning invoice (generated by `swap.getAddress()`).
  - **Confirmation & Monitoring:** The SDK/wallet monitors the source chain for payment confirmation. For BTC on-chain, this may require a number of confirmations (often ~3). The SDK provides `swap.waitForBitcoinTransaction()` with a callback to track confirmations and ETA. For Lightning, `swap.waitForPayment()` listens for the invoice to be paid (which is typically quick).
  - **Claim/Settlement:** Once the payment is confirmed, the swap is automatically settled: the LP's vault releases the output tokens to the user. In many cases, Atomiq's watchtower service will auto-claim on behalf of the user. If not, the SDK exposes a `swap.claim()` function to manually finalize the swap on Starknet (or `swap.refund()` if something went wrong). In practice, Braavos reports that the process is seamless – after payment, the user just sees the funds appear.

• **Number of API Calls:** From the dApp perspective, you'll make 2-3 main calls per swap:
  - A call to create the swap (quote).
  - A call to commit (initiating the transaction on source chain).
  - (Possibly) a call to finalize or refund, if not automated. The rest is handled via event listeners. For example, after `swap.commit()`, you can await `swap.waitForBitcoinTransaction()` or `swap.waitForPayment()` which internally polls the status.

• **Asynchronous Complexity:** Cross-chain swaps are inherently async and can time out. The SDK handles a lot of this (with built-in timeouts, state enums, etc.), but you should be prepared to manage user feedback during waiting periods (e.g. "Waiting for 1/3 Bitcoin confirmations..."). The swap object has states like `CREATED`, `COMMITTED`, `CLAIMED`, `REFUNDABLE` etc. to help track progress. You might need to implement a polling UI or a status callback – Atomiq does not push webhooks to your server (it's client-side driven). In a web app, simply calling the waitFor… promises (which use callbacks internally) is sufficient.

• **Learning Curve:** The documentation is good, but the concept of PSBT and UTXOs (for on-chain BTC) might be new if you haven't worked with Bitcoin. The SDK tries to simplify this by providing `getFundedPsbt()` and similar helpers. If you use Lightning, the complexity drops significantly – no PSBTs, just invoices.

• **Integration Time:** Given the above, an experienced dev can integrate basic flows in ~2 days. Braavos wallet had this running (they likely collaborated with Atomiq), but for you, a deposit-only Lightning integration is the fastest path (possibly even a day of coding with the example code). On-chain BTC flows could add another day or two of debugging. Overall, fitting it in 3-4 days is realistic. Testing will be crucial (simulate success, timeout, refund scenarios).

**Confidence Level:** MEDIUM – We have concrete code examples, but the actual coding effort depends on your familiarity with cross-chain concepts. Expect some iteration, but nothing insurmountable.

### 4: Starknet Asset Support

**Status:** CLEAR – Atomiq supports multiple Starknet tokens for BTC swaps, notably wBTC, STRK, and ETH, via known contract addresses.

**Key Findings:**

• **Wrapped BTC on Starknet (wBTC):** Yes, Atomiq's primary use-case is swapping native BTC to wrapped BTC (wBTC) on Starknet. When you perform a BTC→Starknet swap, the user receives wBTC tokens. These wBTC are standard ERC-20 tokens on Starknet, usable in DeFi. Notably, Braavos describes this as "convert BTC into wBTC" via Atomiq. The wBTC contract on Starknet used by Atomiq has been identified in their SDK: `0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac` (8 decimals). This likely corresponds to an officially bridged WBTC token (BitGo's WBTC) or a similarly pegged token. Bottom line: you can get real wBTC on Starknet without trusting a custodian – Atomiq's contracts ensure it's 1:1 with BTC via the atomic swap.

• **STRK (Starknet's Token):** Atomiq also supports swaps between BTC and STRK (the Starknet network token). In fact, the Braavos Lightning integration uses STRK as the payment asset – users pay with STRK to send BTC via Lightning. The SDK lists a STRK token (18 decimals) at address `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`. This means you can swap BTC <-> STRK both ways. For example, Lightning → STRK (user pays BTC over Lightning, receives STRK on Starknet) is supported, and Starknet → Lightning also works (user spends STRK to send BTC).

• **ETH (Starknet bridged ETH):** Atomiq's SDK and Braavos wallet indicate support for ETH on Starknet. You can swap BTC to Starknet ETH (and vice versa). In the Braavos interface, BTC, wBTC, STRK, and ETH are all listed as cross-chain swap options. The SDK's token list confirms ETH (18 decimals) at the canonical Starknet ETH address. This could allow flows like converting BTC → ETH on Starknet in one step.

• **Other Assets (TBTC, etc.):** The SDK also mentions a token "TBTC". This likely refers to Threshold BTC (tBTC) – another wrapped Bitcoin representation (which has 18 decimals). It suggests Atomiq may support swapping BTC ↔ TBTC on Starknet, though this is probably a secondary option (perhaps if an LP provides liquidity in tBTC instead of wBTC). For your hack's scope, wBTC is the primary focus.

• **Supported Token Summary:** In production, the main supported Starknet assets for Atomiq swaps are wBTC, STRK, and ETH. wBTC is the default output for a BTC deposit. STRK and ETH can be both source or destination if the user wants to convert their BTC directly into those tokens. Braavos explicitly confirms these four are supported by Atomiq swaps ("BTC, ETH, STRK & wBTC supported"). Additionally, Braavos lists major Starknet tokens (USDC, DAI, etc.) but those non-BTC assets are handled by an aggregator (not directly via Atomiq). Atomiq does not swap BTC directly to USDC/DAI in one step – you'd swap BTC to wBTC or ETH, then trade that for other tokens using a DEX.

• **Contract Addresses:** For integration, you generally don't need to hard-code these addresses, as the SDK knows them. But for reference:
  - wBTC (Starknet) – `0x03fe...e7ac` (8 decimals).
  - STRK – `0x0471...3938d` (18 decimals).
  - ETH – `0x049d...4dc7` (18 decimals, the Starknet ETH bridge token).
  These align with known Starknet tokens (ETH and STRK addresses match official deployments). Ensure your frontend shows correct decimals and symbols (the SDK's Factory.Tokens object can provide this mapping).

**Confidence Level:** HIGH – Confirmed via multiple sources (official and code) which tokens are supported.

### 5: Swap Performance & Limits

**Status:** PARTIAL – Lightning swaps are extremely fast (seconds), on-chain swaps are slower (minutes to an hour). Fees and limits are reasonable, but exact figures vary by liquidity provider and network conditions.

**Key Findings:**

• **Settlement Time – Lightning:** Swaps using the Lightning Network complete virtually instantly once payment is made. Braavos reports that a user can "scan, pay, and go in 3s" for Lightning payments with Atomiq. In practice, a Lightning invoice payment is settled in a few seconds, and the Starknet side claiming is handled immediately by the protocol. There is no block confirmation needed on Bitcoin for LN because the HTLC is off-chain – the swap finalizes as soon as the payment is received and a Starknet transaction (to deliver funds) is executed. Overall, Lightning deposits/withdrawals typically settle within a few seconds to a minute (plus maybe ~10–15 seconds for a Starknet block to finalize the token transfer).

• **Settlement Time – On-Chain Bitcoin:** Swaps involving on-chain Bitcoin will be notably slower. The exact time depends on Bitcoin block confirmations. Atomiq's design uses a configurable confirmation threshold (commonly 3 blocks for finality). Braavos documentation notes that "BTC transactions usually take between a few minutes and an hour". This aligns with waiting for 1–3 confirmations (1 conf ~10 min average, 3 conf ~30 min average, but could be longer if blocks are slow or fees are low). Atomiq mitigates this with an optional liquidity fronting feature – an LP could release funds after 1 conf for a fee. However, for simplicity, expect ~30 minutes for on-chain BTC swaps to be fully settled without front-running risk. This is the trade-off for trustlessness; there's no custodian to instantly credit BTC, the protocol needs actual Bitcoin blocks.

• **Minimum Swap Amounts:** Atomiq supports very small swap sizes. Because it's on-chain, the minimum is constrained by Bitcoin dust limits and fee practicality. The SDK examples use amounts like 10,000 sats (0.0001 BTC) and even as low as 1,000 sats in a Lightning invoice example. In Braavos, the minimum BTC swap is likely on the order of a few dollars (to cover fees). There is no official published minimum, but expect something like ~0.00001–0.0001 BTC as a practical minimum. For Lightning, 1,000–5,000 sats might be the smallest (since routing tiny payments can fail). On Starknet side, the minimum wBTC or STRK is just whatever that sat amount equates to (fractions of a token).

• **Maximum Swap Amounts:** No fixed global cap is stated. Atomiq's capacity depends on Liquidity Providers' locked funds. Each LP advertises its max in the RFQ handshake. Currently, being a new system, the max might be limited (possibly in the low BTC range per swap). For instance, if an LP has 1 BTC in the vault, you can't swap 5 BTC. If you attempt a large swap, you might get no quote or a worse rate. As Starknet's BTC liquidity grows (Starknet Foundation has initiatives to bring more BTC), these limits should increase. For hack/demo purposes, you'll likely be dealing with small amounts (e.g. 0.01 BTC or less), which should be fine. It's wise to test the upper bound in testnet; the SDK's `swap.getPriceInfo().difference` will indicate if you're moving the price (which would imply hitting size limits).

• **Fees:** Atomiq swaps carry a fee, but it's relatively low and transparent. There are two components:
  - **Network fees:** The Bitcoin transaction fee or Lightning routing fee, and Starknet gas. These are passed to the user (either added on top or included in the quote). For example, when swapping to BTC, the quote will include the miner fee in the required input. Lightning fees are typically a few sats.
  - **Service fee/spread:** Atomiq's LP likely takes a small cut (this is how the protocol incentivizes LPs and watchtowers). The platform advertises "zero slippage" but not zero fees – instead, you get a fixed quote with a slight spread from market price. Braavos notes a "small fee included with each transaction" for using the Atomiq bridge. Although exact percentages aren't stated publicly, users have reported the fee is on the order of 0.2% – 0.5% of the swap, plus a fixed minor amount. The SDK `swap.getFee()` will return the fee portion in the source token, so you can display it. For Lightning payments via Braavos, they described fees as "minimal" and worth the convenience. In summary: expect a small percentage fee (sub-1%) and network fees; no large overhead. (During the Starknet Foundation promo period, Braavos/Atomiq even waived bridge fees, charging only network fees).

• **Rate Limits / Throughput:** There's no explicit rate limit per user aside from technical constraints. The LP nodes might limit API call frequency to prevent abuse, but the typical use (a few swaps) won't hit this. Volume-wise, because everything is non-custodial, there's no daily swap cap imposed by Atomiq – it's constrained by how much an LP can handle. As a hackathon user, this is not a concern. Uptime has been good so far (no known major downtime), as Atomiq's contracts are on-chain and LP nodes have redundancies. Still, it's wise to handle errors (network timeouts, etc.) gracefully.

**Confidence Level:** MEDIUM – Performance characteristics are documented and observed in practice (especially via Braavos). Fee structure is inferred from documentation and user context (precise fee % not explicitly given, but qualitatively described).

## INTEGRATION CHECKLIST

**Integration Steps for Atomiq:**

1. **Install SDK & Set Up Environment** – Est. Time: 1 hour – Blocker Risk: LOW.
   - Add `@atomiqlabs/sdk` (and `@atomiqlabs/chain-starknet` for Starknet support) to your project.
   - Ensure you have a Starknet Sepolia wallet (Braavos/ArgentX in testnet mode) and a Bitcoin testnet wallet (e.g. Xverse or Sparrow for PSBTs, or an LN wallet for Lightning testnet).
   - **Blockers:** Minimal. Documentation is clear and installation is straightforward.

2. **Initialize the Swapper** – Est. Time: 2 hours – Blocker Risk: LOW.
   - Use the SDK to create a Swapper instance with Starknet and (optionally) Solana configured. Set `bitcoinNetwork: BitcoinNetwork.TESTNET` to use Starknet Sepolia and testnet BTC.
   - Example: `Factory = new SwapperFactory([StarknetInitializer] as const); const swapper = Factory.newSwapper({chains: {STARKNET: {rpcUrl: sepoliaRPC}}, bitcoinNetwork: BitcoinNetwork.TESTNET});`.
   - **Blockers:** Make sure to use a reliable Starknet RPC (e.g. Infura/Blast) for Sepolia. No API keys required for Atomiq, but you need a Bitcoin RPC for testnet if doing on-chain (mempool.space or run bitcoind – Lightning flow doesn't require this explicitly in the browser).

3. **Implement Swap (Deposit) Flow** – Est. Time: 4–6 hours – Blocker Risk: MEDIUM.
   - **UI/UX:** Create a "Deposit BTC" interface where the user can initiate a swap. Let them choose amount in BTC (or you can fix an amount for demo).
   - **Quote & Commit:** On clicking deposit, call `swapper.swap(Tokens.BITCOIN.BTC or BTCLN, Tokens.STARKNET.WBTC (or STRK), amount, ...)` to request a quote. Display the quote details (e.g. rate, fee, expiration time). Then call `swap.commit()` if required (for on-chain flows, commit opens the vault on Starknet; for Lightning, commit is trivial).
   - **Payment:** For on-chain BTC: display the Bitcoin address (`swap.getAddress()`) or PSBT for the user to fund. For Lightning: display the BOLT11 invoice string or QR code (`swap.getAddress()` gives invoice). Provide clear instructions: "Send exactly X BTC to this address" or "Scan to pay X sats".
   - **Blockers:** Handling the PSBT flow is the hardest part (the SDK can return a PSBT that still needs user's inputs). If time is short, use Lightning to avoid PSBT complexity – just show invoice QR. Another consideration: UI polling. You'll likely use `await swap.waitForPayment()` or `waitForBitcoinTransaction()` which runs in background. Ensure your UI reflects a waiting state and handles timeouts (the quote expires after e.g. ~10 minutes if no payment). The risk is moderate, as debugging cross-chain flows can be tricky – but logs from the SDK are helpful.

4. **Implement Swap (Withdrawal) Flow (Optional)** – Est. Time: 4 hours – Blocker Risk: MEDIUM.
   - If you want users to withdraw BTC, do the reverse: `swapper.swap(Tokens.STARKNET.WBTC, Tokens.BITCOIN.BTC, amount, ...)`. You'll need to have users input a BTC address (or Lightning invoice) as the destination and pass it as the destAddress in `swap()`. Then call `swap.commit(starknetSigner)` to lock wBTC and trigger the Bitcoin payout.
   - **Blockers:** Similar complexity as deposit. On-chain withdrawal will produce a PSBT that the LP signs and broadcasts – the user just waits for BTC. Lightning withdrawal will require the user's own LN invoice (the SDK can generate one and then pay it, but in withdrawal the user is the one receiving on Lightning, so likely the SDK provides an invoice for them to share – in Braavos, withdrawal wasn't the primary focus). For hack purposes, withdrawal is optional and can be skipped to reduce scope.

5. **Handle Swap Completion & Errors** – Est. Time: 2 hours – Blocker Risk: LOW.
   - Use the SDK's promises to update the UI when the swap completes. E.g., after `waitForPayment()` returns true, you can show "Deposit Confirmed!" and perhaps fetch the new wBTC balance from Starknet. Atomiq will automatically claim funds to the user's Starknet address in most cases. If not claimed after a short while, call `swap.claim()` as a fallback.
   - Implement error cases: if `waitForPayment()` returns false (payment not received in time), or `swap.waitTillClaimed()` times out, inform the user and allow retry or refund. The SDK can detect REFUNDABLE state – for on-chain swaps, you could call `swap.refund()` to return Starknet funds if the BTC side never came. In practice, in testnet you may not need refunds if you control both sides for demo.
   - **Blockers:** Relatively straightforward. Just ensure to catch exceptions from the promises. The risk here is forgetting to handle a timeout which could leave the user confused – make sure to provide feedback (e.g. "Swap expired – no BTC sent. Please try again.").

6. **Testing End-to-End** – Est. Time: 1 day (intermittent) – Blocker Risk: MEDIUM.
   - Test a full deposit on testnet: get test BTC, initiate swap, send BTC, wait for wBTC on Starknet. Use small amounts first. Then test failure scenarios: don't send BTC and let quote expire – does the app handle it? Test Lightning path (you might need two wallets to pay an invoice you create). If possible, test mainnet with a tiny amount (e.g. 5,000 sats via Lightning) to ensure everything works in real conditions – though optional, as hack judges likely accept testnet demos.
   - **Blockers:** Testnet Bitcoin can be slow/unreliable (mining is irregular). Lightning on testnet might require connecting to a specific node. These are external factors; mitigate by performing tests well in advance and possibly using signet (which has predictable block times) if needed. During demo, have pre-mined confirmations or use a Lightning swap for speed.

**Total Estimated Time:** ~20–30 hours (about 3–4 days of focused work). This covers coding, UI, and testing.

**Overall Risk:** MEDIUM. The integration is doable with provided tools, but cross-chain interactions always carry some complexity. Using Lightning where possible lowers the risk significantly. No single step is "critical-blocker" level, but there are many small moving parts to get right. With proper testing and by leveraging Atomiq's examples, the risk can be managed.

## DECISION MATRIX

| Criteria | Score (1–5) | Notes |
|----------|-------------|-------|
| API Documentation Quality | 5 | Excellent. Comprehensive docs and code samples for all flows. The GitBook and README cover setup through edge cases, which reduces guesswork. |
| Testnet Availability | 5 | Full support. Works on Bitcoin testnet & Starknet Sepolia. No real BTC needed. Lightning and on-chain both testable (with minor effort for LN). |
| Integration Complexity | 3 | Moderate. The SDK abstracts a lot, but you still manage multi-step flows and user interactions. Lightning swaps are simple, on-chain swaps more complex (PSBT, waiting). Feasible in hack timeframe, but requires careful handling. |
| Developer Support | 4 | Good. Open-source repos are active and Braavos already integrated (proof of concept). Atomiq has a Telegram dev channel and was involved in Starknet hackathon mentorship. Support is community-driven; responses are reasonably quick, though 24/7 support is not guaranteed. |
| Timeline Feasibility | 4 | High. A basic deposit flow can be done in ~3 days given the ready-made SDK. You have buffer time for testing. Focusing on core features (like deposit-only, Lightning path) keeps it on schedule. Including full bidirectional swaps or deep customization might stretch timeline. |
| Risk Level | 2 | Low-Med. (Scored as 5=high risk, 1=low risk). The tech is solid (audited, used by Braavos with no issues). Primary risks are integration bugs or testnet quirks, not fundamental security or reliability issues. Mitigated by thorough testing and fallback logic. |

**Overall Score:** 23/30

**Recommendation:** GO. Proceed with Atomiq integration – it appears viable within the timeframe and adds significant functionality. (Use a CAUTIOUS GO approach: implement the simplest working version first, e.g. Lightning deposit, then iterate. Have a minimal backup plan, but full abandonment is not necessary given the available support.)

## RECOMMENDED ALTERNATIVES

If integrating Atomiq proves more difficult than expected, consider these options:

1. **Garden Finance (Bitcoin-Starknet bridge):** A newly launched trustless BTC bridge on Starknet, focused on speed. Garden promises ~30 second swaps using an intents-based mechanism. It supports Bitcoin testnet and has Starknet contracts live. **Why better:** Much faster finality for on-chain BTC and potentially simpler UX. **Caveat:** It's very bleeding-edge (launched April 2025); documentation and SDKs might be less mature than Atomiq. Integration could be risky under time constraints if resources are lacking.

2. **Centralized Swap via Exchange API:** Use a service like SideShift, Changelly, or a custodial bridge that supports BTC <-> ETH and then move ETH to Starknet. For example, user sends BTC to a custodial address and you credit them wBTC. **Why it might be better:** Simpler one-step API calls, no complex on-chain handling on your side. **Caveat:** Trust and KYC – these likely require accounts or are geo-restricted, and not in the spirit of "trustless". Also not ideal for hackathon judging if not self-contained.

3. **Fallback – Manual Demo Mode:** If time is nearly up, implement a mock swap. For instance, have users send Bitcoin testnet to your own testnet wallet (display an address/QR). Once you see the tx on a block explorer, you manually or programmatically mint them a placeholder "BTC token" in the Starknet game. **Why better:** It avoids all SDK integration, just using basic blockchain interactions you control. **Caveat:** This is centralized and only for demo – not a real trustless swap. It should be positioned as a temporary demo solution. (For a hackathon demo, this might be acceptable if you explain how it would be trustless with more time.)

**Rationale:** Atomiq is quite feasible, so these alternatives are mainly contingency plans. Garden is the closest like-for-like trustless alternative if Atomiq were to fall through. The centralized or mock approaches are last resorts if something unforeseen blocks the trustless integration.

## CODE EXAMPLES

Below is an example in TypeScript using the Atomiq SDK for a Lightning deposit (BTC → Starknet STRK) on testnet. This illustrates how to get a swap quote, present a Lightning invoice to the user, wait for payment, and then claim the Starknet funds:

```typescript
// Initialize the Atomiq swapper for Starknet Sepolia & Bitcoin testnet
const { SwapperFactory } = await import("@atomiqlabs/sdk");
const { StarknetInitializer } = await import("@atomiqlabs/chain-starknet");

const Factory = new SwapperFactory([StarknetInitializer] as const);
const swapper = Factory.newSwapper({
  chains: {
    STARKNET: { rpcUrl: "https://starknet-sepolia.infura.io/v3/YOUR_INFURA_KEY" }
  },
  bitcoinNetwork: BitcoinNetwork.TESTNET // use Bitcoin testnet
});

// Example: Create a swap from Bitcoin Lightning -> Starknet STRK (testnet)
const amountSats = 10000n; // e.g. 10k sats = 0.0001 BTC
const swap = await swapper.swap(
  Factory.Tokens.BITCOIN.BTCLN, // from BTC (Lightning Network)
  Factory.Tokens.STARKNET.STRK, // to Starknet STRK token
  amountSats,
  true, // exactIn: we're specifying input amount in sats
  undefined, // source address not needed for BTC-LN
  starknetUserAddress // destination Starknet address to receive STRK
);

// Generate Lightning invoice for the user to pay
const lnInvoice = swap.getAddress(); // BOLT11 invoice with amount
const qrData = swap.getHyperlink(); // optional: QR code data (LNURL link)
console.log("Please pay this invoice:", lnInvoice);

// Wait for the Lightning payment to be completed
const paid = await swap.waitForPayment();
if (!paid) {
  console.error("Lightning payment not received before expiration.");
  // Handle timeout (e.g., inform user, perhaps retry or abort)
  return;
}

// Payment received! Now finalize the swap on Starknet.
// (Often the watchtower auto-claims the STRK for the user. We'll ensure it's claimed:)
try {
  await swap.waitTillClaimedOrFronted(timeoutSignal(30_000)); // wait up to 30s for auto-claim
} catch {
  await swap.claim(starknetSigner); // manually claim the STRK into user's account
}

console.log("Swap complete! User has received STRK on Starknet.");
```

**Code walkthrough:** We configure the swapper for testnet, request a Lightning swap of 10k sats into STRK, retrieve a payment invoice (`lnInvoice`), and then wait for the user to pay it. Once `waitForPayment()` returns true, we either detect that the STRK was delivered automatically or call `swap.claim()` ourselves to release the funds. In a real app, you'd update the UI at each step (e.g., show QR code, then "Payment received, claiming funds…"). The SDK manages most complexities – e.g., if the invoice expires unpaid, `waitForPayment()` returns false and we handle that.

For more examples, see the official Atomiq Labs GitHub repository, which includes demos and a README with flows for on-chain BTC swaps (using PSBTs) and Lightning swaps.

## CRITICAL WARNINGS

⚠ **On-Chain Complexity:** If you attempt on-chain BTC ↔ Starknet swaps, be aware that handling PSBTs and UTXO management is non-trivial. The Atomiq SDK helps, but you'll need to ensure the user can provide a signed Bitcoin transaction. Given the hackathon time frame, relying on pure on-chain BTC flow is high-risk for a demo. **Mitigation:** Use Lightning for BTC deposits/withdrawals – it avoids PSBT complexity and provides a smoother UX (just scanning an invoice).

⚠ **Testnet Lightning Constraints:** The Lightning Network on testnet is less liquid and user-friendly than mainnet. Many wallet apps don't support testnet LN, and routes can fail due to limited nodes. **Plan:** You might run a testnet LND node or use signet (if Atomiq supports TESTNET4) for more reliable results. As a backup, you could do a small mainnet Lightning demo (e.g. using real wallets with a few sats) since Lightning fees are low – but only do this with caution and clear disclosure.

⚠ **Swap Expiry & Refunds:** Each quote has an expiration (usually ~10 minutes). If the user delays sending BTC, the swap will expire and become invalid. The SDK will mark it `QUOTE_EXPIRED`. You must handle this (e.g., allow the user to refresh the quote). Similarly, if a swap fails mid-way (e.g., user sent BTC but something broke), funds might be locked in the contract temporarily. Ensure you implement the `refund()` logic for Starknet→BTC swaps, and inform users of what to do if a swap fails. Atomiq's design guarantees eventual refunds or no-loss scenarios, but only if the refund function is invoked by the user or a watchtower after timeout.

⚠ **Security Assumptions:** Although trustless, remember that Atomiq involves an off-chain LP. There is no known backdoor, but the system relies on the LP to honestly execute the Bitcoin side of the swap. The good news: if the LP doesn't perform, the swap doesn't complete and the user can reclaim funds – but the user's experience is impacted. For hackathon, use the official Atomiq-run LP (which has been reliable) rather than trying to run your own. The smart contracts have been audited, but as with any new integration, be vigilant for any abnormal behavior during testing.

⚠ **Compliance and Limits:** If deploying to production post-hackathon, keep in mind there may be regulatory considerations (swapping BTC↔ETH might be seen as a money transmission service in some jurisdictions if you charge fees). Atomiq Labs' goal is to remain non-custodial (and thus regulatory-light), but any integration should still follow relevant laws. For the hackathon demo this is not an immediate issue, but it's something to consider for future development. Also note that U.S. persons can use it (there's no geoblocking in the protocol), but always double-check the terms of service of Atomiq (if any on their website) before public launch.

In summary, integrating Atomiq is feasible and well-supported. By leveraging the SDK's high-level functions and focusing on the Lightning swap path for simplicity, you can add a compelling Bitcoin feature to your Starknet Battleship game within the allotted time. Just be mindful of the above caveats, and you'll be on track for a successful GO decision on Atomiq integration. Good luck!