# RISE Agent Development Guide

This guide provides comprehensive documentation for building agents and applications on RISE blockchain, covering architecture, deployment, RISE-specific features, and development best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Flow](#deployment-flow)
3. [RISE-Specific Methods](#rise-specific-methods)
   - [WebSocket Subscriptions](#websocket-subscriptions)
   - [Shreds](#shreds)
4. [VRF (Verifiable Random Function)](#vrf-verifiable-random-function)
5. [Foundry Development](#foundry-development)
6. [Frontend Integration](#frontend-integration)
7. [Historical Event Lookup](#historical-event-lookup)
8. [Ponder Indexing](#ponder-indexing-optional)
9. [Best Practices](#best-practices)

## Architecture Overview

The RISE Vibe Template follows a modular architecture designed for real-time dApps:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
├─────────────────┬─────────────────┬────────────────────────┤
│   Components    │     Hooks       │       Providers         │
│                 │                 │                         │
│  - ChatInterface│ - useRiseContract│ - WebSocketProvider   │
│  - DebugUI     │ - useEmbeddedWallet│ - WagmiProvider     │
│  - EventViewer │ - useContractEvents│ - ThemeProvider     │
└─────────────────┴─────────────────┴────────────────────────┘
                           │
                           │ WebSocket & RPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    RISE Blockchain                          │
├─────────────────┬─────────────────┬────────────────────────┤
│  Smart Contracts│   WebSocket API │    Shred API           │
│                 │                 │                         │
│  - Your dApp    │ - rise_subscribe│ - Sync transactions    │
│  - VRF         │ - Real-time events│ - Instant receipts   │
└─────────────────┴─────────────────┴────────────────────────┘
```

### Key Components

1. **Smart Contracts Layer**
   - Foundry-based development environment
   - Auto-deployment scripts with contract syncing
   - VRF integration for on-chain randomness

2. **Frontend Layer**
   - Next.js 14 with App Router
   - Real-time WebSocket management
   - Embedded wallet with nonce management
   - Type-safe contract interactions

3. **Integration Layer**
   - Automatic ABI generation and typing
   - WebSocket event subscriptions
   - Synchronous transaction support

## Deployment Flow

The template provides a streamlined deployment process that automatically syncs contracts to the frontend:

### 1. One-Command Deployment

```bash
npm run deploy-and-sync
```

This command:
1. Loads environment variables from `.env` files
2. Builds contracts using Foundry
3. Deploys to RISE testnet
4. Extracts contract addresses and ABIs
5. Generates TypeScript types
6. Updates frontend configuration

### 2. Deployment Script Options

```bash
# Deploy with custom script
npm run deploy-and-sync -- -s MyCustomDeploy

# Deploy with verification
npm run deploy-and-sync -- -v

# Deploy to local network
npm run deploy-and-sync -- -n localhost
```

### 3. How Contract Syncing Works

The `sync-contracts.js` script:
1. Reads broadcast files from `contracts/broadcast/`
2. Extracts deployed contract information
3. Saves ABIs to `frontend/contracts/abi/`
4. Updates `frontend/src/contracts/contracts.ts` with:
   ```typescript
   export const contracts = {
     ChatApp: {
       address: "0x...",
       abi: chatAppAbi,
       chainId: 11155931
     }
   };
   ```

### 4. Multi-Contract Support

Deploy multiple contracts in one script:
```solidity
// contracts/script/DeployMultiple.s.sol
contract DeployMultipleScript is Script {
    function run() public {
        vm.startBroadcast();
        
        ChatApp chatApp = new ChatApp();
        MyToken token = new MyToken();
        GameContract game = new GameContract();
        
        vm.stopBroadcast();
    }
}
```

All contracts are automatically synced to frontend.

## RISE-Specific Methods

### WebSocket Subscriptions

RISE's `rise_subscribe` method provides real-time access to blockchain events through WebSockets.

#### What are Shreds?

Shreds are sub-blocks emitted in real-time containing:
- Subset of transactions
- Transaction receipts
- State changes
- Emitted before final block confirmation

#### Setting Up WebSocket Connection

```typescript
// Basic WebSocket setup
const ws = new WebSocket('wss://testnet.riselabs.xyz/ws');

ws.on('open', () => {
  // Subscribe to contract events
  ws.send(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "rise_subscribe",
    params: ["logs", {
      address: CONTRACT_ADDRESS,
      topics: [EVENT_SIGNATURE]
    }]
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.method === 'rise_subscription') {
    // Handle real-time event
    console.log('New event:', message.params.result);
  }
});
```

#### Template WebSocket Manager

The template includes a robust WebSocket manager:

```typescript
// frontend/src/lib/websocket/RiseWebSocketManager.ts
export class RiseWebSocketManager {
  private subscriptions = new Map();
  private eventHandlers = new Map();
  
  subscribeToContract(address: string, eventSignatures: string[]) {
    const topics = eventSignatures.map(sig => ethers.id(sig));
    
    this.ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "rise_subscribe",
      params: ["logs", { address, topics }]
    }));
  }
  
  // Auto-reconnection, event deduplication, error handling
}
```

#### Using in React Components

```typescript
// Provided by WebSocketProvider
const { events } = useContractEvents('ChatApp');

// Events update in real-time
useEffect(() => {
  events.forEach(event => {
    if (event.eventName === 'MessageSent') {
      console.log('New message:', event.args);
    }
  });
}, [events]);
```

### Shreds

The Shreds package enables synchronous transactions with immediate receipts on RISE Chain.

#### Installation

```bash
npm install shreds
```

#### Basic Usage

```typescript
import { createPublicSyncClient } from 'shreds/viem';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { riseTestnet } from 'viem/chains';

// Create account from private key
const account = privateKeyToAccount(privateKey);

// Create sync client
const syncClient = createPublicSyncClient({
  chain: riseTestnet,
  transport: http(),
});

// Create wallet client for signing
const walletClient = createWalletClient({
  account,
  chain: riseTestnet,
  transport: http(),
});

// Prepare and sign transaction
const request = await walletClient.prepareTransactionRequest({
  account,
  to: contractAddress,
  data: encodedFunctionData,
  value: 0n,
});

const serializedTransaction = await walletClient.signTransaction(request);

// Send synchronous transaction
const receipt = await syncClient.sendRawTransactionSync({
  serializedTransaction,
});

// Receipt is immediately available
console.log('Transaction confirmed:', receipt.transactionHash);
console.log('Gas used:', receipt.gasUsed);
console.log('Status:', receipt.status); // 'success' or 'reverted'
```

#### Embedded Wallet Integration

The template integrates Shreds for embedded wallets:

```typescript
// frontend/src/lib/rise-sync-client.ts
import { createPublicSyncClient } from 'shreds/viem';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { riseTestnet } from 'viem/chains';

export class RiseSyncClient {
  private syncClient: any;
  private walletClient: any;
  private account: any;

  constructor(privateKey: string) {
    this.account = privateKeyToAccount(privateKey);
    
    this.syncClient = createPublicSyncClient({
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });
  }

  async sendTransaction(tx: { to: string; data?: string; value?: string }) {
    const request = await this.walletClient.prepareTransactionRequest({
      account: this.account,
      to: tx.to,
      data: tx.data || '0x',
      value: tx.value ? BigInt(tx.value) : 0n,
    });

    const serializedTransaction = await this.walletClient.signTransaction(request);
    
    const receipt = await this.syncClient.sendRawTransactionSync({
      serializedTransaction,
    });
    
    return receipt;
  }
}
```

#### Nonce Management

The Shreds package handles nonce management automatically, but the template includes additional safeguards:

```typescript
// frontend/src/lib/wallet/NonceManager.ts
export class NonceManager {
  private nonceMap = new Map<string, number>();
  
  async getNextNonce(address: string): Promise<number> {
    const currentNonce = await provider.getTransactionCount(address);
    const localNonce = this.nonceMap.get(address) || currentNonce;
    
    const nextNonce = Math.max(currentNonce, localNonce);
    this.nonceMap.set(address, nextNonce + 1);
    
    return nextNonce;
  }
}
```

## VRF (Verifiable Random Function)

RISE provides on-chain verifiable randomness through the VRF Coordinator.

### VRF Coordinator

- **Address**: `0x9d57aB4517ba97349551C876a01a7580B1338909`
- **Chain**: RISE Testnet (11155931)

### Integration Steps

1. **Import VRF Interface**
```solidity
import "./interfaces/IVRF.sol";
```

2. **Implement VRF Consumer**
```solidity
contract DiceGame is IVRFConsumer {
    IVRFCoordinator constant VRF = IVRFCoordinator(
        0x9d57aB4517ba97349551C876a01a7580B1338909
    );
    
    mapping(uint256 => address) public requestIdToPlayer;
    
    function rollDice() external payable {
        require(msg.value >= 0.001 ether, "Insufficient fee");
        
        uint256 requestId = VRF.requestRandomWords{value: msg.value}(
            500000, // callback gas limit
            1,      // number of random words
            ""      // additional data
        );
        
        requestIdToPlayer[requestId] = msg.sender;
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords,
        bytes calldata
    ) external override {
        require(msg.sender == address(VRF), "Only VRF can fulfill");
        
        address player = requestIdToPlayer[requestId];
        uint256 diceRoll = (randomWords[0] % 6) + 1;
        
        emit DiceRolled(player, requestId, diceRoll);
    }
}
```

3. **Monitor VRF Events**
```typescript
// Subscribe to both request and fulfillment
const VRF_REQUEST_SIG = ethers.id("RandomWordsRequested(uint256,address,uint256,uint256,bytes)");
const DICE_ROLLED_SIG = ethers.id("DiceRolled(address,uint256,uint256)");

// Track pending requests
const pendingRequests = new Map();

// Handle VRF request
if (event.topics[0] === VRF_REQUEST_SIG) {
  const requestId = event.topics[1];
  pendingRequests.set(requestId, {
    player: event.address,
    timestamp: Date.now()
  });
}

// Handle dice roll result
if (event.topics[0] === DICE_ROLLED_SIG) {
  const [player, requestId, diceValue] = ethers.AbiCoder.defaultAbiCoder().decode(
    ['address', 'uint256', 'uint256'],
    event.data
  );
  
  console.log(`Player ${player} rolled a ${diceValue}!`);
  pendingRequests.delete(requestId);
}
```

## Foundry Development

### Key Commands

```bash
# Initialize new project
forge init

# Build contracts
forge build

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test testSpecificFunction

# Fork RISE for testing
forge test --fork-url https://testnet.riselabs.xyz

# Deploy with script
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast

# Verify contract
forge verify-contract $CONTRACT_ADDRESS $CONTRACT_NAME \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.riselabs.xyz/api/
```

### Testing Best Practices

1. **Unit Tests**
```solidity
// test/ChatApp.t.sol
contract ChatAppTest is Test {
    ChatApp public chatApp;
    address alice = makeAddr("alice");
    
    function setUp() public {
        chatApp = new ChatApp();
        vm.deal(alice, 1 ether);
    }
    
    function testSendMessage() public {
        vm.prank(alice);
        chatApp.sendMessage("Hello RISE!");
        
        assertEq(chatApp.messageCount(), 1);
    }
}
```

2. **Fork Testing**
```solidity
function testVRFIntegration() public {
    // Fork RISE testnet
    vm.createSelectFork("rise_testnet");
    
    // Test against real VRF coordinator
    IVRFCoordinator vrf = IVRFCoordinator(
        0x9d57aB4517ba97349551C876a01a7580B1338909
    );
    
    // Your test logic
}
```

3. **Gas Optimization**
```solidity
// Use forge test --gas-report
function testGasOptimized() public {
    // Original implementation
    uint256 gasBefore = gasleft();
    chatApp.inefficientFunction();
    uint256 gasUsed = gasBefore - gasleft();
    
    // Optimized implementation
    uint256 gasBeforeOpt = gasleft();
    chatApp.optimizedFunction();
    uint256 gasUsedOpt = gasBeforeOpt - gasleft();
    
    // Assert optimization works
    assertLt(gasUsedOpt, gasUsed);
}
```

### Deployment Scripts

```solidity
// script/Deploy.s.sol
contract DeployScript is Script {
    function run() public returns (ChatApp) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ChatApp chatApp = new ChatApp();
        
        // Optional: Initialize contract
        chatApp.initialize();
        
        vm.stopBroadcast();
        
        // Log deployment
        console.log("ChatApp deployed to:", address(chatApp));
        
        return chatApp;
    }
}
```

## Frontend Integration

### Contract Hooks

The template provides type-safe hooks for contract interaction:

```typescript
// Use any deployed contract
const { read, write, estimateGas } = useContract('ChatApp');

// Read contract state
const messageCount = await read.messageCount();

// Write with automatic typing
await write.sendMessage(['Hello RISE!']);

// Estimate gas
const gasEstimate = await estimateGas.sendMessage(['Test']);
```

### Event Handling

```typescript
// Real-time event subscription
const { events, isConnected } = useContractEvents('ChatApp');

// Process events
const messages = events
  .filter(e => e.eventName === 'MessageSent')
  .map(e => ({
    sender: e.args.sender,
    message: e.args.message,
    timestamp: e.args.timestamp
  }));
```

### Embedded Wallet

```typescript
// Auto-generates on first visit
const { address, isConnected, connect, disconnect } = useEmbeddedWallet();

// Use with contracts
const { write } = useRiseContract();

// Rapid transactions without nonce conflicts
for (let i = 0; i < 10; i++) {
  await write.sendMessage([`Message ${i}`]);
}
```

## Historical Event Lookup

The template includes built-in historical event lookup functionality on both the Debug and Events pages, allowing you to query past blockchain events efficiently.

### Features

- **Batch Processing**: Fetch events in configurable batch sizes to avoid rate limits
- **Block Range Configuration**: Specify how many blocks to look back
- **Event Type Filtering**: Query specific event types or all events
- **Export Functionality**: Export historical events to JSON
- **Real-time Updates**: See partial results as batches complete

### Implementation on Debug Page

```typescript
// frontend/src/app/debug/page.tsx
const [historicalEvents, setHistoricalEvents] = useState<ContractEvent[]>([]);
const [blockRange, setBlockRange] = useState({
  blocksBack: 100,
  batchSize: 20
});

const fetchHistoricalEvents = async () => {
  const publicClient = createPublicClient({
    chain: riseTestnet,
    transport: http('https://testnet.riselabs.xyz'),
  });
  
  const currentBlock = await publicClient.getBlockNumber();
  const batches = Math.ceil(blockRange.blocksBack / blockRange.batchSize);
  
  for (let i = 0; i < batches; i++) {
    const fromBlock = currentBlock - BigInt(Math.min((i + 1) * blockRange.batchSize, blockRange.blocksBack));
    const toBlock = currentBlock - BigInt(i * blockRange.batchSize);
    
    const events = await publicClient.getContractEvents({
      address: contract.address,
      abi: [eventAbi],
      eventName: selectedEventForHistory,
      fromBlock,
      toBlock,
    });
    
    // Process events...
  }
};
```

### Implementation on Events Page

The Events page extends this functionality with:
- Support for all contracts simultaneously
- Event type filtering across contracts
- Combined real-time and historical view
- Export for both real-time and historical events

### Best Practices for Historical Queries

1. **Rate Limit Management**
   ```typescript
   // Add delay between batches
   if (i < batches - 1) {
     await new Promise(resolve => setTimeout(resolve, 100));
   }
   ```

2. **Error Handling**
   ```typescript
   try {
     const events = await publicClient.getContractEvents({...});
   } catch (error) {
     if (error.message.includes('rate limit')) {
       // Reduce batch size or increase delay
     }
   }
   ```

3. **Memory Management**
   ```typescript
   // Limit stored events to prevent memory issues
   const MAX_EVENTS = 10000;
   if (allEvents.length > MAX_EVENTS) {
     allEvents = allEvents.slice(-MAX_EVENTS);
   }
   ```

## Ponder Indexing (Optional)

For applications requiring complex queries, aggregations, or persistent event storage, the template includes optional Ponder integration.

### What is Ponder?

Ponder is an open-source framework for blockchain indexing that provides:
- SQL database for event storage
- GraphQL API generation
- Automatic reorg handling
- Real-time and historical indexing

### Setup Process

1. **Deploy Contracts**
   ```bash
   npm run deploy-and-sync
   ```

2. **Sync Ponder Configuration**
   ```bash
   npm run ponder:sync
   ```
   
   This script:
   - Reads deployed contract addresses
   - Extracts ABIs from frontend
   - Generates `ponder.config.ts`
   - Copies ABIs to `ponder/abis/`

3. **Install and Run**
   ```bash
   cd ponder
   npm install
   npm run dev
   ```

### Schema Definition

```typescript
// ponder/src/schema.ts
export default createSchema((p) => ({
  User: p.createTable({
    id: p.string(), // wallet address
    userId: p.string(),
    registeredAt: p.bigint(),
    registeredAtBlock: p.bigint(),
    messageCount: p.int(),
    karma: p.int(),
  }),
  
  Message: p.createTable({
    id: p.string(),
    user: p.string().references("User.id"),
    userId: p.string(),
    content: p.string(),
    timestamp: p.bigint(),
    blockNumber: p.bigint(),
    transactionHash: p.string(),
  }),
}));
```

### Indexing Functions

```typescript
// ponder/src/index.ts
ponder.on("ChatApp:MessageSent", async ({ event, context }) => {
  const { Message, User } = context.db;
  
  // Create message record
  await Message.create({
    id: event.args.msgId.toString(),
    data: {
      user: event.args.user.toLowerCase(),
      userId: event.args.userId,
      content: event.args.message,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    },
  });
  
  // Update user stats
  await User.update({
    id: event.args.user.toLowerCase(),
    data: ({ current }) => ({
      messageCount: current.messageCount + 1,
    }),
  });
});
```

### Querying Indexed Data

Once running, Ponder provides a GraphQL endpoint at `http://localhost:42069/graphql`:

```graphql
query GetUserMessages {
  messages(where: { userId: "alice" }, orderBy: "timestamp", orderDirection: "desc") {
    id
    content
    timestamp
    user {
      karma
      messageCount
    }
  }
}
```

### Auto-Sync Configuration

The `sync-ponder-config.js` script automatically:
1. Detects all deployed contracts
2. Generates proper network configuration
3. Sets the correct start block
4. Updates ABIs when contracts change

### When to Use Ponder

Consider Ponder when you need:
- Complex queries (JOINs, aggregations)
- Historical data analysis
- Data persistence beyond browser storage
- GraphQL API for your dApp
- Handling chain reorganizations

### Ponder vs Frontend Historical Lookup

| Feature | Frontend Lookup | Ponder |
|---------|----------------|---------|
| Setup | Built-in | Requires setup |
| Queries | Simple event filters | Complex SQL/GraphQL |
| Storage | Browser memory | PostgreSQL/SQLite |
| Performance | Good for recent events | Better for large datasets |
| Real-time | Via WebSocket | Via indexing |
| Use Case | Quick lookups | Analytics & complex apps |

## Best Practices

### 1. WebSocket Connection Management

```typescript
// Implement reconnection logic
class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect() {
    this.ws = new WebSocket(WS_URL);
    
    this.ws.on('close', () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, Math.pow(2, this.reconnectAttempts) * 1000);
      }
    });
    
    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.resubscribe();
    });
  }
}
```

### 2. Event Deduplication

```typescript
// Prevent duplicate event processing
const processedEvents = new Set<string>();

function handleEvent(event: ContractEvent) {
  const eventId = `${event.transactionHash}-${event.logIndex}`;
  
  if (processedEvents.has(eventId)) {
    return; // Already processed
  }
  
  processedEvents.add(eventId);
  // Process event
}
```

### 3. Error Handling

```typescript
// Graceful error handling
async function sendTransaction() {
  try {
    const tx = await write.someFunction();
    toast.success('Transaction sent!');
    return tx;
  } catch (error) {
    if (error.code === 'ACTION_REJECTED') {
      toast.error('Transaction cancelled');
    } else if (error.message.includes('nonce')) {
      // Reset nonce manager
      nonceManager.reset();
      toast.error('Nonce error - please retry');
    } else {
      toast.error('Transaction failed');
      console.error(error);
    }
  }
}
```

### 4. Gas Estimation

```typescript
// Always estimate gas for better UX
const estimatedGas = await estimateGas.someFunction(args);
const gasWithBuffer = estimatedGas * 110n / 100n; // 10% buffer

const tx = await write.someFunction(args, {
  gasLimit: gasWithBuffer
});
```

### 5. Type Safety

```typescript
// Use generated types
import { ChatApp } from '@/contracts/types';

// Type-safe event handling
function handleMessageSent(event: ChatApp.MessageSentEvent) {
  const { sender, message, timestamp } = event.args;
  // TypeScript knows the exact types
}
```

## Network Configuration

### RISE Testnet

```typescript
export const riseTestnet = {
  id: 11155931,
  name: 'RISE Testnet',
  network: 'rise-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.riselabs.xyz'],
      webSocket: ['wss://testnet.riselabs.xyz/ws'],
    },
    public: {
      http: ['https://testnet.riselabs.xyz'],
      webSocket: ['wss://testnet.riselabs.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'RISE Explorer',
      url: 'https://explorer.testnet.riselabs.xyz',
    },
  },
  contracts: {
    vrfCoordinator: {
      address: '0x9d57aB4517ba97349551C876a01a7580B1338909',
    },
  },
};
```

### Wagmi Configuration

```typescript
// frontend/src/lib/wagmi-config.ts
import { createConfig, http } from 'wagmi';
import { riseTestnet } from './chains';

export const config = createConfig({
  chains: [riseTestnet],
  transports: {
    [riseTestnet.id]: http(),
  },
});
```

## Resources

- [RISE Documentation](https://docs.riselabs.xyz)
- [Foundry Book](https://book.getfoundry.sh/)
- [Shreds NPM Package](https://www.npmjs.com/package/shreds)
- [RISE Explorer](https://explorer.testnet.riselabs.xyz)
- [RISE Discord](https://discord.gg/rise)

---
