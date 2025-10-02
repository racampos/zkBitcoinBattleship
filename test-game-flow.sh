#!/bin/bash
# Complete game flow test script

set -e

# Setup environment
source ~/.dojo/env
export PATH="$HOME/.local/bin:$PATH"
cd /Users/rcampos/prog/Web3/StarknetHackathon/BitcoinShip/chain/dojo

# Player addresses from Katana
P1="0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec"
P2="0x42b249d1633812d903f303d640a4261f58fead5aa24925a9efc1dd9d76fb555"

echo "🎮 Testing Complete Game Flow"
echo "=============================="
echo ""

# Step 1: Create Game
echo "1️⃣  Creating game..."
GAME_TX=$(sozo execute game_management create_game $P2 10 --wait)
echo "$GAME_TX"
GAME_ID=$(echo "$GAME_TX" | grep -o "0x[a-f0-9]\{64\}" | tail -1)
echo "   Game ID: $GAME_ID"
echo ""

# Step 2: Commit Boards (both players with mock proofs)
echo "2️⃣  Player 1 committing board..."
COMMIT1="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
RULES="0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd"
PROOF="0x1111"
sozo execute board_commit commit_board $GAME_ID $COMMIT1 $RULES $PROOF --wait
echo "   ✅ P1 board committed"
echo ""

echo "3️⃣  Player 2 committing board..."
# Switch to P2 account (using --account-address if needed, or just use same for testing)
COMMIT2="0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
sozo execute board_commit commit_board $GAME_ID $COMMIT2 $RULES $PROOF --wait
echo "   ✅ P2 board committed"
echo ""

# Step 3: Coin-flip commit-reveal
echo "4️⃣  Coin-flip: P1 commits..."
FLIP_COMMIT1="0x2222222222222222222222222222222222222222222222222222222222222222"
sozo execute coin_flip start_game_commit $GAME_ID $FLIP_COMMIT1 --wait
echo "   ✅ P1 flip committed"
echo ""

echo "5️⃣  Coin-flip: P2 commits..."
FLIP_COMMIT2="0x3333333333333333333333333333333333333333333333333333333333333333"
sozo execute coin_flip start_game_commit $GAME_ID $FLIP_COMMIT2 --wait
echo "   ✅ P2 flip committed"
echo ""

echo "6️⃣  Coin-flip: P1 reveals..."
NONCE1="0x9999"
sozo execute coin_flip start_game_reveal $GAME_ID $NONCE1 --wait
echo "   ✅ P1 revealed"
echo ""

echo "7️⃣  Coin-flip: P2 reveals..."
NONCE2="0x8888"
sozo execute coin_flip start_game_reveal $GAME_ID $NONCE2 --wait
echo "   ✅ P2 revealed - Game should be Started!"
echo ""

# Step 4: Fire shot
echo "8️⃣  Firing shot at (5, 5)..."
sozo execute gameplay fire_shot $GAME_ID 5 5 --wait
echo "   ✅ Shot fired - Pending shot created"
echo ""

# Step 5: Apply shot proof (defender responds)
echo "9️⃣  Applying shot proof (mock)..."
RESULT=1  # Hit
NULLIFIER="0x4444444444444444444444444444444444444444444444444444444444444444"
sozo execute proof_verify apply_shot_proof $GAME_ID 5 5 $RESULT $NULLIFIER $RULES $PROOF --wait
echo "   ✅ Shot proof applied - Turn should flip"
echo ""

echo "🎉 Complete game flow tested successfully!"
echo ""
echo "Next steps:"
echo "- Query game state via Torii GraphQL"
echo "- Continue firing shots until 17 hits"
echo "- Test win condition"

