# RISE-Specific Methods

Technical reference for RISE blockchain's unique RPC methods.

## eth_sendRawTransactionSync

Submits a transaction and returns the receipt immediately.

**Traditional Flow:**
```
Send TX → Wait for block → Get receipt (15+ seconds)
```

**RISE Flow:**
```
Send TX → Get receipt instantly (< 1 second)
```

### Usage

```typescript
const receipt = await provider.request({
  method: 'eth_sendRawTransactionSync',
  params: [signedTransaction]
})
```

### Response

```typescript
{
  transactionHash: "0x...",
  blockNumber: "0x...",
  gasUsed: "0x...",
  status: "0x1",  // 1 = success, 0 = failure
  logs: [...]      // Event logs
}
```

### Implementation

See `frontend/src/lib/rise-sync-client.ts` for the full implementation that handles:
- Nonce management
- Gas estimation (5M for token deployments, 300k default)
- Error handling and retries

## rise_subscribe

Subscribe to real-time blockchain events via WebSocket.

### Usage

```javascript
// Subscribe to all events from a contract
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  method: "rise_subscribe",
  params: ["logs", {
    address: "0x...",  // Contract address
    topics: []         // Empty = all events
  }],
  id: 1
}))
```

### Event Stream

```javascript
// Events arrive as they happen
{
  jsonrpc: "2.0",
  method: "rise_subscription",
  params: {
    subscription: "0x...",
    result: {
      address: "0x...",
      topics: ["0x..."],  // Event signature
      data: "0x...",      // Event data
      blockNumber: "0x...",
      transactionHash: "0x..."
    }
  }
}
```

### Implementation

See `frontend/src/lib/websocket/RiseWebSocketManager.ts` for:
- Automatic reconnection
- Event decoding
- Multi-contract subscriptions

## Integration Pattern

```typescript
// In your React component
const { write } = useContractName()
const events = useContractEvents('ContractName')

// Send transaction - instant confirmation
const result = await write('methodName', [args])

// Events update automatically via WebSocket
// No polling or manual refreshing needed!
```

## Key Benefits

1. **Instant Feedback** - Users see results immediately
2. **No Polling** - Events stream in real-time
3. **Better UX** - Feels like Web2 applications
4. **Lower Costs** - Fewer RPC calls needed

## Common Patterns

### Optimistic Updates
```typescript
// Update UI before transaction
setLocalState(newValue)
const result = await write('update', [newValue])
if (!result.success) {
  setLocalState(oldValue) // Revert on failure
}
```

### Event-Driven UI
```typescript
// Let events drive your UI state
const messages = events
  .filter(e => e.eventName === 'MessageSent')
  .map(e => e.args)
```

## Resources

- [Core Concepts](core-concepts.md) - Understand shreds and real-time architecture
- [API Reference](api-reference.md) - Complete hook documentation
- Source code: `frontend/src/lib/`