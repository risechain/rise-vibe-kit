import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import validatePackageName from 'validate-npm-package-name';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import https from 'https';
import { promisify } from 'util';
import stream from 'stream';
const pipeline = promisify(stream.pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub repository configuration
const GITHUB_REPO = {
  owner: 'risechain',
  repo: 'rise-vibe-kit',
  branch: 'main',
  baseUrl: 'https://raw.githubusercontent.com/risechain/rise-vibe-kit/main'
};

// Get working directories (source of truth)
function getWorkingDirectories() {
  // When running locally in development
  const rootDir = path.join(__dirname, '../..');
  const localDirs = {
    root: rootDir,
    frontend: path.join(rootDir, 'frontend'),
    contracts: path.join(rootDir, 'contracts'),
    scripts: path.join(rootDir, 'scripts')
  };
  
  // Check if we're in the development environment
  const isLocal = fs.existsSync(localDirs.frontend);
  
  return {
    ...localDirs,
    isLocal
  };
}

// Fetch file from GitHub
async function fetchFileFromGitHub(filePath) {
  const url = `${GITHUB_REPO.baseUrl}/${filePath}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 404) {
        resolve(null); // File doesn't exist
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${filePath}: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Download file from GitHub and save locally
async function downloadFileFromGitHub(githubPath, localPath) {
  const url = `${GITHUB_REPO.baseUrl}/${githubPath}`;
  
  await fs.ensureDir(path.dirname(localPath));
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 404) {
        resolve(false); // File doesn't exist
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${githubPath}: ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(localPath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', reject);
  });
}

// Get list of files from GitHub API
async function getGitHubFiles(directory) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/contents/${directory}?ref=${GITHUB_REPO.branch}`;
  
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'create-rise-dapp'
      }
    };
    
    https.get(apiUrl, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to list ${directory}: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const files = JSON.parse(data);
          resolve(files);
        } catch (e) {
          reject(e);
        }
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Recursively download directory from GitHub
async function downloadDirectoryFromGitHub(githubDir, localDir) {
  try {
    const files = await getGitHubFiles(githubDir);
    
    for (const file of files) {
      if (file.type === 'file') {
        const localPath = path.join(localDir, path.basename(file.path));
        await downloadFileFromGitHub(file.path, localPath);
      } else if (file.type === 'dir') {
        // Recursively download subdirectories
        const subLocalDir = path.join(localDir, file.name);
        await downloadDirectoryFromGitHub(file.path, subLocalDir);
      }
    }
    
    return true;
  } catch (error) {
    console.warn(`Warning: Could not download directory ${githubDir}: ${error.message}`);
    return false;
  }
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
  },
  leverage: {
    contracts: [
      'src/leverage/LeverageTrading.sol',
      'src/leverage/PriceOracle.sol',
      'src/leverage/MockUSDC.sol',
      'script/DeployLeverageTrading.s.sol'
    ],
    frontend: {
      pages: ['src/app/leverage/page.tsx'],
      components: [
        'src/components/defi/BalancePercentageSlider.tsx',
        'src/components/defi/LeverageSlider.tsx',
        'src/components/dataviz/PriceChart.tsx',
        'src/components/ui/label.tsx',
        'src/components/ui/scroll-area.tsx',
        'src/components/ui/select.tsx'
      ],
      hooks: [
        'src/hooks/useLeverageTrading.ts',
        'src/hooks/useLeverageTradingEvents.ts',
        'src/hooks/useMockUSDC.ts'
      ],
      lib: ['src/lib/feedIdMapping.ts'],
      abi: [
        'src/contracts/abi/LeverageTrading.json',
        'src/contracts/abi/PriceOracleV2.json',
        'src/contracts/abi/MockUSDC.json',
        'src/contracts/abi/ERC20.json'
      ]
    },
    appTitle: 'RISE Leverage Trading',
    pageReplacements: {
      'src/app/leverage/page.tsx': 'src/app/page.tsx' // Leverage replaces the home page
    },
    dependencies: {
      '@web3icons/react': '^4.0.16',
      '@radix-ui/react-label': '^2.1.7',
      '@radix-ui/react-scroll-area': '^1.2.9',
      '@radix-ui/react-select': '^2.2.5',
      'recharts': '^2.15.3'
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
      'src/app/globals.css'
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
    'deploy-and-update.sh',
    'setup.sh',
    'validate-setup.js',
    'install-forge-deps.js',
    'sync-contracts.js',
    'deploy-vercel.sh',
    'setup-vercel-env.sh',
    'sync-contracts-update.js'
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
  if (!options.yes && (!template || !['chat', 'pump', 'frenpet', 'leverage'].includes(template))) {
    const { selectedTemplate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTemplate',
        message: 'Which template would you like to use?',
        choices: [
          { name: 'Chat App - Real-time messaging with karma system', value: 'chat' },
          { name: 'Pump - Token launchpad like pump.fun', value: 'pump' },
          { name: 'FrenPet - Virtual pet game with VRF battles', value: 'frenpet' },
          { name: 'Leverage Trading - Perpetual futures with up to 100x leverage', value: 'leverage' }
        ]
      }
    ]);
    template = selectedTemplate;
  }
  
  // Get working directories
  const workingDirs = getWorkingDirectories();
  
  // Check if we're running from local development or npm package
  if (workingDirs.isLocal) {
    // Validate working directories exist
    const requiredDirs = [workingDirs.frontend, workingDirs.contracts, workingDirs.scripts];
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        console.error(chalk.red(`Required directory not found: ${dir}`));
        console.error(chalk.red('Please run this command from the rise-vibe-kit root directory'));
        process.exit(1);
      }
    }
  } else {
    console.log(`${chalk.blue('ℹ Fetching latest templates from GitHub...')}`);
  }
  
  // Create project directory
  console.log(`\\n${chalk.green('Creating a new RISE app in')} ${chalk.cyan(targetDir)}\\n`);
  console.log(`${chalk.blue('ℹ Using direct template approach - always up-to-date!')}\\n`);
  fs.ensureDirSync(targetDir);
  
  const spinner = ora(workingDirs.isLocal ? 'Copying files from working directories...' : 'Fetching files from GitHub...').start();
  
  try {
    if (workingDirs.isLocal) {
      // Copy from local directories
      await copyBaseFiles(workingDirs, targetDir);
      await copyTemplateFiles(template, workingDirs, targetDir);
    } else {
      // Fetch from GitHub
      await copyBaseFilesFromGitHub(targetDir);
      await copyTemplateFilesFromGitHub(template, targetDir);
    }
    
    // Generate contracts configuration
    await generateContractsConfig(template, workingDirs, targetDir);
    
    spinner.succeed(workingDirs.isLocal ? 'Files copied from working directories' : 'Files fetched from GitHub');
    
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
    
    console.log(chalk.magenta('Happy building on RISE'));
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
  
  // Copy lib files if they exist
  if (frontendMapping.lib) {
    for (const libPattern of frontendMapping.lib) {
      const files = await glob(libPattern, { cwd: workingDirs.frontend });
      for (const file of files) {
        const sourcePath = path.join(workingDirs.frontend, file);
        const targetPath = path.join(targetDir, 'frontend', file);
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
      }
    }
  }
}

