# RISE-Specific Methods

## Overview

RISE blockchain provides unique methods that enable sub-second transaction finality and real-time event streaming. This guide details how to integrate and use these RISE-specific features in your dApp.

## Core RISE Methods

### 1. `eth_sendRawTransactionSync`

**Purpose**: Submit a transaction and receive the receipt immediately without waiting for block confirmation.

#### How It Works

Traditional Ethereum flow:
```
Send Transaction → Wait for Block → Get Receipt (15+ seconds)
```

RISE synchronous flow:
```
Send Transaction → Get Receipt Immediately (< 1 second)
```

#### Implementation

**Location**: `frontend/src/lib/rise-sync-client.ts`

```typescript
// Basic implementation
async function sendSyncTransaction(signedTx: string): Promise<TransactionReceipt> {
  const receipt = await provider.request({
    method: 'eth_sendRawTransactionSync',
    params: [signedTx]
  });
  
  // Receipt includes:
  // - transactionHash
  // - blockNumber
  // - gasUsed
  // - status (0x1 for success)
  // - logs (events)
  
  return receipt;
}
```

#### Complete Integration Example

```typescript
// frontend/src/lib/rise-sync-client.ts
export class RiseSyncClient {
  private signer: any;
  private provider: any;
  private nonceManager: Map<string, number> = new Map();

  constructor(signer: any) {
    this.signer = signer;
    this.provider = signer.provider;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionReceipt> {
    try {
      // 1. Prepare transaction with proper nonce
      const prepared = await this.prepareTransaction(tx);
      
      // 2. Sign the transaction
      const signedTx = await this.signer.signTransaction(prepared);
      
      // 3. Send using sync method
      const receipt = await this.provider.request({
        method: 'eth_sendRawTransactionSync',
        params: [signedTx]
      });
      
      // 4. Update nonce for next transaction
      this.incrementNonce(prepared.from);
      
      // 5. Return receipt immediately
      return this.parseReceipt(receipt);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private async prepareTransaction(tx: TransactionRequest) {
    const from = await this.signer.getAddress();
    const nonce = await this.getNonce(from);
    
    return {
      ...tx,
      from,
      nonce,
      gasLimit: tx.gasLimit || await this.estimateGas(tx),
      gasPrice: tx.gasPrice || await this.getGasPrice(),
      chainId: RISE_CHAIN_ID,
      type: 0 // Legacy transaction type for compatibility
    };
  }

  private async getNonce(address: string): Promise<number> {
    // Check local nonce manager first
    const localNonce = this.nonceManager.get(address);
    
    if (localNonce !== undefined) {
      return localNonce;
    }
    
    // Fetch from network
    const networkNonce = await this.provider.getTransactionCount(address);
    this.nonceManager.set(address, networkNonce);
    return networkNonce;
  }

  private incrementNonce(address: string) {
    const current = this.nonceManager.get(address) || 0;
    this.nonceManager.set(address, current + 1);
  }

  private parseReceipt(rawReceipt: any): TransactionReceipt {
    return {
      transactionHash: rawReceipt.transactionHash,
      blockNumber: parseInt(rawReceipt.blockNumber, 16),
      gasUsed: BigInt(rawReceipt.gasUsed),
      status: rawReceipt.status === '0x1',
      logs: rawReceipt.logs || [],
      contractAddress: rawReceipt.contractAddress || null
    };
  }
}
```

#### Usage in React Components

```typescript
// frontend/src/components/TransactionExample.tsx
import { useEmbeddedWallet } from '@/hooks/useEmbeddedWallet';
import { RiseSyncClient } from '@/lib/rise-sync-client';

export function TransactionExample() {
  const { signer, isEmbedded } = useEmbeddedWallet();
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);

  const handleTransaction = async () => {
    if (!signer || !isEmbedded) {
      console.error('Sync transactions require embedded wallet');
      return;
    }

    const syncClient = new RiseSyncClient(signer);
    
    try {
      // Send transaction and get receipt immediately
      const receipt = await syncClient.sendTransaction({
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8f8a',
        value: parseEther('0.001'),
        data: '0x'
      });

      console.log('Transaction complete!', receipt);
      setReceipt(receipt);
      
      // No need to wait - receipt is already final!
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleTransaction}>
        Send Instant Transaction
      </button>
      
      {receipt && (
        <div>
          <p>Transaction Hash: {receipt.transactionHash}</p>
          <p>Block Number: {receipt.blockNumber}</p>
          <p>Gas Used: {receipt.gasUsed.toString()}</p>
          <p>Status: {receipt.status ? 'Success' : 'Failed'}</p>
        </div>
      )}
    </div>
  );
}
```

