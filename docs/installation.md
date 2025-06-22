# Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js** (v18.0.0 or higher)
  ```bash
  node --version  # Should output v18.0.0 or higher
  ```

- **npm** or **yarn** package manager
  ```bash
  npm --version   # Should output 8.0.0 or higher
  ```

- **Git** for version control
  ```bash
  git --version
  ```

- **Foundry** for smart contract development
  ```bash
  # Install Foundry
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  
  # Verify installation
  forge --version
  anvil --version
  ```

## Quick Start

### 1. Create a New RISE App

The fastest way to get started is using the create-rise-app CLI:

```bash
npx create-rise-app@latest my-rise-app
cd my-rise-app
```

### 2. Interactive Setup

The CLI will guide you through the setup process:

```bash
? What template would you like to use? (Use arrow keys)
❯ base      - Minimal RISE dApp with core infrastructure
  chat      - Real-time messaging with karma system  
  pump      - Token launchpad like pump.fun
  frenpet   - Virtual pet game with VRF battles
  perps     - Perpetual futures exchange
```

### 3. Installation Options

During setup, you can choose:
- Initialize Git repository
- Install dependencies automatically
- Configure deployment settings

## Manual Installation

If you prefer to set up manually or clone the repository:

### 1. Clone the Repository

```bash
git clone https://github.com/risechain/rise-vibe-kit.git
cd rise-vibe-kit
```

### 2. Install Dependencies

Install all dependencies from the root directory:

```bash
# Install all dependencies
npm install

# Install Foundry dependencies
cd contracts && forge install
```

### 3. Environment Setup

Create a `.env.local` file in the frontend directory:

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# RISE Network Configuration
NEXT_PUBLIC_RISE_TESTNET_RPC=https://testnet.rise.chain
NEXT_PUBLIC_RISE_MAINNET_RPC=https://rpc.rise.chain
NEXT_PUBLIC_RISE_WEBSOCKET_URL=wss://testnet.rise.chain

# Contract Deployment (optional)
PRIVATE_KEY=your_private_key_here

# API Keys (optional)
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_id
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
```

## Project Structure After Installation

```
my-rise-app/
├── contracts/              # Solidity smart contracts
│   ├── src/               # Contract source files
│   ├── script/            # Deployment scripts
│   ├── test/              # Contract tests
│   ├── lib/               # Dependencies (auto-installed)
│   └── foundry.toml       # Foundry configuration
│
├── frontend/              # Next.js application
│   ├── src/              # Application source
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── .env.local        # Environment variables
│
├── scripts/              # Utility scripts
│   ├── deploy-and-sync.sh    # Deploy contracts
│   ├── sync-contracts.js     # Sync to frontend
│   └── setup.sh             # Initial setup
│
├── package.json          # Root package file
└── README.md            # Project documentation
```

## First-Time Setup

### 1. Run Setup Script

After installation, run the setup script:

```bash
./scripts/setup.sh
```

This script:
- Verifies all dependencies
- Sets up git hooks
- Configures foundry remappings
- Creates necessary directories

### 2. Start Local Development

Start the local blockchain:

```bash
# Terminal 1 - Start Anvil fork
npm run chain
```

Deploy contracts:

```bash
# Terminal 2 - Deploy contracts
npm run deploy-and-sync
```

Start the frontend:

```bash
# Terminal 3 - Start development server
npm run dev
```

Your app will be available at `http://localhost:8080`

## Troubleshooting Installation

### Common Issues

#### 1. Foundry Installation Fails

If Foundry installation fails:

```bash
# Manual installation
git clone https://github.com/foundry-rs/foundry
cd foundry
cargo install --path ./cli --bins --locked --force
```

#### 2. Node Version Issues

If you encounter Node.js version errors:

```bash
# Using nvm
nvm install 18
nvm use 18
```

#### 3. Permission Errors

If you get permission errors during installation:

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### 4. Contract Library Issues

If Foundry libraries fail to install:

```bash
cd contracts
rm -rf lib/
forge install --no-commit
```

## Platform-Specific Instructions

### macOS

Additional requirements:
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Windows

Use WSL2 for best compatibility:
```bash
# Install WSL2
wsl --install

# Inside WSL2, follow Linux instructions
```

### Linux

Ensure build essentials are installed:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential git curl

# Fedora
sudo dnf install gcc-c++ make git curl
```

## Verifying Installation

After installation, verify everything is working:

```bash
# Check Node.js
node --version

# Check Foundry
forge --version
anvil --version

# Check project structure
ls -la contracts/src/
ls -la frontend/src/

# Run tests
cd contracts && forge test
cd ../frontend && npm run type-check
```

## Next Steps

Once installation is complete:

1. Read the [Project Structure](./structure.md) documentation
2. Learn about [RISE-specific features](./rise-methods.md)
3. Start building with our [Frontend Guide](./frontend-guide.md)
4. Deploy contracts with our [Contract Guide](./contracts-guide.md)

## Getting Help

If you encounter issues:

1. Check our [Troubleshooting Guide](./troubleshooting.md)
2. Join our [Discord](https://discord.gg/rise)
3. Open an issue on [GitHub](https://github.com/risechain/rise-vibe-kit/issues)