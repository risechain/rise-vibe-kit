#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
VERIFY=false
NETWORK="rise_testnet"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verify)
      VERIFY=true
      shift
      ;;
    --network)
      NETWORK="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--verify] [--network <network>]"
      exit 1
      ;;
  esac
done

echo "🚀 Deploying ChatApp to $NETWORK..."

# Change to contracts directory
cd contracts

# Build contracts first
echo "📦 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract build failed${NC}"
    exit 1
fi

# Deploy the contract
echo "🔨 Deploying contract..."
if [ "$VERIFY" = true ]; then
    echo "📝 Verification enabled"
    OUTPUT=$(forge script script/DeployAndUpdate.s.sol:DeployAndUpdateScript \
        --rpc-url $NETWORK \
        --broadcast \
        --verify \
        --verifier blockscout \
        --verifier-url https://explorer.testnet.riselabs.xyz/api/ \
        -vvv)
else
    OUTPUT=$(forge script script/DeployAndUpdate.s.sol:DeployAndUpdateScript \
        --rpc-url $NETWORK \
        --broadcast \
        -vvv)
fi

# Extract the contract address from the output
CONTRACT_ADDRESS=$(echo "$OUTPUT" | grep -oE "ChatApp deployed to: 0x[a-fA-F0-9]{40}" | cut -d' ' -f4)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to extract contract address${NC}"
    echo "Output was:"
    echo "$OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed to: $CONTRACT_ADDRESS${NC}"

# Update frontend using the new sync script
echo "🔄 Syncing contracts to frontend..."
cd ..
node scripts/sync-contracts.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "Contract deployed to: $CONTRACT_ADDRESS"
    echo ""
    echo "Next steps:"
    echo "1. cd frontend"
    echo "2. npm run dev"
    echo "3. Open http://localhost:3000"
    
    if [ "$VERIFY" = true ]; then
        echo ""
        echo "📝 Contract verification status:"
        echo "   Check: https://explorer.testnet.riselabs.xyz/address/$CONTRACT_ADDRESS"
    fi
else
    echo -e "${RED}❌ Frontend sync failed${NC}"
    exit 1
fi