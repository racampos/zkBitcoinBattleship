#!/bin/bash
# Quick launcher for Bitcoin Integration Demo

echo "🚀 Starting Bitcoin Integration Demo..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo ""
    echo "Creating .env with default testnet config..."
    cat > .env << EOL
# Bitcoin Integration Configuration
VITE_BITCOIN_NETWORK=testnet
VITE_ATOMIQ_ENV=testnet
# IMPORTANT: Add your Starknet RPC URL below!
# Get free key from: https://www.infura.io/ or https://www.alchemy.com/
VITE_STARKNET_RPC_URL=https://starknet-sepolia.infura.io/v3/YOUR_INFURA_KEY
EOL
    echo ""
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your Starknet RPC URL!"
    echo "   Get a free key from Infura or Alchemy"
    echo ""
    read -p "Press Enter after updating .env..."
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo ""
echo "✅ Starting Vite dev server..."
echo ""
echo "📍 Demo will be available at: https://localhost:3000/bitcoin-demo.html"
echo ""
echo "💡 Tips:"
echo "   1. Make sure Xverse wallet is installed"
echo "   2. Switch Xverse to Bitcoin Testnet mode"
echo "   3. Check console logs for debugging"
echo ""

pnpm dev

