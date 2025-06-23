#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`),
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  scriptName: null,
  verbose: false,
  force: false,
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-v' || arg === '--verbose') {
    options.verbose = true;
  } else if (arg === '-f' || arg === '--force') {
    options.force = true;
  } else if (arg === '-h' || arg === '--help') {
    showHelp();
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    options.scriptName = arg;
  }
}

function showHelp() {
  console.log(`
${colors.bright}Contract Sync Tool${colors.reset}

Syncs deployed contract addresses and ABIs from Foundry broadcast data to the frontend.

${colors.bright}Usage:${colors.reset}
  sync-contracts.js [options] [script-name]

${colors.bright}Options:${colors.reset}
  -v, --verbose    Show detailed output
  -f, --force      Overwrite existing files without prompting
  -h, --help       Show this help message

${colors.bright}Examples:${colors.reset}
  sync-contracts.js                    # Auto-detect latest deployment
  sync-contracts.js Deploy             # Use Deploy.s.sol
  sync-contracts.js DeployAll -v       # Use DeployAll.s.sol with verbose output
`);
}

// Configuration
const CHAIN_ID = '11155931'; // RISE Testnet
const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const BROADCAST_DIR = path.join(CONTRACTS_DIR, 'broadcast');
const OUT_DIR = path.join(CONTRACTS_DIR, 'out');

// Validation checks
function validateEnvironment() {
  log.header('Validating environment...');
  
  // Check if contracts directory exists
  if (!fs.existsSync(CONTRACTS_DIR)) {
    log.error(`Contracts directory not found: ${CONTRACTS_DIR}`);
    process.exit(1);
  }
  
  // Check if broadcast directory exists
  if (!fs.existsSync(BROADCAST_DIR)) {
    log.error(`No broadcast directory found. Have you deployed any contracts?`);
    log.info(`Run 'npm run deploy' to deploy contracts first.`);
    process.exit(1);
  }
  
  // Check if out directory exists
  if (!fs.existsSync(OUT_DIR)) {
    log.error(`No out directory found. Have you compiled the contracts?`);
    log.info(`Run 'cd contracts && forge build' to compile contracts first.`);
    process.exit(1);
  }
  
  // Check if frontend directory exists
  if (!fs.existsSync(FRONTEND_DIR)) {
    log.error(`Frontend directory not found: ${FRONTEND_DIR}`);
    process.exit(1);
  }
  
  log.success('Environment validation passed');
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
    })
    .sort(); // Sort for consistent output
  
  return scripts;
}