### 2. `rise_subscribe`

**Purpose**: Subscribe to real-time blockchain events via WebSocket, receiving updates as "shreds" (sub-blocks).

#### How It Works

```
WebSocket Connection → Subscribe to Contract → Receive Events in Real-time
```

Events are delivered immediately when they occur, not when blocks are mined.

#### Implementation

**Location**: `frontend/src/lib/websocket/RiseWebSocketManager.ts`

```typescript
// Subscribe to contract events
const subscription = {
  jsonrpc: '2.0',
  method: 'rise_subscribe',
  params: ['logs', {
    address: contractAddress,     // Contract to watch
    topics: []                   // Empty = all events, or specify event signatures
  }],
  id: subscriptionId
};

websocket.send(JSON.stringify(subscription));
```

#### Complete WebSocket Manager

```typescript
// frontend/src/lib/websocket/RiseWebSocketManager.ts
export class RiseWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor(
    private wsUrl: string,
    private contracts: ContractConfig[]
  ) {
    super();
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log('WebSocket connected to RISE node');
    this.isConnected = true;
    this.reconnectTimer = null;
    
    // Subscribe to all contracts
    this.subscribeToContracts();
    
    // Send queued messages
    this.flushMessageQueue();
    
    this.emit('connected');
  }

  private subscribeToContracts() {
    this.contracts.forEach((contract, index) => {
      const subscriptionId = `sub_${Date.now()}_${index}`;
      
      const request = {
        jsonrpc: '2.0',
        method: 'rise_subscribe',
        params: ['logs', {
          address: contract.address.toLowerCase(),
          topics: [] // Subscribe to all events
        }],
        id: subscriptionId
      };

      this.send(request);
      
      // Store subscription info for later use
      this.subscriptions.set(subscriptionId, {
        contractName: contract.name,
        contractAddress: contract.address,
        abi: contract.abi,
        subscriptionId: null // Will be set when confirmed
      });
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle subscription confirmation
      if (message.id && this.subscriptions.has(message.id)) {
        const sub = this.subscriptions.get(message.id)!;
        sub.subscriptionId = message.result;
        console.log(`Subscribed to ${sub.contractName} events`);
      }
      
      // Handle event notifications
      if (message.method === 'rise_subscription') {
        this.handleEventNotification(message.params);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleEventNotification(params: any) {
    const { subscription, result } = params;
    
    // Find which contract this event belongs to
    const subInfo = Array.from(this.subscriptions.values())
      .find(s => s.subscriptionId === subscription);
    
    if (!subInfo) {
      console.warn('Received event for unknown subscription:', subscription);
      return;
    }

    // Decode the event
    const decodedEvent = this.decodeEvent(result, subInfo.abi);
    
    if (decodedEvent) {
      // Emit for listeners
      this.emit('event', {
        ...decodedEvent,
        contractName: subInfo.contractName,
        contractAddress: subInfo.contractAddress,
        timestamp: Date.now()
      });
    }
  }

  private decodeEvent(log: any, abi: any[]): DecodedEvent | null {
    try {
      // Find the event ABI from the topic
      const eventSignature = log.topics[0];
      const eventAbi = abi.find(item => {
        if (item.type !== 'event') return false;
        const sig = encodeEventTopics({
          abi: [item],
          eventName: item.name
        });
        return sig[0] === eventSignature;
      });

      if (!eventAbi) {
        console.warn('Unknown event signature:', eventSignature);
        return null;
      }

      // Decode using viem
      const decoded = decodeEventLog({
        abi: [eventAbi],
        data: log.data,
        topics: log.topics
      });

      return {
        eventName: decoded.eventName,
        args: decoded.args,
        address: log.address,
        blockNumber: parseInt(log.blockNumber, 16),
        transactionHash: log.transactionHash,
        logIndex: parseInt(log.logIndex, 16),
        removed: log.removed || false
      };
    } catch (error) {
      console.error('Failed to decode event:', error);
      return null;
    }
  }

  private send(message: any) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  // Subscribe to specific event types
  subscribeToEvent(
    eventName: string,
    handler: (event: DecodedEvent) => void
  ): () => void {
    const listener = (event: DecodedEvent) => {
      if (event.eventName === eventName) {
        handler(event);
      }
    };

    this.on('event', listener);
    
    // Return unsubscribe function
    return () => {
      this.off('event', listener);
    };
  }

  // Get all events for a specific contract
  getContractEvents(contractAddress: string): DecodedEvent[] {
    // This would typically be connected to a state store
    return [];
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.subscriptions.clear();
  }
}
```

