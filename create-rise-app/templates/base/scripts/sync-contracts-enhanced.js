#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Configuration
const CHAIN_ID = '11155931'; // RISE Testnet
const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const BROADCAST_DIR = path.join(CONTRACTS_DIR, 'broadcast');
const OUT_DIR = path.join(CONTRACTS_DIR, 'out');
const CONTRACTS_FILE = path.join(FRONTEND_DIR, 'src/contracts/contracts.ts');

console.log('🔄 Syncing contracts from broadcast data...\n');

// Load existing contracts if file exists
function loadExistingContracts() {
  if (!fs.existsSync(CONTRACTS_FILE)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(CONTRACTS_FILE, 'utf8');
    // Extract contracts object from the file
    const contractsMatch = content.match(/export const contracts = \{([^}]+)\}/s);
    if (!contractsMatch) return {};
    
    // Parse the contracts
    const contractsStr = contractsMatch[1];
    const contracts = {};
    
    // Simple parser for the contracts object
    const contractRegex = /(\w+):\s*\{\s*address:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = contractRegex.exec(contractsStr)) !== null) {
      contracts[match[1]] = match[2];
    }
    
    return contracts;
  } catch (error) {
    console.warn('⚠️  Could not parse existing contracts file, starting fresh');
    return {};
  }
}

// Find all available deployment scripts
function findAvailableDeploymentScripts() {
  if (!fs.existsSync(BROADCAST_DIR)) {
    return [];
  }
  
  const scripts = fs.readdirSync(BROADCAST_DIR)
    .filter(dir => {
      const scriptPath = path.join(BROADCAST_DIR, dir);
      return fs.statSync(scriptPath).isDirectory() && dir.endsWith('.sol');
    });
  
  return scripts;
}

// Find the latest broadcast file for a specific script
function findBroadcastForScript(scriptName) {
  let broadcastPath;
  
  // Handle different input formats
  if (!scriptName.endsWith('.sol')) {
    // First try with .s.sol extension (common Foundry pattern)
    const scriptNameWithS = `${scriptName}.s.sol`;
    const pathWithS = path.join(BROADCAST_DIR, scriptNameWithS, CHAIN_ID);
    
    if (fs.existsSync(pathWithS)) {
      scriptName = scriptNameWithS;
    } else {
      // Fall back to just .sol
      scriptName = `${scriptName}.sol`;
    }
  }
  
  broadcastPath = path.join(BROADCAST_DIR, scriptName, CHAIN_ID);
  
  if (!fs.existsSync(broadcastPath)) {
    console.error(`❌ No broadcast data found for script '${scriptName}' on chain ${CHAIN_ID}`);
    return null;
  }
  
  const runLatestPath = path.join(broadcastPath, 'run-latest.json');
  if (!fs.existsSync(runLatestPath)) {
    console.error(`❌ No run-latest.json found for ${scriptName}`);
    return null;
  }
  
  return runLatestPath;
}

// Extract deployed contracts from broadcast data
function extractDeployedContracts(broadcastPath) {
  const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
  const deployedContracts = {};
  
  // Look for CREATE transactions (contract deployments)
  broadcastData.transactions.forEach(tx => {
    if (tx.transactionType === 'CREATE' && tx.contractName) {
      console.log(`📋 Found deployed contract: ${tx.contractName}`);
      console.log(`   Address: ${tx.contractAddress}`);
      console.log(`   Block: ${broadcastData.receipts.find(r => r.transactionHash === tx.hash)?.blockNumber || 'pending'}`);
      
      deployedContracts[tx.contractName] = {
        address: tx.contractAddress,
        deploymentTxHash: tx.hash,
        blockNumber: broadcastData.receipts.find(r => r.transactionHash === tx.hash)?.blockNumber || 0
      };
    }
  });
  
  return deployedContracts;
}

// Get ABI from the out directory
function getContractABI(contractName) {
  // Try to find the contract JSON in the out directory
  const outPath = path.join(OUT_DIR);
  
  // Search for the contract JSON file
  const searchPaths = [
    path.join(outPath, `${contractName}.sol`, `${contractName}.json`),
    path.join(outPath, `${contractName.toLowerCase()}.sol`, `${contractName}.json`),
    path.join(outPath, 'chatApp.sol', `${contractName}.json`), // Specific for ChatApp
  ];
  
  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      console.log(`   Found ABI at: ${searchPath}`);
      const contractJson = JSON.parse(fs.readFileSync(searchPath, 'utf8'));
      return contractJson.abi;
    }
  }
  
  console.warn(`   ⚠️  Could not find ABI for ${contractName}`);
  return null;
}

// Save ABIs to separate files and generate imports
function saveABIsAndGenerateImports(contracts) {
  const abiDir = path.join(FRONTEND_DIR, 'src/contracts/abi');
  
  // Create abi directory if it doesn't exist
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
    console.log(`📁 Created ABI directory: ${abiDir}`);
  }
  
  const contractsWithABI = {};
  const abiImports = [];
  
  // Get ABIs for each contract and save them
  Object.entries(contracts).forEach(([name, info]) => {
    const abi = getContractABI(name);
    if (abi) {
      // Save ABI to separate file
      const abiFilePath = path.join(abiDir, `${name}.json`);
      fs.writeFileSync(abiFilePath, JSON.stringify(abi, null, 2));
      console.log(`   💾 Saved ABI: ${abiFilePath}`);
      
      // Add to imports
      abiImports.push(`import ${name}ABI from './abi/${name}.json';`);
      
      contractsWithABI[name] = {
        ...info,
        abiImportName: `${name}ABI`
      };
    }
  });
  
  return { contractsWithABI, abiImports };
}

