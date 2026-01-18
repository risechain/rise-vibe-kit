# RISE Vibe Kit

> **Welcome!** This is your comprehensive guide to building dApps on RISE blockchain. 
## 🎯 What is This?

**RISE Vibe Kit** is a full-stack TypeScript template for building real-time dApps on RISE blockchain with:
- ⚡ **5ms transaction confirmations** (no waiting!)
- 🔌 **Real-time WebSocket events** (instant UI updates)
- 🌐 **Embedded browser wallets** (no MetaMask required)
- 🚀 **Automated deployment pipeline** (contracts → frontend sync)
- 🎨 **Production-ready UI** (Next.js 15 + Tailwind v4)

**Tech Stack:** Next.js 15, TypeScript, Wagmi v3, Viem v2, Foundry, Solidity 0.8.23, Rise Wallet

---

## 📁 Project Structure

```
rise-vibe-kit/
├── contracts/              # Foundry smart contracts
│   ├── src/               # Solidity contracts
│   │   ├── chatApp.sol    # Real-time messaging with karma
│   │   ├── FrenPet.sol    # Virtual pet game with VRF
│   │   └── SimpleStorage.sol
│   ├── script/            # Deployment scripts
│   └── test/              # Contract tests
│
├── frontend/              # Next.js 15 application
│   ├── src/
│   │   ├── app/          # Pages (chat, frenpet, debug)
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── config/       # Chain & wallet config
│   │   └── contracts/    # AUTO-GENERATED ABIs & addresses
│   └── package.json
│
├── scripts/              # Automation scripts (TypeScript)
│   ├── deploy-and-sync.sh    # Deploy + sync ABIs
│   ├── sync-contracts.ts     # Sync ABIs to frontend
│   ├── install-forge-deps.ts # Install Foundry deps
│   ├── setup.sh             # Initial setup
│   └── deploy-vercel.sh     # Deploy to Vercel
│
├── package.json          # Root scripts
└── .env                  # Environment variables
```

---

## 🚀 Quick Start (5 Minutes)

### **Step 1: Install Dependencies**

```bash
# Install everything (Node.js 18+, Bun, Foundry)
bun install

# This automatically:
# - Installs Foundry dependencies (forge-std, OpenZeppelin)
# - Installs frontend dependencies
```

### **Step 2: Configure Environment**

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your private key
# PRIVATE_KEY=0x...
```

**Need a test private key?**
- Use Anvil's default: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Get testnet funds from RISE faucet

### **Step 3: Deploy Contracts**

```bash
# Deploy all contracts and sync ABIs to frontend
bun run deploy-and-sync

# ✅ This will:
# 1. Compile Solidity contracts (ChatApp, FrenPet)
# 2. Deploy to RISE testnet
# 3. Generate frontend/src/contracts/contracts.ts
# 4. Update ABIs automatically
```

**Output:**
```
✅ ChatApp deployed to: 0x243aceC54D74bF4Ec8445F1337667038C4EC98DB
✅ FrenPet deployed to: 0x65e8B023aCAB6648fC7e78FF8D50b0808A6895EB
✅ Updated contracts file: frontend/src/contracts/contracts.ts
```

### **Step 4: Start Development**

```bash
# Start frontend dev server
bun run dev

