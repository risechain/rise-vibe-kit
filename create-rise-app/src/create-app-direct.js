import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import validatePackageName from 'validate-npm-package-name';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get working directories (source of truth)
function getWorkingDirectories() {
  const rootDir = path.join(__dirname, '../..');
  return {
    root: rootDir,
    frontend: path.join(rootDir, 'frontend'),
    contracts: path.join(rootDir, 'contracts'),
    scripts: path.join(rootDir, 'scripts')
  };
}

// Template-specific file mappings (from sync-working-to-templates.js)
const TEMPLATE_MAPPINGS = {
  chat: {
    contracts: [
      'src/chatApp.sol',
      'script/Deploy.s.sol'
    ],
    frontend: {
      pages: ['src/app/chat/page.tsx'], // Chat app at /chat route
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
    },
    appTitle: 'RISE Chat',
    pageReplacements: {
      'src/app/chat/page.tsx': 'src/app/page.tsx' // Chat replaces the home page
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
    },
    appTitle: 'RISE Pump',
    pageReplacements: {
      'src/app/pump/page.tsx': 'src/app/page.tsx' // Pump replaces the home page
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
    },
    appTitle: 'RISE FrenPet',
    pageReplacements: {
      'src/app/frenpet/page.tsx': 'src/app/page.tsx' // FrenPet replaces the home page
    }
  }
};

// Base files that every template gets (from sync-working-to-templates.js)
const BASE_FILES = {
  root: [
    'package.json',
    'package-lock.json',
    'README.md',
    '.gitignore',
    '.env.example'
  ],
  contracts: [
    'foundry.toml',
    'remappings.txt',
    'src/interfaces/**/*'
  ],
  frontend: {
    structure: [
      'package.json',
      'package-lock.json',
      'next.config.ts',
      'tsconfig.json',
      'postcss.config.mjs',
      'eslint.config.mjs',
      '.eslintrc.json',
      'next-env.d.ts',
      'vercel.json',
      '.gitignore',
      '.env.example',
      '.npmrc',
      'README.md'
    ],
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
      'src/app/layout.tsx',
      'src/app/globals.css',
      'src/app/favicon.ico'
    ],
    lib: ['src/lib/**/*'],
    providers: ['src/providers/**/*'],
    config: ['src/config/**/*'],
    styles: ['src/styles/**/*'],
    fonts: ['src/fonts/**/*'],
    types: ['src/types/**/*'],
    public: ['public/**/*']
  },
  scripts: [
    'deploy-and-sync.sh',
    'setup.sh',
    'validate-setup.js',
    'install-forge-deps.js',
    'sync-contracts.js'
  ]
};

