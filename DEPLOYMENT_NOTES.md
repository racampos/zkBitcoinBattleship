# Deployment Notes

## ✅ Local Deployment Successful

**Date:** September 30, 2025

### Working Configuration

**Dojo Toolchain:**
- **Katana**: 1.7.0-alpha.4-dev (c4403da)
- **Sozo**: 1.7.0-alpha.0
- **Torii**: 1.7.0-alpha.0 (NOT currently working)
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

### Known Issues

**Torii Indexer:**
- ❌ Version mismatch: Torii 1.7.0-alpha.0 expects Katana RPC v0.9, but Katana 1.7.0-alpha.4 provides v0.8.1
- **Impact:** Cannot start Torii indexer for GraphQL queries
- **Workaround:** Direct RPC queries work, sozo commands work
- **Resolution:** Either upgrade Katana or downgrade Torii - to be addressed later

**Model Queries:**
- `sozo model get` returns empty data (likely needs Torii)
- Events show correct data being written
- Contracts are functional despite indexing issues

### Development Commands

```bash
# Setup environment
source dev-env.sh  # or: export PATH="$HOME/.local/bin:$PATH" && source ~/.dojo/env

# Build
cd chain/dojo && sozo build

# Deploy
sozo migrate

# Execute
sozo execute game_management create_game <p2_address> 10 --wait --receipt

# Query events directly from RPC
curl -X POST http://localhost:5050 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"starknet_getTransactionReceipt","params":["<tx_hash>"],"id":1}'
```

### Next Steps

1. ✅ Basic deployment working
2. ⏳ Implement remaining game systems
3. ⏳ Address Torii version mismatch (low priority for development)
4. ⏳ Add ZK circuits and verifiers
5. ⏳ Build client application
