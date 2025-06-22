#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '../..');
const TEMPLATE_DIR = path.join(__dirname, '../templates');
const WORKING_FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const WORKING_CONTRACTS_DIR = path.join(ROOT_DIR, 'contracts');

// File mapping configuration
const FILE_MAPPINGS = {
  chat: {
    contracts: [
      'src/ChatApp.sol',
      'script/Deploy.s.sol'
    ],
    frontend: {
      pages: ['src/app/page.tsx'], // Main chat page
      components: [
        'src/components/ChatInterface.tsx',
        'src/components/ChatInterfaceEnhanced.tsx',
        'src/components/chat/**/*'
      ],
      hooks: [
        'src/hooks/useChatAppContract.ts',
        'src/hooks/useChatEvents.ts'
      ],
      abi: ['src/contracts/abi/ChatApp.json']
    }
  },
  pump: {
    contracts: [
      'src/TokenLaunchpad.sol',
      'script/DeployTokenLaunchpad.s.sol'
    ],
    frontend: {
      pages: ['src/app/pump/page.tsx'],
      components: [],
      hooks: [
        'src/hooks/useTokenLaunchpad.ts',
        'src/hooks/useTokenLaunchpad-mock.ts'
      ],
      abi: ['src/contracts/abi/TokenLaunchpad.json']
    }
  },
  frenpet: {
    contracts: [
      'src/FrenPet.sol',
      'script/DeployFrenPet.s.sol'
    ],
    frontend: {
      pages: ['src/app/frenpet/page.tsx'],
      components: [],
      hooks: [
        'src/hooks/useFrenPet.ts',
        'src/hooks/useFrenPet-mock.ts'
      ],
      abi: ['src/contracts/abi/FrenPet.json']
    }
  },
  perps: {
    contracts: [
      'src/PerpExchange.sol',
      'script/DeployPerpExchange.s.sol'
    ],
    frontend: {
      pages: ['src/app/perps/page.tsx'],
      components: [
        'src/components/defi/**/*',
        'src/components/dataviz/**/*'
      ],
      hooks: [
        'src/hooks/usePerpExchange.ts'
      ],
      abi: ['src/contracts/abi/PerpExchange.json']
    }
  }
};

// Base template files that should be synced
const BASE_FILES = {
  contracts: [
    'src/SimpleStorage.sol',
    'src/interfaces/**/*',
    'script/DeployMultiple.s.sol'
  ],
  frontend: {
    components: [
      'src/components/ui/**/*',
      'src/components/web3/**/*',
      'src/components/AutoWalletProvider.tsx',
      'src/components/DebugInfo.tsx',
      'src/components/EventNotifications.tsx',
      'src/components/NavigationBar.tsx',
      'src/components/NetworkStatus.tsx',
      'src/components/Providers.tsx',
      'src/components/ThemeToggle.tsx',
      'src/components/TransactionConfirmation.tsx',
      'src/components/WalletSelector.tsx',
      'src/components/WebSocketStatus.tsx'
    ],
    hooks: [
      'src/hooks/useAutoWallet.ts',
      'src/hooks/useContract.ts',
      'src/hooks/useContractEventSubscription.ts',
      'src/hooks/useContractEvents.ts',
      'src/hooks/useContractFactory.ts',
      'src/hooks/useContractFactoryPayable.ts',
      'src/hooks/useEmbeddedWalletEnhanced.ts',
      'src/hooks/useEnsureNetwork.ts',
      'src/hooks/useEventCache.ts',
      'src/hooks/useEventNotifications.tsx',
      'src/hooks/useHistoricalEvents.ts',
      'src/hooks/useRiseWebSocket.ts'
    ],
    pages: [
      'src/app/debug/page.tsx',
      'src/app/events/page.tsx',
      'src/app/websocket-test/page.tsx',
      'src/app/layout.tsx',
      'src/app/globals.css',
      'src/app/favicon.ico'
    ],
    lib: ['src/lib/**/*'],
    providers: ['src/providers/**/*'],
    config: ['src/config/**/*'],
    styles: ['src/styles/**/*'],
    fonts: ['src/fonts/**/*'],
    types: ['src/types/**/*']
  }
};

async function syncFiles(direction) {
  console.log(chalk.blue(`\\n🔄 Syncing files ${direction}...\\n`));
  
  const syncOperations = [];
  
  // Sync base template files
  console.log(chalk.yellow('Syncing base template files...'));
  await syncBaseTemplate(direction, syncOperations);
  
  // Sync template-specific files
  for (const [template, mapping] of Object.entries(FILE_MAPPINGS)) {
    console.log(chalk.yellow(`\\nSyncing ${template} template files...`));
    await syncTemplate(template, mapping, direction, syncOperations);
  }
  
  // Execute sync operations
  if (syncOperations.length === 0) {
    console.log(chalk.green('✓ All files are already in sync!'));
    return;
  }
  
  console.log(chalk.blue(`\\n📋 Sync Summary:`));
  console.log(`Total operations: ${syncOperations.length}\\n`);
  
  // Show operations
  syncOperations.forEach(op => {
    console.log(`  ${op.action}: ${chalk.cyan(op.from)} → ${chalk.green(op.to)}`);
  });
  
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Proceed with sync?',
    default: true
  }]);
  
  if (!confirm) {
    console.log(chalk.yellow('Sync cancelled.'));
    return;
  }
  
  // Execute operations
  for (const op of syncOperations) {
    await fs.ensureDir(path.dirname(op.to));
    await fs.copy(op.from, op.to, { overwrite: true });
  }
  
  console.log(chalk.green('\\n✅ Sync completed successfully!'));
}

