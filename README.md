# RISE Vibe Kit

A full-stack template for building ultra-fast dApps on RISE with real-time features, automatic contract syncing, and embedded wallet support. Inspired by [scaffold-eth](https://scaffoldeth.io/)

## Quick Start

```bash
# Clone the template
git clone <your-repo-url> my-rise-app
cd my-rise-app
# Install dependencies
npm install
# Set up environment
cp .env.example .env
# Add your private key to .env
# Deploy contracts and start frontend
npm run deploy-and-sync
cd frontend && npm run dev
```

Visit http://localhost:3000 to see your app!

## What's Included

### Smart Contract Development
- **Foundry Setup**: Pre-configured for RISE testnet
- **Example Contracts**: Chat app demonstrating RISE capabilities
- **VRF Interface**: Access to near instant on-chain randomness
- **Auto-deployment Scripts**: One command to deploy and sync

### Frontend Features
- **Next.js 14**: App router with TypeScript
- **Real-time WebSockets**: Instant event updates from shreds via `rise_subscribe`
- **Embedded Wallet**: Browser-based wallet with [shred API](https://www.npmjs.com/package/rise-shred-client) integration & [eth_sendRawTransactionSync](https://ethresear.ch/t/halving-transaction-submission-latency-with-eth-sendrawtransactionsync/22482)
- **Multi-wallet Support**: MetaMask, WalletConnect, and more
- **Contract Type Safety**: Auto-generated TypeScript types
- **Debug Interface**: Interactive contract testing UI
- **Event Stream Viewer**: Real-time blockchain event monitoring

### Developer Experience
- **Hot Contract Reload**: Changes automatically sync to frontend
- **One-Command Deploy**: `npm run deploy-and-sync`
- **Multi-Contract Support**: Deploy multiple contracts seamlessly
- **Dark Mode**: Built-in theme support
- **Toast Notifications**: User-friendly transaction feedback

## 📁 Project Structure

```
rise-vibe-template/
├── contracts/              # Smart contracts (Foundry)
│   ├── src/               # Contract source files
│   ├── script/            # Deployment scripts
│   ├── test/              # Contract tests
│   └── foundry.toml       # Foundry configuration
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/          # Pages (/, /debug, /events)
│   │   ├── components/    # UI components
│   │   ├── hooks/        # Contract & wallet hooks
│   │   └── lib/          # Utilities & libraries
│   └── contracts/        # Auto-generated contract data
└── scripts/              # Build and deployment scripts
```

## Available Commands

### Deployment
```bash
# Deploy and sync contracts to frontend
npm run deploy-and-sync

# Deploy with custom script
npm run deploy-and-sync -- -s MyDeploy

# Deploy with verification
npm run deploy-and-sync -- -v

# Deploy to local network
npm run deploy-and-sync -- -n localhost
```

### Development
```bash
# Frontend development
cd frontend && npm run dev

# Run local blockchain
npm run chain

# Sync contracts manually
npm run sync-contracts
```

### Testing
```bash
# Test contracts
cd contracts && forge test

# Test with gas reporting
cd contracts && forge test --gas-report
```

## 🔧 Configuration

### Environment Variables
```env
# .env
PRIVATE_KEY=your_private_key_here

# Optional
RISE_RPC_URL=https://testnet.riselabs.xyz
RISE_WS_URL=wss://testnet.riselabs.xyz/ws
```

### Network Configuration
The template is pre-configured for RISE testnet. To add networks, edit `contracts/foundry.toml`:

```toml
[rpc_endpoints]
rise_testnet = "https://testnet.riselabs.xyz"
localhost = "http://localhost:8545"
```

## Building Your App

### 1. Create Your Contracts
Add new contracts to `contracts/src/`:
```solidity
// contracts/src/MyContract.sol
pragma solidity ^0.8.19;

contract MyContract {
    event SomethingHappened(address user, string message);
    
    function doSomething(string memory message) public {
        emit SomethingHappened(msg.sender, message);
    }
}
```

### 2. Deploy Your Contracts
Create or modify deployment scripts in `contracts/script/`:
```solidity
// contracts/script/Deploy.s.sol
contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();
        new MyContract();
        vm.stopBroadcast();
    }
}
```

Then deploy:
```bash
npm run deploy-and-sync
```

### 3. Use in Frontend
Your contracts are automatically available:
```typescript
import { useContract } from '@/hooks/useContract';

function MyComponent() {
  const { write } = useContract('MyContract');
  
  const handleClick = async () => {
    await write.doSomething(['Hello RISE!']);
  };
  
  return <button onClick={handleClick}>Do Something</button>;
}
```

## RISE-Specific Features

### Real-time Events
```typescript
// Auto-subscribed to contract events
const { events } = useContractEvents('MyContract');

// Events appear instantly
useEffect(() => {
  console.log('New event:', events[0]);
}, [events]);
```

### Synchronous Transactions
```typescript
// Get immediate receipts with RISE's sync transactions
const { write } = useRiseContract();
const receipt = await write.doSomething(['Hello!']);
console.log('Transaction confirmed:', receipt.transactionHash);
```

### Embedded Wallet
```typescript
// Auto-generates wallet on first visit
const { address, isConnected } = useEmbeddedWallet();

// Send rapid transactions with nonce management
await write.function1();
await write.function2(); // No nonce conflicts!
```

## Learn More

For detailed documentation on architecture, RISE-specific methods, and advanced usage, see [Agent.md](./Agent.md).

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

