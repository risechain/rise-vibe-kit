# RISE Vibe Kit

A full-stack template for building real-time dApps on RISE using shreds

<img src="vibing.png">

## Quick Start

```bash
# Install dependencies
npm install

# Deploy contracts & start development
npm run deploy-and-sync  # Deploy contracts
npm run dev             # Start frontend at http://localhost:3000
```

## What's Included

**Real-time Transactions** - Synchronous transaction receipts with `eth_sendRawTransactionSync`
**Real-time Events** - WebSocket subscriptions via `rise_subscribe` for live updates
**Embedded Wallets** - Browser-based wallet (no MetaMask required!)
**Auto Contract Sync** - Deploy and sync contracts to frontend automatically
**Modern Stack** - Next.js 15, TypeScript, Tailwind CSS v4, Wagmi v2

## Templates

This repo includes two production-ready templates:

- **Chat** (`/chat`) - Real-time messaging with karma voting system
- **FrenPet** (`/frenpet`) - Virtual pet game with VRF battles

## Project Structure

```
rise-vibe-kit/
├── contracts/                 # Foundry smart contracts
│   ├── src/                  # chatApp.sol, FrenPet.sol
│   ├── script/               # Deployment scripts
│   └── foundry.toml          # Foundry configuration
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/              # Pages (chat, frenpet)
│   │   ├── components/       # React components
│   │   ├── contracts/        # Auto-generated ABIs & addresses
│   │   ├── hooks/            # Contract interaction hooks
│   │   ├── lib/              # rise-sync-client.ts, wallet/
│   │   └── providers/        # WebSocket provider
│   └── public/               # Static assets
├── scripts/                   # Deployment automation
│   ├── deploy-and-sync.sh    # Main deployment script
│   ├── sync-contracts.js     # ABI sync to frontend
│   ├── deploy-vercel.sh      # Vercel deployment
│   └── setup.sh              # Initial setup
└── tbd/                       # Documentation & CLI tool (archived)
    ├── docs/                 # RISE docs (reference)
    └── create-rise-app/      # CLI scaffolding tool
```

## Core Commands

```bash
npm run dev              # Start frontend (localhost:3000)
npm run chain            # Start local Anvil blockchain
npm run deploy-and-sync  # Deploy contracts & sync ABIs to frontend
npm run build            # Build for production
npm run test             # Run contract tests
npm run vercel-deploy    # Deploy to Vercel
```

## Key Files

- **Wallet**: `frontend/src/lib/wallet/` & `wagmi-embedded-connector.ts`
- **Fast TXs**: `frontend/src/lib/rise-sync-client.ts` (5ms confirmations)
- **Real-time Events**: `frontend/src/providers/WebSocketProvider.tsx`
- **Contract Hooks**: Auto-generated in `frontend/src/hooks/`

## Resources

- [RISE Documentation](https://docs.risechain.com)
- [Discord Community](https://discord.gg/risechain)
- [Foundry Docs](https://book.getfoundry.sh/)
- [Shred API](https://www.npmjs.com/package/shreds)


## License

MIT