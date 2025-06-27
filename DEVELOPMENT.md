# Development Guide

This guide covers the development workflow for building dApps with RISE Vibe Kit.

## Quick Start

### Option 1: All-in-One Development Mode (Recommended)

```bash
npm run dev:all
```

This single command runs everything you need:
- ⛓️ Local blockchain (Anvil fork)
- 🚀 Auto-deployment with file watching
- 🎨 Frontend development server

### Option 2: Manual Terminal Setup

If you prefer separate terminals for better control:

**Terminal 1 - Blockchain:**
```bash
npm run chain
```

**Terminal 2 - Contracts:**
```bash
npm run watch-deploy  # Auto-deploys on file changes
# OR
npm run deploy-and-sync  # One-time deployment
```

**Terminal 3 - Frontend:**
```bash
npm run dev
```

## Available Scripts

### Core Development
- `npm run dev:all` - Start everything with one command
- `npm run chain` - Start local Anvil fork of RISE testnet
- `npm run deploy-and-sync` - Deploy contracts and sync to frontend
- `npm run watch-deploy` - Auto-deploy on contract changes
- `npm run dev` - Start frontend development server

### Validation & Setup
- `npm run validate` - Check your environment setup
- `npm run setup` - Interactive setup wizard
- `npm test` - Run contract tests

### Deployment Options
- `npm run deploy-and-sync` - Deploy default contracts
- `npm run deploy-and-sync -- -a` - Deploy all contracts
- `npm run deploy-and-sync -- -s Deploy` - Deploy specific script
- `npm run deploy-and-sync -- -v` - Deploy with verification

### Utility Scripts
- `npm run reset` - Clean all build artifacts and dependencies
- `npm run reset:cache` - Clean only build caches
- `npm run sync-contracts` - Manually sync contracts to frontend
- `npm run build` - Build frontend for production
- `npm run build:contracts` - Build contracts only

### Testing
- `npm run test:integration` - Run full integration tests
- `npm run chain:test` - Start test chain on port 8546
- `npm run deploy:test` - Deploy to test chain
- `npm run test:e2e` - Run end-to-end tests

## Terminal Layout Recommendations

### VS Code
1. Open integrated terminal
2. Split terminal (Ctrl/Cmd + Shift + 5)
3. Run different commands in each pane

### tmux Users
```bash
# Create new session
tmux new -s rise-dev

# Split horizontally
Ctrl+b %

# Split vertically
Ctrl+b "

# Navigate between panes
Ctrl+b [arrow keys]
```

### Terminal App with Tabs
1. Open 3 tabs
2. Name them: "Chain", "Contracts", "Frontend"
3. Run respective commands in each

## Development Workflow

### 1. Initial Setup
```bash
# First time setup
npm install
npm run setup
npm run validate

# Copy and configure environment
cp .env.example .env
# Edit .env with your private key
```

### 2. Start Development
```bash
# Easy mode
npm run dev:all

# OR manual mode
npm run chain          # Terminal 1
npm run watch-deploy   # Terminal 2
npm run dev           # Terminal 3
```

### 3. Make Changes
- Edit contracts in `contracts/src/`
- Edit frontend in `frontend/src/`
- Changes auto-reload in browser
- Contracts auto-deploy on save (if using watch-deploy)

### 4. Test Your Changes
```bash
# Test contracts
cd contracts && forge test

# Test specific contract
cd contracts && forge test --match-contract MyContract

# Test with gas report
cd contracts && forge test --gas-report
```

### 5. Deploy to Testnet
```bash
# Make sure .env has your private key
npm run deploy-and-sync -- -n rise_testnet

# With verification
npm run deploy-and-sync -- -n rise_testnet -v
```

## Common Issues

### Port Already in Use
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8545 (blockchain)
lsof -ti:8545 | xargs kill -9
```

### Contract Changes Not Deploying
1. Check that watch-deploy is running
2. Save the file again (sometimes file watchers miss changes)
3. Check for compilation errors in terminal

### Frontend Not Updating
1. Check browser console for errors
2. Try hard refresh (Ctrl/Cmd + Shift + R)
3. Restart dev server

### Out of Gas Errors
1. Check your wallet balance
2. For token deployments, gas is automatically increased
3. Manual override: Add `--gas-limit 5000000` to deploy command

## Tips & Tricks

### Speed Up Development
- Use `dev:all` for quick starts
- Keep terminals organized with clear names
- Use VS Code's integrated terminal for everything in one window

### Debugging Contracts
```bash
# Get detailed traces
cd contracts
forge test -vvvv

# Fork from specific block
npm run chain -- --fork-block-number 12345
```

### Managing Multiple Contracts
```bash
# Deploy specific contracts
npm run deploy-and-sync -- -s DeployToken -s DeployNFT

# Deploy all contracts
npm run deploy-and-sync -- -a
```

### Reset Everything
```bash
# Nuclear option - clean everything
npm run reset

# Just clear caches
npm run reset:cache
```

## Environment Variables

### Required
- `PRIVATE_KEY` - Your deployer wallet private key

### Optional
- `RISE_RPC_URL` - Custom RPC endpoint (default: testnet)
- `RISE_WS_URL` - Custom WebSocket endpoint
- `NEXT_PUBLIC_RISE_RPC_URL` - Frontend RPC endpoint
- `NEXT_PUBLIC_RISE_WS_URL` - Frontend WebSocket endpoint

## Next Steps

1. Review the [README](./README.md) for feature overview
2. Check [contracts guide](./docs/contracts-guide.md) for smart contract development
3. See [frontend guide](./docs/frontend-guide.md) for UI development
4. Explore example implementations in the codebase

Happy building! 🚀