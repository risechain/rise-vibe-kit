# Agent Development Guide

Quick reference for AI agents building on RISE.

## Key Concepts

**RISE = Real-time blockchain**
- `eth_sendRawTransactionSync` - Instant transaction receipts
- `rise_subscribe` - WebSocket event streaming
- Shreds - Sub-block event delivery

## Essential Commands

```bash
# Setup
npm install
npm run chain              # Local blockchain
npm run deploy-and-sync    # Deploy contracts

# Development
npm run dev               # Frontend (localhost:3000)
npm run test              # Contract tests
npm run build             # Production build
```

## Project Structure

```
/
├── contracts/           # Solidity contracts (Foundry)
│   ├── src/            # Contract source files
│   └── script/         # Deployment scripts
├── frontend/           # Next.js app
│   ├── src/
│   │   ├── hooks/      # Auto-generated contract hooks
│   │   ├── contracts/  # ABIs and addresses
│   │   └── lib/        # RISE-specific utilities
└── scripts/            # Build tools
```

## Contract Development

1. Write contract in `contracts/src/`
2. Create deployment script in `contracts/script/`
3. Run `npm run deploy-and-sync`
4. Use auto-generated hooks in frontend

## Frontend Integration

**Auto-generated hooks:**
```typescript
const { read, write } = useContractName()
const events = useContractEvents('ContractName')
```

**Transaction handling is automatic:**
- Embedded wallets → Synchronous
- External wallets → Standard async

## Real-time Events

Events stream automatically via WebSocket:
```typescript
// Just use the hook - no setup needed
const events = useContractEvents('ContractName')
```

## Templates

```bash
npx create-rise-app@latest --template chat    # Messaging
npx create-rise-app@latest --template pump    # Tokens
npx create-rise-app@latest --template frenpet # Gaming
```

## Common Tasks

**Read contract state:**
```typescript
const balance = await read('balanceOf', [address])
```

**Send transaction:**
```typescript
const result = await write('transfer', [to, amount])
```

**Handle events:**
```typescript
events.filter(e => e.eventName === 'Transfer')
```

## Resources

- [Core Concepts](docs/core-concepts.md)
- [Building Apps](docs/building-apps.md)
- [API Reference](docs/api-reference.md)