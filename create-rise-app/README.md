# create-rise-app

Create RISE blockchain dApps with one command.

## Quick Start

```bash
npx create-rise-app my-rise-dapp
```

## Usage

### Interactive Mode

Run without arguments to use the interactive prompts:

```bash
npx create-rise-app
```

### With Arguments

```bash
# Create app with specific template
npx create-rise-app my-pump-clone --template pump

# Create app with all templates
npx create-rise-app my-rise-suite --template all

# Skip all prompts
npx create-rise-app my-app -y
```

## Available Templates

- **chat** - Real-time messaging with karma system
- **pump** - Token launchpad like pump.fun
- **frenpet** - Virtual pet game with VRF battles
- **all** - All templates included

## Options

- `-t, --template <template>` - Template to use (chat, pump, frenpet, all)
- `-y, --yes` - Skip prompts and use defaults
- `--no-git` - Skip git initialization
- `--no-install` - Skip dependency installation

## What's Included

Each template comes with:

- Smart contracts written in Solidity
- Frontend built with Next.js and TypeScript
- Blockchain integration using wagmi
- Real-time updates via WebSocket
- Production-ready UI components
- Deployment scripts

## Development

After creating your app:

```bash
cd my-rise-dapp

# Start local blockchain
npm run chain

# Deploy contracts
npm run deploy-and-sync

# Start development server
npm run dev
```

## License

MIT