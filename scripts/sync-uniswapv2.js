#!/usr/bin/env node

/**
 * Manual sync script for UniswapV2 contracts
 * Run this after deploying UniswapV2 contracts to update the frontend
 *
 * Usage: node scripts/sync-uniswapv2.js
 *
 * First deploy contracts:
 *   cd contracts && forge script script/DeployUniswapV2.s.sol --rpc-url $RPC_URL --broadcast
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}UniswapV2 Contract Sync Script${colors.reset}`);
console.log(`${colors.blue}==============================${colors.reset}\n`);

// Path to the frontend contracts file
const FRONTEND_FILE = path.join(__dirname, '../frontend/src/contracts/uniswapV2.ts');

// Check if file exists
if (!fs.existsSync(FRONTEND_FILE)) {
  console.error(`${colors.red}Error: Frontend file not found at ${FRONTEND_FILE}${colors.reset}`);
  process.exit(1);
}

console.log(`${colors.yellow}After deploying UniswapV2 contracts, update the following addresses:${colors.reset}\n`);

// Read the current file
const currentContent = fs.readFileSync(FRONTEND_FILE, 'utf8');

// Extract current addresses
const addressPattern = /(\w+):\s*'(0x[0-9a-fA-F]{40})'/g;
let match;
const currentAddresses = {};

while ((match = addressPattern.exec(currentContent)) !== null) {
  currentAddresses[match[1]] = match[2];
}

// Display current addresses
console.log('Current addresses in frontend:');
Object.entries(currentAddresses).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log(`\n${colors.yellow}To update addresses:${colors.reset}`);
console.log('1. Deploy contracts:');
console.log('   cd contracts');
console.log('   forge script script/DeployUniswapV2.s.sol --rpc-url $RPC_URL --broadcast\n');
console.log('2. Copy the addresses from the deployment output');
console.log('3. Edit frontend/src/contracts/uniswapV2.ts');
console.log('4. Replace the placeholder addresses with the deployed ones\n');

// Create a template for manual update
const updateTemplate = `
// Example update (copy this format):
export const UNISWAP_V2_ADDRESSES = {
  factory: 'PASTE_FACTORY_ADDRESS_HERE',
  router: 'PASTE_ROUTER_ADDRESS_HERE',
  weth: 'PASTE_WETH_ADDRESS_HERE',
  usdc: 'PASTE_USDC_ADDRESS_HERE',
  dai: 'PASTE_DAI_ADDRESS_HERE',
  pepe: 'PASTE_PEPE_ADDRESS_HERE',
} as const;
`;

console.log(`${colors.green}Template for updating addresses:${colors.reset}`);
console.log(updateTemplate);

// Check for broadcast files
const broadcastDir = path.join(__dirname, '../contracts/broadcast/DeployUniswapV2.s.sol');
if (fs.existsSync(broadcastDir)) {
  console.log(`${colors.green}Found broadcast directory. Checking for recent deployments...${colors.reset}`);

  // Look for the most recent run-latest.json
  const chains = fs.readdirSync(broadcastDir).filter(dir => {
    const stat = fs.statSync(path.join(broadcastDir, dir));
    return stat.isDirectory();
  });

  if (chains.length > 0) {
    const latestChain = chains[0];
    const runLatestFile = path.join(broadcastDir, latestChain, 'run-latest.json');

    if (fs.existsSync(runLatestFile)) {
      console.log(`${colors.green}Found deployment at: ${runLatestFile}${colors.reset}`);
      console.log('You can extract addresses from this file.\n');

      try {
        const deploymentData = JSON.parse(fs.readFileSync(runLatestFile, 'utf8'));

        // Extract deployed contracts
        if (deploymentData.transactions) {
          console.log('Deployed contracts found:');
          deploymentData.transactions
            .filter(tx => tx.transactionType === 'CREATE' || tx.transactionType === 'CREATE2')
            .forEach(tx => {
              if (tx.contractName && tx.contractAddress) {
                console.log(`  ${tx.contractName}: ${tx.contractAddress}`);
              }
            });
        }
      } catch (err) {
        console.error(`${colors.red}Error reading deployment file: ${err.message}${colors.reset}`);
      }
    }
  }
} else {
  console.log(`${colors.yellow}No broadcast directory found. Deploy contracts first.${colors.reset}`);
}

console.log(`\n${colors.blue}After updating addresses, run:${colors.reset}`);
console.log('  npm run dev (in frontend directory)');
console.log('  Navigate to /wallet-playground to test\n');

console.log(`${colors.green}Script completed!${colors.reset}`);