# 🌐 Opens http://localhost:3000
```

**That's it!** Your dApp is live with deployed contracts.

---

## 📜 Available Scripts

### **Root Commands** (`package.json`)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `bun run setup` | Initial environment setup | First time setup |
| `bun run deploy-and-sync` | Deploy contracts + sync ABIs | After contract changes |
| `bun run deploy-and-sync -- -s Deploy` | Deploy specific script | Deploy one contract |
| `bun run deploy-and-sync -- -a` | Deploy all contracts | Deploy everything |
| `bun run sync-contracts` | Sync ABIs only (no deploy) | After manual deployment |
| `bun run dev` | Start frontend dev server | During development |
| `bun run build` | Build frontend for production | Before deployment |
| `bun run build:contracts` | Compile Solidity contracts | Test compilation |
| `bun run test` | Run contract tests | Test contracts |
| `bun run clean` | Clean build artifacts | Reset builds |
| `bun run chain` | Start local Anvil fork | Local testing |

### **Frontend Commands** (`frontend/package.json`)

| Command | What It Does |
|---------|-------------|
| `bun run dev` | Next.js dev with Turbopack |
| `bun run build` | Production build |
| `bun run lint` | ESLint check |
| `bun run type-check` | TypeScript validation |

### **Deployment Commands**

| Command | What It Does |
|---------|-------------|
| `bun run vercel-deploy` | Deploy to Vercel production |
| `bun run vercel-deploy:preview` | Deploy to Vercel preview |
| `./scripts/deploy-vercel.sh -f` | Force deploy (skip checks) |

---

## 🏗️ Architecture Deep Dive

### **How Contracts Connect to Frontend**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Deploy Contract (deploy-and-sync.sh)                    │
│    forge script script/DeployAll.s.sol --broadcast          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Broadcast Data Saved                                     │
│    contracts/broadcast/DeployAll.s.sol/11155931/           │
│    └── run-latest.json (contains addresses, tx hashes)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Sync Script Runs (sync-contracts.ts)                    │
│    - Reads broadcast JSON                                   │
│    - Extracts contract addresses                            │
│    - Copies ABIs from contracts/out/                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend Files Generated                                 │
│    frontend/src/contracts/                                  │
│    ├── contracts.ts (addresses + imports)                  │
│    └── abi/                                                │
│        ├── ChatApp.json                                    │
│        └── FrenPet.json                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Use in Components                                        │
│    import { CHATAPP_ADDRESS, CHATAPP_ABI } from            │
│            '@/contracts/contracts'                          │
└─────────────────────────────────────────────────────────────┘
```

### **Real-Time Event Flow**

```
Smart Contract Event
    ↓
WebSocket (wss://testnet.riselabs.xyz/ws)
    ↓
WebSocketProvider (Viem watchLogs)
    ↓
useContractEvents() hook
    ↓
React Component (ChatInterface, FrenPet)
    ↓
UI Updates Instantly ⚡
```

**Key Components:**
- **WebSocketProvider**: Subscribes to contract logs via Viem
- **useContractEvents**: Filters events by contract address
- **Decoded Events**: Returns typed event data with names & args

---

## 📱 Example Apps Included

### **1. Chat App** (`/chat`)
Real-time messaging with community voting

**Features:**
- Register username
- Send messages (broadcast instantly)
- Upvote/downvote messages (karma system)
- Real-time message stream via WebSocket

**Contract:** `chatApp.sol`
```solidity
registerUser(string userId)
sendMessage(string message)
giveKarma(uint256 msgId)
takeKarma(uint256 msgId)

Events:
- UserRegistered(address user, string userId)
- MessageSent(address user, string userId, string message, uint256 msgId)
- KarmaChanged(address user, string userId, int256 karma)
```

**Hook:** `useChatAppContract()`

### **2. FrenPet Game** (`/frenpet`)
Virtual pet with progression and VRF battles

**Features:**
- Create pet with custom name
- Feed pet (costs 0.001 ETH)
- Play with pet (costs 0.0005 ETH)
- Battle other pets (VRF-powered random outcomes)
- Pet stats decay over time (hunger, happiness)
- Level progression through experience

**Contract:** `FrenPet.sol`
```solidity
createPet(string name)
feedPet() payable
playWithPet() payable
initiateBattle(address opponent) payable

Events:
- PetCreated, PetFed, PetPlayed
- BattleInitiated, BattleResult
- PetLevelUp
```

**Hook:** `useFrenPet()`

### **3. Test Page** (`/test`)
Testing ground for wallet features

