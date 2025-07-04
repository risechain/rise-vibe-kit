# Core Concepts

Understanding RISE's unique architecture and features.

## 🌟 What Makes RISE Different

RISE is an ultra-fast EVM blockchain that introduces two groundbreaking features:

1. **Synchronous Transactions** - Get instant receipts without waiting
2. **Real-time Event Streaming** - Subscribe to blockchain events via WebSocket

## 📦 Shreds: Sub-blocks for Speed

RISE uses "shreds" - small units of execution that are produced multiple times per second:

- Traditional blockchains: 1 block every 12+ seconds
- RISE: Multiple shreds per second
- Result: Sub-second transaction finality

## ⚡ Synchronous Transactions

### Traditional Flow
```javascript
// Normal Ethereum - Async with waiting
const tx = await contract.transfer(recipient, amount);
const receipt = await tx.wait(); // Wait 12+ seconds!
```

### RISE Flow
```javascript
// RISE - Instant synchronous receipt
const receipt = await riseSyncClient.sendTransaction({
  to: contractAddress,
  data: encodedData
});
// Receipt available immediately!
```

The magic: `eth_sendRawTransactionSync` returns the receipt instantly.

## 📡 Real-time Events with rise_subscribe

### Traditional Event Listening
```javascript
// Polling for events (inefficient)
setInterval(async () => {
  const events = await contract.queryFilter('Transfer');
  // Process events...
}, 1000);
```

### RISE Event Streaming
```javascript
// WebSocket subscription (real-time)
ws.send({
  method: 'rise_subscribe',
  params: ['logs', {
    address: contractAddress,
    topics: []
  }]
});

// Events stream in real-time
ws.on('message', (event) => {
  // Process event immediately
});
```

## 🔐 Embedded Wallets

RISE Vibe Kit includes browser-based wallets:

- No extension required
- Private keys in localStorage
- Seamless user experience
- Perfect for onboarding

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐
│   Frontend      │────▶│  RISE Sync RPC   │
│  (Next.js)      │     │ (Instant TXs)    │
└────────┬────────┘     └──────────────────┘
         │                        
         │ WebSocket              
         ▼                        
┌─────────────────┐     ┌──────────────────┐
│ WebSocket       │────▶│ rise_subscribe   │
│ Provider        │     │ (Event Stream)   │
└─────────────────┘     └──────────────────┘
```

## 💡 Key Benefits

1. **No Waiting** - Users get instant feedback
2. **Real-time UX** - UI updates as events happen
3. **Better DX** - Simpler code without polling
4. **Lower Costs** - Efficient infrastructure

## 🔧 Implementation Details

### RiseSyncClient
Handles synchronous transactions for embedded wallets:
- Manages nonces automatically
- Handles gas estimation
- Provides instant receipts

### RiseWebSocketManager
Manages WebSocket connections:
- Auto-reconnection
- Event decoding
- Subscription management

### Contract Hooks
Pre-built React hooks for common patterns:
- `useContract()` - Read/write contract data
- `useContractEvents()` - Subscribe to events
- `useEmbeddedWallet()` - Manage wallet state

Ready to see it in action? Check out the [Tutorial](./tutorial.md)!