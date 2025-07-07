#!/bin/bash

# RISE Vibe Kit Setup Script
# This script ensures Foundry is installed and sets up the development environment

set -e  # Exit on error

echo " RISE Vibe Kit Setup"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
check_node_version() {
    echo -n "Checking Node.js version... "
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js not found!${NC}"
        echo "Please install Node.js 18 or higher from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Node.js version $NODE_VERSION is too old!${NC}"
        echo "Please upgrade to Node.js 18 or higher"
        exit 1
    fi
    echo -e "${GREEN}OK (v$(node -v))${NC}"
}

# Check and install Foundry
check_foundry() {
    echo -n "Checking Foundry installation... "
    if command -v forge &> /dev/null; then
        echo -e "${GREEN}OK ($(forge --version))${NC}"
        return 0
    else
        echo -e "${YELLOW}Not found${NC}"
        return 1
    fi
}

install_foundry() {
    echo ""
    echo "📦 Installing Foundry..."
    echo "This will download and install the Foundry toolkit."
    echo ""
    
    # Ask for confirmation
    read -p "Do you want to install Foundry now? (y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -L https://foundry.paradigm.xyz | bash
        
        # Source the updated PATH
        if [ -f "$HOME/.bashrc" ]; then
            source "$HOME/.bashrc"
        elif [ -f "$HOME/.zshrc" ]; then
            source "$HOME/.zshrc"
        fi
        
        # Run foundryup
        if command -v foundryup &> /dev/null; then
            foundryup
            echo -e "${GREEN}✅ Foundry installed successfully!${NC}"
        else
            echo -e "${YELLOW}⚠️  Foundry installed but 'foundryup' not found in PATH${NC}"
            echo "Please add the following to your shell configuration:"
            echo 'export PATH="$HOME/.foundry/bin:$PATH"'
            echo "Then run 'foundryup' manually"
            exit 1
        fi
    else
        echo -e "${YELLOW}Skipping Foundry installation${NC}"
        echo "You can install it later by running:"
        echo "  curl -L https://foundry.paradigm.xyz | bash"
        echo "  foundryup"
        exit 0
    fi
}

# Install npm dependencies
install_dependencies() {
    echo ""
    echo "📦 Installing npm dependencies..."
    npm install
}

# Main execution
main() {
    check_node_version
    
    if ! check_foundry; then
        install_foundry
    fi
    
    install_dependencies
    
    echo ""
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.example to .env and add your private key"
    echo "2. Run 'npm run deploy-and-sync' to deploy contracts"
    echo "3. Run 'npm run dev' to start the frontend"
    echo ""
    echo "Happy building! 🏗️"
}

# Run main function
main