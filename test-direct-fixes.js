#!/usr/bin/env node

// Test script to verify our fixes
import { createAppDirect } from './create-rise-app/src/create-app-direct.js';
import fs from 'fs-extra';
import path from 'path';

async function testFixes() {
  console.log('Testing template fixes...\n');
  
  // Clean up test directory
  const testDir = path.join(process.cwd(), 'test-template-fixes');
  await fs.remove(testDir);
  
  // Create a test chat app
  await createAppDirect('test-template-fixes', {
    template: 'chat',
    yes: true,
    install: false,
    git: false
  });
  
  // Check contracts.ts has correct address
  const contractsPath = path.join(testDir, 'frontend/src/contracts/contracts.ts');
  const contractsContent = await fs.readFile(contractsPath, 'utf-8');
  
  console.log('✅ Checking contract address...');
  if (contractsContent.includes('0xcf7b7f03188f3b248d6a3d4bd589dc7c31b55084')) {
    console.log('   ✓ Contract address is correct (not 0x0000...)\n');
  } else {
    console.log('   ✗ Contract address is still 0x0000...\n');
  }
  
  // Check NavigationBar doesn't have dropdown
  const navPath = path.join(testDir, 'frontend/src/components/NavigationBar.tsx');
  const navContent = await fs.readFile(navPath, 'utf-8');
  
  console.log('✅ Checking NavigationBar...');
  if (!navContent.includes('DropdownMenu')) {
    console.log('   ✓ NavigationBar has no dropdown (template version)\n');
  } else {
    console.log('   ✗ NavigationBar still has dropdown\n');
  }
  
  // Clean up
  await fs.remove(testDir);
  console.log('Test complete!');
}

testFixes().catch(console.error);