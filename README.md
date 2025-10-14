# ⚓ ZK Bitcoin Battleship

> **A fully on-chain multiplayer Battleship game on Starknet with Bitcoin staking**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-zk--bitcoin--battleship.vercel.app-blue)](https://zk-bitcoin-battleship.vercel.app)
[![Network](https://img.shields.io/badge/Network-Starknet%20Sepolia-purple)](https://sepolia.voyager.online/)
[![Framework](https://img.shields.io/badge/Framework-Dojo%201.0.11-orange)](https://www.dojoengine.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

**Play classic Battleship with real Bitcoin stakes, powered by Starknet's provable game engine.**

---

## 🎮 What is ZK Bitcoin Battleship?

ZK Bitcoin Battleship is a **fully on-chain multiplayer game** that brings the classic Battleship experience to Web3 with:

- 🪙 **Bitcoin Staking** - Deposit BTC, stake WBTC, winner takes all
- 🔐 **Zero-Knowledge Proofs** - Hide your board, prove hits/misses (coming soon)
- ⚡ **Real-Time Gameplay** - Instant turn updates via gRPC subscriptions
- 🎯 **Provably Fair** - All game logic enforced on-chain (Starknet)
- 🌐 **Cross-Chain** - BTC (Testnet3) ↔ WBTC (Starknet Sepolia) via Atomiq

**[🎮 Play Now](https://zk-bitcoin-battleship.vercel.app)** | **[📚 Full Documentation](./docs/)** | **[🔍 View Contracts](https://sepolia.voyager.online/contract/0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69)**

---

## ✨ Key Features

### 🎲 Core Gameplay

- **Create & Join Games** - Open game creation with invite links
- **Board Setup** - Place 5 ships on a 10x10 grid (Carrier, Battleship, Cruiser, Submarine, Destroyer)
- **Turn-Based Combat** - Fire shots, respond with proofs, sink enemy ships
- **Win Detection** - Automatic victory when all opponent ships are destroyed
- **Escrow System** - Secure WBTC staking with automatic prize distribution

### 💰 Bitcoin Integration

- **BTC Deposits** - Deposit Bitcoin from Xverse wallet via PSBT signing
- **Atomiq Swaps** - Automatic BTC → WBTC conversion on Starknet
- **WBTC Staking** - 1000 sats (0.00001 BTC) per match
- **Winner Takes All** - 2x stake (2000 sats) automatically sent to winner

### 🔧 Technical Highlights

- **Dojo Engine** - ECS-based on-chain game framework
- **Cartridge Controller** - Seamless Starknet account management
- **Account Abstraction** - Automatic deployment on first transaction
- **gRPC + HTTP Polling** - Resilient real-time state updates
- **Board Persistence** - localStorage + blockchain for state recovery

---

## 🛠️ Built With

This project showcases integration with cutting-edge blockchain technologies:

### Core Framework
- **[Dojo Engine](https://www.dojoengine.org/)** - On-chain game framework for Starknet
- **[Starknet](https://www.starknet.io/)** - Layer 2 scaling solution with Cairo

### Wallets & Accounts
- **[Cartridge Controller](https://cartridge.gg/)** - Starknet wallet with session keys and game-optimized UX
- **[Xverse](https://www.xverse.app/)** - Bitcoin wallet for PSBT signing and BTC deposits

### Cross-Chain & Bitcoin
- **[Atomiq](https://atomiq.exchange/)** - Trustless BTC ↔ Starknet swap protocol
- Bitcoin Testnet3 - For real BTC deposits and testing

### Zero-Knowledge Proofs
- **[Noir](https://noir-lang.org/)** - ZK-SNARK circuit language by Aztec
- **[Garaga](https://github.com/keep-starknet-strange/garaga)** - Cairo verifier generator for Starknet
- Barretenberg - Aztec's proving backend

### Development Tools
- React 18 + Vite - Modern frontend framework
- Vercel - Frontend hosting and deployment
- AWS EC2 - Torii indexer hosting

**Special Thanks:** Atomiq team for Telegram support, Dojo community for debugging help, Garaga maintainers for v0.18.1 bug fix.

---

## 🏆 Achievements

### Production Deployment

✅ **Fully Functional Live Game**

- Frontend: [zk-bitcoin-battleship.vercel.app](https://zk-bitcoin-battleship.vercel.app)
- Torii Indexer: [praxys.academy](https://praxys.academy) (AWS EC2 + HTTPS)
- Successfully tested with remote multiplayer (two players from different locations)

✅ **Complete Bitcoin-to-Starknet Integration**

- BTC Testnet3 deposits working
- Atomiq SDK integration for cross-chain swaps
- WBTC staking and escrow system operational
- Automatic prize distribution to winner

✅ **Production-Ready Infrastructure**

- **Frontend (Vercel):** React app with optimized build, automatic GitHub deployments, and HTTPS
- **Indexer (AWS EC2):** Torii for blockchain indexing with Nginx reverse proxy, SSL (Let's Encrypt), and gRPC streaming
- **Real-Time Updates:** gRPC subscriptions with HTTP polling fallback for maximum resilience

### Technical Milestones

✅ **Zero-Knowledge Proof System** (50% Complete)

- Noir circuits implemented and tested (21/21 tests passing)
- Garaga Cairo verifiers generated (1.2MB contracts)
- Complete offline proof generation pipeline
- Currently disabled due to 10-30s proof times (see [ZK Status](#-zero-knowledge-proofs-status))

✅ **Smart Contract System** (100% Complete)

- 7 Cairo contract systems (game management, board commit, gameplay, proof verify, escrow, timeout)
- Comprehensive game state models
- Robust error handling and validation
- Deployed on Starknet Sepolia

---

## 🎯 Design Decisions

### Why Starknet?

- **Cairo Language** - Native support for provable computation
- **Dojo Framework** - Purpose-built for on-chain games (ECS architecture)
- **Account Abstraction** - Seamless UX (no manual deployment)
- **Low Fees** - Affordable on-chain game state storage

### Why Bitcoin Staking?

- **Neutral Money** - Bitcoin is the most trusted and widely held cryptocurrency
- **Cross-Chain Innovation** - Demonstrates Starknet's interoperability
- **Real Stakes** - Gives the game real-world value and incentives
- **Atomiq Protocol** - Enables trustless BTC ↔ Starknet swaps

### Why Mock Proofs (For Now)?

**ZK proofs are fully implemented but disabled for UX:**

| Aspect              | Real ZK Proofs     | Mock Proofs (Current) |
| ------------------- | ------------------ | --------------------- |
| **Privacy**         | ✅ Complete        | ❌ Honor system       |
| **Security**        | ✅ Cryptographic   | ❌ Trust-based        |
| **UX**              | ❌ 10-30s waits    | ✅ Instant            |
| **Deployment Cost** | ❌ 1.2MB contracts | ✅ Minimal            |

**Decision:** Prioritize UX for MVP, activate ZK when proof generation drops to <3 seconds.

**Future:** Hybrid mode (real ZK for high-stakes games, mock for casual play).

---

## 🔐 Zero-Knowledge Proofs Status

### ✅ What's Complete

- **Noir Circuits** (21/21 tests passing)

  - `BoardCommit`: Validates board placement + generates commitment
  - `ShotResult`: Proves hit/miss without revealing board
  - Both use Poseidon2 hashing (Starknet-optimized)

- **Cairo Verifiers** (Generated with Garaga)

  - `battleship_board_commit_verifier/` (1.2MB contract)
  - `battleship_shot_result_verifier/` (1.2MB contract)

- **Proof Generation** (Tested offline)
  - Full workflow: Noir → Barretenberg → Garaga → Calldata
  - 16KB proofs expand to 2997 felt252 values for Starknet

### ⏸️ Why Not Currently Enabled

**Critical Issue:** Proof generation takes **10-30 seconds** in browser, creating unacceptable UX for real-time multiplayer.

**Impact:**

- Board commitment: 10-30s wait
- Each shot response: 10-30s wait
- Total match time: 60-120+ seconds of pure waiting

**Alternative:** Game uses instant mock verification to prioritize gameplay experience. See full ZK implementation details in [docs/deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md](./docs/deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md#-zero-knowledge-proofs-garaga-integration)

---

## 🛠️ Technology Stack

### Frontend

- **Framework:** React 18.3.1 + Vite 6.0.11
- **Blockchain SDK:** Dojo SDK 1.7.6
- **Wallet:** Cartridge Controller 0.6.3
- **Bitcoin Wallet:** Xverse (PSBT signing)
- **Cross-Chain:** Atomiq SDK 0.3.4
- **State Management:** Zustand
- **Styling:** Custom CSS (dark theme)

### Smart Contracts

- **Framework:** Dojo 1.0.11 (Cairo)
- **Network:** Starknet Sepolia Testnet
- **World Address:** `0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69`
- **Escrow Contract:** `0xfc378fb3dc5c81094e305ef23099d3c7fbd7305ce0998c2e80df4792056b30`
- **WBTC Contract:** `0x04861ba938aed21f2cd7740acd3765ac4d2974783a3218367233de0153490cb6` (Vesu)

### Infrastructure

- **Frontend Hosting:** Vercel
- **Indexer:** Torii (Dojo) on AWS EC2 (Ubuntu 24.04 LTS)
- **Web Server:** Nginx 1.24+ (reverse proxy + SSL)
- **SSL:** Let's Encrypt (Certbot)
- **RPC:** Alchemy (Starknet Sepolia)
- **Bitcoin:** Testnet3

### Zero-Knowledge (Ready but Disabled)

- **Circuits:** Noir v1.0.0-beta.5
- **Proving:** Barretenberg v0.87.4-starknet.1
- **Verifier Generator:** Garaga v0.18.1
- **Hash Function:** Poseidon2 (Starknet-optimized)

---

## 🚀 Quick Start

### Prerequisites

Install the required tooling:

```bash
# Rust & Cairo
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh

# Dojo toolchain
curl -L https://install.dojoengine.org | bash
dojoup

# Node.js (v18+)
nvm install 18
npm install -g pnpm
```

### Local Development

```bash
# 1) Install dependencies
cd chain/dojo
sozo build

# 2) Terminal A: Start Katana (local dev network)
katana --dev

# 3) Terminal B: Migrate contracts
sozo migrate
export WORLD_ADDR=<address_from_migration>

# 4) Terminal C: Start Torii (indexer)
torii --world $WORLD_ADDR

# 5) Terminal D: Start client
cd ../../apps/client
pnpm install
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000) to play!

**For detailed setup:** See [INSTALL_GUIDE.md](./INSTALL_GUIDE.md)

---

## 📁 Project Structure

```
zkBitcoinBattleship/
├── apps/
│   ├── client/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/        # Game UI components
│   │   │   ├── hooks/             # React hooks for contracts
│   │   │   ├── services/          # Atomiq integration
│   │   │   ├── store/             # Zustand state management
│   │   │   └── utils/             # Helper functions
│   │   └── vercel.json            # Vercel deployment config
│   └── server/                    # Optional backend (unused)
│
├── chain/
│   ├── dojo/                      # Dojo world
│   │   ├── src/
│   │   │   ├── models/            # Game state models
│   │   │   ├── systems/           # Game logic systems
│   │   │   └── helpers/           # Contract helpers
│   │   ├── torii.toml             # Torii indexer config
│   │   ├── dojo_sepolia.toml      # Sepolia deployment config
│   │   └── manifest_sepolia.json  # Deployed contract manifest
│   └── scripts/                   # Deployment & testing scripts
│
├── battleship_board_commit_verifier/  # Garaga ZK verifier (board)
├── battleship_shot_result_verifier/   # Garaga ZK verifier (shot)
│
├── zk/
│   ├── circuits/                  # Noir ZK circuits
│   │   ├── board_commit/          # Board validation circuit
│   │   ├── shot_result/           # Shot proof circuit
│   │   ├── README.md              # Circuit specs
│   │   └── TESTING.md             # Testing guide
│   └── ZK_INTEGRATION_STATUS.md   # ZK implementation status
│
├── docs/                          # All documentation
│   ├── deployment/                # Deployment guides
│   ├── development/               # Dev session notes
│   ├── integrations/              # External service docs
│   ├── debugging/                 # Troubleshooting guides
│   ├── migrations/                # Refactoring docs
│   └── README.md                  # Documentation index
│
├── README.md                      # This file
├── PRD.md                         # Product requirements
└── INSTALL_GUIDE.md               # Detailed setup instructions
```

---

## 🧪 Testing

### ZK Circuits

```bash
cd zk/circuits/board_commit && nargo test  # 10/10 tests passing
cd ../shot_result && nargo test            # 11/11 tests passing
```

### Cairo Contracts

```bash
cd chain/dojo && sozo test
```

### Frontend

```bash
cd apps/client && pnpm test
```

---

## 🚢 Deployment

The game is deployed across multiple services:

- **Frontend:** Vercel (automatic deployment from GitHub)
- **Torii Indexer:** AWS EC2 (systemd service)
- **Contracts:** Starknet Sepolia (sozo migrate)

**For complete deployment guide:** See [docs/deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md](./docs/deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md)

**Quick deployment links:**

- [AWS Torii Setup](./docs/deployment/AWS_TORII_SETUP.md)
- [Vercel Deployment](./docs/deployment/VERCEL_DEPLOYMENT.md)
- [Pre-Deployment Checklist](./docs/deployment/PRE_DEPLOYMENT_CHECKLIST.md)

---

## 📚 Documentation

### For Judges & Evaluators

**Start with these 4 documents:**

1. **[This README](./README.md)** - Project overview (you are here)
2. **[Production Deployment Success](./docs/deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md)** - Complete deployment journey
3. **[ZK Integration Status](./zk/ZK_INTEGRATION_STATUS.md)** - Technical depth (ZK implementation)
4. **[PRD](./PRD.md)** - Original vision and goals

### For Developers

- **[Documentation Index](./docs/README.md)** - All documentation organized by category
- **[Installation Guide](./INSTALL_GUIDE.md)** - Detailed setup instructions
- **[Circuit README](./zk/circuits/README.md)** - ZK circuit specifications
- **[Atomiq Integration](./docs/integrations/atomiq/)** - Cross-chain integration journey

---

## 🎯 Roadmap

### ✅ Completed (v1.0 - Testnet)

- [x] Full game logic (7 contract systems)
- [x] React UI with Cartridge Controller
- [x] Bitcoin deposit via Atomiq SDK
- [x] WBTC staking and escrow
- [x] Real-time multiplayer (gRPC + HTTP)
- [x] Board state persistence
- [x] Production deployment (Vercel + AWS)
- [x] ZK circuits implemented (21/21 tests)
- [x] Cairo verifiers generated

### 🚧 In Progress

- [ ] ZK proof client integration (bb.js)
- [ ] Server-side proving service
- [ ] Mobile responsive design
- [ ] Game history & analytics

### 🔮 Future Enhancements

- [ ] Mainnet deployment
- [ ] Tournament mode
- [ ] Spectator mode
- [ ] Leaderboard & rankings
- [ ] Lightning Network integration (instant deposits)
- [ ] Ship customization & NFTs
- [ ] Multiple game modes (fog of war, power-ups)

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

---

**Built with ❤️ for the Starknet Hackathon**

🎮 [Play Now](https://zk-bitcoin-battleship.vercel.app) | 📚 [Documentation](./docs/) | 🔍 [View on Explorer](https://sepolia.voyager.online/contract/0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69)