export async function createAppDirect(projectName, options) {
  let appName = projectName;
  let template = options.template;
  
  // If no project name provided, prompt for it
  if (!appName) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is your project name?',
        default: 'my-rise-app',
        validate: (input) => {
          const validation = validatePackageName(input);
          if (validation.validForNewPackages) {
            return true;
          }
          return 'Invalid package name';
        }
      }
    ]);
    appName = name;
  }
  
  // Validate project name
  const validation = validatePackageName(appName);
  if (!validation.validForNewPackages) {
    console.error(chalk.red(`Invalid project name: ${appName}`));
    process.exit(1);
  }
  
  // Check if directory already exists
  const targetDir = path.resolve(process.cwd(), appName);
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`Directory ${appName} already exists!`));
    process.exit(1);
  }
  
  // If template not specified, prompt for it
  if (!options.yes && (!template || !['chat', 'pump', 'frenpet'].includes(template))) {
    const { selectedTemplate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTemplate',
        message: 'Which template would you like to use?',
        choices: [
          { name: 'Chat App - Real-time messaging with karma system', value: 'chat' },
          { name: 'Pump - Token launchpad like pump.fun', value: 'pump' },
          { name: 'FrenPet - Virtual pet game with VRF battles', value: 'frenpet' }
        ]
      }
    ]);
    template = selectedTemplate;
  }
  
  // Get working directories
  const workingDirs = getWorkingDirectories();
  
  // Validate working directories exist
  const requiredDirs = [workingDirs.frontend, workingDirs.contracts, workingDirs.scripts];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.error(chalk.red(`Required directory not found: ${dir}`));
      console.error(chalk.red('Please run this command from the rise-vibe-kit root directory'));
      process.exit(1);
    }
  }
  
  // Create project directory
  console.log(`\\n${chalk.green('Creating a new RISE app in')} ${chalk.cyan(targetDir)}\\n`);
  console.log(`${chalk.blue('ℹ Using direct template approach - always up-to-date!')}\\n`);
  fs.ensureDirSync(targetDir);
  
  const spinner = ora('Copying files from working directories...').start();
  
  try {
    // Copy base files (shared across all templates)
    await copyBaseFiles(workingDirs, targetDir);
    
    // Copy template-specific files
    await copyTemplateFiles(template, workingDirs, targetDir);
    
    // Generate contracts configuration
    await generateContractsConfig(template, workingDirs, targetDir);
    
    spinner.succeed('Files copied from working directories');
    
    // Update app metadata
    await updateAppMetadata(targetDir, template, appName);
    
    // Initialize git
    if (options.git !== false) {
      spinner.start('Initializing git repository...');
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      
      // Create .gitignore
      const gitignoreContent = `
# Dependencies
node_modules/
.yarn/

# Testing
coverage/

# Production
build/
dist/
out/
.next/

# Foundry
contracts/cache/
contracts/out/

# Environment
.env
.env.local

# Misc
.DS_Store
*.pem
*.log

# IDE
.vscode/
.idea/
      `.trim();
      
      fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignoreContent);
      spinner.succeed('Git repository initialized');
    }
    
    // Install dependencies
    if (options.install !== false) {
      spinner.start('Installing dependencies... (this may take a few minutes)');
      
      // Install root dependencies
      execSync('npm install', { cwd: targetDir, stdio: 'ignore' });
      
      // Install frontend dependencies
      execSync('npm install', { cwd: path.join(targetDir, 'frontend'), stdio: 'ignore' });
      
      // Install Foundry dependencies
      execSync('forge install', { cwd: path.join(targetDir, 'contracts'), stdio: 'ignore' });
      
      spinner.succeed('Dependencies installed');
    }
    
    // Success message
    console.log(`\\n${chalk.green('Success!')} Created ${chalk.cyan(appName)} at ${chalk.cyan(targetDir)}\\n`);
    
    console.log('Inside that directory, you can run several commands:\\n');
    
    console.log(chalk.cyan('  npm run chain'));
    console.log('    Starts a local blockchain\\n');
    
    console.log(chalk.cyan('  npm run deploy-and-sync'));
    console.log('    Deploys contracts and syncs to frontend\\n');
    
    console.log(chalk.cyan('  npm run dev'));
    console.log('    Starts the development server\\n');
    
    console.log(chalk.cyan('  npm run build'));
    console.log('    Builds the app for production\\n');
    
    console.log('We suggest that you begin by typing:\\n');
    console.log(chalk.cyan(`  cd ${appName}`));
    console.log(chalk.cyan('  npm run deploy-and-sync'));
    console.log(chalk.cyan('  npm run dev\\n'));
    
    console.log(chalk.magenta('Happy building on RISE! 🚀'));
    console.log(chalk.blue('\\n💡 This app was created directly from working directories - always up-to-date!'));
    
  } catch (error) {
    spinner.fail('Failed to create app');
    throw error;
  }
}

