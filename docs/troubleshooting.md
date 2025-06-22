# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common issues you might encounter while developing with RISE Vibe Kit and their solutions.

## Installation Issues

### Node Version Errors

**Problem**: `Error: Node.js version 16.x.x is not supported`

**Solution**:
```bash
# Check current version
node --version

# Install Node 18+ using nvm
nvm install 18
nvm use 18

# Or using fnm
fnm install 18
fnm use 18
```

### Foundry Installation Fails

**Problem**: `foundryup: command not found`

**Solution**:
```bash
# Re-run installation
curl -L https://foundry.paradigm.xyz | bash

# Add to PATH (add to .bashrc or .zshrc)
export PATH="$HOME/.foundry/bin:$PATH"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc

# Verify
forge --version
```

### Dependencies Installation Timeout

**Problem**: `npm install` hangs or times out

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Try with different registry
npm install --registry https://registry.npmjs.org/

# Or use yarn
yarn install
```

## Contract Development Issues

### Import Errors

**Problem**: `Error: Source "@openzeppelin/contracts/token/ERC20/ERC20.sol" not found`

**Solution**:
```bash
cd contracts

# Install dependencies
forge install openzeppelin/openzeppelin-contracts@v5.0.0 --no-commit

# Update remappings
forge remappings > remappings.txt

# Verify remappings
cat remappings.txt
```

### Compilation Errors

**Problem**: `ParserError: Source file requires different compiler version`

**Solution**:
```solidity
// In foundry.toml
[profile.default]
solc = "0.8.23"  # Match your contract version

// In contract
pragma solidity ^0.8.23;  # Use consistent version
```

### Test Failures

**Problem**: Tests pass locally but fail in CI

**Solution**:
```bash
# Ensure deterministic testing
forge test --no-match-test "test_Fuzz" # Skip fuzz tests
forge test --gas-limit 30000000        # Increase gas limit

# Check fork URL
forge test --fork-url $RISE_TESTNET_RPC
```

## Frontend Issues

### WebSocket Connection Errors

**Problem**: `WebSocket connection to 'wss://...' failed`

**Solution**:

1. Check `.env.local`:
```env
NEXT_PUBLIC_RISE_WEBSOCKET_URL=wss://testnet.rise.chain
```

2. Debug in browser console:
```javascript
// Test WebSocket manually
const ws = new WebSocket('wss://testnet.rise.chain');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

3. Check WebSocket manager (`frontend/src/lib/websocket/RiseWebSocketManager.ts`):
```typescript
// Add more logging
private handleError(error: Event) {
  console.error('WebSocket error details:', {
    readyState: this.ws?.readyState,
    url: this.wsUrl,
    error
  });
}
```

### Transaction Failures

**Problem**: `Transaction failed: insufficient funds`

**Solution**:

1. Check wallet balance:
```typescript
const balance = await publicClient.getBalance({ address });
console.log('Balance:', formatEther(balance));
```

2. For embedded wallets, ensure funding:
```typescript
// In development, fund embedded wallet
if (isEmbedded && balance < parseEther('0.1')) {
  alert('Please fund your embedded wallet');
}
```

### Contract Sync Issues

**Problem**: `Cannot read properties of undefined (reading 'address')`

**Solution**:

1. Check if contracts are deployed:
```bash
# Verify deployment
ls contracts/broadcast/*/run-latest.json
```

2. Re-run sync:
```bash
npm run deploy-and-sync
```

3. Check `contracts.ts`:
```typescript
// frontend/src/contracts/contracts.ts should not be empty
console.log('Contracts:', contracts);
```

### Type Errors

**Problem**: `Type 'bigint' is not assignable to type 'number'`

**Solution**:
```typescript
// Use proper BigInt handling
const value = BigInt(amount);
const formatted = formatEther(value); // For display
const number = Number(value); // Only for small values

// In function parameters
function myFunction(amount: bigint) { // Not number
  // ...
}
```

### Build Errors

**Problem**: `Module not found: Can't resolve '@/components/...'`

**Solution**:

1. Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. Clear Next.js cache:
```bash
rm -rf .next
npm run build
```

## Deployment Issues

### Gas Estimation Errors

**Problem**: `Error: gas required exceeds allowance`

**Solution**:

1. Increase gas limit in deployment:
```solidity
// In deployment script
vm.txGasLimit(5_000_000);
```

2. For token deployments:
```typescript
// frontend/src/lib/rise-sync-client.ts
const isTokenDeploy = this.isTokenDeployment(tx.data);
const gasLimit = isTokenDeploy ? 5_000_000n : 300_000n;
```

### Nonce Issues

**Problem**: `Error: nonce too low`

