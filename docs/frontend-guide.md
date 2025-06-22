# Frontend Development Guide

## Overview

The RISE Vibe Kit frontend is built with Next.js 15, TypeScript, and Tailwind CSS. This guide covers how to update and extend the frontend, including key components, hooks, and patterns.

## Key Files and Locations

### Core Configuration

```
frontend/src/
├── app/layout.tsx              # Root layout with all providers
├── config/
│   ├── wagmi.ts               # Wallet & chain configuration
│   └── constants.ts           # App-wide constants
└── lib/
    ├── rise-sync-client.ts    # Sync transaction handling
    └── websocket/             # WebSocket management
```

### Component Structure

```
frontend/src/components/
├── ui/                        # Shadcn UI components (buttons, dialogs, etc.)
├── web3/                      # Web3-specific components
├── NavigationBar.tsx          # Main navigation
├── WalletSelector.tsx         # Wallet connection UI
├── EventNotifications.tsx     # Real-time event toasts
└── [feature]/                 # Feature-specific components
```

## Adding New Pages

### 1. Create a New Route

Next.js 15 uses the app directory for routing. Create a new folder with a `page.tsx` file:

```typescript
// frontend/src/app/my-feature/page.tsx
'use client';

import { useAccount } from 'wagmi';
import { useMyContract } from '@/hooks/useMyContract';

export default function MyFeaturePage() {
  const { address, isConnected } = useAccount();
  const { write, read } = useMyContract();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rise-card max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to use this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Feature</h1>
      {/* Your feature content */}
    </div>
  );
}
```

### 2. Add Navigation Link

Update the navigation to include your new page:

```typescript
// frontend/src/components/NavigationBar.tsx
<Link 
  href="/my-feature"
  className={`text-sm font-medium transition-colors ${
    pathname === '/my-feature' 
      ? 'text-purple-600 dark:text-purple-400' 
      : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
  }`}
>
  My Feature
</Link>
```

## Working with Smart Contracts

### 1. After Contract Deployment

When you deploy a new contract, it's automatically available in the frontend:

```typescript
// frontend/src/contracts/contracts.ts (auto-generated)
export const contracts = {
  MyContract: {
    address: '0x...',
    abi: [...],
    deploymentTxHash: '0x...',
    blockNumber: 123456
  }
} as const;
```

### 2. Create a Custom Hook

Create a hook for your contract using the factory pattern:

```typescript
// frontend/src/hooks/useMyContract.ts
import { useContractFactory } from './useContractFactory';
import { contracts } from '@/contracts/contracts';

export function useMyContract() {
  const contract = useContractFactory(
    contracts.MyContract.address,
    contracts.MyContract.abi
  );

  // Add any contract-specific logic
  const doSomethingSpecial = async () => {
    const result = await contract.read.getValue();
    return result * 2n; // Example transformation
  };

  return {
    ...contract,
    doSomethingSpecial
  };
}
```

### 3. Use in Components

```typescript
// frontend/src/components/MyContractInterface.tsx
import { useMyContract } from '@/hooks/useMyContract';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MyContractInterface() {
  const { write, read, subscribe } = useMyContract();
  const [value, setValue] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  // Read contract state
  useEffect(() => {
    const fetchValue = async () => {
      const currentValue = await read.getValue();
      setValue(currentValue);
    };
    fetchValue();
  }, [read]);

  // Subscribe to events
  useEffect(() => {
    return subscribe.ValueChanged((newValue) => {
      console.log('Value changed:', newValue);
      setValue(newValue);
    });
  }, [subscribe]);

  // Write to contract
  const handleUpdate = async () => {
    setLoading(true);
    try {
      const receipt = await write.setValue(123n);
      console.log('Transaction complete:', receipt);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rise-card">
      <h3 className="text-lg font-semibold mb-4">Contract Interface</h3>
      <p>Current Value: {value.toString()}</p>
      <Button 
        onClick={handleUpdate} 
        disabled={loading}
        className="mt-4"
      >
        {loading ? 'Updating...' : 'Update Value'}
      </Button>
    </div>
  );
}
```

## Creating Custom Components

### 1. Component Template

```typescript
// frontend/src/components/MyComponent.tsx
'use client';

import { FC } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  title: string;
  onAction?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({
  className,
  title,
  onAction
}) => {
  return (
    <div className={cn(
      "rise-card",
      className
    )}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {onAction && (
        <button
          onClick={onAction}
          className="rise-button"
        >
          Take Action
        </button>
      )}
    </div>
  );
};
```

### 2. Using Shadcn UI Components

```typescript
// Import pre-configured UI components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MyForm() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open Form
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Form</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter name" />
            </div>
            
            <Button onClick={() => setOpen(false)}>
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## Working with Real-time Events

### 1. Display Event Feed

```typescript
// frontend/src/components/EventFeed.tsx
import { useRiseWebSocket } from '@/hooks/useRiseWebSocket';

