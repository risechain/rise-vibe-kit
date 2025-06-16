#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePackageJson = {
  "name": "my-rise-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "chain": "cd contracts && anvil --host 0.0.0.0",
    "deploy": "cd contracts && forge script script/Deploy.s.sol:DeployScript --rpc-url $RISE_RPC_URL --broadcast",
    "deploy-and-sync": "node scripts/deploy-and-sync.js",
    "sync-contracts": "node scripts/sync-contracts.js",
    "test": "cd contracts && forge test",
    "lint": "cd frontend && npm run lint"
  },
  "dependencies": {},
  "devDependencies": {}
};

const frontendPackageJson = {
  "name": "rise-app-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-slot": "^1.0.2",
    "@tanstack/react-query": "^5.28.4",
    "@wagmi/connectors": "^5.0.0",
    "@wagmi/core": "^2.10.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "ethers": "^6.11.1",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.439.0",
    "next": "^14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "react-toastify": "^10.0.5",
    "shreds": "^0.1.1",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "viem": "^2.10.5",
    "wagmi": "^2.9.8"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.3",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
};

async function createTemplatePackages() {
  // Write root package.json to base template
  const baseDir = path.join(__dirname, '../templates/base');
  await fs.writeJson(
    path.join(baseDir, 'package.json'), 
    templatePackageJson, 
    { spaces: 2 }
  );
  
  // Write frontend package.json to base template
  await fs.writeJson(
    path.join(baseDir, 'frontend/package.json'), 
    frontendPackageJson, 
    { spaces: 2 }
  );
  
  console.log('✅ Template package.json files created');
}

createTemplatePackages();