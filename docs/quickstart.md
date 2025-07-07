# Quickstart Guide

Get your first RISE app running in 5 minutes!

## Prerequisites

- Node.js 18+
- Git
- A code editor (VS Code recommended)

## Create Your First App

```bash
npx create-rise-app my-app
```

Choose a template:
- **Chat** - Real-time messaging with karma system
- **Pump** - Token launchpad (like pump.fun)
- **FrenPet** - Virtual pet game with battles
- **Leverage** - Perpetual futures trading

## Start Development

```bash
cd my-app
npm run dev
```

Your app will be running at `http://localhost:3000` 🎉

## Key Commands

```bash
npm run chain          # Start local blockchain (optional)
npm run deploy-and-sync # Deploy contracts to RISE testnet
npm run dev            # Start frontend development server
npm run build          # Build for production
```

## What's Next?

1. **Get Test ETH** - Visit [faucet.risechain.com](https://faucet.risechain.com)
2. **Explore Templates** - Each template demonstrates different RISE features
3. **Read Core Concepts** - Understand what makes RISE unique
4. **Build Your Own** - Follow the tutorial to create a custom dApp

## Quick Tips

- 🔐 The app includes an embedded wallet (no MetaMask needed!)
- ⚡ Transactions are instant with `eth_sendRawTransactionSync`
- 📡 Real-time updates via WebSocket (no polling needed!)
- 🛠️ Hot reload works for both frontend and contracts

Need help? Check out the [Tutorial](./tutorial.md) for a detailed walkthrough.