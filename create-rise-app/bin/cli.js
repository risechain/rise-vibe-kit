#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { createApp } from '../src/create-app.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

program
  .name('create-rise-app')
  .version(packageJson.version)
  .description('Create a new RISE dApp with the Vibe Kit')
  .argument('[project-name]', 'Name of your project')
  .option('-t, --template <template>', 'Template to use (chat, pump, frenpet, all)', 'all')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--typescript', 'Use TypeScript (default)')
  .option('--no-typescript', 'Use JavaScript')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip dependency installation')
  .action(async (projectName, options) => {
    console.log(chalk.magenta(`
╦═╗╦╔═╗╔═╗  ╦  ╦╦╔╗ ╔═╗  ╦╔═╦╔╦╗
╠╦╝║╚═╗║╣   ╚╗╔╝║╠╩╗║╣   ╠╩╗║ ║ 
╩╚═╩╚═╝╚═╝   ╚╝ ╩╚═╝╚═╝  ╩ ╩╩ ╩ 
    `));
    
    console.log(chalk.cyan('Welcome to create-rise-app! 🚀\n'));
    
    try {
      await createApp(projectName, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();