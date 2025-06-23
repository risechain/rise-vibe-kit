#!/usr/bin/env node

/**
 * Watch for contract changes and auto-deploy
 * This script monitors contract files and redeploys when changes are detected
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

// Configuration
const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const WATCH_PATHS = [
  path.join(CONTRACTS_DIR, 'src'),
  path.join(CONTRACTS_DIR, 'script'),
];

// Debounce configuration
let deployTimeout;
const DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before deploying

// Track if deployment is in progress
let isDeploying = false;

// Deploy contracts
function deployContracts() {
  if (isDeploying) {
    log.warning('Deployment already in progress, skipping...');
    return;
  }

  isDeploying = true;
  log.header('🚀 Deploying contracts...');

  const deploy = spawn('npm', ['run', 'deploy-and-sync'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  deploy.on('close', (code) => {
    isDeploying = false;
    if (code === 0) {
      log.success('Deployment completed successfully!');
    } else {
      log.error(`Deployment failed with code ${code}`);
    }
    log.info('Watching for changes...');
  });

  deploy.on('error', (err) => {
    isDeploying = false;
    log.error(`Failed to start deployment: ${err.message}`);
  });
}

// Handle file changes
function handleChange(eventType, filename) {
  if (!filename) return;
  
  // Ignore certain files
  if (filename.includes('.swp') || filename.includes('.tmp') || filename.startsWith('.')) {
    return;
  }

  log.info(`Change detected in ${filename}`);

  // Clear existing timeout
  if (deployTimeout) {
    clearTimeout(deployTimeout);
  }

  // Set new timeout
  deployTimeout = setTimeout(() => {
    deployContracts();
  }, DEBOUNCE_MS);
}

// Start watching
function startWatching() {
  log.header('👀 Contract Auto-Deploy Watcher');
  log.info(`Watching for changes in:`);
  WATCH_PATHS.forEach(watchPath => {
    log.info(`  - ${watchPath}`);
  });
  log.info('');
  log.info('Press Ctrl+C to stop');
  log.info('');

  // Check if directories exist
  const existingPaths = WATCH_PATHS.filter(p => fs.existsSync(p));
  if (existingPaths.length === 0) {
    log.error('No watch paths exist!');
    process.exit(1);
  }

  // Initial deployment
  log.info('Running initial deployment...');
  deployContracts();

  // Watch for changes
  existingPaths.forEach(watchPath => {
    fs.watch(watchPath, { recursive: true }, handleChange);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  log.info('\nStopping watcher...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Start the watcher
startWatching();