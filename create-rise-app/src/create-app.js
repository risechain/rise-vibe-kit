import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import validatePackageName from 'validate-npm-package-name';
import { copyTemplate, updatePackageJson } from './templates.js';

export async function createApp(projectName, options) {
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
          { name: 'FrenPet - Virtual pet game with VRF battles', value: 'frenpet' },
          { name: 'Leverage Trading - Perpetual futures with up to 100x leverage', value: 'leverage' }
        ]
      }
    ]);
    template = selectedTemplate;
  }
  
  // Create project directory
  console.log(`\n${chalk.green('Creating a new RISE app in')} ${chalk.cyan(targetDir)}\n`);
  fs.ensureDirSync(targetDir);
  
  // Copy base template
  const spinner = ora('Copying template files...').start();
  
  try {
    // Copy base template (common files)
    const baseTemplatePath = path.join(path.dirname(import.meta.url.replace('file://', '')), '../templates/base');
    await fs.copy(baseTemplatePath, targetDir);
    
    // Copy specific template
    await copyTemplate(template, targetDir);
    
    spinner.succeed('Template files copied');
    
    // Update package.json with project name
    await updatePackageJson(targetDir, appName);
    
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
    console.log(`\n${chalk.green('Success!')} Created ${chalk.cyan(appName)} at ${chalk.cyan(targetDir)}\n`);
    
    console.log('Inside that directory, you can run several commands:\n');
    
    console.log(chalk.cyan('  npm run chain'));
    console.log('    Starts a local blockchain\n');
    
    console.log(chalk.cyan('  npm run deploy-and-sync'));
    console.log('    Deploys contracts and syncs to frontend\n');
    
    console.log(chalk.cyan('  npm run dev'));
    console.log('    Starts the development server\n');
    
    console.log(chalk.cyan('  npm run build'));
    console.log('    Builds the app for production\n');
    
    console.log('We suggest that you begin by typing:\n');
    console.log(chalk.cyan(`  cd ${appName}`));
    console.log(chalk.cyan('  npm run deploy-and-sync'));
    console.log(chalk.cyan('  npm run dev\n'));
    
    console.log(chalk.magenta('Happy building on RISE! '));
    
  } catch (error) {
    spinner.fail('Failed to create app');
    throw error;
  }
}