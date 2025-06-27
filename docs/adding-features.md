# Adding Features Guide

This guide explains how to add new features to the RISE Vibe Kit base functionality that will be available to all templates.

## Overview

When adding features to RISE Vibe Kit, you're enhancing the core functionality that all templates inherit. This includes:
- New hooks for common patterns
- UI components
- Utility functions
- WebSocket enhancements
- Wallet integrations

## Architecture Understanding

### Core Directories

```
frontend/src/
├── hooks/          # Reusable React hooks
├── components/     # UI and functional components
│   ├── ui/        # Base UI components (buttons, cards, etc.)
│   └── web3/      # Web3-specific components
├── lib/           # Core libraries and utilities
│   ├── websocket/ # WebSocket management
│   └── wallet/    # Wallet utilities
└── providers/     # React context providers
```

### Feature Categories

1. **Base Features**: Available to all templates
2. **Optional Features**: Can be imported when needed
3. **Template-Specific**: Only for specific templates (avoid these in base)

## Step-by-Step Guide

### 1. Adding a New Hook

Hooks are the primary way to add reusable functionality. Here's how to create a new hook:

#### Example: Adding a Gas Price Hook

```typescript
// frontend/src/hooks/useGasPrice.ts
import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatGwei } from 'viem';

export function useGasPrice() {
  const publicClient = usePublicClient();
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [formatted, setFormatted] = useState<string>('');
  
  useEffect(() => {
    if (!publicClient) return;
    
    const fetchGasPrice = async () => {
      try {
        const price = await publicClient.getGasPrice();
        setGasPrice(price);
        setFormatted(formatGwei(price));
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
      }
    };
    
    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 10000); // Update every 10s
    
    return () => clearInterval(interval);
  }, [publicClient]);
  
  return { gasPrice, formatted };
}
```

### 2. Adding a New Component

Components should be reusable and follow the existing patterns:

#### Example: Adding a Transaction History Component

```typescript
// frontend/src/components/web3/TransactionHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Card } from '@/components/ui/card';
import { formatEther } from 'viem';
import { ExternalLink } from 'lucide-react';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  timestamp: number;
}

export function TransactionHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!address || !publicClient) return;
    
    const fetchTransactions = async () => {
      try {
        // Fetch recent blocks and filter for user transactions
        const blockNumber = await publicClient.getBlockNumber();
        const blocks = await Promise.all(
          Array.from({ length: 10 }, (_, i) => 
            publicClient.getBlock({ 
              blockNumber: blockNumber - BigInt(i),
              includeTransactions: true 
            })
          )
        );
        
        // Extract user transactions
        const userTxs = blocks
          .flatMap(block => block.transactions)
          .filter(tx => 
            tx.from.toLowerCase() === address.toLowerCase() ||
            tx.to?.toLowerCase() === address.toLowerCase()
          )
          .slice(0, 10);
        
        setTransactions(userTxs as Transaction[]);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [address, publicClient]);
  
  if (loading) {
    return <Card className="p-4">Loading transactions...</Card>;
  }
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div key={tx.hash} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
            <div className="flex-1">
              <div className="text-sm font-mono">
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </div>
              <div className="text-xs text-gray-500">
                {formatEther(tx.value)} ETH
              </div>
            </div>
            <a
              href={`https://testnet.explorer.rise.chain/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

### 3. Adding Utility Functions

Utilities should be pure functions that solve common problems:

#### Example: Adding BigInt Serialization

```typescript
// frontend/src/lib/utils.ts

// Add to existing utils.ts file
export function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export function deserializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj),
    (key, value) => {
      if (typeof value === 'string' && /^\d+n?$/.test(value)) {
        return BigInt(value.replace('n', ''));
      }
      return value;
    }
  );
}
```

### 4. Enhancing WebSocket Functionality

To add new WebSocket features, modify the RiseWebSocketManager:

```typescript
// frontend/src/lib/websocket/RiseWebSocketManager.ts

// Add new subscription type
async subscribeToBlocks(callback: (block: any) => void) {
  const subscriptionId = await this.sendRequest('rise_subscribe', ['newHeads']);
  this.blockCallbacks.set(subscriptionId, callback);
  return subscriptionId;
}

// Handle new message type
private handleMessage(data: any) {
  // ... existing code ...
  
  if (data.method === 'rise_subscription' && data.params?.subscription) {
    const callback = this.blockCallbacks.get(data.params.subscription);
    if (callback && data.params.result) {
      callback(data.params.result);
    }
  }
}
```

