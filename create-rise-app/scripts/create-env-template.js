#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = `# Private key for deploying contracts
# You can get this from your wallet (MetaMask, etc.)
PRIVATE_KEY=

# RISE Chain RPC URLs
RISE_RPC_URL=https://testnet.risechain.com

# Optional: API keys for additional services
# ETHERSCAN_API_KEY=
`;

async function createEnvTemplate() {
  const baseDir = path.join(__dirname, '../templates/base');
  await fs.writeFile(
    path.join(baseDir, '.env.example'), 
    envContent
  );
  
  console.log('✅ .env.example template created');
}

createEnvTemplate();