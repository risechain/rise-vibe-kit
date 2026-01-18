# RISE Vibe Kit 🚀

> Full-stack TypeScript template for building lightning-fast dApps on RISE blockchain

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.23-orange)](https://soliditylang.org/)
[![Wagmi](https://img.shields.io/badge/Wagmi-v3-purple)](https://wagmi.sh)

<img src="vibing.png" alt="RISE Vibe Kit" />

## ⚡ What Makes This Special?

- **5ms Transactions** - No more waiting for confirmations
- **Real-Time WebSocket Events** - UI updates instantly when contracts emit events
- **Embedded Wallets** - No MetaMask required, works in any browser
- **Auto-Generated ABIs** - Deploy contracts, frontend sync happens automatically
- **Session Keys** - Gasless-like UX with secure delegation
- **Production Ready** - Next.js 15, Tailwind v4, TypeScript strict mode

## 🎯 Quick Start

### Prerequisites
- Node.js 18+
- [Bun](https://bun.sh/) installed (`curl -fsSL https://bun.sh/install | bash`)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed

### 1. Install Dependencies

```bash
bun install
```

This automatically installs both frontend and Foundry contract dependencies.

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your private key:
```env
PRIVATE_KEY=0x...
```

**Need testnet funds?** Get ETH from the [RISE faucet](https://testnet.riselabs.xyz).

### 3. Deploy Contracts & Start Dev Server

```bash
# Deploy contracts and sync ABIs to frontend
bun run deploy-and-sync

# Start development server
bun run dev
```

**That's it!** Open [http://localhost:3000](http://localhost:3000)

Your contracts are deployed and the frontend is connected. Try the Chat app at `/chat` or the FrenPet game at `/frenpet`.

## 📁 Project Structure

```
rise-vibe-kit/
├── contracts/              # Foundry smart contracts
│   ├── src/               # Solidity files (ChatApp, FrenPet)
│   ├── script/            # Deployment scripts
│   └── test/              # Contract tests
│
├── frontend/              # Next.js 15 application
│   ├── src/
│   │   ├── app/          # Pages (chat, frenpet, debug, events)
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── config/       # Chain & wallet configuration
│   │   └── contracts/    # 🤖 AUTO-GENERATED (ABIs & addresses)
│   └── package.json
│
├── scripts/              # Automation (TypeScript)
│   ├── deploy-and-sync.sh    # Deploy + sync ABIs
│   ├── sync-contracts.ts     # Sync ABIs to frontend
│   └── setup.sh             # Initial setup
│
└── .env                  # Environment variables
```

## 🎮 Example Apps Included

### 💬 Chat App (`/chat`)
Real-time messaging with community karma voting

- Register username
- Send messages (instantly broadcast via WebSocket)
- Upvote/downvote messages
- Karma leaderboard

**Contract**: `chatApp.sol`

### 🐾 FrenPet Game (`/frenpet`)
Virtual pet with progression and battles

- Create and name your pet
- Feed and play with your pet
- Battle other pets (VRF-powered randomness)
- Level up through experience
- Stats decay over time

**Contract**: `FrenPet.sol`

### 🧪 Test Page (`/test`)
Session key testing ground

- Create and manage session keys
- Test transactions with/without session keys
- Transfer MockUSD tokens
- Debug wallet permissions

## 🛠️ Available Commands

| Command | Description |
|---------|------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run deploy-and-sync` | Deploy contracts + sync ABIs |
| `bun run sync-contracts` | Sync ABIs only (no deploy) |
| `bun run test` | Run contract tests |
| `bun run clean` | Clean build artifacts |
| `bun run chain` | Start local Anvil fork |

## 🔧 Common Tasks

### Add a New Smart Contract

1. **Create contract**
   ```bash
   touch contracts/src/MyContract.sol
   ```

2. **Write Solidity code**
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.23;

   contract MyContract {
       uint256 public value;

       event ValueChanged(uint256 newValue);

       function setValue(uint256 _value) external {
           value = _value;
           emit ValueChanged(_value);
       }
   }
   ```

3. **Create deployment script**
   ```bash
   touch contracts/script/DeployMyContract.s.sol
   ```

4. **Deploy and sync**
   ```bash
   bun run deploy-and-sync -- -s DeployMyContract
   ```

5. **Use in frontend**
   ```typescript
   import { MYCONTRACT_ADDRESS, MYCONTRACT_ABI } from '@/contracts/contracts';
   ```

### Subscribe to Contract Events

```typescript
import { useContractEvents } from '@/hooks/useContractEvents';

function MyComponent() {
  // Real-time events only
  const { events } = useContractEvents('MyContract');

  // With historical data + caching
  const {
    events,
    isLoading,
    fetchMore,
    hasMore
  } = useContractEvents('MyContract', 'ValueChanged', {
    enableHistorical: true,  // Fetch past events
    autoFetch: true,         // Start fetching on mount
    blockRange: 500,         // Fetch 500 blocks at a time
    cacheOptions: {
      storage: 'indexeddb',  // Persist to IndexedDB
      ttl: 10 * 60 * 1000,   // 10 minute cache
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

### Create Contract Interaction Hook

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
  const getValue = useCallback(async (): Promise<bigint> => {
    if (!publicClient) throw new Error('Client not available');

    const result = await publicClient.readContract({
      address: MYCONTRACT_ADDRESS,
      abi: MYCONTRACT_ABI,
      functionName: 'getValue',
    });

    return result as bigint;
  }, [publicClient]);

  // Write function
  const setValue = useCallback(async (value: bigint) => {
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

## 🔑 Key Technologies

### Wagmi v3 + Viem v2
Modern TypeScript libraries for Ethereum development

- **`useConnection()`** - Wallet connection state
- **`useReadContract()`** - Read contract data
- **`useRiseWalletTransaction()`** - Execute transactions

### Rise Wallet
Embedded browser wallet with advanced features

- No browser extension required
- WebAuthn/Passkey authentication
- Session keys for improved UX
- Granular permissions system

### Session Keys
Delegate transaction signing for gasless-like experience

```typescript
const {
  keyPair,              // Current session key
  hasUsableSessionKey,  // Is session key valid?
  createSessionKey,     // Create new session key
  revokeSessionKey,     // Revoke session key
  activeSessionKeys,    // List all active keys
} = useRiseWalletSessionKey();

// Use session key in transaction
await execute({
  calls: [{ to: CONTRACT_ADDRESS, data }],
  sessionKey: hasUsableSessionKey && keyPair ? keyPair : undefined,
});
```

## 📊 How It Works

### Contract Deployment → Frontend Sync Flow

```
1. Deploy Contracts
   ↓
   forge script script/DeployAll.s.sol --broadcast

2. Broadcast Data Saved
   ↓
   contracts/broadcast/.../run-latest.json

3. Sync Script Runs
   ↓
   scripts/sync-contracts.ts
   - Reads broadcast JSON
   - Extracts contract addresses
   - Copies ABIs from contracts/out/

4. Frontend Files Generated
   ↓
   frontend/src/contracts/contracts.ts
   ├── Contract addresses
   ├── Transaction hashes
   └── ABIs

5. Use in Components
   ↓
   import { CHATAPP_ADDRESS, CHATAPP_ABI } from '@/contracts/contracts';
```

### Real-Time Event Flow

```
Smart Contract Emits Event
    ↓
WebSocket (wss://testnet.riselabs.xyz/ws)
    ↓
WebSocketProvider (Viem watchLogs)
    ↓
useContractEvents() Hook
    ↓
React Component
    ↓
UI Updates Instantly ⚡
```

## 🐛 Debugging

### Built-in Debug Pages

- **`/debug`** - Contract state, transaction history, WebSocket status
- **`/events`** - Real-time contract event viewer
- **`/test`** - Session key and transaction testing

### Contract Tests

```bash
cd contracts
forge test -vvv              # Verbose output
forge test --match TestName  # Run specific test
```

## 🚢 Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
bun run vercel-deploy:preview

# Deploy to production
bun run vercel-deploy
```

### Pre-Deployment Checklist

- [ ] Run `bun run build` and fix TypeScript errors
- [ ] Run `bun run test` to verify contracts
- [ ] Test on RISE testnet thoroughly
- [ ] Set production `PRIVATE_KEY` in Vercel environment variables
- [ ] Verify contract addresses in `frontend/src/contracts/contracts.ts`
- [ ] Test wallet connection and WebSocket connectivity

## ⚙️ Configuration

### Environment Variables (`.env`)

```env
# Required for contract deployment
PRIVATE_KEY=0x...

# Optional: Override RPC endpoints
NEXT_PUBLIC_RISE_RPC_URL=https://testnet.riselabs.xyz
NEXT_PUBLIC_RISE_WS_URL=wss://testnet.riselabs.xyz/ws
```

### Chain Configuration

**RISE Testnet**
- **Chain ID**: 11155931
- **RPC**: `https://testnet.riselabs.xyz`
- **WebSocket**: `wss://testnet.riselabs.xyz/ws`
- **Explorer**: [RISE Block Explorer](https://testnet.riselabs.xyz)

## 💡 Pro Tips

### Performance Optimization

1. **Use event caching for historical data**
   ```typescript
   useContractEvents('ChatApp', 'MessageSent', {
     enableHistorical: true,
     cacheOptions: { storage: 'indexeddb' }
   });
   ```

2. **Batch contract reads**
   ```typescript
   const { data } = useReadContracts({
     contracts: [
       { address: CHAT_ADDRESS, abi: CHAT_ABI, functionName: 'getUser' },
       { address: CHAT_ADDRESS, abi: CHAT_ABI, functionName: 'getKarma' },
     ]
   });
   ```

3. **Configure query caching**
   ```typescript
   const { data } = useReadContract({
     address: CONTRACT_ADDRESS,
     abi: CONTRACT_ABI,
     functionName: 'getValue',
     query: {
       staleTime: 60_000,  // Consider fresh for 1 minute
       gcTime: 300_000,    // Keep in cache for 5 minutes
     }
   });
   ```

### Common Gotchas

- **Private Keys**: Never commit `.env` files to git
- **WebSocket**: Test connectivity if events aren't arriving
- **Gas Costs**: You need testnet ETH even on testnet
- **Session Keys**: Ensure permissions match your contract calls
- **Event Ordering**: Sort by block number for chronological order

### Security Best Practices

- Use OpenZeppelin contracts for security patterns
- Validate all user inputs before contract calls
- Test session key permissions thoroughly
- Never expose private keys in frontend code
- Audit contracts before mainnet deployment

## 📚 Resources

### RISE Blockchain
- [Testnet Faucet](https://testnet.riselabs.xyz/faucet)
- [Block Explorer](https://testnet.riselabs.xyz)
- [Documentation](https://docs.riselabs.xyz)

### Technology Stack
- [Wagmi v3 Docs](https://wagmi.sh)
- [Viem v2 Docs](https://viem.sh)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Foundry Book](https://book.getfoundry.sh)
- [Tailwind CSS](https://tailwindcss.com)

## 🎓 Learning Path

### New to dApps?

1. Run the quick start guide
2. Explore the Chat app (`/chat`)
3. Read `contracts/src/chatApp.sol`
4. Explore `frontend/src/components/chat/ChatInterface.tsx`
5. Make small UI changes and see them live

### Know React + Solidity?

1. Add a new function to `chatApp.sol`
2. Re-deploy with `bun run deploy-and-sync`
3. Create a custom hook for your function
4. Build a UI component using the hook
5. Add real-time event subscriptions

### Ready for Production?

1. Build a new contract from scratch
2. Implement complex state management
3. Add VRF randomness (study `FrenPet.sol`)
4. Optimize gas usage
5. Add comprehensive error handling
6. Deploy to production

## 🤝 Contributing

Found a bug? Want to improve the template?

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (`bun run build`, `bun run test`)
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [Wagmi](https://wagmi.sh) - React Hooks for Ethereum
- [Viem](https://viem.sh) - TypeScript Ethereum library
- [Next.js](https://nextjs.org) - React framework
- [Foundry](https://getfoundry.sh) - Solidity toolkit
- [Rise Wallet](https://riselabs.xyz) - Embedded wallet solution

---

**Start building on RISE today!** 🚀

*Questions? Check out the [detailed AGENTS.md](./AGENTS.md) for comprehensive engineering documentation.*