**Features:**
- Session key creation & management
- Transaction testing with/without session keys
- Balance display
- Transfer MockUSD tokens

---

## 🔧 Common Development Tasks

### **Add New Smart Contract**

```bash
# 1. Create contract
touch contracts/src/MyContract.sol

# 2. Write Solidity code
# pragma solidity ^0.8.23;
# contract MyContract { ... }

# 3. Create deployment script
touch contracts/script/DeployMyContract.s.sol

# 4. Deploy and sync
bun run deploy-and-sync -- -s DeployMyContract

# ✅ ABIs automatically generated in frontend/src/contracts/
```

### **Add New Frontend Page**

```bash
# 1. Create page directory
mkdir -p frontend/src/app/mypage

# 2. Create page component
touch frontend/src/app/mypage/page.tsx

# 3. Use contract hooks
import { useConnection } from 'wagmi';
import { MYCONTRACT_ADDRESS, MYCONTRACT_ABI } from '@/contracts/contracts';

export default function MyPage() {
  const { address } = useConnection();
  // Your component logic...
}
```

### **Add Contract Interaction Hook**

```typescript
// frontend/src/hooks/useMyContract.ts
import { useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { useRiseWalletTransaction } from '@/hooks/useRiseWalletTransaction';
import { MYCONTRACT_ADDRESS, MYCONTRACT_ABI } from '@/contracts/contracts';
import { encodeFunctionData } from 'viem';

export function useMyContract() {
  const { execute, isLoading } = useRiseWalletTransaction();
  const publicClient = usePublicClient();

  // Read function
  const getValue = useCallback(async (): Promise<string> => {
    if (!publicClient) throw new Error('Client not available');

    const result = await publicClient.readContract({
      address: MYCONTRACT_ADDRESS,
      abi: MYCONTRACT_ABI,
      functionName: 'getValue',
    });

    return result as string;
  }, [publicClient]);

  // Write function
  const setValue = useCallback(async (value: string) => {
    const data = encodeFunctionData({
      abi: MYCONTRACT_ABI,
      functionName: 'setValue',
      args: [value],
    });

    const result = await execute({
      calls: [{
        to: MYCONTRACT_ADDRESS,
        data,
      }],
    });

    if (!result?.success) {
      throw new Error(result?.error?.message || 'Transaction failed');
    }

    return result;
  }, [execute]);

  return {
    getValue,
    setValue,
    isLoading,
  };
}
```

### **Subscribe to Contract Events**

```typescript
import { useContractEvents } from '@/hooks/useContractEvents';

function MyComponent() {
  // Real-time events only
  const { events } = useContractEvents('MyContract');

  // With historical events + caching
  const {
    events,
    isLoading,
    fetchMore,
    hasMore
  } = useContractEvents('MyContract', 'MyEvent', {
    enableHistorical: true,
    autoFetch: true,
    blockRange: 500,
    cacheOptions: {
      storage: 'indexeddb',
      ttl: 10 * 60 * 1000, // 10 minutes
    },
  });

  return (
    <div>
      {events.map(event => (
        <div key={event.transactionHash}>
          {event.eventName}: {JSON.stringify(event.args)}
        </div>
      ))}
      {hasMore && <button onClick={fetchMore}>Load More</button>}
    </div>
  );
}
```

---

## 🔑 Key Technologies & Concepts

### **Wagmi v3 + Viem v2**
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript Ethereum library
- Use `useConnection()` for wallet state
- Use `useReadContract()` for contract reads
- Use `useRiseWalletTransaction()` for writes

### **Rise Wallet**
- Embedded browser wallet (no extensions needed)
- Supports session keys for gasless-like UX
- WebAuthn/Passkey authentication
- Permissions system for secure delegation