// Find the latest broadcast file with validation
function findLatestBroadcast() {
  log.header('Finding deployment data...');
  
  let broadcastPath;
  let scriptName;
  
  if (options.scriptName) {
    // Use the specified deployment script
    scriptName = options.scriptName;
    
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
      log.error(`No broadcast data found for script '${scriptName}' on chain ${CHAIN_ID}`);
      log.error(`Expected path: ${broadcastPath}`);
      
      const available = findAvailableDeploymentScripts();
      if (available.length > 0) {
        log.info(`Available deployment scripts:`);
        available.forEach(script => log.info(`  - ${script}`));
      }
      process.exit(1);
    }
    
    log.success(`Using specified deployment script: ${scriptName}`);
  } else {
    // Auto-detect the most recent deployment script
    const availableScripts = findAvailableDeploymentScripts();
    
    if (availableScripts.length === 0) {
      log.error(`No deployment scripts found in ${BROADCAST_DIR}`);
      process.exit(1);
    }
    
    // Find the most recently modified script
    let mostRecentScript = null;
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
      log.error(`No broadcast data found for chain ${CHAIN_ID} in any deployment script`);
      log.info(`Available deployment scripts:`);
      availableScripts.forEach(script => log.info(`  - ${script}`));
      process.exit(1);
    }
    
    log.success(`Auto-detected deployment script: ${mostRecentScript}`);
    broadcastPath = path.join(BROADCAST_DIR, mostRecentScript, CHAIN_ID);
    scriptName = mostRecentScript;
  }
  
  const runLatestPath = path.join(broadcastPath, 'run-latest.json');
  if (!fs.existsSync(runLatestPath)) {
    log.error(`No run-latest.json found at: ${runLatestPath}`);
    process.exit(1);
  }
  
  // Validate the broadcast file
  try {
    const data = JSON.parse(fs.readFileSync(runLatestPath, 'utf8'));
    if (!data.transactions || !Array.isArray(data.transactions)) {
      log.error('Invalid broadcast file format: missing transactions array');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Failed to parse broadcast file: ${error.message}`);
    process.exit(1);
  }
  
  return { path: runLatestPath, scriptName };
}

// Extract deployed contracts from broadcast data with validation
function extractDeployedContracts(broadcastPath) {
  log.header('Extracting deployed contracts...');
  
  const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
  const deployedContracts = {};
  
  // Validate broadcast data structure
  if (!broadcastData.transactions || !Array.isArray(broadcastData.transactions)) {
    log.error('Invalid broadcast data: missing transactions');
    return deployedContracts;
  }
  
  // Look for CREATE transactions (contract deployments)
  broadcastData.transactions.forEach((tx, index) => {
    if (tx.transactionType === 'CREATE' && tx.contractName) {
      if (options.verbose) {
        log.info(`Processing transaction ${index + 1}/${broadcastData.transactions.length}`);
      }
      
      // Validate required fields
      if (!tx.contractAddress) {
        log.warning(`Skipping ${tx.contractName}: no contract address`);
        return;
      }
      
      log.success(`Found deployed contract: ${tx.contractName}`);
      log.info(`  Address: ${tx.contractAddress}`);
      
      const receipt = broadcastData.receipts?.find(r => r.transactionHash === tx.hash);
      const blockNumber = receipt?.blockNumber || 0;
      
      if (blockNumber) {
        log.info(`  Block: ${blockNumber}`);
      } else {
        log.warning(`  Block: pending or not found`);
      }
      
      deployedContracts[tx.contractName] = {
        address: tx.contractAddress,
        deploymentTxHash: tx.hash,
        blockNumber: blockNumber
      };
    }
  });
  
  if (Object.keys(deployedContracts).length === 0) {
    log.warning('No deployed contracts found in broadcast data');
  }
  
  return deployedContracts;
}

// Get ABI from the out directory with better error handling
function getContractABI(contractName) {
  // Common file name variations
  const variations = [
    contractName,
    contractName.toLowerCase(),
    contractName.charAt(0).toLowerCase() + contractName.slice(1), // camelCase
  ];
  
  // Search for the contract JSON file
  for (const variation of variations) {
    const searchPaths = [
      path.join(OUT_DIR, `${variation}.sol`, `${contractName}.json`),
      path.join(OUT_DIR, `${contractName}.sol`, `${variation}.json`),
    ];
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        if (options.verbose) {
          log.info(`  Found ABI at: ${searchPath}`);
        }
        
        try {
          const contractJson = JSON.parse(fs.readFileSync(searchPath, 'utf8'));
          if (!contractJson.abi || !Array.isArray(contractJson.abi)) {
            log.warning(`  Invalid ABI format in ${searchPath}`);
            continue;
          }
          return contractJson.abi;
        } catch (error) {
          log.warning(`  Failed to parse ABI from ${searchPath}: ${error.message}`);
          continue;
        }
      }
    }
  }
  
  log.warning(`  Could not find ABI for ${contractName}`);
  return null;
}

// Save ABIs and generate imports with validation
function saveABIsAndGenerateImports(contracts) {
  const abiDir = path.join(FRONTEND_DIR, 'src/contracts/abi');
  
  // Create abi directory if it doesn't exist
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
    log.success(`Created ABI directory: ${abiDir}`);
  }
  
  const contractsWithABI = {};
  const abiImports = [];
  const failedContracts = [];
  
  // Get ABIs for each contract and save them
  Object.entries(contracts).forEach(([name, info]) => {
    const abi = getContractABI(name);
    if (abi) {
      // Save ABI to separate file
      const abiFilePath = path.join(abiDir, `${name}.json`);
      
      try {
        fs.writeFileSync(abiFilePath, JSON.stringify(abi, null, 2));
        log.success(`Saved ABI: ${name}.json`);
        
        // Add to imports
        abiImports.push(`import ${name}ABI from './abi/${name}.json';`);
        
        contractsWithABI[name] = {
          ...info,
          abiImportName: `${name}ABI`
        };
      } catch (error) {
        log.error(`Failed to save ABI for ${name}: ${error.message}`);
        failedContracts.push(name);
      }
    } else {
      failedContracts.push(name);
    }
  });
  
  if (failedContracts.length > 0) {
    log.warning(`Failed to process ABIs for: ${failedContracts.join(', ')}`);
  }
  
  return { contractsWithABI, abiImports };
}

// Generate the TypeScript contracts file with validation
function generateContractsFile(contracts) {
  log.header('Generating TypeScript files...');
  
  const { contractsWithABI, abiImports } = saveABIsAndGenerateImports(contracts);
  
  if (Object.keys(contractsWithABI).length === 0) {
    log.error('No contracts with ABI found to generate');
    process.exit(1);
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

// Main execution
async function main() {
  log.header('🔄 Contract Sync Tool');
  console.log('═'.repeat(50));
  
  try {
    // Validate environment
    validateEnvironment();
    
    // Find broadcast file
    const { path: broadcastPath, scriptName } = findLatestBroadcast();
    
    // Extract contracts
    const contracts = extractDeployedContracts(broadcastPath);
    
    if (Object.keys(contracts).length === 0) {
      log.error('No contracts found to sync');
      process.exit(1);
    }
    
    // Generate TypeScript file
    const tsContent = generateContractsFile(contracts);
    
    // Save the contracts file
    const contractsPath = path.join(FRONTEND_DIR, 'src/contracts/contracts.ts');
    const contractsDir = path.dirname(contractsPath);
    
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    
    // Check if file exists and handle overwrite
    if (fs.existsSync(contractsPath) && !options.force) {
      const existingContent = fs.readFileSync(contractsPath, 'utf8');
      if (existingContent !== tsContent) {
        log.warning(`File already exists: ${contractsPath}`);
        log.info('Use -f or --force to overwrite');
        process.exit(1);
      }
    }
    
    fs.writeFileSync(contractsPath, tsContent);
    log.success(`Generated contracts.ts`);
    
    // Summary
    log.header('✨ Sync completed successfully!');
    log.info(`Script: ${scriptName}`);
    log.info(`Contracts synced: ${Object.keys(contracts).length}`);
    log.info(`Output: ${contractsPath}`);
    
  } catch (error) {
    log.error(`Sync failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main();