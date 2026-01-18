#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

// Types
interface BroadcastTransaction {
  transactionType: string;
  contractName?: string;
  contractAddress?: string;
  hash: string;
}

interface BroadcastReceipt {
  transactionHash: string;
  blockNumber?: number;
}

interface BroadcastData {
  transactions: BroadcastTransaction[];
  receipts: BroadcastReceipt[];
}

interface DeployedContract {
  address: string;
  deploymentTxHash: string;
  blockNumber: number;
}

interface ContractWithABI extends DeployedContract {
  abiImportName: string;
}

type DeployedContracts = Record<string, DeployedContract>;
type ContractsWithABI = Record<string, ContractWithABI>;

// Parse command line arguments
const args = process.argv.slice(2);
const deploymentScriptName = args[0]; // Optional: specific deployment script name

// Configuration
const CHAIN_ID = '11155931'; // RISE Testnet
const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const BROADCAST_DIR = path.join(CONTRACTS_DIR, 'broadcast');
const OUT_DIR = path.join(CONTRACTS_DIR, 'out');

console.log('🔄 Syncing contracts from broadcast data...\n');

// Find all available deployment scripts
function findAvailableDeploymentScripts(): string[] {
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

// Find the latest broadcast file
function findLatestBroadcast(): string {
  let broadcastPath: string;

  if (deploymentScriptName) {
    // Use the specified deployment script
    let scriptName = deploymentScriptName;

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
      console.error(`   Expected path: ${broadcastPath}`);

      const available = findAvailableDeploymentScripts();
      if (available.length > 0) {
        console.error(`\n📋 Available deployment scripts:`);
        available.forEach(script => console.error(`   - ${script}`));
      }
      process.exit(1);
    }
  } else {
    // Auto-detect the most recent deployment script
    const availableScripts = findAvailableDeploymentScripts();

    if (availableScripts.length === 0) {
      console.error(`❌ No deployment scripts found in ${BROADCAST_DIR}`);
      process.exit(1);
    }

    // Find the most recently modified script
    let mostRecentScript: string | null = null;
    let mostRecentTime = 0;

    availableScripts.forEach(script => {
      const scriptChainPath = path.join(BROADCAST_DIR, script, CHAIN_ID);
      if (fs.existsSync(scriptChainPath)) {
        const runLatestPath = path.join(scriptChainPath, 'run-latest.json');
        if (fs.existsSync(runLatestPath)) {
          const stats = fs.statSync(runLatestPath);
          if (stats.mtimeMs > mostRecentTime) {
            mostRecentTime = stats.mtimeMs;
            mostRecentScript = script;
          }
        }
      }
    });

    if (!mostRecentScript) {
      console.error(`❌ No broadcast data found for chain ${CHAIN_ID} in any deployment script`);
      console.error(`\n📋 Available deployment scripts:`);
      availableScripts.forEach(script => console.error(`   - ${script}`));
      process.exit(1);
    }

    console.log(`🔍 Auto-detected deployment script: ${mostRecentScript}`);
    broadcastPath = path.join(BROADCAST_DIR, mostRecentScript, CHAIN_ID);
  }

  const runLatestPath = path.join(broadcastPath, 'run-latest.json');
  if (!fs.existsSync(runLatestPath)) {
    console.error('❌ No run-latest.json found');
    process.exit(1);
  }

  return runLatestPath;
}

// Extract deployed contracts from broadcast data
function extractDeployedContracts(broadcastPath: string): DeployedContracts {
  const broadcastData: BroadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
  const deployedContracts: DeployedContracts = {};

  // Look for CREATE transactions (contract deployments)
  broadcastData.transactions.forEach(tx => {
    if (tx.transactionType === 'CREATE' && tx.contractName && tx.contractAddress) {
      console.log(`📋 Found deployed contract: ${tx.contractName}`);
      console.log(`   Address: ${tx.contractAddress}`);
      const receipt = broadcastData.receipts.find(r => r.transactionHash === tx.hash);
      console.log(`   Block: ${receipt?.blockNumber || 'pending'}`);

      deployedContracts[tx.contractName] = {
        address: tx.contractAddress,
        deploymentTxHash: tx.hash,
        blockNumber: receipt?.blockNumber || 0
      };
    }
  });

  return deployedContracts;
}

