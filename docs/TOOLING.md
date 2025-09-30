# Tooling Versions

Pin these versions to avoid curve/parameter drift:

## Core Tooling (Updated for Dojo 1.7.0)

- **Dojo**: `1.7.0` ✅ (current stable)
- **Sozo/Katana**: `1.7.0` (match Dojo version)
- **Cairo**: `2.12.2` ✅
- **Scarb**: `2.12.2` ✅
- **Noir**: `0.26.0` (or latest tested with Garaga)
- **Garaga**: `<exact version from testing>` - Update after first successful verifier generation
- **NoirJS**: Match Noir version
- **Node.js**: `18.x` or `20.x`

## Installation Commands

```bash
# Rust & Cairo
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
curl --proto '=https' --tlsv1.2 -sSf https://docs.starknet.io/quick_start/install.sh | sh

# Dojo toolchain (using asdf for version management)
curl -L https://raw.githubusercontent.com/dojoengine/dojo/main/dojoup/asdf-install | bash

# Or use dojoup for latest
curl -L https://install.dojoengine.org | bash
dojoup

# Node.js for client & NoirJS
nvm install 18
npm install -g pnpm

# Noir for ZK circuits
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

## Version Verification

After installation, verify versions:

```bash
scarb --version  # Should show 2.12.2
sozo --version   # Should show 1.7.0
katana --version # Should show 1.7.0
nargo --version  # Should show 0.26.0+
node --version
pnpm --version
```

## Dojo 1.7.0 API Notes

**Key syntax changes from 0.7.x:**

- Use `#[dojo::model]` attribute on models
- Use `#[dojo::contract]` instead of `#[system]`
- Use `ModelStorage` trait: `world.read_model()` and `world.write_model()`
- Models need `Copy, Drop, Serde` derives
- Use `Introspect` derive for enums

## Critical Notes

- **BN254 curve** required for Garaga compatibility
- **Poseidon parameters** must match between Noir and Cairo
- Retest all ZK circuits after any tooling upgrades
- Pin Garaga version after first successful verifier generation

Update `Cargo.toml`, `package.json`, and CI to use these exact versions once locked in.