// Generate the TypeScript contracts file
function generateContractsFile(contracts) {
  const { contractsWithABI, abiImports } = saveABIsAndGenerateImports(contracts);
  
  if (Object.keys(contractsWithABI).length === 0) {
    console.error('❌ No contracts with ABI found');
    return null;
  }
  
  // Generate TypeScript file content
  const fileContent = `// Auto-generated by sync-contracts.js - DO NOT EDIT
// Last updated: ${new Date().toISOString()}
// Chain ID: ${CHAIN_ID} (RISE Testnet)

// Import ABIs
${abiImports.join('\n')}

export const contracts = {
${Object.entries(contractsWithABI).map(([name, info]) => `  ${name}: {
    address: '${info.address}' as const,
    deploymentTxHash: '${info.deploymentTxHash}',
    blockNumber: ${info.blockNumber},
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
  
  return fileContent;
}

// Generate WebSocket config file
function generateWebSocketConfig(contracts) {
  const contractAddresses = Object.entries(contracts).reduce((acc, [name, info]) => {
    acc[name] = info.address;
    return acc;
  }, {});
  
  const wsConfigContent = `// Auto-generated by sync-contracts.js - DO NOT EDIT
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
  
  return wsConfigContent;
}

// Show usage information
function showUsage() {
  console.log(`
Usage: node sync-contracts-enhanced.js [options] [deployment-script-names...]

Arguments:
  deployment-script-names    Names of deployment scripts to sync. If not provided, syncs all available.

Options:
  --merge                   Merge with existing contracts (default)
  --replace                 Replace all existing contracts
  --help, -h               Show this help message

Examples:
  node sync-contracts-enhanced.js                           # Sync all deployments
  node sync-contracts-enhanced.js DeployAll                 # Sync specific script
  node sync-contracts-enhanced.js Deploy DeployFrenPet      # Sync multiple scripts
  node sync-contracts-enhanced.js --replace DeployAll       # Replace all with DeployAll
`);
}

// Main function
async function main() {
  const scriptNames = [];
  let mergeMode = true;
  
  // Parse arguments
  for (const arg of args) {
    if (arg === '--replace') {
      mergeMode = false;
    } else if (arg === '--merge') {
      mergeMode = true;
    } else if (!arg.startsWith('-')) {
      scriptNames.push(arg);
    }
  }
  
  // If no scripts specified, find all available
  if (scriptNames.length === 0) {
    const available = findAvailableDeploymentScripts();
    if (available.length === 0) {
      console.error('❌ No deployment scripts found');
      process.exit(1);
    }
    scriptNames.push(...available.map(s => s.replace('.s.sol', '').replace('.sol', '')));
    console.log('🔍 Found deployment scripts:', scriptNames.join(', '));
  }
  
  // Load existing contracts if in merge mode
  let allContracts = {};
  if (mergeMode && fs.existsSync(CONTRACTS_FILE)) {
    console.log('📋 Loading existing contracts...');
    // For now, we'll start fresh each time to avoid complexity
    // In a production system, you'd want to properly merge
  }
  
  // Process each deployment script
  for (const scriptName of scriptNames) {
    console.log(`\n🔄 Processing ${scriptName}...`);
    
    const broadcastPath = findBroadcastForScript(scriptName);
    if (!broadcastPath) continue;
    
    const deployedContracts = extractDeployedContracts(broadcastPath);
    
    // Merge contracts
    Object.assign(allContracts, deployedContracts);
  }
  
  if (Object.keys(allContracts).length === 0) {
    console.error('❌ No deployed contracts found');
    process.exit(1);
  }
  
  // Generate contracts file
  console.log('\n📝 Generating contracts file...');
  const contractsContent = generateContractsFile(allContracts);
  
  if (!contractsContent) {
    process.exit(1);
  }
  
  // Create contracts directory if it doesn't exist
  const contractsDir = path.join(FRONTEND_DIR, 'src/contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  // Write contracts file
  fs.writeFileSync(CONTRACTS_FILE, contractsContent);
  console.log(`✅ Contracts file generated: ${CONTRACTS_FILE}`);
  
  // Generate WebSocket config
  const wsConfigPath = path.join(FRONTEND_DIR, 'src/config/websocket.ts');
  const wsConfigContent = generateWebSocketConfig(allContracts);
  fs.writeFileSync(wsConfigPath, wsConfigContent);
  console.log(`✅ WebSocket config generated: ${wsConfigPath}`);
  
  // Summary
  console.log('\n✨ Sync complete!');
  console.log(`📋 Synced contracts: ${Object.keys(allContracts).join(', ')}`);
}

// Run main function
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});