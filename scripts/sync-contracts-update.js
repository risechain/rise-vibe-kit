#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const CHAIN_ID = 11155931; // RISE Testnet

// Get deployment script name from command line
const scriptName = process.argv[2];
if (!scriptName) {
  console.error('Usage: node sync-contracts-update.js <deployment-script-name>');
  process.exit(1);
}

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BROADCAST_DIR = path.join(PROJECT_ROOT, 'contracts', 'broadcast');
const FRONTEND_CONTRACTS_DIR = path.join(PROJECT_ROOT, 'frontend', 'src', 'contracts');
const FRONTEND_ABI_DIR = path.join(FRONTEND_CONTRACTS_DIR, 'abi');
const CONTRACTS_FILE = path.join(FRONTEND_CONTRACTS_DIR, 'contracts.ts');
const WEBSOCKET_CONFIG_FILE = path.join(PROJECT_ROOT, 'frontend', 'src', 'config', 'websocket.ts');
const FOUNDRY_OUT_DIR = path.join(PROJECT_ROOT, 'contracts', 'out');

// Create directories if they don't exist
if (!fs.existsSync(FRONTEND_CONTRACTS_DIR)) {
  fs.mkdirSync(FRONTEND_CONTRACTS_DIR, { recursive: true });
}
if (!fs.existsSync(FRONTEND_ABI_DIR)) {
  fs.mkdirSync(FRONTEND_ABI_DIR, { recursive: true });
}

// Helper function to read existing contracts
function readExistingContracts() {
  try {
    if (!fs.existsSync(CONTRACTS_FILE)) {
      return {};
    }
    
    const content = fs.readFileSync(CONTRACTS_FILE, 'utf8');
    const contracts = {};
    
    // Parse existing contracts from the file
    const contractsMatch = content.match(/export const contracts = {([^}]+)}/s);
    if (contractsMatch) {
      const contractsContent = contractsMatch[1];
      const contractMatches = contractsContent.matchAll(/(\w+):\s*{[^}]+address:\s*['"]([^'"]+)['"]/g);
      
      for (const match of contractMatches) {
        const [, name, address] = match;
        contracts[name] = { address };
      }
    }
    
    return contracts;
  } catch (error) {
    console.warn('Warning: Could not read existing contracts:', error.message);
    return {};
  }
}

// Helper function to find the latest broadcast file
function findLatestBroadcast(scriptName) {
  const broadcastPattern = path.join(BROADCAST_DIR, `${scriptName}.sol`, CHAIN_ID.toString(), 'run-latest.json');
  const files = glob.sync(broadcastPattern);
  
  if (files.length === 0) {
    return null;
  }
  
  return files[0];
}

// Helper function to extract contract info from broadcast
function extractContractInfo(broadcastData) {
  const contracts = {};
  
  if (broadcastData.transactions) {
    for (const tx of broadcastData.transactions) {
      if (tx.transactionType === 'CREATE' && tx.contractName && tx.contractAddress) {
        contracts[tx.contractName] = {
          address: tx.contractAddress,
          deploymentTxHash: tx.hash
        };
        
        // Try to get block number from receipt
        const receipt = broadcastData.receipts?.find(r => r.transactionHash === tx.hash);
        if (receipt && receipt.blockNumber) {
          contracts[tx.contractName].blockNumber = parseInt(receipt.blockNumber);
        }
      }
    }
  }
  
  return contracts;
}

// Helper function to find and copy ABI
function findAndCopyABI(contractName) {
  // Try multiple potential paths for the ABI
  const potentialPaths = [
    path.join(FOUNDRY_OUT_DIR, `${contractName}.sol`, `${contractName}.json`),
    path.join(FOUNDRY_OUT_DIR, '**', `${contractName}.json`)
  ];
  
  for (const pattern of potentialPaths) {
    const files = glob.sync(pattern);
    if (files.length > 0) {
      const abiFile = files[0];
      const abiData = JSON.parse(fs.readFileSync(abiFile, 'utf8'));
      
      if (abiData.abi) {
        const targetPath = path.join(FRONTEND_ABI_DIR, `${contractName}.json`);
        fs.writeFileSync(targetPath, JSON.stringify(abiData.abi, null, 2));
        console.log(`   💾 Saved ABI: ${targetPath}`);
        return true;
      }
    }
  }
  
  console.warn(`   ⚠️  Could not find ABI for ${contractName}`);
  return false;
}

