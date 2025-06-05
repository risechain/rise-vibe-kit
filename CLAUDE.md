# CLAUDE.md

## Code Style

Do not use emojis in code / comments / documentation.

## Repo 

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start frontend development server
cd frontend && npm run dev

# Run local blockchain fork
npm run chain

# Run contract tests
cd contracts && forge test

# Run contract tests with gas reporting
cd contracts && forge test --gas-report

# Run a specific test
cd contracts && forge test --match-test testFunctionName

# Build contracts
cd contracts && forge build

# Frontend linting
cd frontend && npm run lint
```

### Deployment
```bash
# Deploy contracts and sync to frontend (main command)
npm run deploy-and-sync

# Deploy with custom script
npm run deploy-and-sync -- -s ScriptName

# Deploy with verification
npm run deploy-and-sync -- -v

# Deploy to local network
npm run deploy-and-sync -- -n localhost

# Manual contract sync
npm run sync-contracts
```

## Architecture

### Smart Contracts (Foundry)
- **Location**: `/contracts/src/`
- **Deployment**: Scripts in `/contracts/script/`
- **Testing**: Tests in `/contracts/test/`
- **Network**: RISE Testnet (chainId: 11155931)
- **VRF Coordinator**: `0x9d57aB4517ba97349551C876a01a7580B1338909`

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **Key Hooks**:
  - `useContract()` - Type-safe contract interactions
  - `useContractEvents()` - Real-time event subscriptions
  - `useRiseContract()` - Synchronous transactions via Shred Client
  - `useEmbeddedWallet()` - Browser-based wallet management

### Contract Syncing
The `deploy-and-sync` command automatically:
1. Deploys contracts to RISE testnet
2. Extracts ABIs to `/frontend/contracts/abi/`
3. Updates contract addresses in `/frontend/src/contracts/contracts.ts`
4. Generates TypeScript types

### WebSocket Integration
- **Manager**: `/frontend/src/lib/websocket/RiseWebSocketManager.ts`
- **Provider**: `/frontend/src/providers/WebSocketProvider.tsx`
- **Method**: `rise_subscribe` for real-time events
- **Auto-reconnection** and event deduplication built-in

### Key Dependencies
- **rise-shred-client**: Synchronous transaction support
- **wagmi v2**: Ethereum React hooks
- **viem v2**: TypeScript Ethereum library
- **ethers v6**: Ethereum utilities