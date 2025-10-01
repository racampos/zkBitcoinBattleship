# Exact Tool Versions - Verified Working ✅

**Date Verified:** October 1, 2025  
**Status:** All tools tested and working together

## Dojo Toolchain

### Scarb (Cairo Compiler)
```
Version: 2.12.2
Build Hash: dc0dbfd50
Build Date: 2025-09-15
Cairo: 2.12.2
Sierra: 1.7.0
Installation: ~/.local/bin/scarb
```

### Sozo (Dojo CLI)
```
Version: 1.7.1
Scarb: 2.12.2 (dc0dbfd50)
Cairo: 2.12.2
Sierra: 1.7.0
Installation: ~/.dojo/bin/sozo
```

### Katana (Local Devnet)
```
Version: 1.7.0-alpha.4-dev
Commit: c4403da
Build Date: 2025-09-09T05:02:54.529871000Z
Features: -native
Installation: ~/.dojo/bin/katana
RPC Endpoint: http://localhost:5050
RPC Version: 0.8.1
```

### Torii (Indexer)
```
Version: 1.7.0-alpha.0 (binary reports this, but compatible with alpha.4)
Commit: 85edf2d (main branch)
Installation: ~/.dojo/bin/torii
HTTP Endpoint: http://127.0.0.1:8081 (custom port, default is 8080)
GraphQL Playground: http://127.0.0.1:8081/graphql
gRPC Endpoint: 127.0.0.1:50051
Status: ✅ Working - all 11 models registered
```

## Installation Commands (Exact)

```bash
# Dojo (installs sozo, katana, torii)
curl -L https://install.dojoengine.org | bash
dojoup install 1.7.0-alpha.4

# Scarb
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh -s -- --version 2.12.2

# Verify installations
source ~/.dojo/env
export PATH="$HOME/.local/bin:$PATH"
scarb --version
sozo version
katana --version
torii --version
```

## Project Configuration Files

### Scarb.toml
```toml
cairo-version = "2.12.2"
starknet = "2.12.2"
dojo = "1.7.0"
dojo_cairo_macros = "1.7.0"
```

### dojo_dev.toml
```toml
world_address = "0x04b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69"
```

## Deployment Details

**World Address:** `0x04b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69`

**Models Deployed:** 11/11
- Game, StartCommit, StartReveal
- BoardCommit, CellHit, ShipAliveCount  
- PendingShot, AttackerShot, Shot, NullifierSet
- Escrow

**Systems Deployed:** 1/7
- game_management

## Verified Working Features

✅ **sozo build** - Compiles successfully  
✅ **sozo migrate** - Deploys to Katana  
✅ **sozo execute** - Transactions succeed  
✅ **Katana** - Local devnet running  
✅ **Torii** - GraphQL indexing working  
✅ **Model queries** - Entities indexed in real-time  

## Known Compatibility Notes

### Version Matching Requirements
- Sozo 1.7.1 is compatible with Dojo 1.7.0 dependencies
- Katana 1.7.0-alpha.4 provides RPC v0.8.1
- Torii 1.7.0-alpha.4 is compatible with Katana alpha.4 (despite binary showing alpha.0)
- Scarb 2.12.2 matches Cairo 2.12.2

### Port Configurations
- **Katana RPC:** localhost:5050 (default)
- **Torii HTTP:** 127.0.0.1:8081 (custom, default 8080 had conflicts)
- **Torii gRPC:** 127.0.0.1:50051 (default)
- **Torii Relay:** localhost:9090-9092 (various protocols)

## Path Configuration

```bash
# Required in PATH (in order):
export PATH="$HOME/.local/bin:$PATH"  # Scarb 2.12.2
source ~/.dojo/env                     # Dojo tools

# Alternatively:
source dev-env.sh  # Convenience script that sets up everything
```

## Still to Install (When Needed)

### Node.js & PNPM
```bash
nvm install 18
npm install -g pnpm
```

### Noir (for ZK circuits)
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
# Target: Noir 0.26.0 (or latest compatible with Garaga)
```

### Garaga (for ZK verifiers)
```bash
# Installation TBD
# Will be documented after first successful integration
```

## Upgrade Path (If Needed)

```bash
# Upgrade Dojo tools
dojoup install <version>

# Upgrade Scarb
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh -s -- --version <version>

# Check current Dojo version
dojoup show
```

## Build Reproducibility

To reproduce this exact environment:

1. Install Scarb 2.12.2
2. Install Dojo 1.7.0-alpha.4 (gets compatible sozo, katana, torii)
3. Configure PATH as shown above
4. Use the project's Scarb.toml dependencies
5. Start services: katana → sozo migrate → torii

Last verified: October 1, 2025
