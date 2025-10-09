#!/bin/bash
# Mint Mock WBTC for testing on Katana

set -e

WBTC_ADDRESS="0x066604cab8d009317131f7282b1c875311a41e3cac91af22858a92a0ddcfa0"
ACCOUNT="${1:-0x13d9ee239f33fea4f8785b9e3870ade909e20a9599ae7cd62c1c292b73af1b7}"
AMOUNT="${2:-100000}" # Default: 100,000 sats (0.001 BTC)

echo "🪙 Minting Mock WBTC"
echo "   Contract: $WBTC_ADDRESS"
echo "   Recipient: $ACCOUNT"
echo "   Amount: $AMOUNT sats"
echo ""

# Use sozo to call the mint function
# Format: sozo execute <tag_or_address> <entrypoint> <calldata...>
sozo execute $WBTC_ADDRESS mint $ACCOUNT u256:$AMOUNT

echo ""
echo "✅ Minted $AMOUNT sats to $ACCOUNT"
echo ""
echo "💡 To check balance:"
echo "   sozo call --world 0x04b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69 $WBTC_ADDRESS balance_of --calldata $ACCOUNT"

