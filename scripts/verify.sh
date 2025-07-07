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
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}Loading .env from project root...${NC}"
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

if [ -f "$PROJECT_ROOT/contracts/.env" ]; then
    echo -e "${YELLOW}Loading .env from contracts directory...${NC}"
    set -a
    source "$PROJECT_ROOT/contracts/.env"
    set +a
fi

# Default values
CONTRACT_NAME=""
CONTRACT_ADDRESS=""

# Help function
show_help() {
    echo "Usage: ./verify.sh [options]"
    echo ""
    echo "Options:"
    echo "  -c, --contract <name>   Contract name (e.g., ChatApp, TokenLaunchpad)"
    echo "  -a, --address <addr>    Contract address (optional, will auto-detect from broadcasts)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./verify.sh                               # Interactive selection"
    echo "  ./verify.sh -c ChatApp                    # Verify specific contract (auto-detect address)"
    echo "  ./verify.sh -c ChatApp -a 0x123...       # Verify with specific address"
    echo ""
    echo "When using npm run:"
    echo "  npm run verify                            # Interactive selection"
    echo "  npm run verify -- -c ChatApp              # Verify specific contract"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--contract)
            CONTRACT_NAME="$2"
            shift 2
            ;;
        -a|--address)
            CONTRACT_ADDRESS="$2"
            shift 2
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

# Function to find deployed contracts from broadcast files
find_deployed_contracts() {
    local contracts=()
    
    # Find all run-latest.json files in broadcast directory
    for broadcast_file in "$PROJECT_ROOT/contracts/broadcast/"*.sol/*/run-latest.json; do
        if [ -f "$broadcast_file" ]; then
            # Extract contract info from the broadcast file
            local contract_info=$(jq -r '.transactions[] | select(.contractName) | "\(.contractName):\(.contractAddress)"' "$broadcast_file" 2>/dev/null)
            if [ -n "$contract_info" ]; then
                while IFS= read -r line; do
                    contracts+=("$line")
                done <<< "$contract_info"
            fi
        fi
    done
    
    # Remove duplicates and sort
    printf '%s\n' "${contracts[@]}" | sort -u
}

# Interactive menu function
select_contract() {
    local contracts=()
    local selected=0
    local key
    
    # Get all deployed contracts
    while IFS= read -r contract; do
        contracts+=("$contract")
    done < <(find_deployed_contracts)
    
    if [ ${#contracts[@]} -eq 0 ]; then
        echo -e "${RED}No deployed contracts found in broadcast directory${NC}"
        echo "Please deploy contracts first using: npm run deploy-and-sync"
        exit 1
    fi
    
    # Clear screen and hide cursor
    tput civis
    
    while true; do
        # Clear previous menu
        tput clear
        
        echo -e "${YELLOW}Select contract to verify:${NC}"
        echo -e "${BLUE}(Use arrow keys to navigate, Enter to select, 'q' to quit)${NC}"
        echo ""
        
        # Display options
        for i in "${!contracts[@]}"; do
            local name="${contracts[$i]%%:*}"
            local addr="${contracts[$i]##*:}"
            if [ $i -eq $selected ]; then
                echo -e "${GREEN}▶ $name (${addr})${NC}"
            else
                echo "  $name (${addr})"
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
                            selected=$((${#contracts[@]} - 1))
                        fi
                        ;;
                    '[B') # Down arrow
                        ((selected++))
                        if [ $selected -ge ${#contracts[@]} ]; then
                            selected=0
                        fi
                        ;;
                esac
                ;;
            '') # Enter key
                tput cnorm # Show cursor
                echo ""
                CONTRACT_NAME="${contracts[$selected]%%:*}"
                CONTRACT_ADDRESS="${contracts[$selected]##*:}"
                return
                ;;
            'q'|'Q') # Quit
                tput cnorm # Show cursor
                echo ""
                echo -e "${YELLOW}Verification cancelled${NC}"
                exit 0
                ;;
        esac
    done
}

# If no contract specified, show interactive menu
if [ -z "$CONTRACT_NAME" ]; then
    select_contract
fi

# If address not provided, try to find it from broadcasts
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${YELLOW}Looking for deployed address of $CONTRACT_NAME...${NC}"
    
    # Search for the contract in broadcast files
    for broadcast_file in "$PROJECT_ROOT/contracts/broadcast/"*.sol/*/run-latest.json; do
        if [ -f "$broadcast_file" ]; then
            found_address=$(jq -r --arg name "$CONTRACT_NAME" '.transactions[] | select(.contractName == $name) | .contractAddress' "$broadcast_file" 2>/dev/null | head -1)
            if [ -n "$found_address" ]; then
                CONTRACT_ADDRESS="$found_address"
                echo -e "${GREEN}Found address: $CONTRACT_ADDRESS${NC}"
                break
            fi
        fi
    done
    
    if [ -z "$CONTRACT_ADDRESS" ]; then
        echo -e "${RED}Could not find deployed address for $CONTRACT_NAME${NC}"
        echo "Please provide address manually with -a flag"
        exit 1
    fi
fi

# Find the contract source file
echo -e "${YELLOW}Looking for contract source file...${NC}"
CONTRACT_FILE=$(find "$PROJECT_ROOT/contracts/src" -name "*.sol" -type f -exec grep -l "contract $CONTRACT_NAME" {} \; | head -1)

if [ -z "$CONTRACT_FILE" ]; then
    echo -e "${RED}Could not find source file for contract $CONTRACT_NAME${NC}"
    exit 1
fi

# Get relative path from contracts directory
CONTRACT_PATH="${CONTRACT_FILE#$PROJECT_ROOT/contracts/}"
echo -e "${GREEN}Found source: $CONTRACT_PATH${NC}"

# Construct the contract identifier (path:contractName)
CONTRACT_ID="${CONTRACT_PATH}:${CONTRACT_NAME}"

# Verify the contract
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Verifying contract...${NC}"
echo "Contract: $CONTRACT_NAME"
echo "Address: $CONTRACT_ADDRESS"
echo "Source: $CONTRACT_ID"
echo ""

cd "$PROJECT_ROOT/contracts"

forge verify-contract \
    --rpc-url "${RISE_RPC_URL:-https://testnet.riselabs.xyz/}" \
    "$CONTRACT_ADDRESS" \
    "$CONTRACT_ID" \
    --verifier blockscout \
    --verifier-url https://explorer.testnet.riselabs.xyz/api/

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Contract verified successfully!${NC}"
    echo -e "${BLUE}View on explorer: https://explorer.testnet.riselabs.xyz/address/$CONTRACT_ADDRESS${NC}"
else
    echo ""
    echo -e "${RED}❌ Contract verification failed${NC}"
    exit 1
fi