// Get ABI from the out directory
function getContractABI(contractName: string): any[] | null {
  // Try to find the contract JSON in the out directory
  const outPath = OUT_DIR;

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
function saveABIsAndGenerateImports(contracts: DeployedContracts): {
  contractsWithABI: ContractsWithABI;
  abiImports: string[]
} {
  const abiDir = path.join(FRONTEND_DIR, 'src/contracts/abi');

  // Create abi directory if it doesn't exist
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
    console.log(`📁 Created ABI directory: ${abiDir}`);
  }

  const contractsWithABI: ContractsWithABI = {};
  const abiImports: string[] = [];

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
function generateContractsFile(contracts: DeployedContracts): string {
  const { contractsWithABI, abiImports } = saveABIsAndGenerateImports(contracts);

  if (Object.keys(contractsWithABI).length === 0) {
    console.error('❌ No contracts with ABI found');
    process.exit(1);
  }

  // Generate TypeScript file content
  const fileContent = `// Auto-generated by sync-contracts.ts - DO NOT EDIT
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
function generateWebSocketConfig(contracts: DeployedContracts): string {
  const contractAddresses = Object.entries(contracts).reduce((acc, [name, info]) => {
    acc[name] = info.address;
    return acc;
  }, {} as Record<string, string>);

  const wsConfigContent = `// Auto-generated by sync-contracts.ts - DO NOT EDIT
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
function showUsage(): void {
  console.log(`
Usage: tsx scripts/sync-contracts.ts [deployment-script-name]

Arguments:
  deployment-script-name    Optional. Name of the deployment script (e.g., 'Deploy', 'DeployAndUpdate', 'DeployMultiple').
                           If not provided, the script will auto-detect the most recent deployment.

Examples:
  tsx scripts/sync-contracts.ts                    # Auto-detect most recent deployment
  tsx scripts/sync-contracts.ts Deploy             # Use Deploy.s.sol
  tsx scripts/sync-contracts.ts DeployAndUpdate    # Use DeployAndUpdate.s.sol
  tsx scripts/sync-contracts.ts Deploy.s.sol       # Also accepts full filename

Options:
  --help, -h                Show this help message
`);
}

// Main execution
function main(): void {
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  try {
    // Find and read broadcast data
    const broadcastPath = findLatestBroadcast();
    console.log(`📖 Reading broadcast data from: ${broadcastPath}\n`);

    // Extract deployed contracts
    const deployedContracts = extractDeployedContracts(broadcastPath);

    if (Object.keys(deployedContracts).length === 0) {
      console.error('❌ No deployed contracts found in broadcast data');
      process.exit(1);
    }

    console.log(`\n✅ Found ${Object.keys(deployedContracts).length} deployed contract(s)\n`);

    // Generate contracts file (this will also save ABIs)
    console.log('📝 Generating contracts file and saving ABIs...');
    const contractsContent = generateContractsFile(deployedContracts);
    const contractsPath = path.join(FRONTEND_DIR, 'src/contracts/contracts.ts');

    // Ensure directory exists
    const contractsDir = path.dirname(contractsPath);
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }

    // Write contracts file
    fs.writeFileSync(contractsPath, contractsContent);
    console.log(`✅ Updated contracts file: ${contractsPath}`);

    // Generate WebSocket config
    const wsConfigContent = generateWebSocketConfig(deployedContracts);
    const wsConfigPath = path.join(FRONTEND_DIR, 'src/config/websocket.ts');

    // Ensure config directory exists
    const configDir = path.dirname(wsConfigPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write WebSocket config
    fs.writeFileSync(wsConfigPath, wsConfigContent);
    console.log(`✅ Updated WebSocket config: ${wsConfigPath}`);

    console.log('\n🎉 Contract sync complete!');
    console.log('\nNext steps:');
    console.log('1. cd frontend');
    console.log('2. bun run dev');
    console.log('3. Open http://localhost:3000');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error syncing contracts:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
