# Project Structure & Architecture

## Overview

RISE Vibe Kit follows a monorepo structure with clear separation between smart contracts, frontend, and tooling. This guide explains the architecture and key components, with special focus on RISE-specific integrations.

## Directory Structure

```
rise-vibe-kit/
├── contracts/                    # Smart contracts (Foundry)
├── frontend/                     # Next.js application  
├── scripts/                      # Deployment & utility scripts
├── create-rise-app/             # CLI tool for scaffolding
├── ponder/                      # Event indexer (optional)
└── docs/                        # Documentation
```

## Frontend Architecture

### Core Structure

```
frontend/src/
├── app/                         # Next.js App Router
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home page
│   └── [feature]/              # Feature pages
│
├── components/                  # React components
│   ├── ui/                     # Shadcn UI components
│   ├── web3/                   # Web3-specific components
│   └── [feature]/              # Feature components
│
├── hooks/                       # Custom React hooks
│   ├── useRiseWebSocket.ts     # WebSocket subscriptions
│   ├── useContract.ts          # Generic contract hook
│   └── useEmbeddedWallet.ts    # Embedded wallet handling
│
├── lib/                         # Core libraries
│   ├── websocket/              # WebSocket management
│   ├── rise-sync-client.ts     # Sync transaction client
│   └── utils/                  # Utilities
│
├── providers/                   # React Context providers
│   ├── Web3Provider.tsx        # Wagmi configuration
│   └── WebSocketProvider.tsx   # WebSocket context
│
├── config/                      # Configuration
│   ├── wagmi.ts               # Wallet configuration
│   └── constants.ts           # App constants
│
└── types/                       # TypeScript definitions
```

## Key Components Deep Dive

### 1. WebSocket Manager - Real-time Events with `rise_subscribe`

**Location**: `frontend/src/lib/websocket/RiseWebSocketManager.ts`

The WebSocket manager handles real-time blockchain events using RISE's `rise_subscribe` method:

```typescript
export class RiseWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts = 0;

  constructor(
    private url: string,
    private contracts: ContractConfig[]
  ) {
    this.connect();
  }

  private async connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.setupSubscriptions();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.handleReconnection();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  private setupSubscriptions() {
    // Subscribe to each contract's events
    this.contracts.forEach(contract => {
      const subscription = {
        jsonrpc: '2.0',
        method: 'rise_subscribe',
        params: ['logs', {
          address: contract.address,
          topics: [] // Subscribe to all events
        }],
        id: Date.now()
      };

      this.ws?.send(JSON.stringify(subscription));
      this.subscriptions.set(contract.address, {
        contractName: contract.name,
        abi: contract.abi
      });
    });
  }

  private handleMessage(message: any) {
    if (message.method === 'rise_subscription') {
      const { params } = message;
      const logs = params.result;
      
      // Decode the event using the contract ABI
      const contractAddress = logs.address.toLowerCase();
      const subscription = this.subscriptions.get(contractAddress);
      
      if (subscription) {
        const decodedEvent = this.decodeEvent(logs, subscription.abi);
        this.notifyListeners(decodedEvent);
      }
    }
  }

  private decodeEvent(logs: any, abi: any[]) {
    // Use viem to decode the event
    const eventAbi = abi.find(item => 
      item.type === 'event' && 
      item.name === this.getEventName(logs.topics[0])
    );

    if (eventAbi) {
      const decoded = decodeEventLog({
        abi: [eventAbi],
        data: logs.data,
        topics: logs.topics
      });
      
      return {
        eventName: decoded.eventName,
        args: decoded.args,
        address: logs.address,
        blockNumber: logs.blockNumber,
        transactionHash: logs.transactionHash
      };
    }
  }
}
```

**Integration in React**:

```typescript
// frontend/src/hooks/useRiseWebSocket.ts
export function useRiseWebSocket() {
  const { events, subscribe, unsubscribe } = useContext(WebSocketContext);

  // Subscribe to specific events
  const subscribeToEvent = useCallback((
    eventName: string,
    handler: (event: DecodedEvent) => void
  ) => {
    const id = subscribe(eventName, handler);
    return () => unsubscribe(id);
  }, [subscribe, unsubscribe]);

  return {
    events,        // All events
    subscribeToEvent,
    isConnected: true
  };
}
```

### 2. RISE Sync Client - Handling `eth_sendRawTransactionSync`

**Location**: `frontend/src/lib/rise-sync-client.ts`

This client handles both embedded and injected wallets, using RISE's synchronous transactions when available:

