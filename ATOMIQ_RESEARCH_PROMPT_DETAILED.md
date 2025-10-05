# Deep Research Request: Atomiq SDK Integration Issue on Starknet

## 🎯 Research Objective

Investigate why the Atomiq Labs SDK fails to initialize in a browser environment when attempting to create Bitcoin ↔ Starknet swaps, and determine the correct configuration or alternative solution.

---

## 📋 Context

### Project Overview

- **Project**: ZK Battleship game on Starknet (using Dojo engine)
- **Goal**: Integrate trustless Bitcoin ↔ Starknet token swaps using Lightning Network
- **Wallet**: Xverse (Bitcoin) + Cartridge Controller (Starknet)
- **Environment**: Browser-based web application (Vite + React)
- **Target Network**: Bitcoin Testnet4 + Starknet Sepolia testnet

### Technology Stack

- **Frontend**: Vite 6.x, React 19.x, TypeScript
- **Starknet RPC**: Alchemy (Sepolia testnet)
  - URL: `https://starknet-sepolia.g.alchemy.com/v2/[API_KEY]`
- **Bitcoin Wallet SDK**: `sats-connect` v4.1.1 (for Xverse integration)
- **Swap SDK**: `@atomiqlabs/sdk` v6.0.3 + `@atomiqlabs/chain-starknet` v5.1.5

### What's Working

✅ Bitcoin wallet connection (Xverse via sats-connect v4 API)  
✅ Starknet wallet connection (Cartridge Controller)  
✅ Environment configuration (RPC URLs, network selection)  
✅ React application loads successfully  
✅ Atomiq `SwapperFactory` instantiates without error

### What's Failing

❌ Atomiq SDK initialization fails when calling `Factory.newSwapper()`  
❌ Error occurs during Starknet contract initialization  
❌ Specifically fails at `StarknetBtcRelay` contract instantiation

---

## 🔴 The Error

### Error Stack Trace

```
TypeError: Cannot read properties of undefined (reading 'find')
    at getAbiVersion (@atomiqlabs_chain-starknet.js:12644:15)
    at createAbiParser (@atomiqlabs_chain-starknet.js:12634:23)
    at new _Contract (@atomiqlabs_chain-starknet.js:21375:24)
    at new StarknetContractBase (@atomiqlabs_chain-starknet.js:24729:25)
    at new StarknetBtcRelay (@atomiqlabs_chain-starknet.js:25150:9)
    at initializeStarknet (@atomiqlabs_chain-starknet.js:35511:24)
    at SwapperFactory.newSwapper (@atomiqlabs_sdk.js:22814:29)
    at AtomiqService.initialize (atomiq.ts:53:30)
```

### Error Location

The error happens when:

1. `SwapperFactory` is successfully created
2. `Factory.newSwapper()` is called with configuration
3. SDK attempts to initialize `StarknetBtcRelay` contract
4. Contract ABI parsing fails with `undefined.find()` error

### Code That Fails

```typescript
import { SwapperFactory, BitcoinNetwork } from "@atomiqlabs/sdk";
import { StarknetInitializer } from "@atomiqlabs/chain-starknet";

const Factory = new SwapperFactory([StarknetInitializer] as const);
console.log("✅ Factory created"); // This works
console.log("Factory.Tokens:", Factory.Tokens); // This exists

// THIS FAILS:
const swapper = Factory.newSwapper({
  chains: {
    STARKNET: {
      rpcUrl: "https://starknet-sepolia.g.alchemy.com/v2/[KEY]",
    },
  },
  bitcoinNetwork: BitcoinNetwork.TESTNET, // Value: 1
});
```

### Configuration Used

```typescript
{
  chains: {
    STARKNET: {
      rpcUrl: "https://starknet-sepolia.g.alchemy.com/v2/A7uy7yxUkDxDje-8thlzv7LNcwsFEAki"
    }
  },
  bitcoinNetwork: 1 // BitcoinNetwork.TESTNET
}
```

---

## 🔍 Research Questions

### **Priority 1: Root Cause Analysis**

1. **What is the exact cause of the `undefined.find()` error?**

   - What ABI/contract data is the SDK trying to access?
   - Is the SDK making RPC calls to fetch contract ABIs?
   - Are the Atomiq contracts deployed on Starknet Sepolia testnet?

2. **Which Starknet network does Atomiq SDK support?**

   - Mainnet only?
   - Goerli (deprecated)?
   - Sepolia (current testnet)?
   - Multiple networks?

3. **What is `StarknetBtcRelay`?**
   - Is this a deployed contract or a local ABI?
   - What is the expected contract address on testnet/mainnet?
   - Is this related to the actual Bitcoin relay bridge?

### **Priority 2: Configuration & Requirements**

4. **Is additional configuration required?**

   - Contract addresses?
   - Network IDs?
   - Additional RPC parameters?
   - Provider configuration (e.g., starknet.js Account instance)?

5. **Are there browser-specific requirements?**

   - Node.js polyfills needed?
   - WASM support required?
   - Wallet connection needed before SDK init?
   - Specific Vite/bundler configuration?

6. **What are the correct package versions?**
   - Is `@atomiqlabs/sdk` v6.0.3 compatible with Sepolia?
   - Is `@atomiqlabs/chain-starknet` v5.1.5 the right version?
   - Are there known compatibility issues with `starknet` v8.5.4?

### **Priority 3: Working Examples & Documentation**

7. **Are there working browser examples?**

   - Official Atomiq demo applications?
   - Community examples using the SDK?
   - Example repositories on GitHub?

8. **What does the official documentation say?**

   - Initialization guide for browser environments?
   - Testnet vs mainnet configuration?
   - Required vs optional parameters?
   - Known issues or limitations?