### **Session Keys**
```typescript
const {
  keyPair,              // Current session key
  hasUsableSessionKey,  // Is key valid?
  createSessionKey,     // Create new key
  revokeSessionKey,     // Revoke key
  activeSessionKeys,    // All active keys
} = useRiseWalletSessionKey();

// Use in transactions
await execute({
  calls: [{ to: CONTRACT, data }],
  sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
});
```

### **Real-Time Events**
- WebSocket connection to RISE testnet
- Auto-reconnect with exponential backoff
- Event filtering by contract address
- Decoded event logs with type safety

---

## 🐛 Debugging

### **Check Contract Events**
Visit `/events` page to see all contract events in real-time

### **Debug Utilities**
Visit `/debug` page for:
- Contract state inspection
- Transaction history
- WebSocket connection status

### **Browser Console**
Enable verbose logging:
```typescript
// Add to components for debugging
console.log('WebSocket events:', contractEvents);
console.log('Transaction result:', result);
```

### **Contract Tests**
```bash
cd contracts
forge test -vvv              # Verbose output
forge test --match TestName  # Specific test
```

---

## ⚙️ Configuration Files

### **Environment Variables** (`.env`)

```env
# Required: Private key for contract deployment
PRIVATE_KEY=0x...

# Optional: Override RPC endpoints
# NEXT_PUBLIC_RISE_RPC_URL=https://testnet.riselabs.xyz
# NEXT_PUBLIC_RISE_WS_URL=wss://testnet.riselabs.xyz/ws
```

### **Chain Configuration** (`src/config/chain.ts`)

```typescript
import { riseTestnet } from "viem/chains";

export const RISE_TESTNET = riseTestnet;
export const RISE_CHAIN_ID = 11155931;
export const RISE_RPC_URL = "https://testnet.riselabs.xyz";
export const RISE_WS_URL = "wss://testnet.riselabs.xyz/ws";
```

### **Foundry Config** (`contracts/foundry.toml`)

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.23"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
rise_testnet = "https://testnet.riselabs.xyz/"
```

### **Auto-Generated** (`frontend/src/contracts/contracts.ts`)

```typescript
// ⚠️ DO NOT EDIT MANUALLY - Auto-generated by sync-contracts.ts

export const contracts = {
  ChatApp: {
    address: '0x243aceC54D74bF4Ec8445F1337667038C4EC98DB',
    deploymentTxHash: '0x...',
    blockNumber: 0x201a522,
    abi: ChatAppABI
  },
  FrenPet: {
    address: '0x65e8B023aCAB6648fC7e78FF8D50b0808A6895EB',
    deploymentTxHash: '0x...',
    blockNumber: 0x201a522,
    abi: FrenPetABI
  }
} as const;

// Convenience exports
export const CHATAPP_ADDRESS = '0x243aceC54D74bF4Ec8445F1337667038C4EC98DB';
export const CHATAPP_ABI = ChatAppABI;
```

---

## 🚢 Deployment to Production

### **Vercel Deployment**

```bash
# 1. Login to Vercel
vercel login

# 2. Link project
bun run vercel-setup

# 3. Set environment variables
./scripts/setup-vercel-env.sh

# 4. Deploy to preview
bun run vercel-deploy:preview

