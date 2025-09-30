#!/bin/bash
# Development environment setup
# Source this file before working: source dev-env.sh

# Set correct PATH order (newer Scarb 2.12.2 takes precedence)
export PATH="$HOME/.local/bin:$PATH"

# Load Dojo environment
source ~/.dojo/env

# Verify versions
echo "🔧 Development Environment"
echo "========================="
echo "Scarb:  $(scarb --version | head -1)"
echo "Sozo:   $(sozo --version | head -1)"
echo "Katana: $(katana --version | head -1)"
echo "Torii:  $(torii --version | head -1)"
echo "========================="
echo "✅ Environment ready!"
echo ""
echo "Quick commands:"
echo "  cd chain/dojo && sozo build    # Build contracts"
echo "  katana --dev                    # Start local devnet"
echo "  sozo migrate                    # Deploy contracts"