### 5. Adding Provider Enhancements

Providers manage global state and functionality:

#### Example: Adding a Notification Provider

```typescript
// frontend/src/providers/NotificationProvider.tsx
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  notify: (type: Notification['type'], message: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const notify = useCallback((type: Notification['type'], message: string) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
    toast[type](message);
  }, []);
  
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);
  
  return (
    <NotificationContext.Provider value={{ notifications, notify, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
```

## Best Practices

### 1. Maintain Backward Compatibility
- Don't break existing functionality
- Use optional parameters for new features
- Provide migration guides for breaking changes

### 2. Follow Existing Patterns
```typescript
// Good: Follows existing hook pattern
export function useNewFeature() {
  // Implementation
}

// Bad: Inconsistent naming
export function NewFeatureHook() {
  // Implementation
}
```

### 3. Add TypeScript Types
```typescript
// Always export types
export interface TransactionDetails {
  hash: string;
  from: string;
  to: string;
  value: bigint;
}

// Use generic types where appropriate
export function useContractRead<T = unknown>(
  contractName: string,
  functionName: string
): T | undefined {
  // Implementation
}
```

### 4. Document Your Feature
```typescript
/**
 * Hook for fetching current gas prices
 * @returns {Object} Object containing gasPrice in wei and formatted in gwei
 * @example
 * const { gasPrice, formatted } = useGasPrice();
 * console.log(`Current gas: ${formatted} gwei`);
 */
export function useGasPrice() {
  // Implementation
}
```

### 5. Consider Performance
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Component implementation
});

// Use useMemo for expensive calculations
const processedData = useMemo(() => {
  return expensiveCalculation(rawData);
}, [rawData]);
```

## Testing Your Feature

### 1. Manual Testing
```bash
# Test in development
cd frontend && npm run dev

# Test with all templates
for template in chat pump frenpet; do
  create-rise-app test-$template --template $template
  # Test your feature in each template
done
```

### 2. Integration Testing
- Ensure feature works with embedded wallets
- Test with external wallets (MetaMask, etc.)
- Verify WebSocket reconnection handling
- Test error scenarios

### 3. Performance Testing
- Check bundle size impact
- Monitor render performance
- Test with slow network conditions

## Common Patterns to Follow

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('User-friendly error message');
  // Don't throw - handle gracefully
}
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await fetch();
    setData(data);
  } catch (err) {
    setError(err as Error);
  } finally {
    setLoading(false);
  }
};
```

### Cleanup
```typescript
useEffect(() => {
  const subscription = subscribe();
  
  // Always cleanup
  return () => {
    subscription.unsubscribe();
  };
}, [dependencies]);
```

## Submitting Your Feature

1. **Test Thoroughly**: Ensure it works with all templates
2. **Update Documentation**: Add to relevant guides
3. **Update Types**: Ensure TypeScript types are exported
4. **Consider Examples**: Add usage examples
5. **Submit PR**: Include description of feature and usage

## Examples of Good Features to Add

### 1. Enhanced Error Handling
- Retry mechanisms for failed transactions
- Better error messages for common issues
- Automatic fallback strategies

### 2. Performance Optimizations
- Request batching for multiple contract calls
- Caching strategies for frequently accessed data
- Lazy loading for heavy components

### 3. Developer Tools
- Debug mode enhancements
- Performance profiling utilities
- Contract interaction helpers

### 4. User Experience
- Better loading indicators
- Smoother animations
- Keyboard shortcuts
- Accessibility improvements

## Troubleshooting

### Feature Not Working in Templates
- Ensure it's imported in base files, not template-specific
- Check if it needs to be added to Providers.tsx
- Verify no conflicting dependencies

### TypeScript Errors
- Export all types from the module
- Add to types/index.ts if needed
- Check for circular dependencies

### Performance Issues
- Profile with React DevTools
- Check for unnecessary re-renders
- Consider using React.memo or useMemo

## Next Steps

After adding your feature:
1. Test with all existing templates
2. Update this guide if you introduced new patterns
3. Consider creating a demo showing the feature
4. Share with the community for feedback

For creating entirely new templates, see [Creating Templates Guide](./creating-templates.md).