// GitHub-based file copying functions
async function copyBaseFilesFromGitHub(targetDir) {
  // Copy root files
  for (const file of BASE_FILES.root) {
    const success = await downloadFileFromGitHub(file, path.join(targetDir, file));
    if (!success && file !== '.env.example') {
      console.warn(`Warning: Could not download ${file}`);
    }
  }
  
  // Copy contract base files
  for (const pattern of BASE_FILES.contracts) {
    // For patterns with wildcards, we need to handle differently
    if (pattern.includes('**')) {
      // Skip for now - would need directory listing
      continue;
    }
    await downloadFileFromGitHub(`contracts/${pattern}`, path.join(targetDir, 'contracts', pattern));
  }
  
  // Copy frontend base files systematically
  const frontendBase = BASE_FILES.frontend;
  
  // Structure files
  for (const file of frontendBase.structure) {
    await downloadFileFromGitHub(`frontend/${file}`, path.join(targetDir, 'frontend', file));
  }
  
  // Download essential directories
  const essentialDirs = [
    { github: 'frontend/src/components/ui', local: 'frontend/src/components/ui' },
    { github: 'frontend/src/components/web3', local: 'frontend/src/components/web3' },
    { github: 'frontend/src/hooks', local: 'frontend/src/hooks' },
    { github: 'frontend/src/lib', local: 'frontend/src/lib' },
    { github: 'frontend/src/providers', local: 'frontend/src/providers' },
    { github: 'frontend/src/config', local: 'frontend/src/config' },
    { github: 'frontend/src/types', local: 'frontend/src/types' },
    { github: 'frontend/public', local: 'frontend/public' },
    { github: 'frontend/src/styles', local: 'frontend/src/styles' },
    { github: 'frontend/src/fonts', local: 'frontend/src/fonts' }
  ];
  
  for (const dir of essentialDirs) {
    await downloadDirectoryFromGitHub(dir.github, path.join(targetDir, dir.local));
  }
  
  // Copy specific component files
  const componentFiles = [
    'AutoWalletProvider.tsx',
    'DebugInfo.tsx',
    'EventNotifications.tsx',
    'NavigationBar.tsx',
    'NetworkStatus.tsx',
    'Providers.tsx',
    'ThemeToggle.tsx',
    'TransactionConfirmation.tsx',
    'WalletSelector.tsx',
    'WebSocketStatus.tsx'
  ];
  
  for (const file of componentFiles) {
    await downloadFileFromGitHub(`frontend/src/components/${file}`, path.join(targetDir, 'frontend/src/components', file));
  }
  
  // Copy page files
  const pageFiles = frontendBase.pages;
  for (const file of pageFiles) {
    await downloadFileFromGitHub(`frontend/${file}`, path.join(targetDir, 'frontend', file));
  }
  
  // Copy script files
  for (const file of BASE_FILES.scripts) {
    await downloadFileFromGitHub(`scripts/${file}`, path.join(targetDir, 'scripts', file));
  }
}