```typescript
export class RiseSyncClient {
  private provider: any;
  private isEmbedded: boolean;

  constructor(provider: any, isEmbedded: boolean) {
    this.provider = provider;
    this.isEmbedded = isEmbedded;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionReceipt> {
    if (this.isEmbedded) {
      // Use synchronous transaction for embedded wallets
      return this.sendSyncTransaction(tx);
    } else {
      // Use standard flow for injected wallets
      return this.sendStandardTransaction(tx);
    }
  }

  private async sendSyncTransaction(tx: TransactionRequest): Promise<TransactionReceipt> {
    try {
      // Prepare the transaction
      const prepared = await this.prepareTransaction(tx);
      
      // Sign the transaction
      const signedTx = await this.provider.signTransaction(prepared);
      
      // Send using eth_sendRawTransactionSync
      const receipt = await this.provider.request({
        method: 'eth_sendRawTransactionSync',
        params: [signedTx]
      });

      // Receipt is available immediately!
      return receipt;
    } catch (error) {
      console.error('Sync transaction failed:', error);
      throw error;
    }
  }

  private async sendStandardTransaction(tx: TransactionRequest): Promise<TransactionReceipt> {
    // Standard flow: send transaction and wait for receipt
    const txHash = await this.provider.sendTransaction(tx);
    const receipt = await this.provider.waitForTransaction(txHash);
    return receipt;
  }

  private async prepareTransaction(tx: TransactionRequest) {
    // Auto-detect token deployments for gas optimization
    const isTokenDeploy = this.isTokenDeployment(tx.data);
    
    return {
      ...tx,
      gasLimit: isTokenDeploy ? 5_000_000n : 300_000n,
      nonce: await this.getNextNonce(),
      chainId: RISE_CHAIN_ID
    };
  }

  private isTokenDeployment(data?: string): boolean {
    if (!data) return false;
    
    // Check for ERC20 deployment patterns
    const tokenDeploySignatures = [
      '0x60806040', // Standard contract deployment
      '0x60c06040'  // Contract with immutable variables
    ];
    
    return tokenDeploySignatures.some(sig => 
      data.toLowerCase().startsWith(sig)
    );
  }
}
```

**Usage in Hooks**:

```typescript
// frontend/src/hooks/useContractFactoryPayable.ts
export function useContractFactoryPayable(
  address: string,
  abi: any[]
) {
  const { data: walletClient } = useWalletClient();
  const { address: account } = useAccount();
  const publicClient = usePublicClient();

  const isEmbedded = useMemo(() => {
    return walletClient?.transport?.name === 'embedded';
  }, [walletClient]);

  const riseSyncClient = useMemo(() => {
    if (!walletClient) return null;
    return new RiseSyncClient(walletClient, isEmbedded);
  }, [walletClient, isEmbedded]);

  const write = useMemo(() => {
    const handler = async (functionName: string, args: any[], value?: bigint) => {
      if (!riseSyncClient || !account) {
        throw new Error('No wallet connected');
      }

      // Encode the function call
      const data = encodeFunctionData({
        abi,
        functionName,
        args
      });

      // Send transaction (sync or standard based on wallet type)
      const receipt = await riseSyncClient.sendTransaction({
        to: address,
        data,
        value: value || 0n
      });

      return receipt;
    };

    // Create proxy for easy function calling
    return new Proxy({}, {
      get: (_, functionName: string) => {
        return (...args: any[]) => {
          const value = args[args.length - 1]?.value;
          const actualArgs = value !== undefined ? args.slice(0, -1) : args;
          return handler(functionName, actualArgs, value);
        };
      }
    });
  }, [riseSyncClient, account, address, abi]);

  return { write, isEmbedded };
}
```

### 3. Provider Setup

**Location**: `frontend/src/app/layout.tsx`

The root layout sets up all providers in the correct order:

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <Web3Provider>
            <WebSocketProvider>
              <AutoWalletProvider>
                <div className="min-h-screen bg-background">
                  <NavigationBar />
                  <main>{children}</main>
                  <EventNotifications />
                </div>
              </AutoWalletProvider>
            </WebSocketProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 4. Contract Integration Flow

**Location**: `frontend/src/contracts/contracts.ts` (Auto-generated)

After deployment, contracts are automatically synced:

```typescript
// Auto-generated by sync-contracts.js
export const contracts = {
  ChatApp: {
    address: '0x...' as const,
    abi: [...],
    deploymentTxHash: '0x...',
    blockNumber: 123456
  },
  // ... other contracts
} as const;

// Type-safe contract access
export type ContractName = keyof typeof contracts;
export type Contracts = typeof contracts;
```

**Hook Generation Pattern**:

