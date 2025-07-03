# Building Custom Apps

This guide walks through building a custom dApp on RISE, from smart contract to real-time frontend.

## Overview

We'll build a simple voting dApp that demonstrates:
- Writing and deploying a contract
- Auto-syncing to frontend
- Handling instant transactions
- Real-time event updates

## Step 1: Write Your Contract

Create a new contract in `contracts/src/VotingApp.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract VotingApp {
    struct Proposal {
        string description;
        uint256 voteCount;
    }
    
    Proposal[] public proposals;
    mapping(address => bool) public hasVoted;
    
    event ProposalCreated(uint256 indexed id, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    
    function createProposal(string memory description) public {
        proposals.push(Proposal(description, 0));
        emit ProposalCreated(proposals.length - 1, description);
    }
    
    function vote(uint256 proposalId) public {
        require(!hasVoted[msg.sender], "Already voted");
        require(proposalId < proposals.length, "Invalid proposal");
        
        proposals[proposalId].voteCount++;
        hasVoted[msg.sender] = true;
        
        emit VoteCast(proposalId, msg.sender);
    }
}
```

## Step 2: Create Deployment Script

Add deployment script in `contracts/script/DeployVoting.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/VotingApp.sol";

contract DeployVoting is Script {
    function run() external {
        vm.startBroadcast();
        new VotingApp();
        vm.stopBroadcast();
    }
}
```

## Step 3: Deploy and Sync

```bash
npm run deploy-and-sync -- -s DeployVoting
```

**Pro tip:** Use `npm run dev:all` to run the blockchain, auto-deploy, and frontend in one terminal!

This command:
1. Deploys your contract to RISE
2. Extracts the ABI and address
3. Generates TypeScript types
4. Creates React hooks automatically

## Step 4: Build the Frontend

The deployment creates a hook at `frontend/src/hooks/useVotingApp.ts`. Use it in your component:

```tsx
// frontend/src/app/voting/page.tsx
'use client'

import { useState } from 'react'
import { useVotingApp } from '@/hooks/useVotingApp'
import { useContractEvents } from '@/hooks/useContractEvents'

export default function VotingPage() {
  const [description, setDescription] = useState('')
  const { write, isWriting } = useVotingApp()
  
  // Real-time events
  const events = useContractEvents('VotingApp')
  
  const createProposal = async () => {
    if (!description) return
    
    const result = await write('createProposal', [description])
    if (result.success) {
      setDescription('')
      // No need to refresh - events update automatically!
    }
  }
  
  const vote = async (proposalId: number) => {
    await write('vote', [proposalId])
    // UI updates via real-time events
  }
  
  return (
    <div className="p-8">
      <h1>Decentralized Voting</h1>
      
      {/* Create Proposal */}
      <div className="mb-8">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Proposal description"
          className="border p-2 mr-2"
        />
        <button 
          onClick={createProposal}
          disabled={isWriting}
        >
          Create Proposal
        </button>
      </div>
      
      {/* Real-time Proposals */}
      <div>
        {events
          .filter(e => e.eventName === 'ProposalCreated')
          .map((event, i) => (
            <div key={i} className="border p-4 mb-2">
              <p>{event.args.description}</p>
              <button onClick={() => vote(event.args.id)}>
                Vote
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
```

## Step 5: Handle Transactions

The auto-generated hook handles both wallet types:

**Embedded Wallet** - Instant confirmation:
```typescript
// Automatic in useVotingApp hook
const receipt = await riseSyncClient.sendTransactionSync(tx)
```

**External Wallet** - Standard flow:
```typescript
// Also automatic - falls back to standard transaction
const receipt = await publicClient.waitForTransactionReceipt(hash)
```

## Step 6: Real-time Events

Events update automatically via WebSocket:

```typescript
// In your component
const events = useContractEvents('VotingApp')

// Filter for specific events
const votes = events.filter(e => e.eventName === 'VoteCast')
const proposals = events.filter(e => e.eventName === 'ProposalCreated')
```

## Advanced Patterns

### Custom Event Handling

```typescript
import { useRiseWebSocket } from '@/hooks/useRiseWebSocket'

function MyComponent() {
  const { subscribe } = useRiseWebSocket()
  
  useEffect(() => {
    return subscribe('VotingApp', (event) => {
      if (event.eventName === 'VoteCast') {
        // Custom logic for vote events
        console.log('New vote!', event.args)
      }
    })
  }, [])
}
```

### Optimistic Updates

```typescript
const vote = async (proposalId: number) => {
  // Optimistic UI update
  setVotes(prev => ({...prev, [proposalId]: (prev[proposalId] || 0) + 1}))
  
  const result = await write('vote', [proposalId])
  if (!result.success) {
    // Revert on failure
    setVotes(prev => ({...prev, [proposalId]: prev[proposalId] - 1}))
  }
}
```

## Best Practices

1. **Let events drive UI** - Don't poll for data, subscribe to events
2. **Handle errors gracefully** - Check `result.success` from write operations
3. **Use TypeScript** - Auto-generated types prevent errors
4. **Test locally first** - Use `npm run chain` for local development

## Next Steps

- [API Reference](api-reference.md) - Detailed hook documentation
- [Examples](examples.md) - More complex patterns
- [Core Concepts](core-concepts.md) - Deep dive into RISE features