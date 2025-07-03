# API Reference

## Contract Hooks

Auto-generated hooks for interacting with your smart contracts.

### useContractName()

Generated for each deployed contract (e.g., `useVotingApp`, `useChatApp`).

```typescript
const {
  read,           // Read contract state
  write,          // Write transactions
  isReading,      // Loading state for reads
  isWriting,      // Loading state for writes
  readError,      // Read error if any
  writeError,     // Write error if any
} = useContractName()
```

**Read Example:**
```typescript
const balance = await read('balanceOf', [address])
```

**Write Example:**
```typescript
const result = await write('transfer', [recipient, amount])
if (result.success) {
  console.log('Transaction receipt:', result.receipt)
}
```

## Event Hooks

### useContractEvents()

Subscribe to real-time contract events.

```typescript
const events = useContractEvents('ContractName')
// Returns array of decoded events with:
// - eventName: string
// - args: decoded event arguments
// - blockNumber: number
// - transactionHash: string
```

### useRiseWebSocket()

Low-level WebSocket access for custom subscriptions.

```typescript
const { 
  isConnected,
  subscribe,
  unsubscribe,
  status 
} = useRiseWebSocket()

// Subscribe to specific events
const unsubscribe = subscribe('ContractName', (event) => {
  console.log('New event:', event)
})
```

## Transaction Handling

### Embedded Wallet (Shreds)

Automatic synchronous transactions:

```typescript
// Handled automatically by contract hooks
const result = await write('methodName', args)
// result.receipt available immediately
```

### External Wallet (MetaMask)

Standard async flow with automatic handling:

```typescript
// Same API, different underlying flow
const result = await write('methodName', args)
// Hook waits for confirmation automatically
```

## Utility Functions

### getContract()

Access contract configuration:

```typescript
import { getContract } from '@/contracts/contracts'

const contract = getContract('ContractName')
// Returns: { address, abi, deploymentTxHash, blockNumber }
```

### serializeBigInt()

Serialize BigInt values for JSON:

```typescript
import { serializeBigInt } from '@/lib/utils'

const data = serializeBigInt({ value: BigInt(1000) })
// Safe for JSON.stringify()
```

## WebSocket Methods

### rise_subscribe

Subscribe to contract logs:

```typescript
{
  "method": "rise_subscribe",
  "params": ["logs", {
    "address": "0x...",
    "topics": []  // Empty for all events
  }]
}
```

### eth_sendRawTransactionSync

Send transaction and get receipt in one call:

```typescript
{
  "method": "eth_sendRawTransactionSync",
  "params": ["0x...signed_transaction"]
}
// Returns full transaction receipt immediately
```

## Error Handling

All hooks provide error states:

```typescript
const { write, writeError, isWriting } = useContract()

if (writeError) {
  console.error('Transaction failed:', writeError.message)
}
```

## TypeScript Types

Auto-generated types for all contracts:

```typescript
// Automatic type safety
const result = await read('balanceOf', [address])
// TypeScript knows result is bigint

const tx = await write('transfer', [to, amount])
// TypeScript validates parameter types
```