# 5. Deploy to production
bun run vercel-deploy
```

### **Pre-Deployment Checklist**

- [ ] Run `bun run build` and fix any errors
- [ ] Run `bun run test` for contract tests
- [ ] Test on RISE testnet first
- [ ] Set production `PRIVATE_KEY` in Vercel environment
- [ ] Verify contract addresses in generated files
- [ ] Test wallet connection works
- [ ] Test WebSocket connectivity
- [ ] Monitor gas costs during testing

---

## 💡 Pro Tips

### **Performance Optimization**

1. **Use Historical Event Caching**
   ```typescript
   useContractEvents('ChatApp', 'MessageSent', {
     enableHistorical: true,
     cacheOptions: { storage: 'indexeddb' }
   });
   ```

2. **Batch Contract Reads**
   ```typescript
   const { data } = useReadContracts({
     contracts: [
       { address: CHAT_ADDRESS, abi: CHAT_ABI, functionName: 'getUser' },
       { address: CHAT_ADDRESS, abi: CHAT_ABI, functionName: 'getKarma' },
     ]
   });
   ```

3. **Enable Wagmi Query Caching**
   ```typescript
   const { data } = useReadContract({
     address: CONTRACT,
     abi: ABI,
     functionName: 'getValue',
     query: {
       staleTime: 60_000, // 1 minute
       gcTime: 300_000,   // 5 minutes
     }
   });
   ```

### **Common Gotchas**

1. **Private Keys**: Never commit `.env` files with real private keys
2. **WebSocket**: Some networks block WSS - test connectivity
3. **Gas Costs**: Even on testnet, you need ETH for gas
4. **Session Keys**: Check permissions match your contract calls
5. **Event Ordering**: WebSocket events may arrive out of order - sort by block number

### **Security Best Practices**

- Use session keys for better UX but validate permissions
- Never expose private keys in frontend code
- Validate all user inputs before contract calls
- Use OpenZeppelin contracts for security patterns
- Test contracts thoroughly before mainnet

---

## 📚 Additional Resources

### **RISE Blockchain**
- **Chain ID**: 11155931
- **RPC**: `https://testnet.riselabs.xyz`
- **WebSocket**: `wss://testnet.riselabs.xyz/ws`
- **Explorer**: Check RISE Labs explorer
- **Faucet**: Get testnet ETH from RISE faucet

### **Documentation**
- Wagmi v3: https://wagmi.sh
- Viem v2: https://viem.sh
- Next.js 15: https://nextjs.org/docs
- Foundry: https://book.getfoundry.sh
- Rise Wallet: Check Rise Labs docs

### **Key Libraries**
- `wagmi` - React hooks for Ethereum
- `viem` - TypeScript Ethereum library
- `rise-wallet` - Rise blockchain wallet integration
- `@tanstack/react-query` - Data fetching & caching
- `@radix-ui` - Headless UI components
- `tailwindcss` - Utility-first CSS
- `lucide-react` - Icon library

---

## 🎓 Learning Path

### **Beginner** (Never built a dApp before)
1. ✅ Run quick start guide
2. ✅ Deploy contracts and explore `/chat` app
3. ✅ Read `chatApp.sol` contract code
4. ✅ Explore `ChatInterface.tsx` component
5. ✅ Learn how `useChatAppContract()` works
6. ✅ Make small changes to UI
7. ✅ Add a new message feature

### **Intermediate** (Know React + Solidity basics)
1. ✅ Add new function to `chatApp.sol`
2. ✅ Re-deploy and test changes
3. ✅ Create new hook for your function
4. ✅ Build new UI component using the hook
5. ✅ Add real-time event subscription
6. ✅ Implement session keys for better UX
7. ✅ Write contract tests with Foundry

### **Advanced** (Ready to build production dApps)
1. ✅ Build new contract from scratch
2. ✅ Implement complex state management
3. ✅ Add VRF randomness (like FrenPet battles)
4. ✅ Optimize gas usage
5. ✅ Add comprehensive error handling
6. ✅ Deploy to production
7. ✅ Monitor and maintain your dApp

---

## 🤝 Contributing

Found a bug? Want to improve the template?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (`bun run build`, `bun run test`)
5. Submit a pull request

---

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **RISE Discord**: Join the community
- **Documentation**: Check `/tbd/docs/` for detailed guides

---

## 🎉 You're Ready!

You now have everything you need to build fast, real-time dApps on RISE blockchain. This template handles:

✅ Smart contract deployment
✅ ABI synchronization
✅ Wallet integration
✅ Real-time events
✅ Type-safe contract interactions
✅ Production-ready UI

**Start building and ship fast!** 🚀

---

*Last Updated: January 2026*
*RISE Vibe Kit - Built for speed, designed for developers*
