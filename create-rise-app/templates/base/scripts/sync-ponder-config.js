#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const CHAIN_ID = '11155931'; // RISE Testnet
const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const PONDER_DIR = path.join(__dirname, '../ponder');
const BROADCAST_DIR = path.join(CONTRACTS_DIR, 'broadcast');

console.log('🔄 Syncing Ponder configuration...\n');

// Read existing contracts from frontend
function getDeployedContracts() {
  const contractsPath = path.join(FRONTEND_DIR, 'src/contracts/contracts.ts');
  
  if (!fs.existsSync(contractsPath)) {
    console.error('❌ No contracts file found. Run deploy-and-sync first.');
    process.exit(1);
  }
  
  // Parse the contracts file to extract addresses and ABIs
  const contractsContent = fs.readFileSync(contractsPath, 'utf8');
  const contracts = {};
  
  // Extract contract addresses using regex
  const addressMatches = contractsContent.matchAll(/(\w+):\s*{\s*address:\s*['"]([^'"]+)['"]/g);
  
  for (const match of addressMatches) {
    const [, name, address] = match;
    contracts[name] = { address };
  }
  
  // Get ABIs from the abi directory
  const abiDir = path.join(FRONTEND_DIR, 'src/contracts/abi');
  
  Object.keys(contracts).forEach(name => {
    const abiPath = path.join(abiDir, `${name}.json`);
    if (fs.existsSync(abiPath)) {
      contracts[name].abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    }
  });
  
  return contracts;
}

// Get start block from broadcast data
function getStartBlock() {
  // Find the earliest deployment block
  let earliestBlock = null;
  
  if (fs.existsSync(BROADCAST_DIR)) {
    const scripts = fs.readdirSync(BROADCAST_DIR);
    
    scripts.forEach(script => {
      const runLatestPath = path.join(BROADCAST_DIR, script, CHAIN_ID, 'run-latest.json');
      
      if (fs.existsSync(runLatestPath)) {
        const broadcastData = JSON.parse(fs.readFileSync(runLatestPath, 'utf8'));
        
        broadcastData.receipts.forEach(receipt => {
          const blockNumber = parseInt(receipt.blockNumber, 16);
          if (!earliestBlock || blockNumber < earliestBlock) {
            earliestBlock = blockNumber;
          }
        });
      }
    });
  }
  
  return earliestBlock || 0;
}

// Generate Ponder config
function generatePonderConfig(contracts, startBlock) {
  const config = `import { createConfig } from "@ponder/core";
import { http } from "viem";

// Import ABIs
${Object.entries(contracts).map(([name]) => 
  `import ${name}Abi from "./abis/${name}.json";`
).join('\n')}

export default createConfig({
  networks: {
    rise: {
      chainId: ${CHAIN_ID},
      transport: http(process.env.PONDER_RPC_URL_RISE || "https://testnet.riselabs.xyz"),
    },
  },
  contracts: {
${Object.entries(contracts).map(([name, { address }]) => `    ${name}: {
      abi: ${name}Abi,
      address: "${address}",
      network: "rise",
      startBlock: ${startBlock},
    },`).join('\n')}
  },
});
`;
  
  return config;
}

// Copy ABIs to Ponder directory
function copyABIs(contracts) {
  const ponderAbiDir = path.join(PONDER_DIR, 'abis');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(ponderAbiDir)) {
    fs.mkdirSync(ponderAbiDir, { recursive: true });
  }
  
  Object.entries(contracts).forEach(([name, { abi }]) => {
    if (abi) {
      const abiPath = path.join(ponderAbiDir, `${name}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
      console.log(`📄 Copied ABI for ${name}`);
    }
  });
}

// Main execution
function main() {
  try {
    // Get deployed contracts
    const contracts = getDeployedContracts();
    console.log(`📋 Found ${Object.keys(contracts).length} contracts\n`);
    
    // Get start block
    const startBlock = getStartBlock();
    console.log(`📦 Start block: ${startBlock}\n`);
    
    // Copy ABIs
    console.log('📄 Copying ABIs...');
    copyABIs(contracts);
    
    // Generate Ponder config
    console.log('\n📝 Generating Ponder config...');
    const configContent = generatePonderConfig(contracts, startBlock);
    
    const configPath = path.join(PONDER_DIR, 'ponder.config.ts');
    fs.writeFileSync(configPath, configContent);
    
    console.log(`✅ Ponder config updated: ${configPath}`);
    
    // Update package.json script
    const rootPackageJsonPath = path.join(__dirname, '../package.json');
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
    
    if (!rootPackageJson.scripts['ponder:sync']) {
      rootPackageJson.scripts['ponder:sync'] = 'node scripts/sync-ponder-config.js';
      rootPackageJson.scripts['ponder:dev'] = 'cd ponder && npm run dev';
      rootPackageJson.scripts['ponder:start'] = 'cd ponder && npm run start';
      
      fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
      console.log('\n✅ Added Ponder scripts to root package.json');
    }
    
    console.log('\n🎉 Ponder sync complete!');
    console.log('\nNext steps:');
    console.log('1. cd ponder');
    console.log('2. npm install');
    console.log('3. npm run dev');
    
  } catch (error) {
    console.error('\n❌ Error syncing Ponder config:', error.message);
    process.exit(1);
  }
}

// Run the script
main();