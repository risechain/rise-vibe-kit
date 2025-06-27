# Creating Templates Guide

This guide explains how to create new templates for the RISE Vibe Kit using our direct template approach.

## Overview

Templates in RISE Vibe Kit are created directly from the working directories (`frontend/`, `contracts/`, `scripts/`) rather than maintaining separate template files. This ensures templates are always up-to-date with the latest features.

## Template Architecture

### How Direct Templates Work

1. **Base Files**: Common files shared across all templates
2. **Template-Specific Files**: Unique files for each template
3. **Page Replacements**: Template pages that replace the default home page
4. **Contract Configuration**: Template-specific contract addresses and ABIs

### Template Configuration

Templates are configured in `/create-rise-app/src/create-app-direct.js`:

```javascript
const TEMPLATE_MAPPINGS = {
  'template-name': {
    contracts: [
      'src/MyContract.sol',
      'script/DeployMyContract.s.sol'
    ],
    frontend: {
      pages: ['src/app/my-template/page.tsx'],
      components: ['src/components/my-template/**/*'],
      hooks: ['src/hooks/useMyContract.ts'],
      abi: ['src/contracts/abi/MyContract.json']
    },
    appTitle: 'RISE MyTemplate',
    pageReplacements: {
      'src/app/my-template/page.tsx': 'src/app/page.tsx'
    }
  }
};
```

## Step-by-Step Guide

### 1. Create Your Contract

First, create your smart contract in `/contracts/src/`:

```solidity
// contracts/src/MyTemplate.sol
pragma solidity ^0.8.23;

contract MyTemplate {
    event TemplateCreated(address creator, string name);
    
    mapping(address => string) public templates;
    
    function createTemplate(string memory name) external {
        templates[msg.sender] = name;
        emit TemplateCreated(msg.sender, name);
    }
}
```

### 2. Create Deployment Script

Add a deployment script in `/contracts/script/`:

```solidity
// contracts/script/DeployMyTemplate.s.sol
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {MyTemplate} from "../src/MyTemplate.sol";

contract DeployMyTemplate is Script {
    function run() external {
        vm.startBroadcast();
        MyTemplate template = new MyTemplate();
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("MyTemplate deployed to:", address(template));
    }
}
```

### 3. Deploy and Get Contract Address

Deploy your contract to get the address:

```bash
npm run deploy-and-sync -- -s DeployMyTemplate
```

Note the deployed contract address from the output.

### 4. Create Frontend Page

Create your template page in `/frontend/src/app/my-template/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMyTemplate } from '@/hooks/useMyTemplate';
import { toast } from 'react-toastify';

export default function MyTemplatePage() {
  const { address, isConnected } = useAccount();
  const [templateName, setTemplateName] = useState('');
  const { createTemplate } = useMyTemplate();
  
  const handleCreate = async () => {
    try {
      await createTemplate(templateName);
      toast.success('Template created!');
      setTemplateName('');
    } catch (error) {
      toast.error('Failed to create template');
    }
  };
  
  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
        <p>Please connect your wallet to use MyTemplate</p>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">My Template</h1>
      
      <Card className="p-6">
        <div className="space-y-4">
          <Input
            placeholder="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <Button onClick={handleCreate} className="w-full">
            Create Template
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

### 5. Create Contract Hook

Create a hook in `/frontend/src/hooks/useMyTemplate.ts`:

```typescript
import { useContractFactoryPayable } from './useContractFactoryPayable';

export function useMyTemplate() {
  return useContractFactoryPayable('MyTemplate');
}
```

### 6. Update Template Configuration

Add your template to `/create-rise-app/src/create-app-direct.js`:

```javascript
const TEMPLATE_MAPPINGS = {
  // ... existing templates ...
  
  'my-template': {
    contracts: [
      'src/MyTemplate.sol',
      'script/DeployMyTemplate.s.sol'
    ],
    frontend: {
      pages: ['src/app/my-template/page.tsx'],
      components: [], // Add any template-specific components
      hooks: ['src/hooks/useMyTemplate.ts'],
      abi: ['src/contracts/abi/MyTemplate.json']
    },
    appTitle: 'RISE MyTemplate',
    pageReplacements: {
      'src/app/my-template/page.tsx': 'src/app/page.tsx'
    }
  }
};

// Also add contract configuration
const contractConfig = {
  // ... existing contracts ...
  
  'my-template': {
    name: 'MyTemplate',
    address: '0x...', // Your deployed address
    deploymentTxHash: '0x...',
    blockNumber: 123456
  }
};
```

### 7. Update CLI Choices

Update the template choices in `/create-rise-app/src/create-app-direct.js`:

```javascript
choices: [
  { name: 'Chat App - Real-time messaging with karma system', value: 'chat' },
  { name: 'Pump - Token launchpad like pump.fun', value: 'pump' },
  { name: 'FrenPet - Virtual pet game with VRF battles', value: 'frenpet' },
  { name: 'MyTemplate - Your template description', value: 'my-template' }
]
```

### 8. Test Your Template

Test creating an app with your new template:

```bash
# From the rise-vibe-kit directory
node create-rise-app/bin/cli.js test-my-template --template my-template
cd test-my-template
npm run dev
```

## Best Practices

### 1. Keep It Simple
- Start with minimal functionality
- Focus on demonstrating one core concept
- Add complexity gradually

### 2. Follow Conventions
- Use existing UI components from `/components/ui/`
- Follow the same hook patterns as existing templates
- Maintain consistent naming conventions

### 3. Provide Good Examples
- Include comprehensive comments
- Show best practices for gas optimization
- Demonstrate proper error handling

### 4. Consider User Experience
- Add loading states
- Provide clear error messages
- Include transaction confirmations
- Support both embedded and external wallets

### 5. Document Your Template
- Add comments explaining key concepts
- Update this guide if you add new patterns
- Consider adding a README in the template folder

## Common Patterns

### Event Handling
```typescript
// Use the standard event hooks
const { events } = useContractEvents('MyTemplate');

useEffect(() => {
  const latestEvent = events[events.length - 1];
  if (latestEvent?.eventName === 'TemplateCreated') {
    // Handle event
  }
}, [events]);
```

### Transaction State Management
```typescript
// Prevent state race conditions
const [hasJustCreated, setHasJustCreated] = useState(false);

const handleCreate = async () => {
  setHasJustCreated(true);
  try {
    await createTemplate(name);
    // Update local state immediately
  } finally {
    setTimeout(() => setHasJustCreated(false), 5000);
  }
};
```

### Responsive Design
```typescript
// Use responsive classes
<div className="container mx-auto px-4 py-8 max-w-2xl">
  <Card className="p-4 md:p-6 lg:p-8">
    {/* Content */}
  </Card>
</div>
```

## Troubleshooting

### Contract Not Found
- Ensure contract is deployed: `npm run deploy-and-sync`
- Check contract name matches in hook and contracts.ts
- Verify ABI file exists in `/frontend/src/contracts/abi/`

### Template Page Not Loading
- Check page replacement mapping is correct
- Ensure page.tsx exports default function
- Verify no import errors in browser console

### Events Not Appearing
- Check WebSocket connection in browser
- Verify event names match contract
- Ensure contract address is correct

## Next Steps

After creating your template:
1. Test thoroughly with different wallets
2. Add to the main README.md
3. Consider creating a demo video
4. Share with the community!

For adding features to existing templates or the base kit, see [Adding Features Guide](./adding-features.md).