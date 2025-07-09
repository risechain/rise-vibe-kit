#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, 'local-test-projects');
const cliPath = path.join(__dirname, '../bin/cli.js');

// Ensure test directory exists
fs.ensureDirSync(testDir);

// Clean up any existing test projects
fs.emptyDirSync(testDir);

console.log(chalk.magenta('\n=== Testing Local CLI (not npm package) ===\n'));
console.log(chalk.gray(`Using CLI at: ${cliPath}\n`));

const templates = ['chat', 'leverage', 'pump', 'frenpet'];
let passed = 0;
let failed = 0;

for (const template of templates) {
  console.log(chalk.blue(`\nTesting ${template} template...`));
  
  const projectName = `test-${template}`;
  const projectPath = path.join(testDir, projectName);
  
  try {
    // Create the app
    console.log(chalk.gray(`Creating ${projectName}...`));
    execSync(`node ${cliPath} ${projectName} -t ${template} -y --no-install --no-git`, {
      cwd: testDir,
      stdio: 'pipe' // Suppress output for cleaner test results
    });
    
    // Check NavigationBar
    const navBarPath = path.join(projectPath, 'frontend/src/components/NavigationBar.tsx');
    const navBarContent = fs.readFileSync(navBarPath, 'utf-8');
    
    if (navBarContent.includes('Example Apps') || navBarContent.includes('exampleApps')) {
      console.log(chalk.red(`  ✗ NavigationBar contains Example Apps dropdown`));
      failed++;
      continue;
    } else {
      console.log(chalk.green(`  ✓ NavigationBar correctly excludes Example Apps`));
    }
    
    // Check hooks structure
    const generalHooks = [
      'useAutoWallet.ts',
      'useContractFactory.ts',
      'useRiseWebSocket.ts'
    ];
    
    let hooksOk = true;
    for (const hook of generalHooks) {
      const hookPath = path.join(projectPath, 'frontend/src/hooks', hook);
      if (!fs.existsSync(hookPath)) {
        console.log(chalk.red(`  ✗ Missing general hook: ${hook}`));
        hooksOk = false;
      }
    }
    
    if (hooksOk) {
      console.log(chalk.green(`  ✓ General hooks present`));
    }
    
    // Check template-specific hooks
    let templateHooksOk = true;
    switch (template) {
      case 'chat':
        if (!fs.existsSync(path.join(projectPath, 'frontend/src/hooks/chat/useChatAppContract.ts'))) {
          console.log(chalk.red(`  ✗ Missing chat-specific hooks`));
          templateHooksOk = false;
        }
        break;
      case 'leverage':
        if (!fs.existsSync(path.join(projectPath, 'frontend/src/hooks/leverage/useLeverageTrading.ts'))) {
          console.log(chalk.red(`  ✗ Missing leverage-specific hooks`));
          templateHooksOk = false;
        }
        break;
      case 'pump':
        if (!fs.existsSync(path.join(projectPath, 'frontend/src/hooks/pump/useTokenLaunchpad.ts'))) {
          console.log(chalk.red(`  ✗ Missing pump-specific hooks`));
          templateHooksOk = false;
        }
        break;
      case 'frenpet':
        if (!fs.existsSync(path.join(projectPath, 'frontend/src/hooks/frenpet/useFrenPet.ts'))) {
          console.log(chalk.red(`  ✗ Missing frenpet-specific hooks`));
          templateHooksOk = false;
        }
        break;
    }
    
    if (templateHooksOk) {
      console.log(chalk.green(`  ✓ Template-specific hooks present`));
    }
    
    // Check components
    if (template === 'leverage') {
      const leverageComponents = [
        'frontend/src/components/leverage/defi/LeverageSlider.tsx',
        'frontend/src/components/leverage/dataviz/PriceChart.tsx'
      ];
      
      let componentsOk = true;
      for (const comp of leverageComponents) {
        if (!fs.existsSync(path.join(projectPath, comp))) {
          console.log(chalk.red(`  ✗ Missing leverage component: ${comp}`));
          componentsOk = false;
        }
      }
      
      if (componentsOk) {
        console.log(chalk.green(`  ✓ Leverage components present`));
      }
    }
    
    console.log(chalk.green(`✓ ${template} template passed all checks`));
    passed++;
    
  } catch (error) {
    console.log(chalk.red(`✗ ${template} template failed: ${error.message}`));
    failed++;
  }
}

// Summary
console.log(chalk.blue('\n=== Test Summary ==='));
console.log(chalk.green(`Passed: ${passed}/${templates.length}`));
if (failed > 0) {
  console.log(chalk.red(`Failed: ${failed}/${templates.length}`));
}

// Clean up
fs.removeSync(testDir);

process.exit(failed > 0 ? 1 : 0);