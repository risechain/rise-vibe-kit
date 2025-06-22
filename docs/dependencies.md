# Dependencies Guide

## Overview

RISE Vibe Kit uses a modern stack of dependencies optimized for building high-performance dApps. This guide details all dependencies, their purposes, and version requirements.

## Frontend Dependencies

### Core Framework Dependencies

#### Next.js 15
```json
"next": "^15.0.3"
```
- **Purpose**: React framework with App Router for production-ready applications
- **Key Features Used**: 
  - App Router for file-based routing
  - Server Components for performance
  - API Routes for backend functionality
  - Built-in optimizations

#### React 18
```json
"react": "^18.3.1",
"react-dom": "^18.3.1"
```
- **Purpose**: UI library for building component-based interfaces
- **Key Features Used**:
  - Concurrent features
  - Suspense for data fetching
  - Server Components compatibility

### Web3 Dependencies

#### Wagmi v2
```json
"wagmi": "^2.13.2"
```
- **Purpose**: Type-safe React hooks for Ethereum
- **Key Features Used**:
  - Wallet connection management
  - Contract interactions
  - Account and network state
- **Configuration**: `frontend/src/config/wagmi.ts`

#### Viem v2
```json
"viem": "^2.21.54"
```
- **Purpose**: TypeScript-first Ethereum library
- **Key Features Used**:
  - Type-safe contract interactions
  - ABI encoding/decoding
  - Transaction building
- **Usage**: Core Web3 functionality

#### Ethers v6
```json
"ethers": "^6.13.4"
```
- **Purpose**: Ethereum library for specific utilities
- **Key Features Used**:
  - Wallet creation
  - Advanced cryptographic functions
  - Legacy compatibility

### State Management

#### TanStack Query v5
```json
"@tanstack/react-query": "^5.62.2"
```
- **Purpose**: Server state management
- **Key Features Used**:
  - Caching contract reads
  - Optimistic updates
  - Background refetching

#### Zustand v5
```json
"zustand": "^5.0.2"
```
- **Purpose**: Client state management
- **Key Features Used**:
  - WebSocket event storage
  - UI state management
  - Persistent storage
- **Usage**: `frontend/src/providers/WebSocketProvider.tsx`

### UI Dependencies

#### Tailwind CSS v4
```json
"tailwindcss": "^4.0.0-beta.11"
```
- **Purpose**: Utility-first CSS framework
- **Configuration**: `frontend/tailwind.config.ts`
- **Key Features**:
  - JIT compilation
  - Dark mode support
  - Custom design system

#### Shadcn/ui Components
```json
"@radix-ui/react-*": "various versions"
```
- **Purpose**: Accessible, unstyled UI components
- **Components Used**:
  - Dialog, Dropdown, Tabs
  - Toast notifications
  - Form controls
- **Location**: `frontend/src/components/ui/`

#### Additional UI Libraries
```json
"lucide-react": "^0.468.0",        # Icons
"react-hot-toast": "^2.4.1",      # Toast notifications
"class-variance-authority": "^0.7.1", # Component variants
"clsx": "^2.1.1",                  # Class name utilities
"tailwind-merge": "^2.6.0"         # Tailwind class merging
```

### Development Dependencies

#### TypeScript
```json
"typescript": "^5.7.2"
```
- **Purpose**: Type safety and developer experience
- **Configuration**: `frontend/tsconfig.json`
- **Strict Mode**: Enabled for maximum safety

#### ESLint & Prettier
```json
"eslint": "^9.16.0",
"eslint-config-next": "^15.0.3",
"prettier": "^3.4.2"
```
- **Purpose**: Code quality and formatting
- **Configuration**: `.eslintrc.json`

#### Build Tools
```json
"@types/node": "^22.10.2",
"@types/react": "^18.3.13",
"postcss": "^8.4.49"
```

## Smart Contract Dependencies

### Foundry Dependencies

Located in `contracts/lib/`:

#### OpenZeppelin Contracts v5
```
forge install openzeppelin/openzeppelin-contracts@v5.0.0
```
- **Purpose**: Security-audited contract implementations
- **Used For**:
  - ERC20/721/1155 standards
  - Access control
  - Security utilities
- **Import**: `@openzeppelin/contracts/`

