# create-rise-app

Create RISE blockchain dApps with one command.

## Quick Start

```bash
# Install globally (recommended)
npm install -g create-rise-app
create-rise-app my-rise-dapp

# Or use npx
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
- `--legacy` - Use old template approach (not recommended)

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

## How It Works - Direct Template Approach

create-rise-app now uses a **direct template approach** that creates apps directly from the working directories (`frontend/`, `contracts/`, `scripts/`) rather than maintaining separate template files.

### Benefits
- ✅ Templates are always up-to-date with latest features
- ✅ No duplicate files to maintain
- ✅ Instant access to bug fixes and improvements  
- ✅ Smaller package size (29MB saved!)

### Template Configuration

Templates are configured in `src/create-app-direct.js`:
- **TEMPLATE_MAPPINGS** - Defines which files belong to each template
- **contractConfig** - Contains deployed contract addresses
- **BASE_FILES** - Common files shared across all templates

### For Contributors

To add features or modify templates:
1. Make changes in the main `/frontend/` or `/contracts/` directories
2. Update `TEMPLATE_MAPPINGS` if adding template-specific files
3. See [Creating Templates Guide](../docs/creating-templates.md) for new templates
4. See [Adding Features Guide](../docs/adding-features.md) for base features

## License

MIT