#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up Vercel Environment Variables${NC}"
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend" || exit 1

# Check if authenticated with Vercel
vercel whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Not authenticated with Vercel. Run 'vercel login' first${NC}"
    exit 1
fi

# Set up essential environment variables
echo -e "${YELLOW}Setting up RISE blockchain environment variables...${NC}"

# Production environment variables
vercel env add NEXT_PUBLIC_RISE_RPC_URL production <<EOF
https://testnet.riselabs.xyz
EOF

vercel env add NEXT_PUBLIC_RISE_WS_URL production <<EOF
wss://testnet.riselabs.xyz/ws
EOF

# Preview environment variables
vercel env add NEXT_PUBLIC_RISE_RPC_URL preview <<EOF
https://testnet.riselabs.xyz
EOF

vercel env add NEXT_PUBLIC_RISE_WS_URL preview <<EOF
wss://testnet.riselabs.xyz/ws
EOF

# Development environment variables
vercel env add NEXT_PUBLIC_RISE_RPC_URL development <<EOF
https://testnet.riselabs.xyz
EOF

vercel env add NEXT_PUBLIC_RISE_WS_URL development <<EOF
wss://testnet.riselabs.xyz/ws
EOF

echo -e "${GREEN}✅ Environment variables set up successfully${NC}"
echo -e "${YELLOW}💡 You can view and manage environment variables at: https://vercel.com/dashboard${NC}"