#### OpenZeppelin Upgradeable
```
forge install openzeppelin/openzeppelin-contracts-upgradeable
```
- **Purpose**: Upgradeable contract patterns
- **Used For**:
  - Proxy patterns
  - Storage-safe contracts

#### Forge Standard Library
```
forge install foundry-rs/forge-std
```
- **Purpose**: Testing and scripting utilities
- **Used For**:
  - Test assertions
  - Deployment scripts
  - Console logging

### Contract Configuration

#### Remappings (`contracts/remappings.txt`)
```
@openzeppelin/=lib/openzeppelin-contracts/
@openzeppelin-upgradeable/=lib/openzeppelin-contracts-upgradeable/
forge-std/=lib/forge-std/src/
```

#### Foundry Configuration (`contracts/foundry.toml`)
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.23"
optimizer = true
optimizer_runs = 20000

[rpc_endpoints]
localhost = "http://127.0.0.1:8545"
rise_testnet = "${RISE_TESTNET_RPC}"
```

## RISE-Specific Dependencies

### Shreds Package
```typescript
// Used in: frontend/src/lib/rise-sync-client.ts
import { createEmbeddedWallet } from '@rise/shreds';
```
- **Purpose**: Browser-based embedded wallets
- **Features**:
  - Client-side key generation
  - Transaction signing
  - Synchronous transaction support

### WebSocket Manager
```typescript
// Location: frontend/src/lib/websocket/RiseWebSocketManager.ts
```
- **Purpose**: Real-time blockchain events
- **Dependencies**:
  - Native WebSocket API
  - Event decoding with viem
  - Reconnection logic

## Dependency Management

### Installing Dependencies

#### Frontend Dependencies
```bash
cd frontend
npm install
# or
yarn install
```

#### Contract Dependencies
```bash
cd contracts
forge install
```

### Updating Dependencies

#### Safe Updates (Patch/Minor)
```bash
# Frontend
cd frontend
npm update

# Check outdated
npm outdated
```

#### Major Updates
```bash
# Use with caution - may break compatibility
npm install package@latest

# Always test after major updates
npm run type-check
npm run build
```

### Version Locking

#### package-lock.json
- **Purpose**: Lock exact dependency versions
- **Best Practice**: Always commit this file
- **Regenerate**: `npm install --package-lock-only`

#### Foundry Dependencies
```bash
# Lock to specific commit
forge install org/repo@commithash
```

## Dependency Conflicts Resolution

### Common Issues

#### 1. Peer Dependency Warnings
```bash
# Fix peer dependencies
npm install --legacy-peer-deps
```

#### 2. Type Conflicts
```typescript
// In tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true  // Skip type checking of dependencies
  }
}
```

#### 3. Module Resolution
```javascript
// In next.config.js
module.exports = {
  transpilePackages: ['problematic-package']
}
```

## Security Considerations

### Audit Dependencies
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with breaking changes
npm audit fix --force
```

### Contract Dependencies
- Always use audited versions of OpenZeppelin
- Review dependency licenses
- Pin to specific versions in production

## Minimal Dependencies

For a minimal setup, these are the absolute essential dependencies:

### Frontend Minimal
```json
{
  "dependencies": {
    "next": "^15.0.3",
    "react": "^18.3.1",
    "wagmi": "^2.13.2",
    "viem": "^2.21.54",
    "@tanstack/react-query": "^5.62.2"
  }
}
```

### Contract Minimal
```
forge-std
@openzeppelin/contracts
```

## Bundle Size Optimization

### Analyze Bundle
```bash
# Add to package.json scripts
"analyze": "ANALYZE=true next build"
```

### Tree Shaking
- Wagmi and Viem support tree shaking
- Import only what you need:
```typescript
// Good
import { useAccount } from 'wagmi';

// Avoid
import * as wagmi from 'wagmi';
```

### Dynamic Imports
```typescript
// For large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

## Future-Proofing

### Recommended Practices
1. Use exact versions for production
2. Test thoroughly before updates
3. Keep dependencies minimal
4. Regular security audits
5. Document any workarounds

### Migration Strategy
When updating major versions:
1. Read migration guides
2. Update in development first
3. Run full test suite
4. Test all templates
5. Update documentation