#### Usage in React with Context

```typescript
// frontend/src/providers/WebSocketProvider.tsx
import { RiseWebSocketManager } from '@/lib/websocket/RiseWebSocketManager';
import { contracts } from '@/contracts/contracts';

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<DecodedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const managerRef = useRef<RiseWebSocketManager | null>(null);

  useEffect(() => {
    // Convert contracts object to array
    const contractConfigs = Object.entries(contracts).map(([name, config]) => ({
      name,
      address: config.address,
      abi: config.abi
    }));

    // Create WebSocket manager
    const manager = new RiseWebSocketManager(
      process.env.NEXT_PUBLIC_RISE_WEBSOCKET_URL!,
      contractConfigs
    );

    // Listen for events
    manager.on('event', (event: DecodedEvent) => {
      setEvents(prev => [...prev, event]);
    });

    manager.on('connected', () => {
      setIsConnected(true);
    });

    manager.on('disconnected', () => {
      setIsConnected(false);
    });

    managerRef.current = manager;

    return () => {
      manager.disconnect();
    };
  }, []);

  const subscribeToEvent = useCallback((
    eventName: string,
    handler: (event: DecodedEvent) => void
  ) => {
    if (!managerRef.current) return () => {};
    return managerRef.current.subscribeToEvent(eventName, handler);
  }, []);

  return (
    <WebSocketContext.Provider value={{
      events,
      isConnected,
      subscribeToEvent
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook for using WebSocket in components
export function useRiseWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useRiseWebSocket must be used within WebSocketProvider');
  }
  return context;
}
```

#### Using WebSocket Events in Components

```typescript
// frontend/src/components/EventMonitor.tsx
export function EventMonitor() {
  const { events, subscribeToEvent, isConnected } = useRiseWebSocket();
  const [tokenTransfers, setTokenTransfers] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to specific event
    const unsubscribe = subscribeToEvent('Transfer', (event) => {
      console.log('Token transfer detected:', event);
      setTokenTransfers(prev => [...prev, event]);
    });

    return unsubscribe;
  }, [subscribeToEvent]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>WebSocket {isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="mt-4">
        <h3>Recent Events ({events.length})</h3>
        {events.slice(-10).map((event, i) => (
          <div key={i} className="border p-2 mb-2">
            <div>{event.contractName}: {event.eventName}</div>
            <div className="text-sm text-gray-500">
              Block: {event.blockNumber}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. VRF (Verifiable Random Function)

**Purpose**: Generate verifiable random numbers on-chain for games and other applications.

#### VRF Interface

```solidity
// contracts/src/interfaces/IVRF.sol
interface IVRF {
    function requestRandomness() external returns (uint256 requestId);
    function fulfillRandomness(uint256 requestId, uint256 randomness) external;
}
```

#### Implementation Example

```solidity
// contracts/src/GameContract.sol
contract GameContract {
    IVRF public immutable vrf;
    mapping(uint256 => address) public randomnessRequests;
    
    constructor(address _vrf) {
        vrf = IVRF(_vrf);
    }
    
    function rollDice() external {
        uint256 requestId = vrf.requestRandomness();
        randomnessRequests[requestId] = msg.sender;
    }
    
    function fulfillRandomness(
        uint256 requestId,
        uint256 randomness
    ) external {
        require(msg.sender == address(vrf), "Only VRF can fulfill");
        
        address player = randomnessRequests[requestId];
        uint256 diceRoll = (randomness % 6) + 1;
        
        emit DiceRolled(player, diceRoll);
    }
}
```

### 4. Time Oracle

**Purpose**: Get reliable timestamp information for time-based logic.

#### Interface

```solidity
// contracts/src/interfaces/ITimeOracle.sol
interface ITimeOracle {
    function getCurrentTime() external view returns (uint256);
    function getBlockTime(uint256 blockNumber) external view returns (uint256);
}
```

## Best Practices

### 1. Handling Sync Transactions

```typescript
// Always check wallet type
const isEmbedded = wallet?.type === 'embedded';

