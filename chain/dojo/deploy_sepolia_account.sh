#!/bin/bash

# Sepolia Account Deployment Script

ACCOUNT_ADDRESS="0x05dd46e52bc01823527b68fb73febebb5981bcaa28aaf3869b55b231656dca84"
PRIVATE_KEY="0x0713fa77c07cdc81164319477e6194f1a68c68cea81c2223f0bb9e437ca99786"
PUBLIC_KEY="0x33386555b196dceb478fd6ba3b40cdbc352a264cc7f4cc895523db28b37fe2d"
RPC_URL="https://api.cartridge.gg/x/starknet/sepolia"

echo "🔧 Deploying Starknet account to Sepolia..."
echo "   Address: $ACCOUNT_ADDRESS"
echo "   RPC: $RPC_URL"
echo ""

# Create a temporary keystore file
echo "$PRIVATE_KEY" > /tmp/sepolia_key.txt

# Deploy account using sncast (part of Starknet Foundry)
sncast --url "$RPC_URL" account deploy \
  --name sepolia_battleship \
  --private-key-file /tmp/sepolia_key.txt \
  --public-key "$PUBLIC_KEY" \
  --max-fee 100000000000000

# Clean up
rm /tmp/sepolia_key.txt

echo "✅ Account deployment initiated!"