async function copyTemplateFilesFromGitHub(templateName, targetDir) {
  const mapping = TEMPLATE_MAPPINGS[templateName];
  if (!mapping) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  
  // Copy contract files
  for (const contractFile of mapping.contracts) {
    await downloadFileFromGitHub(`contracts/${contractFile}`, path.join(targetDir, 'contracts', contractFile));
  }
  
  // Copy frontend files
  const frontendMapping = mapping.frontend;
  
  // Copy pages
  for (const pageFile of frontendMapping.pages) {
    const sourcePath = `frontend/${pageFile}`;
    let targetPath;
    
    if (mapping.pageReplacements && mapping.pageReplacements[pageFile]) {
      targetPath = path.join(targetDir, 'frontend', mapping.pageReplacements[pageFile]);
    } else {
      targetPath = path.join(targetDir, 'frontend', pageFile);
    }
    
    await downloadFileFromGitHub(sourcePath, targetPath);
  }
  
  // Copy components
  for (const componentPattern of frontendMapping.components) {
    if (componentPattern.includes('**')) {
      // Handle directory patterns like 'src/components/chat/**/*'
      const baseDir = componentPattern.replace('/**/*', '');
      await downloadDirectoryFromGitHub(`frontend/${baseDir}`, path.join(targetDir, 'frontend', baseDir));
    } else {
      await downloadFileFromGitHub(`frontend/${componentPattern}`, path.join(targetDir, 'frontend', componentPattern));
    }
  }
  
  // Copy hooks
  for (const hookFile of frontendMapping.hooks) {
    await downloadFileFromGitHub(`frontend/${hookFile}`, path.join(targetDir, 'frontend', hookFile));
  }
  
  // Copy ABI files
  for (const abiFile of frontendMapping.abi) {
    await downloadFileFromGitHub(`frontend/${abiFile}`, path.join(targetDir, 'frontend', abiFile));
  }
  
  // Copy lib files if they exist
  if (frontendMapping.lib) {
    for (const libFile of frontendMapping.lib) {
      await downloadFileFromGitHub(`frontend/${libFile}`, path.join(targetDir, 'frontend', libFile));
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
    },
    leverage: {
      contracts: [
        {
          name: 'LeverageTrading',
          address: '0xec472935c006751295453aa55Dd7A3518e626Eb8',
          deploymentTxHash: '', // Add actual tx hash if available
          blockNumber: 0 // Add actual block number if available
        },
        {
          name: 'USDC',
          address: '0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8',
          isExternal: true, // External contract, not deployed by us
          useERC20ABI: true // Use standard ERC20 ABI instead of USDC-specific
        },
        {
          name: 'PriceOracle',
          address: '0x5A569Ad19272Afa97103fD4DbadF33B2FcbaA175',
          isExternal: true // External contract, not deployed by us
        }
      ]
    }
  };
  
  const config = contractConfig[templateName];
  if (!config) {
    throw new Error(`No contract mapping for template: ${templateName}`);
  }

  // Handle leverage template with multiple contracts
  if (templateName === 'leverage' && Array.isArray(config.contracts)) {
    const imports = config.contracts
      .filter(c => !c.useERC20ABI) // Skip USDC since we'll use ERC20ABI
      .map(c => {
        // Special case for PriceOracle - the ABI file is named PriceOracleV2.json
        const abiFileName = c.name === 'PriceOracle' ? 'PriceOracleV2' : c.name;
        return `import ${c.name}ABI from './abi/${abiFileName}.json';`;
      })
      .join('\n');
    
    const contractEntries = config.contracts
      .map(c => `  ${c.name}: {
    address: '${c.address}' as const,
    ${!c.isExternal ? `deploymentTxHash: '${c.deploymentTxHash}',
    blockNumber: ${c.blockNumber},` : ''}
    abi: ${c.useERC20ABI ? 'ERC20ABI' : `${c.name}ABI`}
  }`)
      .join(',\n');
    
    const primaryContract = config.contracts[0].name; // LeverageTrading is primary
    
    return `// Auto-generated for ${templateName} template - DO NOT EDIT
// Generated by create-app-direct.js
// Chain ID: 11155931 (RISE Testnet)

// Import ABIs
${imports}
import ERC20ABI from './abi/ERC20.json';

export const contracts = {
${contractEntries}
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

// Re-export primary contract for convenience
export const ${primaryContract.toUpperCase()}_ADDRESS = '${config.contracts[0].address}' as const;
export const ${primaryContract.toUpperCase()}_ABI = ${primaryContract}ABI;

// Re-export USDC and Oracle addresses
export const USDC_ADDRESS = '${config.contracts[1].address}' as const;
export const USDC_ABI = ERC20ABI;
export const PRICEORACLE_ADDRESS = '${config.contracts[2].address}' as const;
`;
  }

  // Handle single contract templates
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
      navContent = navContent.replace(/RISE App|RISE Vibe Kit|RISE Chat|RISE Pump|RISE FrenPet|RISE Leverage Trading/g, mapping.appTitle);
      
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
      
      // Add template-specific dependencies if needed
      if (packageJsonPath.includes('frontend') && mapping && mapping.dependencies) {
        packageJson.dependencies = {
          ...packageJson.dependencies,
          ...mapping.dependencies
        };
      }
      
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }
  }
}