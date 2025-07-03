# Core Concepts

RISE blockchain introduces unique features that enable real-time dApps with instant feedback. This guide covers the key concepts you need to understand.

## Shreds: Sub-block Events

Shreds are RISE's innovation for real-time blockchain events. Unlike traditional blockchains that emit events only when blocks are finalized, RISE streams events as transactions execute.

**Key Points:**
- Events are delivered via WebSocket subscriptions
- Sub-second latency for user actions
- Perfect for chat, gaming, and interactive dApps

## eth_sendRawTransactionSync

RISE's synchronous transaction method eliminates the wait for transaction receipts.

**Traditional Flow:**
```javascript
// Standard Ethereum - requires polling
const txHash = await wallet.sendTransaction(tx)
const receipt = await provider.waitForTransaction(txHash) // Wait for block
```

**RISE Flow:**
```javascript
// RISE - instant receipt
const receipt = await riseSyncClient.sendTransactionSync(tx)
// Receipt available immediately!
```

**Benefits:**
- No polling required
- Instant transaction confirmation
- Better UX for embedded wallets
- Reduces RPC calls

## rise_subscribe

Subscribe to real-time contract events via WebSocket.

**Usage:**
```javascript
// Subscribe to all events from a contract
ws.send({
  method: "rise_subscribe",
  params: ["logs", {
    address: contractAddress,
    topics: [] // All events
  }]
})

// Receive events in real-time
ws.on("message", (data) => {
  // Event delivered as soon as transaction executes
})
```

**Event Flow:**
1. User performs action (e.g., sends message)
2. Transaction executes with `eth_sendRawTransactionSync`
3. Events stream via `rise_subscribe` to all subscribers
4. UI updates instantly for all users

## Embedded Wallets with Shreds

The Shreds library enables browser-based wallets that work seamlessly with RISE's real-time features.

**Key Features:**
- No browser extension required
- Automatic nonce management
- Optimized for synchronous transactions
- Built-in gas estimation

**Example:**
```javascript
import { createEmbeddedWallet } from 'shreds'

const wallet = await createEmbeddedWallet()
// Ready to use with instant transactions!
```

## Putting It All Together

These features combine to create responsive dApps:

1. **User Action** → Embedded wallet signs transaction
2. **Instant Confirmation** → `eth_sendRawTransactionSync` returns receipt
3. **Real-time Updates** → Events stream to all users via `rise_subscribe`
4. **UI Updates** → All connected clients see changes immediately

This architecture enables experiences that feel like traditional web apps while maintaining blockchain security and decentralization.

## Next Steps

- [Building Apps](building-apps.md) - Create your first RISE dApp
- [API Reference](api-reference.md) - Detailed method documentation
- [Examples](examples.md) - See these concepts in action