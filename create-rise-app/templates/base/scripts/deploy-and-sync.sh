#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
SCRIPT_NAMES=()
NETWORK=""
VERIFY=""
SYNC_AFTER_EACH=false

# Help function
show_help() {
    echo "Usage: ./deploy-and-sync.sh [options]"
    echo ""
    echo "Options:"
    echo "  -s, --script <name>     Deployment script name (can be used multiple times)"
    echo "  -a, --all               Deploy all contracts (ChatApp, TokenLaunchpad, FrenPet)"
    echo "  -n, --network <name>    Network to deploy to (localhost, rise_testnet)"
    echo "  -v, --verify            Verify contracts after deployment"
    echo "  --sync-each             Sync after each deployment (default: sync once at end)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy-and-sync.sh                              # Deploy DeployAndUpdate to RISE testnet"
    echo "  ./deploy-and-sync.sh -a                           # Deploy all contracts"
    echo "  ./deploy-and-sync.sh -s DeployTokenLaunchpad     # Deploy TokenLaunchpad only"
    echo "  ./deploy-and-sync.sh -s Deploy -s DeployFrenPet  # Deploy multiple scripts"
    echo "  ./deploy-and-sync.sh -n localhost                 # Deploy to local network"
    echo "  ./deploy-and-sync.sh -s MyDeploy -v              # Deploy and verify"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--script)
            SCRIPT_NAMES+=("$2")
            shift 2
            ;;
        -a|--all)
            SCRIPT_NAMES=("DeployAll")
            shift
            ;;
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -v|--verify)
            VERIFY="--verify"
            shift
            ;;
        --sync-each)
            SYNC_AFTER_EACH=true
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

# If no scripts specified, use default
if [ ${#SCRIPT_NAMES[@]} -eq 0 ]; then
    SCRIPT_NAMES=("DeployAndUpdate")
fi

# Set RPC URL based on network
if [ "$NETWORK" = "localhost" ]; then
    RPC_URL="http://localhost:8545"
elif [ "$NETWORK" = "rise_testnet" ] || [ -z "$NETWORK" ]; then
    RPC_URL="${RISE_RPC_URL:-https://testnet.riselabs.xyz}"
else
    echo -e "${RED}Error: Unknown network: $NETWORK${NC}"
    exit 1
fi

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}Error: Foundry is not installed${NC}"
    echo "Please install Foundry by running:"
    echo "  curl -L https://foundry.paradigm.xyz | bash"
    echo "  foundryup"
    echo ""
    echo "Or run: ./scripts/setup.sh"
    exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY environment variable is not set${NC}"
    echo "Please set your private key: export PRIVATE_KEY=0x..."
    exit 1
fi

echo -e "${GREEN}🚀 Deploying contracts...${NC}"
echo "Scripts: ${SCRIPT_NAMES[@]}"
echo "Network: ${NETWORK:-rise_testnet}"
echo "RPC URL: $RPC_URL"
echo ""

# Change to contracts directory
cd "$PROJECT_ROOT/contracts" || exit 1

# Build contracts first
echo -e "${YELLOW}Building contracts...${NC}"
forge build || exit 1

# Track deployed scripts for final sync
DEPLOYED_SCRIPTS=()

# Deploy each script
for SCRIPT_NAME in "${SCRIPT_NAMES[@]}"; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Deploying $SCRIPT_NAME...${NC}"
    
    # Check if script file exists
    SCRIPT_FILE="script/${SCRIPT_NAME}.s.sol"
    if [ ! -f "$SCRIPT_FILE" ]; then
        # Try with .s.sol extension if not already present
        if [[ ! "$SCRIPT_NAME" =~ \.s\.sol$ ]]; then
            SCRIPT_FILE="script/${SCRIPT_NAME}.s.sol"
        fi
        
        if [ ! -f "$SCRIPT_FILE" ]; then
            echo -e "${RED}❌ Script file not found: $SCRIPT_FILE${NC}"
            echo "Available scripts:"
            ls -1 script/*.s.sol 2>/dev/null | sed 's|script/||' | sed 's|\.s\.sol||'
            continue
        fi
    fi
    
    # Deploy contract
    if [ -n "$VERIFY" ]; then
        forge script "$SCRIPT_FILE" \
            --rpc-url "$RPC_URL" \
            --private-key "$PRIVATE_KEY" \
            --broadcast \
            --verify \
            --verifier blockscout \
            --verifier-url https://explorer.testnet.riselabs.xyz/api/
    else
        forge script "$SCRIPT_FILE" \
            --rpc-url "$RPC_URL" \
            --private-key "$PRIVATE_KEY" \
            --broadcast
    fi
    
    # Check if deployment was successful
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $SCRIPT_NAME deployed successfully${NC}"
        DEPLOYED_SCRIPTS+=("$SCRIPT_NAME")
        
        # Sync after each deployment if requested
        if [ "$SYNC_AFTER_EACH" = true ]; then
            cd "$PROJECT_ROOT"
            echo -e "${YELLOW}Syncing $SCRIPT_NAME to frontend...${NC}"
            npm run sync-contracts "$SCRIPT_NAME"
            cd "$PROJECT_ROOT/contracts"
        fi
    else
        echo -e "${RED}❌ $SCRIPT_NAME deployment failed${NC}"
    fi
    echo ""
done

# Go back to root directory
cd "$PROJECT_ROOT"

# If not syncing after each, sync all at once
if [ "$SYNC_AFTER_EACH" = false ] && [ ${#DEPLOYED_SCRIPTS[@]} -gt 0 ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Syncing all deployed contracts to frontend...${NC}"
    
    # Sync each deployed script
    for SCRIPT_NAME in "${DEPLOYED_SCRIPTS[@]}"; do
        echo -e "${YELLOW}Syncing $SCRIPT_NAME...${NC}"
        npm run sync-contracts "$SCRIPT_NAME"
    done
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ ${#DEPLOYED_SCRIPTS[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "Successfully deployed:"
    for script in "${DEPLOYED_SCRIPTS[@]}"; do
        echo "  - $script"
    done
    echo ""
    echo "Next steps:"
    echo "1. cd frontend"
    echo "2. npm run dev"
    echo "3. Open http://localhost:3000"
else
    echo -e "${RED}❌ No contracts were successfully deployed${NC}"
    exit 1
fi