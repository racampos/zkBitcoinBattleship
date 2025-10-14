# 🚀 Production Deployment Success

**Date:** October 14, 2025  
**Status:** ✅ **LIVE AND FUNCTIONAL**

This document captures the successful deployment of the ZK Bitcoin Battleship game from local development to a fully functional production environment.

---

## 🌐 Production URLs

| Component | URL | Status |
|-----------|-----|--------|
| **Frontend** | https://zk-bitcoin-battleship.vercel.app | ✅ Live |
| **Torii Indexer** | https://praxys.academy | ✅ Live (HTTPS + gRPC) |
| **Starknet Network** | Sepolia Testnet | ✅ Active |
| **Bitcoin Network** | Testnet3 | ✅ Active |
| **World Contract** | `0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69` | ✅ Deployed |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        PLAYERS                               │
│           (Browser, Cartridge Wallet, Xverse)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│         https://zk-bitcoin-battleship.vercel.app            │
│  - React + Vite + Dojo SDK                                  │
│  - Cartridge Controller Integration                          │
│  - Atomiq SDK for BTC ↔ WBTC swaps                         │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             │ HTTPS (GraphQL)      │ RPC (Alchemy)
             ▼                      ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│   AWS EC2 (Torii)       │  │   Starknet Sepolia           │
│   https://praxys.academy│  │   (via Alchemy RPC)          │
│  - Dojo Indexer         │  │  - World contract            │
│  - GraphQL API          │  │  - Game contracts            │
│  - gRPC subscriptions   │  │  - Escrow contract           │
│  - Nginx reverse proxy  │  │  - WBTC (Vesu) contract     │
└─────────────────────────┘  └──────────────────────────────┘
             │                      ▲
             │ Indexing             │ Write transactions
             └──────────────────────┘
             
┌─────────────────────────────────────────────────────────────┐
│                 Atomiq Network                               │
│        (BTC Testnet3 ↔ Starknet Sepolia)                   │
│  - Intermediary nodes for cross-chain swaps                 │
│  - PSBT signing for Bitcoin deposits                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Critical Fixes That Made It Work

### 1. **RPC Provider Compatibility** (Most Critical)
**Problem:** Atomiq SDK failed with "No intermediary found!" on Vercel  
**Root Cause:** Cartridge RPC doesn't support `block_id: "pending"` for `starknet_call`  
**Fix:** Changed `VITE_STARKNET_RPC_URL` from Cartridge to Alchemy RPC  
**Impact:** Atomiq can now verify intermediary signatures ✅

```typescript
// atomiq.ts - Line 58
const starknetRpc = new RpcProvider({
  nodeUrl: import.meta.env.VITE_STARKNET_RPC_URL, // Must support "pending" blocks
});
```

**Environment Variable:**
```bash
VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/A7uy7yxUkDxDje-8thlzv7LNcwsFEAki
```

---

### 2. **Cartridge Controller Security Headers**
**Problem:** Cartridge Controller failed to connect with `"Cannot delete property 'dispose' of function Symbol()"`  
**Root Cause:** Overly strict COEP/COOP headers blocked iframe/popup communication  
**Fix:** Removed `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` from `vercel.json`  
**Impact:** Cartridge Controller can now authenticate and sign transactions ✅

```json
// vercel.json - Removed these headers:
// "Cross-Origin-Embedder-Policy": "require-corp"  ❌
// "Cross-Origin-Opener-Policy": "same-origin"      ❌
```

---

### 3. **Nginx Configuration for gRPC Streaming**
**Problem:** `ERR_INCOMPLETE_CHUNKED_ENCODING` on gRPC subscriptions  
**Root Cause:** Nginx default timeout (60s) was too short for long-lived gRPC streams  
**Fix:** Increased timeouts and disabled buffering in Nginx config  
**Impact:** Real-time game updates work reliably ✅

```nginx
# /etc/nginx/sites-available/torii
location / {
    proxy_pass http://localhost:8081;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Critical for gRPC streaming
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
    proxy_cache off;
}
```

---

### 4. **HTTP Polling as Backup**
**Problem:** gRPC subscriptions sometimes fail silently  
**Fix:** Always run HTTP polling (every 5 seconds) in parallel with gRPC  
**Impact:** Game state updates even if gRPC dies ✅

```typescript
// useGameState.ts
// ALWAYS start HTTP polling as backup (even if gRPC works)
pollingInterval = setInterval(() => {
  fetchGameState();
}, 5000);

// Try gRPC for real-time updates (best effort)
try {
  subscription = sdk.subscribeEntityQuery(...);
} catch (err) {
  console.warn("⚠️ gRPC subscription failed (HTTP polling will continue):", err);
}
```

---

### 5. **Torii URL Centralization**
**Problem:** Frontend was querying different Torii ports (8080 vs 8081)  
**Fix:** Created `toriiUrl.ts` utility for environment-aware URL management  
**Impact:** GraphQL queries and gRPC subscriptions use correct endpoints ✅

