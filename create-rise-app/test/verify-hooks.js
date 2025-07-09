#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliPath = path.join(__dirname, '../bin/cli.js');
const tempDir = path.join(__dirname, 'temp-verify');

// Clean up temp directory if it exists
if (fs.existsSync(tempDir)) {
  fs.removeSync(tempDir);
}
fs.ensureDirSync(tempDir);

console.log(chalk.magenta('\n=== Verifying Hook Structure for Templates ===\n'));

// Test chat template
console.log(chalk.blue('Testing chat template hook structure...'));

try {
  execSync(`node ${cliPath} test-chat -t chat -y --no-install --no-git`, {
    cwd: tempDir,
    stdio: 'pipe'
  });
  
  const projectPath = path.join(tempDir, 'test-chat');
  
  // Check general hooks
  const generalHooks = [
    'useAutoWallet.ts',
    'useBlockNumber.ts',
    'useContract.ts',
    'useContractEventSubscription.ts',
    'useContractEvents.ts',
    'useContractFactory.ts',
    'useContractFactoryPayable.ts',
    'useEmbeddedWalletEnhanced.ts',
    'useEnsureNetwork.ts',
    'useEventCache.ts',
    'useEventNotifications.tsx',
    'useGasPrice.ts',
    'useHistoricalEvents.ts',
    'useRiseWebSocket.ts',
    'useTokenBalance.ts',
    'useTransactionStatus.ts'
  ];
  
  console.log(chalk.gray('\nChecking general hooks...'));
  let allGeneralHooksExist = true;
  for (const hook of generalHooks) {
    const hookPath = path.join(projectPath, 'frontend/src/hooks', hook);
    if (fs.existsSync(hookPath)) {
      console.log(chalk.green(`  ✓ ${hook}`));
    } else {
      console.log(chalk.red(`  ✗ ${hook}`));
      allGeneralHooksExist = false;
    }
  }
  
  // Check template-specific hooks
  console.log(chalk.gray('\nChecking chat-specific hooks...'));
  const chatHooks = ['useChatAppContract.ts', 'useChatEvents.ts'];
  let allChatHooksExist = true;
  for (const hook of chatHooks) {
    const hookPath = path.join(projectPath, 'frontend/src/hooks/chat', hook);
    if (fs.existsSync(hookPath)) {
      console.log(chalk.green(`  ✓ chat/${hook}`));
    } else {
      console.log(chalk.red(`  ✗ chat/${hook}`));
      allChatHooksExist = false;
    }
  }
  
  // Check that other template hooks are NOT included
  console.log(chalk.gray('\nVerifying other template hooks are excluded...'));
  const excludedDirs = ['leverage', 'pump', 'frenpet'];
  let noExtraHooks = true;
  for (const dir of excludedDirs) {
    const dirPath = path.join(projectPath, 'frontend/src/hooks', dir);
    if (fs.existsSync(dirPath)) {
      console.log(chalk.red(`  ✗ ${dir}/ directory should not exist`));
      noExtraHooks = false;
    } else {
      console.log(chalk.green(`  ✓ ${dir}/ correctly excluded`));
    }
  }
  
  // Summary
  console.log(chalk.blue('\n=== Summary ==='));
  if (allGeneralHooksExist && allChatHooksExist && noExtraHooks) {
    console.log(chalk.green('✓ All checks passed! Hook structure is correct.'));
  } else {
    console.log(chalk.red('✗ Some checks failed. Hook structure needs attention.'));
  }
  
} catch (error) {
  console.error(chalk.red('Error running test:'), error.message);
} finally {
  // Clean up
  fs.removeSync(tempDir);
}