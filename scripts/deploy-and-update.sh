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
VERIFY=""
SYNC_AFTER_EACH=false

# Help function
show_help() {
    echo "Usage: ./deploy-and-update.sh [options]"
    echo ""
    echo "Options:"
    echo "  -s, --script <name>     Deployment script name (can be used multiple times)"
    echo "  -a, --all               Deploy all scripts starting with 'Deploy'"
    echo "  -v, --verify            Verify contracts after deployment"
    echo "  --sync-each             Sync after each deployment (default: sync once at end)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy-and-update.sh                              # List scripts and prompt for selection"
    echo "  ./deploy-and-update.sh -a                           # Deploy all Deploy* scripts"
    echo "  ./deploy-and-update.sh -s Deploy                    # Deploy specific script"
    echo "  ./deploy-and-update.sh -s Deploy -s DeployFrenPet  # Deploy multiple scripts"
    echo "  ./deploy-and-update.sh -s MyDeploy -v              # Deploy and verify"
    echo ""
    echo "When using npm run:"
    echo "  npm run deploy-and-update                           # List scripts and prompt for selection"
    echo "  npm run deploy-and-update -- -a                     # Deploy all Deploy* scripts"
    echo "  npm run deploy-and-update -- -s Deploy              # Deploy specific script"
    echo "  npm run deploy-and-update -- -s Deploy -v           # Deploy and verify"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--script)
            SCRIPT_NAMES+=("$2")
            shift 2
            ;;
        -a|--all)
            # Find all scripts starting with Deploy
            for script in "$PROJECT_ROOT/contracts/script/Deploy"*.s.sol; do
                if [ -f "$script" ]; then
                    SCRIPT_NAMES+=("$(basename "$script" .s.sol)")
                fi
            done
            shift
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

# If no scripts specified, list available scripts and prompt user
if [ ${#SCRIPT_NAMES[@]} -eq 0 ]; then
    # Find all .s.sol files in script directory
    AVAILABLE_SCRIPTS=()
    AVAILABLE_SCRIPTS_FULL=()
    for script in "$PROJECT_ROOT/contracts/script/"*.s.sol; do
        if [ -f "$script" ]; then
            script_name=$(basename "$script" .s.sol)
            script_full=$(basename "$script")
            AVAILABLE_SCRIPTS+=("$script_name")
            AVAILABLE_SCRIPTS_FULL+=("$script_full")
        fi
    done
    
    if [ ${#AVAILABLE_SCRIPTS[@]} -eq 0 ]; then
        echo -e "${RED}No deployment scripts found in contracts/script/${NC}"
        exit 1
    fi
    
    # Interactive menu function
    select_script() {
        local selected=0
        local key
        
        # Clear screen and hide cursor
        tput civis
        
        while true; do
            # Clear previous menu
            tput clear
            
            echo -e "${YELLOW}Select deployment script:${NC}"
            echo -e "${BLUE}(Use arrow keys to navigate, Enter to select, 'a' for all Deploy* scripts, 'q' to quit)${NC}"
            echo ""
            
            # Display options
            for i in "${!AVAILABLE_SCRIPTS_FULL[@]}"; do
                if [ $i -eq $selected ]; then
                    echo -e "${GREEN}▶ ${AVAILABLE_SCRIPTS_FULL[$i]}${NC}"
                else
                    echo "  ${AVAILABLE_SCRIPTS_FULL[$i]}"
                fi
            done
            
            # Read single character
            read -rsn1 key
            
            case "$key" in
                $'\x1b') # ESC sequence
                    read -rsn2 key
                    case "$key" in
                        '[A') # Up arrow
                            ((selected--))
                            if [ $selected -lt 0 ]; then
                                selected=$((${#AVAILABLE_SCRIPTS[@]} - 1))
                            fi
                            ;;
                        '[B') # Down arrow
                            ((selected++))
                            if [ $selected -ge ${#AVAILABLE_SCRIPTS[@]} ]; then
                                selected=0
                            fi
                            ;;
                    esac
                    ;;
                '') # Enter key
                    tput cnorm # Show cursor
                    echo ""
                    return $selected
                    ;;
                'a'|'A') # Deploy all
                    tput cnorm # Show cursor
                    echo ""
                    return 255
                    ;;
                'q'|'Q') # Quit
                    tput cnorm # Show cursor
                    echo ""
                    echo -e "${YELLOW}Deployment cancelled${NC}"
                    exit 0
                    ;;
            esac
        done
    }
    
    # If only one script, just use it
    if [ ${#AVAILABLE_SCRIPTS[@]} -eq 1 ]; then
        echo -e "${YELLOW}Found one deployment script: ${AVAILABLE_SCRIPTS_FULL[0]}${NC}"
        SCRIPT_NAMES=("${AVAILABLE_SCRIPTS[0]}")
    else
        # Show interactive menu
        select_script
        selection=$?
        
        if [ $selection -eq 255 ]; then
            # Deploy all Deploy* scripts
            echo -e "${YELLOW}Deploying all scripts starting with 'Deploy'${NC}"
            for script in "$PROJECT_ROOT/contracts/script/Deploy"*.s.sol; do
                if [ -f "$script" ]; then
                    SCRIPT_NAMES+=("$(basename "$script" .s.sol)")
                fi
            done
        else
            SCRIPT_NAMES=("${AVAILABLE_SCRIPTS[$selection]}")
            echo -e "${GREEN}Selected: ${AVAILABLE_SCRIPTS_FULL[$selection]}${NC}"
        fi
    fi
    echo ""
fi

# Set RPC URL to RISE testnet
RPC_URL="${RISE_RPC_URL:-https://testnet.riselabs.xyz/}"

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

echo -e "${GREEN}󰣕 Deploying contracts...${NC}"
echo "Scripts: ${SCRIPT_NAMES[@]}"
echo "Network: RISE Testnet"
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
            echo -e "${YELLOW}Updating $SCRIPT_NAME to frontend...${NC}"
            npm run sync-contracts:update "$SCRIPT_NAME"
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
    echo -e "${YELLOW}Updating all deployed contracts to frontend...${NC}"
    
    # Sync each deployed script with update mode
    for SCRIPT_NAME in "${DEPLOYED_SCRIPTS[@]}"; do
        echo -e "${YELLOW}Updating $SCRIPT_NAME...${NC}"
        node scripts/sync-contracts-update.js "$SCRIPT_NAME"
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