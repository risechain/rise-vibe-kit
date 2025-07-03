# Examples

Common patterns and code snippets for building on RISE.

## Real-time Chat

```typescript
// Send message with instant confirmation
const sendMessage = async (text: string) => {
  const result = await write('sendMessage', [text])
  if (result.success) {
    // Message sent and confirmed instantly
    setInput('')
  }
}

// Display messages in real-time
const messages = events
  .filter(e => e.eventName === 'MessageSent')
  .map(e => ({
    sender: e.args.sender,
    text: e.args.message,
    timestamp: e.args.timestamp
  }))
```

## Token Launch

```typescript
// Create token with immediate feedback
const launchToken = async () => {
  const result = await write('createToken', [
    name,
    symbol,
    supply
  ], {
    value: parseEther('0.01') // Creation fee
  })
  
  if (result.success) {
    // Token created! Extract address from events
    const event = result.receipt.logs.find(
      log => log.eventName === 'TokenCreated'
    )
    router.push(`/token/${event.args.tokenAddress}`)
  }
}
```

## Optimistic Updates

```typescript
function VotingComponent() {
  const [optimisticVotes, setOptimisticVotes] = useState({})
  
  const vote = async (proposalId: number) => {
    // Update UI immediately
    setOptimisticVotes(prev => ({
      ...prev,
      [proposalId]: true
    }))
    
    const result = await write('vote', [proposalId])
    
    if (!result.success) {
      // Revert on failure
      setOptimisticVotes(prev => ({
        ...prev,
        [proposalId]: false
      }))
      toast.error('Vote failed')
    }
  }
}
```

## Custom Event Filtering

```typescript
// Get events for specific user
const userEvents = events.filter(e => 
  e.eventName === 'Transfer' && 
  e.args.to === userAddress
)

// Get recent events (last 10 minutes)
const recentEvents = events.filter(e => {
  const eventTime = Number(e.blockTimestamp) * 1000
  return Date.now() - eventTime < 600000
})
```

## Error Recovery

```typescript
const robustWrite = async (method: string, args: any[]) => {
  try {
    const result = await write(method, args)
    
    if (!result.success) {
      // Handle known errors
      if (result.error?.includes('insufficient funds')) {
        toast.error('Insufficient balance')
      } else {
        toast.error('Transaction failed')
      }
      return null
    }
    
    return result
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error)
    toast.error('Something went wrong')
    return null
  }
}
```

## Multi-Contract Interaction

```typescript
function TokenSwap() {
  const token = useTokenContract()
  const dex = useDexContract()
  
  const swap = async () => {
    // 1. Approve token spend
    const approval = await token.write('approve', [
      dex.address,
      amount
    ])
    
    if (!approval.success) return
    
    // 2. Execute swap
    const swapResult = await dex.write('swap', [
      tokenAddress,
      amount,
      minOutput
    ])
    
    if (swapResult.success) {
      toast.success('Swap completed!')
    }
  }
}
```

## Batch Operations

```typescript
// Process multiple transactions efficiently
const batchTransfer = async (recipients: string[]) => {
  const results = await Promise.all(
    recipients.map(to => 
      write('transfer', [to, amount])
    )
  )
  
  const successful = results.filter(r => r.success)
  toast.success(`${successful.length} transfers completed`)
}
```

## Event Aggregation

```typescript
// Calculate stats from events
const stats = useMemo(() => {
  const votes = events.filter(e => e.eventName === 'VoteCast')
  
  return votes.reduce((acc, vote) => {
    const id = vote.args.proposalId
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})
}, [events])
```

## Gas Optimization

```typescript
// Auto-detect token deployments for higher gas
const deployToken = async () => {
  // RiseSyncClient automatically uses 5M gas for token deploys
  const result = await write('deployToken', [
    name,
    symbol,
    totalSupply
  ])
  // No manual gas configuration needed!
}
```

## Connection Status

```typescript
function ConnectionIndicator() {
  const { isConnected } = useRiseWebSocket()
  
  return (
    <div className={isConnected ? 'bg-green-500' : 'bg-red-500'}>
      {isConnected ? 'Live' : 'Reconnecting...'}
    </div>
  )
}
```