if (isEmbedded) {
  // Use sync transaction
  const receipt = await sendSyncTransaction(tx);
  // Update UI immediately
} else {
  // Use standard flow with loading state
  setLoading(true);
  const receipt = await sendStandardTransaction(tx);
  setLoading(false);
}
```

### 2. WebSocket Reconnection

```typescript
// Implement exponential backoff
private scheduleReconnect() {
  const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
  this.reconnectTimer = setTimeout(() => {
    this.reconnectAttempts++;
    this.connect();
  }, delay);
}
```

### 3. Event Deduplication

```typescript
// Store processed events to avoid duplicates
const processedEvents = new Set<string>();

function handleEvent(event: DecodedEvent) {
  const eventId = `${event.transactionHash}-${event.logIndex}`;
  
  if (processedEvents.has(eventId)) {
    return; // Already processed
  }
  
  processedEvents.add(eventId);
  // Process event...
}
```

## Error Handling

### Sync Transaction Errors

```typescript
try {
  const receipt = await syncClient.sendTransaction(tx);
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    // Handle insufficient balance
  } else if (error.code === 'NONCE_TOO_LOW') {
    // Reset nonce and retry
  } else {
    // Generic error handling
  }
}
```

### WebSocket Errors

```typescript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Don't close connection - let onclose handle reconnection
};

ws.onclose = (event) => {
  if (event.code === 1000) {
    // Normal closure
  } else {
    // Abnormal closure - reconnect
    this.scheduleReconnect();
  }
};
```

## Testing RISE Methods

### 1. Test Sync Transactions

```typescript
// frontend/src/app/debug/page.tsx
export function DebugPage() {
  const testSyncTransaction = async () => {
    console.time('Sync Transaction');
    const receipt = await sendSyncTransaction({
      to: '0x0000000000000000000000000000000000000000',
      value: 0n,
      data: '0x'
    });
    console.timeEnd('Sync Transaction'); // Should be < 1 second
    console.log('Receipt:', receipt);
  };
}
```

### 2. Test WebSocket Events

```typescript
// frontend/src/app/websocket-test/page.tsx
export function WebSocketTest() {
  const { isConnected, events } = useRiseWebSocket();
  
  const triggerEvent = async () => {
    // Call a contract function that emits an event
    await contract.write.emitTestEvent();
    
    // Event should appear in the events array immediately
  };
}
```

## Performance Considerations

1. **Batch Operations**: When using sync transactions, batch operations where possible
2. **Event Filtering**: Subscribe only to needed events to reduce WebSocket traffic
3. **Nonce Management**: Maintain local nonce counter for rapid transactions
4. **Connection Pooling**: Reuse WebSocket connections across components

## Migration Guide

### From Standard Ethereum

```typescript
// Before (Standard Ethereum)
const tx = await contract.transfer(recipient, amount);
const receipt = await tx.wait(); // Wait 15+ seconds

// After (RISE)
const receipt = await contract.transfer(recipient, amount);
// Receipt available immediately!
```

### Adding WebSocket Events

```typescript
// 1. Wrap app with WebSocketProvider
<WebSocketProvider>
  <App />
</WebSocketProvider>

// 2. Use in components
const { events } = useRiseWebSocket();

// 3. Subscribe to specific events
useEffect(() => {
  return subscribeToEvent('Transfer', handleTransfer);
}, []);
```