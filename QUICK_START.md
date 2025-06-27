# 🚀 RISE Vibe Kit - Quick Start

## First Time Setup (2 minutes)
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
npm run setup

# 3. Configure
cp .env.example .env
# Add your private key to .env
```

## Start Development (1 command)
```bash
npm run dev:all
```
This runs everything: blockchain, auto-deploy, and frontend! 🎉

## What's Running?
- 🟡 **CHAIN** - Local blockchain at http://localhost:8545
- 🔵 **DEPLOY** - Watching contracts, auto-deploying changes
- 🟢 **FRONTEND** - Next.js app at http://localhost:3000

## Common Commands

### Deploy Contracts
```bash
npm run deploy-and-sync         # Deploy once
npm run deploy-and-sync -- -a   # Deploy all contracts
```

### Development
```bash
npm run dev:all    # Start everything
npm run validate   # Check setup
npm run test       # Run tests
npm run build      # Build for production
```

### Reset/Clean
```bash
npm run reset:cache  # Clear build artifacts
npm run reset        # Clean everything
```

## Contract Development
1. Write contracts in `contracts/src/`
2. Save file → Auto-deploys (if using dev:all)
3. Frontend auto-updates with new addresses/ABIs

## Frontend Development
1. Edit files in `frontend/src/`
2. Changes hot-reload in browser
3. Use generated hooks: `useYourContract()`

## Debugging

### Check Logs
- Look at terminal output for errors
- Each process is labeled: CHAIN, DEPLOY, FRONTEND

### Manual Mode
Run in separate terminals if you need more control:
```bash
# Terminal 1
npm run chain

# Terminal 2
npm run watch-deploy

# Terminal 3
npm run dev
```

## Need Help?
- Run `npm run validate` to check setup
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed guide
- Check [troubleshooting](./docs/troubleshooting.md) for common issues

Happy building! 🏗️