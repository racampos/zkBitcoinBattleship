# Deployment Notes

## ✅ Local Deployment Successful

**Date:** September 30, 2025

### Working Configuration ✅

**Dojo Toolchain (All Working!):**
- **Katana**: 1.7.0-alpha.4-dev (c4403da) ✅
- **Sozo**: 1.7.1 ✅
- **Torii**: 1.7.0-alpha.4 ✅ **NOW WORKING!**
- **Scarb**: 2.12.2
- **Cairo**: 2.12.2

### Deployed Contracts

**World Address:** `0x04b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69`

**System:**
- `game_management` at `0x022056e8686d6f6b14bedd1611fd41bc33a2323470efae27f39aa0ca3a673afc`

**All 11 Models Deployed:**
- Game, StartCommit, StartReveal
- BoardCommit, CellHit, ShipAliveCount
- PendingShot, AttackerShot, Shot, NullifierSet
- Escrow

### Verified Working

✅ **create_game function tested successfully:**
- Game 1: `0x13a463ebeed50a0dd372c9b500af0149eec88b49b86dae6380f321053497b73`
- Game 2: `0x63f83a5f30af25701563932f8e7b7424ad4f7b170eeb16391ff349c0af2551`

**Transaction receipts show:**
- Status: SUCCEEDED
- Games created with correct parameters
- Gas usage: ~2.3M L2 gas per game creation

### ✅ Torii Now Working!

**Resolution:** Upgraded to matching versions
- **Torii**: 1.7.0-alpha.4 (matches Katana 1.7.0-alpha.4)
- **Sozo**: 1.7.1 (compatible with both)
- **Port**: Running on 8081 (default 8080 had conflicts)

**Verified Working:**
- ✅ All 11 models registered
- ✅ Game entities indexed
- ✅ GraphQL playground available at http://127.0.0.1:8081/graphql
- ✅ Real-time indexing working

### Development Commands

```bash
# Setup environment
source dev-env.sh  # or: export PATH="$HOME/.local/bin:$PATH" && source ~/.dojo/env

# Terminal 1: Start Katana
cd chain/dojo && katana --dev

# Terminal 2: Build & Deploy
cd chain/dojo
sozo build
sozo migrate

# Terminal 3: Start Torii (after deployment)
cd chain/dojo
torii --world <WORLD_ADDRESS> --http.port 8081

# Execute transactions
sozo execute game_management create_game <p2_address> 10 --wait --receipt

# Query via Torii GraphQL
curl -X POST http://127.0.0.1:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ entities { edges { node { keys } } } }"}'

# Or open GraphQL Playground in browser:
# http://127.0.0.1:8081/graphql
```

### Next Steps

1. ✅ Basic deployment working
2. ✅ Torii indexer working (RESOLVED!)
3. ⏳ Implement remaining game systems (fire_shot, coin_flip, timeout, etc.)
4. ⏳ Add ZK circuits and verifiers
5. ⏳ Build client application
