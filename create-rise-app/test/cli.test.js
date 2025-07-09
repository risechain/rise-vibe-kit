#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, 'test-projects');
const cliPath = path.join(__dirname, '../bin/cli.js');

// Ensure test directory exists
fs.ensureDirSync(testDir);

// Test configuration
const tests = [
  {
    name: 'Chat template',
    template: 'chat',
    verifyFiles: [
      'frontend/src/hooks/useAutoWallet.ts',
      'frontend/src/hooks/useContract.ts',
      'frontend/src/hooks/chat/useChatAppContract.ts',
      'frontend/src/hooks/chat/useChatEvents.ts',
      'frontend/src/components/ChatInterface.tsx',
      'frontend/src/app/page.tsx',
      'contracts/src/chatApp.sol'
    ]
  },
  {
    name: 'Pump template',
    template: 'pump',
    verifyFiles: [
      'frontend/src/hooks/useAutoWallet.ts',
      'frontend/src/hooks/pump/useTokenLaunchpad.ts',
      'frontend/src/hooks/pump/useTokenLaunchpad-mock.ts',
      'frontend/src/app/page.tsx',
      'contracts/src/TokenLaunchpad.sol'
    ]
  },
  {
    name: 'FrenPet template',
    template: 'frenpet',
    verifyFiles: [
      'frontend/src/hooks/useAutoWallet.ts',
      'frontend/src/hooks/frenpet/useFrenPet.ts',
      'frontend/src/hooks/frenpet/useFrenPet-mock.ts',
      'frontend/src/app/page.tsx',
      'contracts/src/FrenPet.sol'
    ]
  },
  {
    name: 'Leverage template',
    template: 'leverage',
    verifyFiles: [
      'frontend/src/hooks/useAutoWallet.ts',
      'frontend/src/hooks/leverage/useLeverageTrading.ts',
      'frontend/src/hooks/leverage/useLeverageTradingEvents.ts',
      'frontend/src/hooks/leverage/useMockUSDC.ts',
      'frontend/src/app/page.tsx',
      'contracts/src/leverage/LeverageTrading.sol'
    ]
  }
];

// Helper function to run a test
async function runTest(test) {
  console.log(chalk.blue(`\nTesting ${test.name}...`));
  
  const projectName = `test-${test.template}-${Date.now()}`;
  const projectPath = path.join(testDir, projectName);
  
  try {
    // Clean up if directory exists
    if (fs.existsSync(projectPath)) {
      fs.removeSync(projectPath);
    }
    
    // Run the CLI command
    console.log(chalk.gray(`Running: node ${cliPath} ${projectName} -t ${test.template} -y --no-install --no-git`));
    execSync(`node ${cliPath} ${projectName} -t ${test.template} -y --no-install --no-git`, {
      cwd: testDir,
      stdio: 'inherit'
    });
    
    // Verify files exist
    console.log(chalk.gray('Verifying files...'));
    let allFilesExist = true;
    
    for (const file of test.verifyFiles) {
      const filePath = path.join(projectPath, file);
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`  ✗ Missing: ${file}`));
        allFilesExist = false;
      } else {
        console.log(chalk.green(`  ✓ Found: ${file}`));
      }
    }
    
    // Verify NavigationBar doesn't have Example Apps dropdown
    const navBarPath = path.join(projectPath, 'frontend/src/components/NavigationBar.tsx');
    if (fs.existsSync(navBarPath)) {
      const navBarContent = fs.readFileSync(navBarPath, 'utf-8');
      if (navBarContent.includes('Example Apps') || navBarContent.includes('exampleApps')) {
        console.log(chalk.red('  ✗ NavigationBar contains Example Apps dropdown (should be removed for templates)'));
        allFilesExist = false;
      } else {
        console.log(chalk.green('  ✓ NavigationBar correctly excludes Example Apps dropdown'));
      }
    }
    
    // Clean up
    fs.removeSync(projectPath);
    
    if (allFilesExist) {
      console.log(chalk.green(`✓ ${test.name} passed`));
      return true;
    } else {
      console.log(chalk.red(`✗ ${test.name} failed`));
      return false;
    }
    
  } catch (error) {
    console.log(chalk.red(`✗ ${test.name} failed with error:`), error.message);
    // Clean up on error
    if (fs.existsSync(projectPath)) {
      fs.removeSync(projectPath);
    }
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log(chalk.magenta('\n=== Running create-rise-dapp CLI Tests ===\n'));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  // Summary
  console.log(chalk.blue('\n=== Test Summary ==='));
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));
  
  // Clean up test directory
  fs.removeSync(testDir);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();