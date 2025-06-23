#!/usr/bin/env node

/**
 * Script to install Foundry dependencies for the contracts
 * This handles the case where forge is not installed and provides helpful instructions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FORGE_STD_URL = 'https://github.com/foundry-rs/forge-std';
const OPENZEPPELIN_URL = 'https://github.com/OpenZeppelin/openzeppelin-contracts@v5.0.0';
const OPENZEPPELIN_UPGRADEABLE_URL = 'https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable@v5.0.0';

function checkForgeInstalled() {
  try {
    execSync('forge --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function installForgeDependencies() {
  console.log('📦 Installing Foundry dependencies...');
  
  const contractsDir = path.join(__dirname, '..', 'contracts');
  const libDir = path.join(contractsDir, 'lib');
  
  // Create lib directory if it doesn't exist
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  // Create .gitmodules in project root if it doesn't exist
  const gitmodulesPath = path.join(__dirname, '..', '.gitmodules');
  const gitmodulesContent = `[submodule "contracts/lib/forge-std"]
	path = contracts/lib/forge-std
	url = ${FORGE_STD_URL}
[submodule "contracts/lib/openzeppelin-contracts"]
	path = contracts/lib/openzeppelin-contracts
	url = https://github.com/OpenZeppelin/openzeppelin-contracts
[submodule "contracts/lib/openzeppelin-contracts-upgradeable"]
	path = contracts/lib/openzeppelin-contracts-upgradeable
	url = https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable
`;

  if (!fs.existsSync(gitmodulesPath)) {
    fs.writeFileSync(gitmodulesPath, gitmodulesContent);
  }

  try {
    // Change to contracts directory
    process.chdir(contractsDir);
    
    // Install dependencies with --no-commit flag
    console.log('Installing forge-std...');
    execSync(`forge install foundry-rs/forge-std --no-commit`, { stdio: 'inherit' });
    
    console.log('Installing OpenZeppelin contracts...');
    execSync(`forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit`, { stdio: 'inherit' });
    
    console.log('Installing OpenZeppelin upgradeable contracts...');
    execSync(`forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.0.0 --no-commit`, { stdio: 'inherit' });
    
    // Create remappings.txt if it doesn't exist
    const remappingsPath = path.join(contractsDir, 'remappings.txt');
    if (!fs.existsSync(remappingsPath)) {
      const remappings = `forge-std/=lib/forge-std/src/
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/
`;
      fs.writeFileSync(remappingsPath, remappings);
    }
    
    console.log('✅ Foundry dependencies installed successfully!');
  } catch (error) {
    console.error('❌ Error installing Foundry dependencies:', error.message);
    console.log('\n💡 You may need to manually run:');
    console.log('   cd contracts');
    console.log('   forge install foundry-rs/forge-std --no-commit');
    console.log('   forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit');
    console.log('   forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.0.0 --no-commit');
  }
}

function main() {
  if (!checkForgeInstalled()) {
    console.log('⚠️  Foundry not detected!');
    console.log('\n📚 To install Foundry, run:');
    console.log('   curl -L https://foundry.paradigm.xyz | bash');
    console.log('   foundryup');
    console.log('\nThen run "npm install" again to install contract dependencies.');
    console.log('\n💡 Continuing with frontend installation...');
    return;
  }

  installForgeDependencies();
}

// Run the script
main();