```typescript
// frontend/src/hooks/useChatApp.ts
import { useContractFactory } from './useContractFactory';
import { contracts } from '@/contracts/contracts';

export function useChatApp() {
  return useContractFactory(
    contracts.ChatApp.address,
    contracts.ChatApp.abi
  );
}
```

### 5. Event Notification System

**Location**: `frontend/src/components/EventNotifications.tsx`

Real-time notifications for blockchain events:

```typescript
export function EventNotifications() {
  const { events } = useRiseWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Listen for new events
    const latestEvent = events[events.length - 1];
    
    if (latestEvent) {
      // Create user-friendly notification
      const notification = createNotification(latestEvent);
      
      toast.custom((t) => (
        <NotificationToast
          notification={notification}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ));
    }
  }, [events]);

  return null; // Notifications rendered by toast library
}
```

## Contract Structure

```
contracts/
├── src/                         # Contract source files
│   ├── interfaces/             # Shared interfaces
│   │   ├── IVRF.sol           # VRF interface
│   │   └── ITimeOracle.sol    # Time oracle interface
│   └── [Contract].sol         # Main contracts
│
├── script/                     # Deployment scripts
│   ├── Deploy[Contract].s.sol # Individual deployment
│   └── DeployMultiple.s.sol   # Multi-contract deployment
│
├── test/                       # Foundry tests
│   └── [Contract].t.sol       # Contract tests
│
├── lib/                        # Dependencies (git submodules)
├── out/                        # Compilation artifacts
└── foundry.toml               # Foundry configuration
```

## Scripts Structure

```
scripts/
├── deploy-and-sync.sh          # Main deployment script
├── sync-contracts.js           # Contract-to-frontend sync
├── setup.sh                    # Initial project setup
└── utils/                      # Utility scripts
```

### Deploy and Sync Flow

The `deploy-and-sync.sh` script orchestrates the deployment:

```bash
#!/bin/bash
# scripts/deploy-and-sync.sh

# 1. Deploy contracts using Foundry
cd contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast

# 2. Extract deployment data
DEPLOYMENT_FILE=$(find broadcast -name "*.json" | head -1)

# 3. Sync to frontend
cd ..
node scripts/sync-contracts.js $DEPLOYMENT_FILE

# 4. Generate TypeScript types
cd frontend
npm run generate-types
```

## Development Workflow

### 1. Contract Development
```bash
# Write contract
contracts/src/MyContract.sol

# Write deployment script
contracts/script/DeployMyContract.s.sol

# Test contract
cd contracts && forge test
```

### 2. Deploy and Sync
```bash
# Deploy to local/testnet
npm run deploy-and-sync

# This automatically:
# - Deploys contracts
# - Updates frontend/src/contracts/contracts.ts
# - Generates TypeScript types
```

### 3. Frontend Integration
```typescript
// Hook is auto-available after sync
import { useMyContract } from '@/hooks/useMyContract';

function MyComponent() {
  const { write, read, subscribe } = useMyContract();
  
  // Use the contract
  const handleClick = async () => {
    const receipt = await write.myFunction(123);
    console.log('Transaction complete:', receipt);
  };
}
```

## Key Integration Points

### 1. WebSocket Subscription
- **Setup**: `WebSocketProvider` in root layout
- **Manager**: `RiseWebSocketManager` handles connections
- **Usage**: `useRiseWebSocket()` hook in components

### 2. Transaction Handling
- **Detection**: Check wallet type in hooks
- **Embedded**: Use `eth_sendRawTransactionSync`
- **Injected**: Use standard transaction flow

### 3. Contract Syncing
- **Trigger**: After deployment via scripts
- **Process**: Extract ABIs and addresses
- **Result**: Updated `contracts.ts` file

### 4. Event Processing
- **Source**: WebSocket real-time events
- **Decoding**: Using contract ABIs
- **Display**: Toast notifications

## Best Practices

1. **Always use the generated hooks** - Don't import contracts directly
2. **Check wallet type** - Handle embedded vs injected appropriately
3. **Subscribe in useEffect** - Clean up subscriptions on unmount
4. **Use type safety** - Leverage TypeScript for contract interactions
5. **Handle errors** - Both sync and async transactions can fail

## Debugging

### WebSocket Issues
- Check connection in `/websocket-test`
- Verify WebSocket URL in `.env.local`
- Check browser console for errors

### Transaction Issues
- Use `/debug` page to test
- Check wallet type detection
- Verify gas limits for token deployments

### Contract Sync Issues
- Check `contracts/broadcast/` for deployment data
- Verify `sync-contracts.js` ran successfully
- Check `frontend/src/contracts/contracts.ts` was updated