export function EventFeed() {
  const { events } = useRiseWebSocket();

  return (
    <div className="rise-card">
      <h3 className="text-lg font-semibold mb-4">Live Events</h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.slice(-20).reverse().map((event, index) => (
          <div 
            key={`${event.transactionHash}-${event.logIndex}`}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">{event.eventName}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {event.contractName}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                Block {event.blockNumber}
              </span>
            </div>
            
            {/* Display event arguments */}
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {Object.entries(event.args).map(([key, value]) => (
                <div key={key}>
                  {key}: {String(value)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Event-Driven UI Updates

```typescript
// frontend/src/components/TokenBalance.tsx
export function TokenBalance({ tokenAddress }: { tokenAddress: string }) {
  const { address } = useAccount();
  const [balance, setBalance] = useState<bigint>(0n);
  const { subscribeToEvent } = useRiseWebSocket();

  // Fetch initial balance
  useEffect(() => {
    const fetchBalance = async () => {
      // Fetch balance logic
    };
    fetchBalance();
  }, [address, tokenAddress]);

  // Subscribe to Transfer events
  useEffect(() => {
    if (!address) return;

    const unsubscribe = subscribeToEvent('Transfer', (event) => {
      // Check if transfer affects our address
      if (
        event.args.to === address || 
        event.args.from === address
      ) {
        // Refetch balance
        fetchBalance();
      }
    });

    return unsubscribe;
  }, [address, subscribeToEvent]);

  return (
    <div className="rise-card">
      <p>Balance: {formatEther(balance)} tokens</p>
    </div>
  );
}
```

## Styling Guidelines

### 1. Using Tailwind Classes

```typescript
// Use rise-card for consistent card styling
<div className="rise-card">
  {/* Content */}
</div>

// Use rise-button for consistent button styling
<button className="rise-button">
  Click Me
</button>

// Dark mode support
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">
    Dark mode aware text
  </p>
</div>
```

### 2. Custom Styles

Add custom styles in `globals.css`:

```css
/* frontend/src/app/globals.css */
@layer components {
  .my-custom-class {
    @apply px-4 py-2 rounded-lg bg-blue-500 text-white;
  }
}
```

### 3. Responsive Design

```typescript
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Responsive grid */}
  </div>
</div>
```

## State Management

### 1. Local Component State

```typescript
// Use React state for component-specific state
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState<any>(null);
```

### 2. Global State with Zustand

```typescript
// frontend/src/stores/appStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  favoriteTokens: string[];
  addFavorite: (token: string) => void;
  removeFavorite: (token: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      favoriteTokens: [],
      addFavorite: (token) => 
        set((state) => ({ 
          favoriteTokens: [...state.favoriteTokens, token] 
        })),
      removeFavorite: (token) =>
        set((state) => ({
          favoriteTokens: state.favoriteTokens.filter(t => t !== token)
        }))
    }),
    {
      name: 'app-storage'
    }
  )
);
```

### 3. Server State with TanStack Query

```typescript
// frontend/src/hooks/useTokenData.ts
import { useQuery } from '@tanstack/react-query';

export function useTokenData(tokenAddress: string) {
  return useQuery({
    queryKey: ['token', tokenAddress],
    queryFn: async () => {
      // Fetch token data
      const response = await fetch(`/api/token/${tokenAddress}`);
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000 // 30 seconds
  });
}
```

## Performance Optimization

### 1. Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false // Disable SSR for client-only components
});
```

### 2. Memoization

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
```

### 3. Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
/>
```

## Testing Components

### 1. Component Test Example

```typescript
// frontend/src/components/__tests__/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<MyComponent title="Test" onAction={handleClick} />);
    
    fireEvent.click(screen.getByText('Take Action'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Hook Test Example

```typescript
// frontend/src/hooks/__tests__/useMyHook.test.ts
import { renderHook } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });
});
```

## Common Patterns

### 1. Loading States

```typescript
export function DataComponent() {
  const { data, isLoading, error } = useQuery({...});

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  return <div>{/* Display data */}</div>;
}
```

### 2. Form Handling

```typescript
export function TokenForm() {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const receipt = await createToken(formData);
      toast.success('Token created!');
    } catch (error) {
      toast.error('Failed to create token');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Token Name"
        required
      />
      {/* More fields */}
      <Button type="submit">Create Token</Button>
    </form>
  );
}
```

### 3. Error Boundaries

```typescript
// frontend/src/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rise-card text-center">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Debugging Tips

### 1. Use Debug Page

Navigate to `/debug` to:
- Check wallet connection
- Test contract interactions
- View network status
- Inspect WebSocket connection

### 2. Browser DevTools

```typescript
// Add debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', { data, state });
}

// Use React DevTools to inspect component state
```

### 3. Network Tab

Monitor:
- WebSocket messages
- RPC calls
- API requests

## Deployment Considerations

### 1. Environment Variables

```env
# frontend/.env.production
NEXT_PUBLIC_RISE_MAINNET_RPC=https://rpc.rise.chain
NEXT_PUBLIC_RISE_WEBSOCKET_URL=wss://rpc.rise.chain
```

### 2. Build Optimization

```bash
# Check bundle size
npm run analyze

# Build for production
npm run build
```

### 3. Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "npm install"
}
```