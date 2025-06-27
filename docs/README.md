# RISE Vibe Kit Documentation

Welcome to the comprehensive documentation for RISE Vibe Kit. This guide will help you build high-performance dApps on the RISE blockchain.

## 📚 Documentation Structure

### Getting Started
- **[Installation Guide](./installation.md)** - Set up your development environment
- **[Dependencies Guide](./dependencies.md)** - Understanding the tech stack

### Core Concepts
- **[Project Structure](./structure.md)** - Architecture and code organization
- **[RISE Methods](./rise-methods.md)** - Using `eth_sendRawTransactionSync` and `rise_subscribe`

### Development Guides
- **[Frontend Guide](./frontend-guide.md)** - Building user interfaces
- **[Contracts Guide](./contracts-guide.md)** - Smart contract development
- **[Creating Templates](./creating-templates.md)** - How to create new app templates
- **[Adding Features](./adding-features.md)** - Process for adding features to the base kit

### Support
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## 🚀 Quick Start

```bash
# Install create-rise-app globally (recommended)
npm install -g create-rise-app

# Create a new RISE app
create-rise-app my-app
cd my-app

# Start development
npm run chain           # Terminal 1: Local blockchain
npm run deploy-and-sync # Terminal 2: Deploy & sync contracts  
cd frontend && npm run dev # Terminal 3: Start frontend
```

## 🎯 Key Features

### 1. Sub-second Transactions
RISE's `eth_sendRawTransactionSync` provides instant transaction receipts:
```typescript
const receipt = await riseSyncClient.sendTransaction(tx);
// Receipt available immediately!
```

### 2. Real-time Events
WebSocket subscriptions via `rise_subscribe` for live updates:
```typescript
const { events } = useRiseWebSocket();
// Events appear in real-time
```

### 3. Embedded Wallets
Seamless UX with browser-based wallets:
```typescript
const { createWallet } = useEmbeddedWallet();
// No extension required
```

## 📖 Learning Path

### For Beginners
1. Start with [Installation](./installation.md)
2. Review [Project Structure](./structure.md)
3. Follow the [Frontend Guide](./frontend-guide.md)
4. Deploy your first contract with [Contracts Guide](./contracts-guide.md)

### For Experienced Developers
1. Jump to [RISE Methods](./rise-methods.md) for blockchain specifics
2. Review [Dependencies](./dependencies.md) for the tech stack
3. Check [Troubleshooting](./troubleshooting.md) for common issues

## 📁 Example Code Structure

```
my-app/
├── contracts/          # Solidity smart contracts
│   ├── src/           # Contract source files
│   ├── script/        # Deployment scripts
│   └── test/          # Contract tests
│
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/      # Pages and layouts
│   │   ├── components/ # React components
│   │   ├── hooks/    # Custom hooks
│   │   └── lib/      # Core libraries
│   └── public/       # Static assets
│
└── scripts/          # Automation scripts
```

## 🛠️ Development Workflow

### 1. Contract Development
```solidity
// contracts/src/MyContract.sol
contract MyContract {
    event ValueChanged(uint256 newValue);
    
    function setValue(uint256 _value) external {
        value = _value;
        emit ValueChanged(_value);
    }
}
```

### 2. Deployment
```bash
npm run deploy-and-sync
```

### 3. Frontend Integration
```typescript
// Automatically available after deployment
import { useMyContract } from '@/hooks/useMyContract';

function MyComponent() {
  const { write, subscribe } = useMyContract();
  
  // Real-time updates
  useEffect(() => {
    return subscribe.ValueChanged(console.log);
  }, []);
}
```

## 🔗 Important Links

- **GitHub**: [github.com/risechain/rise-vibe-kit](https://github.com/risechain/rise-vibe-kit)
- **RISE Docs**: [docs.rise.chain](https://docs.rise.chain)
- **Discord**: [discord.gg/rise](https://discord.gg/rise)
- **Testnet Faucet**: [faucet.rise.chain](https://faucet.rise.chain)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## 📄 License

RISE Vibe Kit is MIT licensed. See [LICENSE](../LICENSE) for details.