async function syncBaseTemplate(direction, operations) {
  const baseTemplateDir = path.join(TEMPLATE_DIR, 'base');
  
  // Sync contracts
  for (const pattern of BASE_FILES.contracts) {
    await syncPattern(
      pattern,
      WORKING_CONTRACTS_DIR,
      path.join(baseTemplateDir, 'contracts'),
      direction,
      operations
    );
  }
  
  // Sync frontend files
  for (const category of Object.keys(BASE_FILES.frontend)) {
    for (const pattern of BASE_FILES.frontend[category]) {
      await syncPattern(
        pattern,
        WORKING_FRONTEND_DIR,
        path.join(baseTemplateDir, 'frontend'),
        direction,
        operations
      );
    }
  }
}

async function syncTemplate(templateName, mapping, direction, operations) {
  const templateDir = path.join(TEMPLATE_DIR, templateName);
  
  // Sync contracts
  for (const file of mapping.contracts || []) {
    await syncFile(
      file,
      WORKING_CONTRACTS_DIR,
      path.join(templateDir, 'contracts'),
      direction,
      operations
    );
  }
  
  // Sync frontend files
  for (const category of Object.keys(mapping.frontend || {})) {
    for (const pattern of mapping.frontend[category] || []) {
      if (category === 'pages') {
        // Special handling for pages
        await syncPageFile(
          pattern,
          WORKING_FRONTEND_DIR,
          path.join(templateDir, 'pages'),
          direction,
          operations
        );
      } else if (category === 'abi') {
        // ABIs don't go into template directories, skip for now
        continue;
      } else {
        await syncPattern(
          pattern,
          WORKING_FRONTEND_DIR,
          path.join(templateDir, category),
          direction,
          operations
        );
      }
    }
  }
}

async function syncPattern(pattern, workingBase, templateBase, direction, operations) {
  const sourceBase = direction === 'to-templates' ? workingBase : templateBase;
  const targetBase = direction === 'to-templates' ? templateBase : workingBase;
  
  const files = await glob(pattern, { cwd: sourceBase });
  
  for (const file of files) {
    const sourcePath = path.join(sourceBase, file);
    const targetPath = path.join(targetBase, file);
    
    if (await shouldSync(sourcePath, targetPath)) {
      operations.push({
        action: 'Copy',
        from: sourcePath,
        to: targetPath
      });
    }
  }
}

async function syncFile(file, workingBase, templateBase, direction, operations) {
  const sourcePath = direction === 'to-templates' 
    ? path.join(workingBase, file)
    : path.join(templateBase, file);
  
  const targetPath = direction === 'to-templates'
    ? path.join(templateBase, file)
    : path.join(workingBase, file);
  
  if (await fs.exists(sourcePath) && await shouldSync(sourcePath, targetPath)) {
    operations.push({
      action: 'Copy',
      from: sourcePath,
      to: targetPath
    });
  }
}

async function syncPageFile(pagePath, workingBase, templatePagesDir, direction, operations) {
  if (direction === 'to-templates') {
    // Extract just the page file name from the path
    const pageName = path.basename(pagePath);
    const sourcePath = path.join(workingBase, pagePath);
    const targetPath = path.join(templatePagesDir, pageName);
    
    if (await fs.exists(sourcePath) && await shouldSync(sourcePath, targetPath)) {
      operations.push({
        action: 'Copy',
        from: sourcePath,
        to: targetPath
      });
    }
  } else {
    // When syncing from templates, we need to reconstruct the full path
    const files = await fs.readdir(templatePagesDir);
    for (const file of files) {
      const sourcePath = path.join(templatePagesDir, file);
      // Reconstruct the original path structure
      const targetPath = path.join(workingBase, pagePath.replace(path.basename(pagePath), file));
      
      if (await shouldSync(sourcePath, targetPath)) {
        operations.push({
          action: 'Copy',
          from: sourcePath,
          to: targetPath
        });
      }
    }
  }
}

async function shouldSync(sourcePath, targetPath) {
  if (!await fs.exists(targetPath)) {
    return true;
  }
  
  const sourceStat = await fs.stat(sourcePath);
  const targetStat = await fs.stat(targetPath);
  
  return sourceStat.mtime > targetStat.mtime;
}

async function main() {
  console.log(chalk.blue('\\n🚀 RISE Vibe Kit - Template Sync Tool\\n'));
  
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select sync direction:',
    choices: [
      { name: 'Working directories → Templates', value: 'to-templates' },
      { name: 'Templates → Working directories', value: 'to-working' },
      { name: 'Exit', value: 'exit' }
    ]
  }]);
  
  if (action === 'exit') {
    console.log(chalk.yellow('Goodbye!'));
    process.exit(0);
  }
  
  await syncFiles(action);
}

// Run the sync tool
main().catch(err => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});