```typescript
// apps/client/src/utils/toriiUrl.ts
export const getToriiGraphQLUrl = () => {
  const baseUrl = import.meta.env.VITE_TORII_URL || "http://localhost:8081";
  if (baseUrl.includes("localhost:8081")) {
    return "/torii-graphql"; // Use Vite proxy in dev
  }
  const url = new URL(baseUrl);
  url.pathname = "/graphql";
  return url.toString(); // Direct query in production
};
```

---

### 6. **React Version Downgrade**
**Problem:** `npm install` failed on Vercel with React 19 peer dependency conflicts  
**Fix:** Downgraded React from 19.2.0 to 18.3.1 + added `.npmrc` with `legacy-peer-deps=true`  
**Impact:** Vercel builds succeed ✅

```json
// package.json
"react": "^18.3.1",
"react-dom": "^18.3.1"
```

```
// .npmrc
legacy-peer-deps=true
```

---

### 7. **Default Entry Point**
**Problem:** Vercel loaded vanilla JS version instead of React app  
**Fix:** Renamed `game-react.html` → `index.html` and moved old `index.html` → `vanilla-version.html`  
**Impact:** React app is now the default ✅

---

### 8. **Vesu WBTC Token Identifier**
**Problem:** Atomiq SDK couldn't find liquidity for WBTC on Sepolia  
**Fix:** Used `_TESTNET_WBTC_VESU` token identifier instead of hardcoding addresses  
**Impact:** BTC → WBTC swaps work on testnet ✅

```typescript
// atomiq.ts
const isMainnet = import.meta.env.VITE_STARKNET_RPC_URL?.includes('mainnet');
const toToken = isMainnet
  ? (this.factory as any).Tokens.STARKNET.WBTC
  : (this.factory as any).Tokens.STARKNET._TESTNET_WBTC_VESU;
```

---

## ✅ Features Confirmed Working (Production)

### Core Gameplay
- [x] **Cartridge Controller** connection and authentication
- [x] **Game creation** (on-chain transaction)
- [x] **Game joining** (via invite URL)
- [x] **WBTC staking** (approve + stake flow)
- [x] **Board commitment** (with hash generation)
- [x] **Shot firing** (with turn validation)
- [x] **Proof application** (defender responds to shots)
- [x] **Hit/Miss detection** (with UI feedback)
- [x] **Real-time updates** (gRPC + HTTP polling)
- [x] **Board state persistence** (localStorage + blockchain)
- [x] **Remote multiplayer** (tested between two homes)

### Technical Features
- [x] **V3 transactions** (resource bounds + tips)
- [x] **Account deployment** (automatic on first tx)
- [x] **Retry logic** for race conditions (NOT_YOUR_TURN, WRONG_SHOOTER)
- [x] **Board restoration** after page reload
- [x] **Game state recovery** from blockchain
- [x] **Defense board tracking** (both hits and misses)