async function copyBaseFiles(workingDirs, targetDir) {
  // Copy root files
  for (const file of BASE_FILES.root) {
    const sourcePath = path.join(workingDirs.root, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.existsSync(sourcePath)) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy contract base files
  for (const pattern of BASE_FILES.contracts) {
    const files = await glob(pattern, { cwd: workingDirs.contracts });
    for (const file of files) {
      const sourcePath = path.join(workingDirs.contracts, file);
      const targetPath = path.join(targetDir, 'contracts', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy frontend base files
  const frontendCategories = ['structure', 'components', 'hooks', 'pages', 'lib', 'providers', 'config', 'styles', 'fonts', 'types', 'public'];
  
  for (const category of frontendCategories) {
    const patterns = BASE_FILES.frontend[category] || [];
    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: workingDirs.frontend });
      for (const file of files) {
        let sourcePath = path.join(workingDirs.frontend, file);
        let targetPath = path.join(targetDir, 'frontend', file);
        
        // Special handling for NavigationBar - use template version for templates
        if (file === 'src/components/NavigationBar.tsx') {
          const templateNavPath = path.join(workingDirs.frontend, 'src/components/NavigationBarTemplate.tsx');
          if (fs.existsSync(templateNavPath)) {
            sourcePath = templateNavPath;
          }
        }
        
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
      }
    }
  }
  
  // Copy script files
  for (const file of BASE_FILES.scripts) {
    const sourcePath = path.join(workingDirs.scripts, file);
    const targetPath = path.join(targetDir, 'scripts', file);
    
    if (fs.existsSync(sourcePath)) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
}

async function copyTemplateFiles(templateName, workingDirs, targetDir) {
  const mapping = TEMPLATE_MAPPINGS[templateName];
  if (!mapping) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  
  // Copy contract files
  for (const contractPattern of mapping.contracts) {
    const files = await glob(contractPattern, { cwd: workingDirs.contracts });
    for (const file of files) {
      const sourcePath = path.join(workingDirs.contracts, file);
      const targetPath = path.join(targetDir, 'contracts', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy frontend files with special handling for page replacements
  const frontendMapping = mapping.frontend;
  
  // Copy pages (with replacement logic)
  for (const pagePattern of frontendMapping.pages) {
    const files = await glob(pagePattern, { cwd: workingDirs.frontend });
    for (const file of files) {
      const sourcePath = path.join(workingDirs.frontend, file);
      
      // Check if this page should replace an existing one
      let targetPath;
      if (mapping.pageReplacements && mapping.pageReplacements[file]) {
        targetPath = path.join(targetDir, 'frontend', mapping.pageReplacements[file]);
      } else {
        targetPath = path.join(targetDir, 'frontend', file);
      }
      
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
  }
  
  // Copy components
  for (const componentPattern of frontendMapping.components) {
    const files = await glob(componentPattern, { cwd: workingDirs.frontend });
    for (const file of files) {
      const sourcePath = path.join(workingDirs.frontend, file);
      const targetPath = path.join(targetDir, 'frontend', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy hooks
  for (const hookPattern of frontendMapping.hooks) {
    const files = await glob(hookPattern, { cwd: workingDirs.frontend });
    for (const file of files) {
      const sourcePath = path.join(workingDirs.frontend, file);
      const targetPath = path.join(targetDir, 'frontend', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy ABI files
  for (const abiPattern of frontendMapping.abi) {
    const files = await glob(abiPattern, { cwd: workingDirs.frontend });
    for (const file of files) {
      const sourcePath = path.join(workingDirs.frontend, file);
      const targetPath = path.join(targetDir, 'frontend', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
}

async function generateContractsConfig(templateName, workingDirs, targetDir) {
  const mapping = TEMPLATE_MAPPINGS[templateName];
  if (!mapping) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  // Generate template-specific contracts.ts with only relevant contracts
  const contractsContent = generateTemplateContracts(templateName, mapping);
  const targetPath = path.join(targetDir, 'frontend/src/contracts/contracts.ts');
  
  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, contractsContent);
}

function generateTemplateContracts(templateName, mapping) {
  // Map template names to contract names and addresses
  const contractConfig = {
    chat: {
      name: 'ChatApp',
      address: '0xcf7b7f03188f3b248d6a3d4bd589dc7c31b55084',
      deploymentTxHash: '0xaa54b83133294bcdabb7ef2f12e2728494a2c4a005cf78948fa14ffbe2181033',
      blockNumber: 0xe6e3d6
    },
    pump: {
      name: 'TokenLaunchpad',
      address: '0x04f339ec4d75cf2833069e6e61b60ef56461cd7c',
      deploymentTxHash: '0x6dda1f873079b1f69820f8ceb5a1c060bc2b9c5afc3134be7dcc0cfebc983c6d',
      blockNumber: 0xef69ab
    },
    frenpet: {
      name: 'FrenPet',
      address: '0x2d222d701b29e9d8652bb9afee0a1dabdad0bc23',
      deploymentTxHash: '0x6dda1f873079b1f69820f8ceb5a1c060bc2b9c5afc3134be7dcc0cfebc983c6d',
      blockNumber: 0xef69ab
    }
  };
  
  const config = contractConfig[templateName];
  if (!config) {
    throw new Error(`No contract mapping for template: ${templateName}`);
  }

  const { name: contractName, address, deploymentTxHash, blockNumber } = config;

  return `// Auto-generated for ${templateName} template - DO NOT EDIT
// Generated by create-app-direct.js
// Chain ID: 11155931 (RISE Testnet)

// Import ABIs
import ${contractName}ABI from './abi/${contractName}.json';

export const contracts = {
  ${contractName}: {
    address: '${address}' as const,
    deploymentTxHash: '${deploymentTxHash}',
    blockNumber: ${blockNumber},
    abi: ${contractName}ABI
  }
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

// Re-export specific contract for convenience
export const ${contractName.toUpperCase()}_ADDRESS = '${address}' as const;
export const ${contractName.toUpperCase()}_ABI = ${contractName}ABI;
`;
}

async function updateAppMetadata(targetDir, templateName, appName) {
  const mapping = TEMPLATE_MAPPINGS[templateName];
  
  // Update app title in NavigationBar
  if (mapping.appTitle) {
    const navPath = path.join(targetDir, 'frontend/src/components/NavigationBar.tsx');
    
    if (fs.existsSync(navPath)) {
      let navContent = await fs.readFile(navPath, 'utf-8');
      
      // Replace the app title
      navContent = navContent.replace(/RISE App|RISE Vibe Kit|RISE Chat|RISE Pump|RISE FrenPet/g, mapping.appTitle);
      
      await fs.writeFile(navPath, navContent);
    }
  }
  
  // Update package.json files
  const packageJsonPaths = [
    path.join(targetDir, 'package.json'),
    path.join(targetDir, 'frontend/package.json')
  ];
  
  for (const packageJsonPath of packageJsonPaths) {
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = appName;
      packageJson.version = '0.1.0';
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }
  }
}