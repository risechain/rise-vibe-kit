#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Load environment variables
# First check in project root
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}Loading .env from project root...${NC}"
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Then check in contracts directory (overrides root if exists)
if [ -f "$PROJECT_ROOT/contracts/.env" ]; then
    echo -e "${YELLOW}Loading .env from contracts directory...${NC}"
    set -a
    source "$PROJECT_ROOT/contracts/.env"
    set +a
fi

# Default values
SCRIPT_NAME="DeployAndUpdate"
NETWORK=""
VERIFY=""

# Help function
show_help() {
    echo "Usage: ./deploy-and-sync.sh [options]"
    echo ""
    echo "Options:"
    echo "  -s, --script <name>     Deployment script name (default: DeployAndUpdate)"
    echo "  -n, --network <name>    Network to deploy to (localhost, rise_testnet)"
    echo "  -v, --verify            Verify contracts after deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy-and-sync.sh                              # Deploy DeployAndUpdate to RISE testnet"
    echo "  ./deploy-and-sync.sh -s DeployMultiple            # Deploy DeployMultiple script"
    echo "  ./deploy-and-sync.sh -n localhost                 # Deploy to local network"
    echo "  ./deploy-and-sync.sh -s MyDeploy -v               # Deploy MyDeploy and verify"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--script)
            SCRIPT_NAME="$2"
            shift 2
            ;;
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -v|--verify)
            VERIFY="--verify"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set RPC URL based on network
if [ "$NETWORK" = "localhost" ]; then
    RPC_URL="http://localhost:8545"
elif [ "$NETWORK" = "rise_testnet" ] || [ -z "$NETWORK" ]; then
    RPC_URL="${RISE_RPC_URL:-https://testnet.riselabs.xyz}"
else
    echo -e "${RED}Error: Unknown network: $NETWORK${NC}"
    exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY environment variable is not set${NC}"
    echo "Please set your private key: export PRIVATE_KEY=0x..."
    exit 1
fi

echo -e "${GREEN}🚀 Deploying contracts...${NC}"
echo "Script: $SCRIPT_NAME"
echo "Network: ${NETWORK:-rise_testnet}"
echo "RPC URL: $RPC_URL"

# Change to contracts directory
cd contracts || exit 1

# Build contracts first
echo -e "${YELLOW}Building contracts...${NC}"
forge build || exit 1

# Deploy contracts
echo -e "${YELLOW}Deploying $SCRIPT_NAME...${NC}"
if [ -n "$VERIFY" ]; then
    forge script "script/${SCRIPT_NAME}.s.sol" \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --verify \
        --verifier blockscout \
        --verifier-url https://explorer.testnet.riselabs.xyz/api/
else
    forge script "script/${SCRIPT_NAME}.s.sol" \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast
fi

# Check if deployment was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment successful${NC}"

# Go back to root directory
cd ..

# Run sync-contracts
echo -e "${YELLOW}Syncing contracts to frontend...${NC}"
npm run sync-contracts "$SCRIPT_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contracts synced successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. cd frontend"
    echo "2. npm run dev"
    echo "3. Open http://localhost:3000"
else
    echo -e "${RED}❌ Contract sync failed${NC}"
    exit 1
fi