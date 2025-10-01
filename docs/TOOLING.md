# Tooling Versions - VERIFIED WORKING ✅

## Current Working Configuration

**Dojo Toolchain (Tested and Working):**
- **Dojo**: `1.7.0-alpha.4` ✅
- **Sozo**: `1.7.1` ✅
- **Katana**: `1.7.0-alpha.4-dev` ✅
- **Torii**: `1.7.0-alpha.4` ✅
- **Scarb**: `2.12.2` ✅
- **Cairo**: `2.12.2` ✅

**Still to be installed:**
- **Noir**: `0.26.0` (or latest tested with Garaga)
- **Garaga**: `<exact version from testing>` - Update after first successful verifier generation
- **NoirJS**: Match Noir version
- **Node.js**: `18.x` or `20.x`

## Installation Commands (Verified)

```bash
# Dojo toolchain
curl -L https://install.dojoengine.org | bash
dojoup install 1.7.0-alpha.4  # Installs matching sozo, katana, torii

# Scarb (Cairo compiler)
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh -s -- --version 2.12.2

# Node.js for client & NoirJS (when needed)
nvm install 18
npm install -g pnpm

# Noir for ZK circuits (when needed)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

## Version Verification

```bash
source dev-env.sh  # Sets up PATH and environment

# Verify versions
scarb --version    # Should show 2.12.2
sozo --version     # Should show 1.7.1
katana --version   # Should show 1.7.0-alpha.4-dev
torii --version    # Should show 1.7.0-alpha.4
```

## Development Stack

```bash
# Terminal 1: Katana (local blockchain)
cd chain/dojo && katana --dev

# Terminal 2: Build & Deploy
cd chain/dojo
sozo build
sozo migrate

# Terminal 3: Torii (indexer)
cd chain/dojo
torii --world <WORLD_ADDRESS> --http.port 8081

# Terminal 4: Client (when ready)
cd apps/client
pnpm dev
```

## Important Notes

### Torii Configuration
- Runs on **port 8081** (not default 8080 due to conflicts)
- GraphQL Playground: http://127.0.0.1:8081/graphql
- Automatically indexes all models in real-time

### Path Configuration
The `dev-env.sh` script handles PATH setup. It ensures:
1. Scarb 2.12.2 is found first (`~/.local/bin`)
2. Dojo tools are available (`~/.dojo/env`)

### BN254 Curve Compatibility
- **Critical for Garaga verifiers**
- Poseidon parameters must match between Noir and Cairo
- Test hash alignment before production

## Dojo 1.7.0 Key Features

- **ModelStorage trait**: `world.read_model()`, `world.write_model()`
- **Contract attribute**: `#[dojo::contract]` instead of `#[system]`
- **Poseidon hashing**: `core::poseidon::poseidon_hash_span`
- **Better type safety**: Explicit derives required

See `docs/DOJO_1.7_MIGRATION.md` for syntax translation from IMPLEMENTATION_PLAN.md.