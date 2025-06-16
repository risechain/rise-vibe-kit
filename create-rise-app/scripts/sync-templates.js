#\!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const rootDir = path.resolve(__dirname, '../..');
const templatesDir = path.join(__dirname, '../templates');

// Define what files to sync for each template
const templates = {
  chat: {
    contracts: ['ChatApp.sol'],
    scripts: ['Deploy.s.sol'],
    pages: { 'page.tsx': 'page.tsx' }, // source: target
    hooks: ['useChatAppContract.ts'],
    components: []
  },
  pump: {
    contracts: ['TokenLaunchpad.sol'],
    scripts: ['DeployTokenLaunchpad.s.sol'],
    pages: { 'pump/page.tsx': 'pump/page.tsx' },
    hooks: ['useTokenLaunchpad.ts'],
    components: []
  },
  frenpet: {
    contracts: ['FrenPet.sol'],
    scripts: ['DeployFrenPet.s.sol'],
    pages: { 'frenpet/page.tsx': 'frenpet/page.tsx' },
    hooks: ['useFrenPet.ts'],
    components: []
  }
};

// Base template files (common to all templates)
const baseFiles = {
  'package.json': 'package.json',
  'README.md': 'README.md',
  'contracts/foundry.toml': 'contracts/foundry.toml',
  'contracts/remappings.txt': 'contracts/remappings.txt',
  'frontend/package.json': 'frontend/package.json',
  'frontend/next.config.ts': 'frontend/next.config.ts',
  'frontend/tsconfig.json': 'frontend/tsconfig.json',
  'frontend/tailwind.config.ts': 'frontend/tailwind.config.ts',
  'frontend/postcss.config.js': 'frontend/postcss.config.js',
  'frontend/.eslintrc.json': 'frontend/.eslintrc.json',
  'frontend/src/config/chain.ts': 'frontend/src/config/chain.ts',
  'frontend/src/config/websocket.ts': 'frontend/src/config/websocket.ts',
  'frontend/src/lib/utils.ts': 'frontend/src/lib/utils.ts',
  'frontend/src/lib/rise-sync-client.ts': 'frontend/src/lib/rise-sync-client.ts',
  'frontend/src/lib/wallet/EmbeddedWallet.ts': 'frontend/src/lib/wallet/EmbeddedWallet.ts',
  'frontend/src/lib/wallet/NonceManager.ts': 'frontend/src/lib/wallet/NonceManager.ts',
  'frontend/src/providers/WagmiProvider.tsx': 'frontend/src/providers/WagmiProvider.tsx',
  'frontend/src/providers/WebSocketProvider.tsx': 'frontend/src/providers/WebSocketProvider.tsx',
  'frontend/src/hooks/useContractFactory.ts': 'frontend/src/hooks/useContractFactory.ts',
  'frontend/src/hooks/useContractEvents.ts': 'frontend/src/hooks/useContractEvents.ts',
  'frontend/src/hooks/useEnsureNetwork.ts': 'frontend/src/hooks/useEnsureNetwork.ts',
  'frontend/src/components/ui': 'frontend/src/components/ui',
  'frontend/src/components/NavigationBar.tsx': 'frontend/src/components/NavigationBar.tsx',
  'frontend/src/components/ConnectButton.tsx': 'frontend/src/components/ConnectButton.tsx',
  'frontend/src/app/layout.tsx': 'frontend/src/app/layout.tsx',
  'frontend/src/app/globals.css': 'frontend/src/app/globals.css',
  'scripts': 'scripts'
};

async function syncBaseTemplate() {
  console.log(chalk.blue('Syncing base template...'));
  const baseDir = path.join(templatesDir, 'base');
  
  // Ensure base directory exists
  await fs.ensureDir(baseDir);
  
  // Copy base files
  for (const [source, target] of Object.entries(baseFiles)) {
    const sourcePath = path.join(rootDir, source);
    const targetPath = path.join(baseDir, target);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath, { overwrite: true });
      console.log(chalk.green(`  ✓ ${target}`));
    } else {
      console.log(chalk.yellow(`  ⚠ ${source} not found`));
    }
  }
}

