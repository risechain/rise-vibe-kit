#!/usr/bin/env node

/**
 * Setup Validation Script
 * Checks that the development environment is properly configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Check results
const results = {
  passed: [],
  warnings: [],
  errors: [],
};

// Helper to run command and return output
function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options }).trim();
  } catch (error) {
    return null;
  }
}

// Check Node.js version
function checkNodeVersion() {
  log.header('Checking Node.js...');
  
  const nodeVersion = runCommand('node --version');
  if (!nodeVersion) {
    results.errors.push('Node.js is not installed');
    log.error('Node.js is not installed');
    return;
  }
  
  const version = nodeVersion.replace('v', '').split('.')[0];
  if (parseInt(version) < 18) {
    results.errors.push(`Node.js version ${nodeVersion} is too old (need >= 18)`);
    log.error(`Node.js version ${nodeVersion} is too old (need >= 18)`);
  } else {
    results.passed.push(`Node.js ${nodeVersion}`);
    log.success(`Node.js ${nodeVersion}`);
  }
}

// Check npm/yarn
function checkPackageManager() {
  log.header('Checking package manager...');
  
  const npmVersion = runCommand('npm --version');
  const yarnVersion = runCommand('yarn --version');
  
  if (!npmVersion && !yarnVersion) {
    results.errors.push('No package manager found (npm or yarn)');
    log.error('No package manager found (npm or yarn)');
  } else {
    if (npmVersion) {
      results.passed.push(`npm ${npmVersion}`);
      log.success(`npm ${npmVersion}`);
    }
    if (yarnVersion) {
      results.passed.push(`yarn ${yarnVersion}`);
      log.success(`yarn ${yarnVersion}`);
    }
  }
}

// Check Foundry installation
function checkFoundry() {
  log.header('Checking Foundry...');
  
  const forgeVersion = runCommand('forge --version');
  if (!forgeVersion) {
    results.errors.push('Foundry is not installed');
    log.error('Foundry is not installed');
    log.info('Install with: curl -L https://foundry.paradigm.xyz | bash && foundryup');
    return;
  }
  
  results.passed.push(`Foundry: ${forgeVersion}`);
  log.success(`Foundry: ${forgeVersion}`);
  
  // Check Foundry tools
  const tools = ['cast', 'anvil', 'chisel'];
  tools.forEach(tool => {
    if (runCommand(`${tool} --version`)) {
      log.success(`  ${tool} is available`);
    } else {
      results.warnings.push(`${tool} is not available`);
      log.warning(`  ${tool} is not available`);
    }
  });
}

// Check environment variables
function checkEnvironmentVariables() {
  log.header('Checking environment variables...');
  
  const envFile = path.join(process.cwd(), '.env');
  const envExampleFile = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envFile)) {
    if (fs.existsSync(envExampleFile)) {
      results.warnings.push('.env file not found (but .env.example exists)');
      log.warning('.env file not found');
      log.info('Create with: cp .env.example .env');
    } else {
      results.errors.push('No .env or .env.example file found');
      log.error('No .env or .env.example file found');
    }
    return;
  }
  
  log.success('.env file found');
  
  // Check for required variables
  const envContent = fs.readFileSync(envFile, 'utf8');
  const requiredVars = ['PRIVATE_KEY', 'RPC_URL'];
  
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    
    if (!match || !match[1] || match[1].includes('your_')) {
      results.warnings.push(`${varName} is not set properly`);
      log.warning(`${varName} is not set properly`);
    } else {
      log.success(`${varName} is set`);
    }
  });
}

// Check RPC connection
async function checkRPCConnection() {
  log.header('Checking RPC connection...');
  
  const envFile = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envFile)) {
    log.warning('Skipping RPC check (no .env file)');
    return;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const rpcMatch = envContent.match(/^RPC_URL=(.+)$/m);
  
  if (!rpcMatch || !rpcMatch[1]) {
    log.warning('No RPC_URL found in .env');
    return;
  }
  
  const rpcUrl = rpcMatch[1];
  log.info(`Testing connection to ${rpcUrl}...`);
  
  // Test RPC connection with a simple request
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1,
  });
  
  return new Promise((resolve) => {
    const url = new URL(rpcUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };
    
    const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.result) {
            const blockNumber = parseInt(response.result, 16);
            results.passed.push(`RPC connection successful (block ${blockNumber})`);
            log.success(`RPC connection successful (block ${blockNumber})`);
          } else {
            results.warnings.push('RPC connection returned unexpected response');
            log.warning('RPC connection returned unexpected response');
          }
        } catch (e) {
          results.warnings.push('RPC connection failed');
          log.warning('RPC connection failed');
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      results.warnings.push(`RPC connection failed: ${error.message}`);
      log.warning(`RPC connection failed: ${error.message}`);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      results.warnings.push('RPC connection timed out');
      log.warning('RPC connection timed out');
      resolve();
    });
    
    req.write(data);
    req.end();
  });
}

// Check contract compilation
function checkContractCompilation() {
  log.header('Checking contract compilation...');
  
  const contractsDir = path.join(process.cwd(), 'contracts');
  if (!fs.existsSync(contractsDir)) {
    log.warning('No contracts directory found');
    return;
  }
  
  const srcDir = path.join(contractsDir, 'src');
  if (!fs.existsSync(srcDir)) {
    log.warning('No contracts/src directory found');
    return;
  }
  
  // Check if any .sol files exist
  const solidityFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.sol'));
  if (solidityFiles.length === 0) {
    log.warning('No Solidity files found in contracts/src');
    return;
  }
  
  log.info(`Found ${solidityFiles.length} Solidity files`);
  
  // Try to compile
  const compileResult = runCommand('cd contracts && forge build', { stdio: 'pipe' });
  if (compileResult && compileResult.includes('Compiler run successful')) {
    results.passed.push('Contracts compile successfully');
    log.success('Contracts compile successfully');
  } else {
    results.errors.push('Contract compilation failed');
    log.error('Contract compilation failed');
    log.info('Run "cd contracts && forge build" to see errors');
  }
}

// Check dependencies installation
function checkDependencies() {
  log.header('Checking dependencies...');
  
  // Check frontend dependencies
  const frontendNodeModules = path.join(process.cwd(), 'frontend', 'node_modules');
  if (fs.existsSync(frontendNodeModules)) {
    const packageCount = fs.readdirSync(frontendNodeModules).length;
    log.success(`Frontend dependencies installed (${packageCount} packages)`);
  } else {
    results.warnings.push('Frontend dependencies not installed');
    log.warning('Frontend dependencies not installed');
    log.info('Run "cd frontend && npm install"');
  }
  
  // Check contract dependencies
  const contractsLib = path.join(process.cwd(), 'contracts', 'lib');
  if (fs.existsSync(contractsLib)) {
    const libs = fs.readdirSync(contractsLib);
    if (libs.length > 0) {
      log.success(`Contract dependencies installed (${libs.join(', ')})`);
    } else {
      results.warnings.push('No contract dependencies found');
      log.warning('No contract dependencies found');
    }
  } else {
    results.warnings.push('Contract lib directory not found');
    log.warning('Contract lib directory not found');
    log.info('Run "cd contracts && forge install"');
  }
}

// Print summary
function printSummary() {
  log.header('Validation Summary');
  
  console.log(`\n${colors.green}Passed: ${results.passed.length}${colors.reset}`);
  results.passed.forEach(item => console.log(`  ✓ ${item}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings: ${results.warnings.length}${colors.reset}`);
    results.warnings.forEach(item => console.log(`  ⚠ ${item}`));
  }
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors: ${results.errors.length}${colors.reset}`);
    results.errors.forEach(item => console.log(`  ✗ ${item}`));
  }
  
  console.log('\n' + '─'.repeat(50));
  
  if (results.errors.length === 0) {
    if (results.warnings.length === 0) {
      console.log(`${colors.green}${colors.bright}✨ All checks passed! Your environment is ready.${colors.reset}`);
    } else {
      console.log(`${colors.yellow}${colors.bright}⚠️  Setup is functional but has some warnings.${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}${colors.bright}❌ Setup has errors that need to be fixed.${colors.reset}`);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}RISE Vibe Kit - Setup Validation${colors.reset}`);
  console.log('═'.repeat(50));
  
  checkNodeVersion();
  checkPackageManager();
  checkFoundry();
  checkEnvironmentVariables();
  await checkRPCConnection();
  checkContractCompilation();
  checkDependencies();
  
  printSummary();
}

// Run validation
main().catch(error => {
  log.error(`Validation script failed: ${error.message}`);
  process.exit(1);
});