### Infrastructure
- [x] **Vercel deployment** (React + Vite)
- [x] **AWS EC2 Torii** (with systemd service)
- [x] **Nginx HTTPS** (with Let's Encrypt)
- [x] **gRPC streaming** (long-lived connections)
- [x] **CORS configuration** (cross-origin requests)

---

## 🧪 Remaining Tests Needed

### High Priority
- [ ] **BTC Deposit Flow** (Xverse → PSBT → Atomiq → WBTC)
  - Test full onboarding for new players
  - Verify 10,000 sats deposit from Xverse wallet
  - Confirm WBTC balance updates on Starknet
  - Check transaction confirmation UI (20-minute flow)

- [ ] **Game Ending & Prize Distribution**
  - Play a complete match (sink all ships)
  - Verify winner gets VICTORY banner + confetti
  - Verify loser gets DEFEAT banner
  - **Critical:** Confirm winner receives full escrow (2x stake)
  - Verify WBTC balances update correctly for both players

### Medium Priority
- [ ] **Game abandonment** (timeout scenarios)
- [ ] **Multiple concurrent games** (same player)
- [ ] **Network interruption recovery** (close tab, reopen)
- [ ] **Mobile browser compatibility** (responsive design)

### Low Priority
- [ ] **Analytics** (player statistics, game history)
- [ ] **Leaderboard** (win/loss tracking)
- [ ] **Spectator mode** (watch ongoing games)

---

## 📊 Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Frontend Load Time** | ~2-3s | ✅ Good |
| **Cartridge Connect Time** | ~3-5s | ✅ Good |
| **Transaction Confirmation** | ~10-30s | ✅ Expected (Starknet) |
| **gRPC Update Latency** | <1s | ✅ Excellent |
| **HTTP Polling Interval** | 5s | ✅ Adequate |
| **Torii Indexing Lag** | ~2-5s | ✅ Good |
| **Vercel Build Time** | ~2min | ✅ Good |

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18.3.1 + Vite 6.0.11
- **Styling:** Custom CSS (modern, dark theme)
- **State Management:** Zustand (game state store)
- **Blockchain SDK:** Dojo SDK 1.7.6
- **Wallet Integration:** Cartridge Controller 0.6.3
- **Bitcoin Wallet:** Xverse (PSBT signing)
- **Cross-Chain:** Atomiq SDK 0.3.4

### Backend / Infrastructure
- **Indexer:** Torii (Dojo) on AWS EC2 (Ubuntu 24.04 LTS)
- **Web Server:** Nginx 1.24+ (reverse proxy + SSL)
- **SSL:** Let's Encrypt (Certbot)
- **Blockchain:** Starknet Sepolia (via Alchemy RPC)
- **Bitcoin:** Testnet3 (for on-chain deposits)
- **Deployment:** Vercel (frontend), AWS EC2 (Torii)

### Smart Contracts
- **Framework:** Dojo 1.0.11 (Cairo)
- **Network:** Starknet Sepolia Testnet
- **World Address:** `0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69`
- **Escrow Contract:** `0xfc378fb3dc5c81094e305ef23099d3c7fbd7305ce0998c2e80df4792056b30`
- **WBTC Contract:** `0x04861ba938aed21f2cd7740acd3765ac4d2974783a3218367233de0153490cb6` (Vesu)

---

## 🎓 Key Learnings

### 1. **RPC Provider Matters**
Not all Starknet RPC providers are equal. Features like `"pending"` block support vary by provider. Always test with your production RPC before deploying.

### 2. **gRPC + HTTP Polling = Resilience**
Never rely solely on gRPC for real-time updates. Always run HTTP polling as a backup to handle silent gRPC failures.

### 3. **Security Headers Can Break Integrations**
Strict COEP/COOP headers may break third-party iframe/popup integrations (like Cartridge Controller). Test thoroughly before enabling.

### 4. **Nginx Tuning for Long-Lived Connections**
Default Nginx timeouts (60s) are too short for gRPC streaming. Increase timeouts and disable buffering for reliable connections.

### 5. **Environment-Aware Configuration**
Use environment variables for ALL environment-specific values (RPC URLs, Torii URLs, token contracts). This prevents hardcoded addresses from breaking across networks.

### 6. **Torii Deployment is Non-Trivial**
Running your own Torii requires:
- Modern OS (Ubuntu 24.04+ for GLIBC 2.38)
- Proper security groups (ports 80, 443, 8081)
- Nginx reverse proxy for HTTPS
- Systemd service for auto-restart
- Regular monitoring

### 7. **Atomic SDK Token Identifiers**
Don't hardcode token addresses when using Atomiq. Use the SDK's token identifiers (e.g., `_TESTNET_WBTC_VESU`) for proper liquidity routing.

---

## 📝 Environment Variables (Production)

### Vercel (Frontend)
```bash
VITE_TORII_URL=https://praxys.academy
VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/A7uy7yxUkDxDje-8thlzv7LNcwsFEAki
VITE_BITCOIN_NETWORK=testnet
```

### AWS EC2 (Torii)
```toml
# /root/BitcoinShip/chain/dojo/torii.toml
world_address = "0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69"
rpc = "https://api.cartridge.gg/x/starknet/sepolia"
start_block = 0
database_dir = ".torii_db_sepolia"
manifest_path = "../apps/client/src/dojo/manifest_sepolia.json"

[server]
port = 8081
host = "0.0.0.0"
```

---

## 🔗 Related Documentation

- [AWS Torii Setup](./AWS_TORII_SETUP.md) - Complete AWS EC2 deployment guide
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Frontend deployment instructions
- [Pre-Deployment Checklist](./PRE_DEPLOYMENT_CHECKLIST.md) - Testing checklist
- [Deployment Overview](./DEPLOYMENT.md) - General deployment strategy

---

## 🏆 Achievements Unlocked

- ✅ **Zero to Production** in <1 week
- ✅ **Cross-Chain Integration** (BTC ↔ Starknet)
- ✅ **Real-Time Multiplayer** over the internet
- ✅ **Self-Hosted Infrastructure** (AWS + Vercel)
- ✅ **Production-Ready UX** (wallet integration, staking, gameplay)
- ✅ **Resilient Architecture** (gRPC + polling, retry logic)

---

## 🚀 Next Steps

1. **Test BTC Deposit Flow** with a real user
2. **Test Game Ending** and verify prize distribution
3. **Add Analytics** (Google Analytics / Plausible)
4. **Add Monitoring** (Sentry for errors, Uptime Robot for availability)
5. **Optimize Performance** (code splitting, lazy loading)
6. **Add Social Features** (game history, player profiles)
7. **Marketing** (demo video, Twitter announcement)

---

## 🎮 Try It Yourself

**Live App:** https://zk-bitcoin-battleship.vercel.app

**How to Play:**
1. Connect your Cartridge wallet
2. Deposit 10,000 sats from Xverse (or use a pre-funded account)
3. Create or join a game
4. Stake WBTC (1000 sats per match)
5. Commit your ship placement
6. Take turns firing shots
7. Sink all opponent ships to win the staked WBTC!

---

## 📧 Contact

**Project:** ZK Bitcoin Battleship  
**Network:** Starknet Sepolia Testnet  
**Status:** ✅ Production Ready (Testnet)  
**Last Updated:** October 14, 2025

---

**Built with ❤️ using Dojo, Starknet, and Bitcoin**