9. **Has anyone else encountered this error?**
   - GitHub issues in Atomiq repositories?
   - Discord/Telegram discussions?
   - Stack Overflow questions?
   - Twitter/X posts from developers?

### **Priority 4: Alternative Solutions**

10. **Are there alternative approaches?**

    - Different Atomiq SDK versions?
    - Alternative Bitcoin-Starknet bridge protocols?
    - Server-side proxy for SDK operations?
    - Direct contract interaction without SDK?

11. **What's the minimum viable integration?**
    - Can we use Atomiq for mainnet only and mock testnet?
    - Can we use a hosted API instead of browser SDK?
    - Are there simpler Bitcoin bridge options?

---

## 📚 Research Sources

### Official Documentation

- [ ] https://docs.atomiq.io/ - Main documentation
- [ ] https://docs.atomiq.io/sdk/ - SDK-specific docs
- [ ] https://docs.atomiq.io/developers/ - Developer guides
- [ ] https://docs.atomiq.io/api/ - API reference

### Code Repositories

- [ ] https://github.com/AtomiqLabs - Organization repos
- [ ] Search for: `@atomiqlabs/sdk` GitHub repositories
- [ ] Search for: `StarknetBtcRelay` in Atomiq repos
- [ ] Look for example apps, demos, or integration tests

### Community Resources

- [ ] Atomiq Discord server (if accessible)
- [ ] Atomiq Twitter/X for announcements
- [ ] Starknet Discord #builders channel
- [ ] Reddit r/StarkNet discussions

### Technical Forums

- [ ] GitHub Issues: `@atomiqlabs/sdk` repository
- [ ] GitHub Issues: `@atomiqlabs/chain-starknet` repository
- [ ] Stack Overflow: `[atomiq]` or `[atomiq-labs]` tags
- [ ] Starknet Forum: Bridge/swap discussions

### Package Information

- [ ] npm: `@atomiqlabs/sdk` - check version history, peer dependencies
- [ ] npm: `@atomiqlabs/chain-starknet` - check changelog
- [ ] Check for beta/alpha versions with testnet support

---

## 🎯 Desired Outcomes

### Research Report Should Include:

1. **Root Cause Identification**

   - Clear explanation of why the error occurs
   - Whether it's a configuration issue, incompatibility, or bug

2. **Solution Path (if exists)**

   - Step-by-step configuration changes needed
   - Code examples of correct implementation
   - Any missing dependencies or polyfills

3. **Network Compatibility Matrix**

   - Table showing which networks are supported
   - Mainnet vs testnet availability
   - Contract deployment status

4. **Working Reference Implementation**

   - Link to working example code
   - Or: proof that browser integration is not yet supported

5. **Alternative Recommendations**

   - If Atomiq SDK doesn't work in browser/testnet
   - Other Bitcoin-Starknet bridge protocols
   - Workaround strategies (mock, server-side, etc.)

6. **Timeline & Feasibility Assessment**
   - Is this fixable within 1-2 days?
   - Does it require Atomiq team support?
   - Should we proceed with alternatives?

---

## 🚨 Critical Context

### Hackathon Constraints

- **Timeline**: Need working demo soon (hackathon context)
- **Alternatives**: Can mock Bitcoin integration if necessary
- **Core Features**: Game + ZK proofs already working
- **Nice-to-Have**: Real Bitcoin integration (not critical path)

### Decision Factors

If research finds:

- ✅ **Quick fix** (< 2 hours): Implement immediately
- ⚠️ **Moderate fix** (2-8 hours): Evaluate vs alternatives
- ❌ **Major blocker** (> 8 hours or needs SDK update): Mock for demo

---

## 📊 Research Deliverables

Please provide:

### 1. Executive Summary (2-3 paragraphs)

- What's causing the error?
- Is it fixable?
- Recommended action

### 2. Technical Analysis

- Detailed explanation of the issue
- SDK architecture relevant to the error
- Network/contract deployment status

### 3. Solution (if available)

- Step-by-step implementation guide
- Code snippets
- Configuration changes
- Expected behavior after fix

### 4. Alternatives (if solution not viable)

- Other bridge protocols
- Mock implementation strategy
- Workaround options

### 5. Resources & References

- Links to relevant documentation
- Example code repositories
- Community discussions
- Contact information for support

---

## ⏰ Priority

**HIGH** - This is blocking Bitcoin integration testing for a hackathon project.

However, the core game functionality works, so this is not critical path. If no quick solution exists, we'll mock the integration and document it as future work.

---

## 🔖 Additional Notes

### Environment Details

- **Node.js**: Not applicable (browser-only)
- **Vite**: v6.x with React plugin
- **Browser**: Chrome/Brave (latest)
- **Polyfills Added**: `global: 'globalThis'` in Vite config

### Already Tried

- ✅ Added `global` polyfill for Node.js globals
- ✅ Verified RPC URL works (Alchemy Sepolia)
- ✅ Confirmed Factory instantiation succeeds
- ✅ Confirmed `Factory.Tokens` property exists
- ✅ Used correct `BitcoinNetwork.TESTNET` enum value
- ❌ Cannot get past `newSwapper()` call

### Not Yet Tried

- Different Starknet networks (Goerli, mainnet)
- Different Atomiq SDK versions
- Server-side SDK initialization
- Direct contract calls without SDK

---

## 📧 Follow-Up Questions

After reviewing the research, we'll need to decide:

1. Implement the fix (if quick)?
2. Mock the integration for demo?
3. Switch to alternative protocol?
4. Seek direct support from Atomiq team?

---

**Thank you for investigating this!** The findings will directly inform our hackathon strategy and implementation approach.