**Solution**:

1. Reset nonce manager:
```typescript
// In RiseSyncClient
this.nonceManager.clear();
const freshNonce = await provider.getTransactionCount(address);
this.nonceManager.set(address, freshNonce);
```

2. Wait for pending transactions:
```typescript
const pending = await provider.getTransactionCount(address, 'pending');
const confirmed = await provider.getTransactionCount(address, 'latest');
if (pending > confirmed) {
  // Wait for pending transactions
}
```

### Contract Verification Failures

**Problem**: `Failed to verify contract`

**Solution**:
```bash
# Ensure correct compiler version
forge verify-contract \
  --chain-id 66666 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.23+commit.f704f362 \
  0xYourAddress \
  src/YourContract.sol:YourContract \
  --etherscan-api-key $API_KEY
```

## Performance Issues

### Slow Page Loads

**Problem**: Initial page load is slow

**Solution**:

1. Implement code splitting:
```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

2. Optimize imports:
```typescript
// Instead of
import { wagmi } from 'wagmi';

// Use specific imports
import { useAccount, useContractRead } from 'wagmi';
```

### Memory Leaks

**Problem**: Page becomes slow after time

**Solution**:

1. Clean up subscriptions:
```typescript
useEffect(() => {
  const unsubscribe = subscribeToEvent('Transfer', handler);
  
  return () => {
    unsubscribe(); // Clean up!
  };
}, []);
```

2. Limit event storage:
```typescript
// In WebSocketProvider
const MAX_EVENTS = 1000;
setEvents(prev => [...prev.slice(-MAX_EVENTS), newEvent]);
```

## Development Workflow Issues

### Hot Reload Not Working

**Problem**: Changes don't appear in browser

**Solution**:

1. Check Next.js dev server:
```bash
# Restart dev server
npm run dev
```

2. Clear browser cache:
```
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

3. Check for syntax errors in console

### Environment Variables Not Loading

**Problem**: `process.env.NEXT_PUBLIC_* is undefined`

**Solution**:

1. Restart dev server after changing `.env.local`

2. Ensure proper prefix:
```env
# ✅ Correct (for client-side)
NEXT_PUBLIC_RISE_RPC=https://testnet.rise.chain

# ❌ Wrong (not accessible in browser)
RISE_RPC=https://testnet.rise.chain
```

3. Check file location:
```
frontend/
  .env.local    # ✅ Correct location
  .env          # ❌ Wrong - use .env.local
```

## RISE-Specific Issues

### Sync Transaction Not Working

**Problem**: `eth_sendRawTransactionSync is not a function`

**Solution**:

1. Check wallet type:
```typescript
console.log('Wallet type:', walletClient?.transport?.name);
// Should be 'embedded' for sync transactions
```

2. Ensure proper setup:
```typescript
// Only works with embedded wallets
if (walletClient?.transport?.name !== 'embedded') {
  console.warn('Sync transactions require embedded wallet');
}
```

### Events Not Appearing

**Problem**: Real-time events not showing

**Solution**:

1. Check WebSocket connection on `/websocket-test` page

2. Verify contract subscription:
```typescript
// In RiseWebSocketManager
console.log('Subscribed contracts:', this.subscriptions);
```

3. Check event decoding:
```typescript
// Add logging to decode function
console.log('Raw event:', logs);
console.log('Decoded:', decodedEvent);
```

## Debugging Tools

### Browser DevTools

1. **Network Tab**: Monitor WebSocket frames
   - Filter by WS
   - Check for rise_subscribe messages

2. **Console Commands**:
```javascript
// Check wagmi state
window.wagmi = wagmi;

// Check contract connections
console.log(window.ethereum);

// Test WebSocket
new WebSocket('wss://testnet.rise.chain');
```

### Debug Pages

1. **`/debug`**: Test contract interactions
2. **`/events`**: Monitor real-time events
3. **`/websocket-test`**: Debug WebSocket connection

### Logging

Add debug logging:
```typescript
// Enable in development
if (process.env.NODE_ENV === 'development') {
  console.log('[WebSocket]', message);
  console.log('[Transaction]', receipt);
  console.log('[Contract]', { address, abi });
}
```

## Getting Help

If you're still stuck:

1. **Check existing issues**: [GitHub Issues](https://github.com/risechain/rise-vibe-kit/issues)

2. **Join Discord**: [RISE Discord](https://discord.gg/rise)

3. **Create detailed issue**:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant code snippets

4. **Debug Information**:
```bash
# Collect system info
npx envinfo --system --binaries --browsers

# Contract info
forge --version
cd contracts && forge config

# Frontend info
cd frontend && npm list wagmi viem next
```