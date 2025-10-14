# Setup Status - ZK Battleship on Starknet

## ✅ Completed (Dojo 1.7.0 Setup)

### Repository & Documentation

- ✅ Git repository initialized
- ✅ Monorepo structure created
- ✅ README.md with quick start guide
- ✅ IMPLEMENTATION_PLAN.md (2200+ lines, production-ready)
- ✅ docs/TOOLING.md updated for Dojo 1.7.0
- ✅ .gitignore configured

### Dojo Project (Updated for 1.7.0)

- ✅ **Scarb.toml** - Dojo 1.7.0, Cairo 2.12.2
- ✅ **dojo_dev.toml** - World and namespace configuration
- ✅ **src/lib.cairo** - Module structure
- ✅ **Models defined** (all 11 models):
  - `Game` (with GameStatus enum)
  - `StartCommit`, `StartReveal` (coin-flip)
  - `BoardCommit`, `CellHit`, `ShipAliveCount` (board tracking)
  - `PendingShot`, `AttackerShot`, `Shot`, `NullifierSet` (shot tracking)
  - `Escrow` (stakes and bonds)
- ✅ **First system**: `game_management` (create_game function)
- ✅ **Helpers**: constants.cairo, errors.cairo

## 🔧 Ready to Build

### Test the Setup

If you have Dojo 1.7.0 installed, you can now test:

```bash
cd chain/dojo

# Build the project
sozo build

# Expected: Should compile successfully (models + game_management system)
```

## ⏳ Next Steps

### Immediate (Day 1)

**1. Complete remaining helper functions:**

- [ ] `src/helpers/get_opt.cairo` - Model-specific optional getters
- [ ] `src/helpers/game_helpers.cairo` - Game state helpers

**2. Implement remaining systems:**

- [ ] `coin_flip.cairo` - start_game_commit, start_game_reveal, timeout_flip
- [ ] `board_commit.cairo` - commit_board with ZK verification
- [ ] `gameplay.cairo` - fire_shot
- [ ] `proof_verify.cairo` - apply_shot_proof
- [ ] `timeout.cairo` - timeout, resign, cancel_unstarted
- [ ] `escrow.cairo` - stake_and_bond, settle, refund

**3. Mock verifiers (for testing before ZK):**

- [ ] Create stub verifiers in `chain/verifiers/`
- [ ] Return `true` for development

### Medium Term (Day 2-5)

**4. Noir ZK Circuits:**

- [ ] `zk/circuits/board_commit/` - Board placement proof
- [ ] `zk/circuits/shot_result/` - Shot result proof
- [ ] Garaga verifier generation

**5. Client Application:**

- [ ] Initialize Vite + React + TypeScript
- [ ] NoirJS integration
- [ ] Cartridge Controller

## 📊 Progress: 25% Complete

**Current Phase:** Phase 1 - Core Infrastructure (Day 1)

- Dojo configuration: ✅
- Models: ✅
- First system: ✅
- Remaining systems: ⏳ In Progress

## 🚀 Quick Command Reference

```bash
# Build
cd chain/dojo && sozo build

# Test (once systems complete)
sozo test

# Start local devnet
katana --config katana.toml

# Migrate contracts
sozo migrate

# Start indexer
torii --config torii.toml
```

## 📝 Notes on Dojo 1.7.0

**Key API differences from implementation plan:**

- Use `world.read_model(key)` instead of `get!(world, Model { key })`
- Use `world.write_model(@model)` instead of `set!(world, Model { ... })`
- Use `world.erase_model(@model)` instead of `delete!(world, Model { ... })`
- Systems use `#[dojo::contract]` + `ContractState`
- Helper functions need explicit `world: WorldStorage` parameter

The implementation plan logic is still 100% valid - just the syntax needs adaptation!