// Main sync function
async function syncContracts() {
  console.log('\n🔄 Updating contracts from broadcast data...\n');
  
  // Find broadcast file
  const broadcastFile = findLatestBroadcast(scriptName);
  if (!broadcastFile) {
    console.error(`❌ No broadcast file found for ${scriptName}`);
    console.error(`   Expected: ${path.join(BROADCAST_DIR, scriptName + '.sol', CHAIN_ID.toString(), 'run-latest.json')}`);
    process.exit(1);
  }
  
  console.log(`📖 Reading broadcast data from: ${broadcastFile}\n`);
  
  // Read broadcast data
  const broadcastData = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
  const newContracts = extractContractInfo(broadcastData);
  
  if (Object.keys(newContracts).length === 0) {
    console.log('❌ No deployed contracts found in broadcast file');
    process.exit(1);
  }
  
  // Read existing contracts
  const existingContracts = readExistingContracts();
  console.log(`📚 Found ${Object.keys(existingContracts).length} existing contracts\n`);
  
  // Merge contracts (new contracts overwrite existing ones with same name)
  const allContracts = { ...existingContracts };
  
  for (const [name, info] of Object.entries(newContracts)) {
    console.log(`📋 ${existingContracts[name] ? 'Updating' : 'Adding'} contract: ${name}`);
    console.log(`   Address: ${info.address}`);
    if (info.blockNumber) {
      console.log(`   Block: ${info.blockNumber}`);
    }
    
    allContracts[name] = info;
    
    // Copy ABI
    findAndCopyABI(name);
  }
  
  console.log(`\n✅ Total contracts after update: ${Object.keys(allContracts).length}\n`);
  
  // Generate contracts file
  generateContractsFile(allContracts);
  
  // Generate WebSocket config
  generateWebSocketConfig(allContracts);
  
  console.log('\n🎉 Contract update complete!');
  console.log('\nNext steps:');
  console.log('1. cd frontend');
  console.log('2. npm run dev');
  console.log('3. Open http://localhost:3000\n');
}

// Generate the TypeScript contracts file
function generateContractsFile(contracts) {
  const abiImports = [];
  const contractsWithABI = {};
  
  // Check which contracts have ABIs
  for (const [name, info] of Object.entries(contracts)) {
    const abiPath = path.join(FRONTEND_ABI_DIR, `${name}.json`);
    if (fs.existsSync(abiPath)) {
      abiImports.push(`import ${name}ABI from './abi/${name}.json';`);
      contractsWithABI[name] = {
        ...info,
        abiImportName: `${name}ABI`
      };
    } else {
      console.warn(`⚠️  No ABI found for ${name}, skipping from contracts.ts`);
    }
  }
  
  if (Object.keys(contractsWithABI).length === 0) {
    console.error('❌ No contracts with ABI found');
    return;
  }
  
  // Generate TypeScript file content
  const fileContent = `// Auto-generated by sync-contracts-update.js - DO NOT EDIT
// Last updated: ${new Date().toISOString()}
// Chain ID: ${CHAIN_ID} (RISE Testnet)

// Import ABIs
${abiImports.join('\n')}

export const contracts = {
${Object.entries(contractsWithABI).map(([name, info]) => `  ${name}: {
    address: '${info.address}' as const,
    deploymentTxHash: '${info.deploymentTxHash}',
    blockNumber: ${info.blockNumber || 0},
    abi: ${info.abiImportName}
  }`).join(',\n')}
} as const;

// Type exports
export type ContractName = keyof typeof contracts;
export type Contracts = typeof contracts;

// Helper functions
export function getContract<T extends ContractName>(name: T): Contracts[T] {
  return contracts[name];
}

export function getContractAddress(name: ContractName): string {
  return contracts[name].address;
}

export function getContractABI(name: ContractName) {
  return contracts[name].abi;
}

// Re-export specific contracts for convenience
${Object.entries(contractsWithABI).map(([name, info]) => `export const ${name.toUpperCase()}_ADDRESS = '${info.address}' as const;
export const ${name.toUpperCase()}_ABI = ${info.abiImportName};`).join('\n')}
`;
  
  fs.writeFileSync(CONTRACTS_FILE, fileContent);
  console.log(`✅ Updated contracts file: ${CONTRACTS_FILE}`);
}

// Generate WebSocket config file
function generateWebSocketConfig(contracts) {
  const contractAddresses = Object.entries(contracts).reduce((acc, [name, info]) => {
    acc[name] = info.address;
    return acc;
  }, {});
  
  const wsConfigContent = `// Auto-generated by sync-contracts-update.js - DO NOT EDIT
// Last updated: ${new Date().toISOString()}

import { RISE_CHAIN_ID, RISE_RPC_URL, RISE_WS_URL, RISE_EXPLORER_URL } from '@/config/chain';

// Re-export for backward compatibility
export { RISE_CHAIN_ID, RISE_RPC_URL, RISE_WS_URL, RISE_EXPLORER_URL };

// Contract addresses for WebSocket subscriptions
export const CONTRACTS = ${JSON.stringify(contractAddresses, null, 2)} as const;

// Re-export specific contract addresses
${Object.entries(contracts).map(([name, info]) => 
  `export const ${name.toUpperCase()}_ADDRESS = '${info.address}' as const;`
).join('\n')}
`;
  
  fs.writeFileSync(WEBSOCKET_CONFIG_FILE, wsConfigContent);
  console.log(`✅ Updated WebSocket config: ${WEBSOCKET_CONFIG_FILE}`);
}

// Run the sync
syncContracts().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});