async function syncTemplate(templateName, config) {
  console.log(chalk.blue(`\nSyncing ${templateName} template...`));
  const templateDir = path.join(templatesDir, templateName);
  
  // Ensure template directories exist
  await fs.ensureDir(path.join(templateDir, 'contracts'));
  await fs.ensureDir(path.join(templateDir, 'scripts'));
  await fs.ensureDir(path.join(templateDir, 'pages'));
  await fs.ensureDir(path.join(templateDir, 'hooks'));
  await fs.ensureDir(path.join(templateDir, 'components'));
  
  // Sync contracts
  for (const contract of config.contracts) {
    const sourcePath = path.join(rootDir, 'contracts/src', contract);
    const targetPath = path.join(templateDir, 'contracts', contract);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
      console.log(chalk.green(`  ✓ contracts/${contract}`));
    } else {
      console.log(chalk.yellow(`  ⚠ contracts/src/${contract} not found`));
    }
  }
  
  // Sync deployment scripts
  for (const script of config.scripts) {
    const sourcePath = path.join(rootDir, 'contracts/script', script);
    const targetPath = path.join(templateDir, 'scripts', script);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
      console.log(chalk.green(`  ✓ scripts/${script}`));
    } else {
      console.log(chalk.yellow(`  ⚠ contracts/script/${script} not found`));
    }
  }
  
  // Sync pages
  for (const [source, target] of Object.entries(config.pages)) {
    const sourcePath = path.join(rootDir, 'frontend/src/app', source);
    const targetPath = path.join(templateDir, 'pages', target);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath, { overwrite: true });
      console.log(chalk.green(`  ✓ pages/${target}`));
    } else {
      console.log(chalk.yellow(`  ⚠ frontend/src/app/${source} not found`));
    }
  }
  
  // Sync hooks
  for (const hook of config.hooks) {
    const sourcePath = path.join(rootDir, 'frontend/src/hooks', hook);
    const targetPath = path.join(templateDir, 'hooks', hook);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
      console.log(chalk.green(`  ✓ hooks/${hook}`));
    } else {
      console.log(chalk.yellow(`  ⚠ frontend/src/hooks/${hook} not found`));
    }
  }
  
  // Sync components
  for (const component of config.components) {
    const sourcePath = path.join(rootDir, 'frontend/src/components', component);
    const targetPath = path.join(templateDir, 'components', component);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath, { overwrite: true });
      console.log(chalk.green(`  ✓ components/${component}`));
    } else {
      console.log(chalk.yellow(`  ⚠ frontend/src/components/${component} not found`));
    }
  }
}

async function cleanupTemplates() {
  console.log(chalk.blue('\nCleaning up template files...'));
  
  // Remove node_modules from base template if it exists
  const nodeModulesPath = path.join(templatesDir, 'base/node_modules');
  if (await fs.pathExists(nodeModulesPath)) {
    await fs.remove(nodeModulesPath);
    console.log(chalk.green('  ✓ Removed base/node_modules'));
  }
  
  const frontendNodeModulesPath = path.join(templatesDir, 'base/frontend/node_modules');
  if (await fs.pathExists(frontendNodeModulesPath)) {
    await fs.remove(frontendNodeModulesPath);
    console.log(chalk.green('  ✓ Removed base/frontend/node_modules'));
  }
  
  // Clean up contract build artifacts
  const contractsOutPath = path.join(templatesDir, 'base/contracts/out');
  if (await fs.pathExists(contractsOutPath)) {
    await fs.remove(contractsOutPath);
    console.log(chalk.green('  ✓ Removed contracts/out'));
  }
  
  const contractsCachePath = path.join(templatesDir, 'base/contracts/cache');
  if (await fs.pathExists(contractsCachePath)) {
    await fs.remove(contractsCachePath);
    console.log(chalk.green('  ✓ Removed contracts/cache'));
  }
}

// Main sync function
async function main() {
  console.log(chalk.magenta('\n🔄 Syncing templates from main project...\n'));
  
  try {
    // Sync base template
    await syncBaseTemplate();
    
    // Sync individual templates
    for (const [name, config] of Object.entries(templates)) {
      await syncTemplate(name, config);
    }
    
    // Clean up unnecessary files
    await cleanupTemplates();
    
    console.log(chalk.green('\n✅ Template sync complete\!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error syncing templates:'), error);
    process.exit(1);
  }
}

// Run if called directly
main();

module.exports = { syncBaseTemplate, syncTemplate, templates };
EOF < /dev/null