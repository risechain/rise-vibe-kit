#!/bin/bash

# RISE Vibe Kit CLI Initialization Script

echo "🚀 RISE Vibe Kit CLI Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "create-rise-app/package.json" ]; then
    echo "❌ Error: Please run this script from the rise-vibe-kit root directory"
    exit 1
fi

# Install create-rise-app dependencies
echo "📦 Installing create-rise-app dependencies..."
cd create-rise-app
npm install
cd ..

# Create global link for easy CLI access
echo ""
echo "🔗 Creating global CLI command..."
cd create-rise-app
npm link
cd ..

echo ""
echo "✅ Setup complete! You can now use the CLI in two ways:"
echo ""
echo "1. Global command (from anywhere):"
echo "   create-rise-app my-app --template chat"
echo ""
echo "2. Direct command (from this directory):"
echo "   node create-rise-app/bin/cli.js my-app --template chat"
echo ""
echo "Available templates:"
echo "  - chat    : Real-time messaging with karma system"
echo "  - pump    : Token launchpad like pump.fun"
echo "  - frenpet : Virtual pet game with VRF battles"
echo ""
echo "Example usage:"
echo "  create-rise-app my-chat-app --template chat"
echo "  create-rise-app my-pump-app --template pump"
echo "  create-rise-app my-pet-app --template frenpet"
echo ""
echo "Happy building on RISE! 🚀"