# Tutorial: Build a Real-time Voting dApp

Let's build a complete dApp from scratch using RISE's unique features!

## What We'll Build

A real-time voting system where:
- Users can create proposals
- Vote yes/no on proposals
- See results update instantly
- Track participation with events

## Step 1: Create the Project

```bash
npx create-rise-dapp voting-app
# Choose "base" template (start fresh)
cd voting-app
```

## Step 2: Write the Smart Contract

Create `contracts/src/Voting.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract Voting {
    struct Proposal {
        string title;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
        bool active;
    }
    
    // Events for real-time updates
    event ProposalCreated(uint256 indexed id, string title);
    event VoteCast(uint256 indexed id, address indexed voter, bool vote);
    event ProposalClosed(uint256 indexed id);
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    function createProposal(string memory title, string memory description) external {
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.title = title;
        p.description = description;
        p.active = true;
        
        emit ProposalCreated(id, title);
    }
    
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.active, "Proposal not active");
        require(!p.hasVoted[msg.sender], "Already voted");
        
        p.hasVoted[msg.sender] = true;
        
        if (support) {
            p.yesVotes++;
        } else {
            p.noVotes++;
        }
        
        emit VoteCast(proposalId, msg.sender, support);
    }
    
    function closeProposal(uint256 proposalId) external {
        proposals[proposalId].active = false;
        emit ProposalClosed(proposalId);
    }
    
    function getProposal(uint256 id) external view returns (
        string memory title,
        string memory description,
        uint256 yesVotes,
        uint256 noVotes,
        bool active
    ) {
        Proposal storage p = proposals[id];
        return (p.title, p.description, p.yesVotes, p.noVotes, p.active);
    }
}
```

## Step 3: Create Deployment Script

Create `contracts/script/DeployVoting.s.sol`:

```solidity
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {Voting} from "../src/Voting.sol";

contract DeployVotingScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Voting voting = new Voting();
        
        vm.stopBroadcast();
        
        console.log("Voting deployed to:", address(voting));
    }
}
```

## Step 4: Deploy to RISE

```bash
npm run deploy-and-sync -- -s DeployVoting
```

This automatically updates `frontend/src/contracts/contracts.ts`!

## Step 5: Create the Hook

Create `frontend/src/hooks/useVoting.ts`:

```typescript
import { createContractHook } from '@/hooks/useContractFactory';
import { useContractEvents } from '@/hooks/useContractEvents';
import { useState, useEffect } from 'react';

const useVotingBase = createContractHook('Voting');

export function useVoting() {
  const contract = useVotingBase();
  const events = useContractEvents('Voting');
  const [proposals, setProposals] = useState<any[]>([]);
  
  // Create a proposal
  const createProposal = async (title: string, description: string) => {
    return await contract.write('createProposal', [title, description]);
  };
  
  // Cast a vote
  const vote = async (proposalId: number, support: boolean) => {
    return await contract.write('vote', [proposalId, support]);
  };
  
  // Get proposal details
  const getProposal = async (id: number) => {
    const [title, description, yesVotes, noVotes, active] = 
      await contract.read('getProposal', [id]);
    
    return {
      id,
      title,
      description,
      yesVotes: Number(yesVotes),
      noVotes: Number(noVotes),
      active
    };
  };
  
  // Load all proposals
  const loadProposals = async () => {
    const count = Number(await contract.read('proposalCount'));
    const loaded = [];
    
    for (let i = 0; i < count; i++) {
      loaded.push(await getProposal(i));
    }
    
    setProposals(loaded);
  };
  
  // Update proposals when events arrive
  useEffect(() => {
    const latestEvent = events[events.length - 1];
    
    if (latestEvent?.eventName === 'ProposalCreated') {
      loadProposals(); // Reload all proposals
    } else if (latestEvent?.eventName === 'VoteCast') {
      // Update vote count in real-time
      const proposalId = Number(latestEvent.args.id);
      getProposal(proposalId).then(updated => {
        setProposals(prev => 
          prev.map(p => p.id === proposalId ? updated : p)
        );
      });
    }
  }, [events]);
  
  // Load proposals on mount
  useEffect(() => {
    loadProposals();
  }, []);
  
  return {
    ...contract,
    proposals,
    createProposal,
    vote,
    events
  };
}
```

## Step 6: Build the UI

Replace `frontend/src/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useVoting } from '@/hooks/useVoting';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from 'wagmi';

export default function VotingApp() {
  const { isConnected } = useAccount();
  const { proposals, createProposal, vote, isLoading } = useVoting();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const handleCreate = async () => {
    if (!title || !description) return;
    
    await createProposal(title, description);
    setTitle('');
    setDescription('');
  };
  
  if (!isConnected) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p>Please connect your wallet to use the voting app</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Real-time Voting</h1>
      
      {/* Create Proposal Form */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create Proposal</h2>
        <div className="space-y-4">
          <Input
            placeholder="Proposal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button 
            onClick={handleCreate}
            disabled={isLoading || !title || !description}
          >
            Create Proposal
          </Button>
        </div>
      </Card>
      
      {/* Proposals List */}
      <div className="grid gap-4">
        {proposals.map((proposal) => (
          <Card key={proposal.id} className="p-6">
            <h3 className="text-lg font-semibold">{proposal.title}</h3>
            <p className="text-gray-600 mb-4">{proposal.description}</p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-semibold">
                  👍 {proposal.yesVotes}
                </span>
                <span className="text-red-600 font-semibold">
                  👎 {proposal.noVotes}
                </span>
              </div>
              
              {proposal.active && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => vote(proposal.id, true)}
                    disabled={isLoading}
                  >
                    Vote Yes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => vote(proposal.id, false)}
                    disabled={isLoading}
                  >
                    Vote No
                  </Button>
                </div>
              )}
            </div>
            
            {/* Vote Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    proposal.yesVotes + proposal.noVotes > 0
                      ? (proposal.yesVotes / (proposal.yesVotes + proposal.noVotes)) * 100
                      : 0
                  }%`
                }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## Step 7: See It In Action!

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Connect your wallet (embedded wallet auto-creates)

3. Create a proposal - see it appear instantly

4. Vote on proposals - watch the counts update in real-time

5. Open multiple browser windows - see updates sync across all of them!

## What Makes This Special

### Instant Feedback
When you vote, the transaction completes immediately:
- No "pending" state
- No waiting for confirmations
- UI updates instantly

### Real-time Updates
Events stream via WebSocket:
- No polling required
- Updates appear as they happen
- All users see the same state

### Simple Code
Compare to traditional Web3:
- No complex state management
- No manual event polling
- No transaction waiting logic

## Next Steps

### Add Features
- User profiles with voting history
- Time-limited proposals
- Delegation system
- Quadratic voting

### Optimize UX
- Optimistic updates
- Skeleton loaders
- Toast notifications
- Mobile responsive design

### Deploy to Production
```bash
npm run build
# Deploy to Vercel, Netlify, etc.
```

## Key Takeaways

1. **Events Drive Everything** - Design contracts with rich events
2. **Hooks Handle Complexity** - Encapsulate logic in custom hooks
3. **Real-time by Default** - WebSocket subscription is automatic
4. **Instant Transactions** - Build UX without waiting

## Challenge Yourself

Try building:
- Real-time auction house
- Multiplayer game
- Social trading platform
- Live prediction market

The possibilities are endless with RISE's instant transactions and real-time events!

## Need Help?

- Check the [examples](https://github.com/risechain/rise-vibe-kit) in the repo
- Join the [RISE Discord](https://discord.gg/risechain)
- Read the [Core Concepts](./core-concepts.md) again

Happy building! 