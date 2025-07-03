# RISE Vibe Kit

A full-stack template for building real-time dApps on RISE blockchain with instant transactions and live event streams.

## Quick Start

```bash
# Create a new app
npx create-rise-app@latest my-app

# Start building
cd my-app
npm run chain          # Start local blockchain
npm run deploy-and-sync # Deploy contracts
npm run dev            # Start frontend
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

## What's Included

** Instant Transactions** - Synchronous transaction receipts with `eth_sendRawTransactionSync`  
**📡 Real-time Events** - WebSocket subscriptions via `rise_subscribe` for live updates  
**🔐 Embedded Wallets** - Browser-based wallets with the Shreds library  
**🎯 Auto Contract Sync** - Deploy and sync contracts to frontend automatically  
**🎨 Modern Stack** - Next.js 15, TypeScript, Tailwind CSS v4, Wagmi v2

## Choose Your Template

```bash
npx create-rise-app@latest my-app --template chat    # Real-time chat with karma
npx create-rise-app@latest my-app --template pump    # Token launchpad
npx create-rise-app@latest my-app --template frenpet # Virtual pet game
```

## Project Structure

```
my-app/
├── contracts/                 # Foundry smart contracts
│   ├── src/                  # Contract source files
│   ├── script/               # Deployment scripts
│   ├── test/                 # Contract tests
│   └── foundry.toml          # Foundry configuration
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/              # App routes and pages
│   │   ├── components/       # React components
│   │   ├── contracts/        # Auto-generated ABIs & addresses
│   │   ├── hooks/            # Auto-generated contract hooks
│   │   ├── lib/              # Utilities (WebSocket, RiseSyncClient)
│   │   └── providers/        # React context providers
│   └── public/               # Static assets
├── scripts/                   # Build and deployment tools
│   ├── deploy-and-sync.sh    # Deploy & sync contracts
│   └── sync-contracts.js     # Contract synchronization
└── package.json              # Monorepo configuration
```

## Core Commands

```bash
npm run dev              # Start frontend development server
npm run chain            # Run local RISE fork
npm run deploy-and-sync  # Deploy contracts & sync to frontend
npm run build            # Build for production
npm run test             # Run contract tests
```

## Documentation

- [**Core Concepts**](docs/core-concepts.md) - Understand RISE's unique features
- [**Building Apps**](docs/building-apps.md) - Step-by-step guide to create custom dApps
- [**API Reference**](docs/api-reference.md) - Contract interfaces and hooks
- [**Examples**](docs/examples.md) - Code snippets and patterns

## Resources

- [RISE Documentation](https://docs.risechain.com)
- [Discord Community](https://discord.gg/rise)
- [Example Apps](https://github.com/risechain/examples)

## License

MIT