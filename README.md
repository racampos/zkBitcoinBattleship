# ZK Battleship on Starknet

> Provably fair, Bitcoin-friendly, on-chain Battleship using Dojo + Noir ZK proofs + Cartridge Controller

## 🚀 Quick Start

### Prerequisites

Before starting, install the required tooling:

```bash
# Rust & Cairo
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
curl --proto '=https' --tlsv1.2 -sSf https://docs.starknet.io/quick_start/install.sh | sh

# Dojo toolchain
curl -L https://install.dojoengine.org | bash
dojoup

# Node.js (v18+)
nvm install 18
npm install -g pnpm

# Noir for ZK circuits
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

### Day-1 Boot Sequence

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
torii --world $WORLD_ADDR --database-url sqlite://torii.db

# 5) Set up client
cd ../../apps/client
pnpm install
pnpm dev
```

## 📁 Project Structure

```
BitcoinShip/
├── apps/
│   ├── client/          # React + Three.js frontend
│   └── server/          # Optional backend services
├── chain/
│   ├── dojo/            # Dojo world (models + systems)
│   ├── verifiers/       # Garaga-generated Cairo verifiers
│   └── scripts/         # Deployment scripts
├── zk/
│   ├── circuits/        # Noir ZK circuits
│   │   ├── board_commit/
│   │   └── shot_result/
│   └── golden/          # Golden test vectors
└── docs/                # Documentation

```

## 🎯 Development Phases

1. **Week 1, Days 1-2**: Core Dojo infrastructure
2. **Week 1, Days 3-5**: Noir circuits + Garaga verifiers
3. **Week 1-2, Days 6-7**: Complete game logic
4. **Week 2, Days 7-9**: UI/UX + Cartridge Controller
5. **Week 2, Days 9-11**: Bitcoin integration
6. **Week 2, Days 11-14**: Testing + polish

## 📚 Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed step-by-step guide
- [PRD](./PRD.md) - Product requirements
- [Tooling Versions](./docs/TOOLING.md) - Version pinning

## 🔐 Environment Setup

Copy `.env.example` to `.env` and fill in required values:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🧪 Testing

```bash
# ZK circuits
cd zk/circuits/board_commit && nargo test
cd ../shot_result && nargo test

# Cairo systems
cd chain/dojo && sozo test

# Client
cd apps/client && pnpm test
```

## 🚢 Deployment

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Section 8 for testnet deployment instructions.

## 📝 License

MIT
