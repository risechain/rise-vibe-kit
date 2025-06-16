#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readmeContent = `# RISE dApp

This project was bootstrapped with [create-rise-app](https://github.com/rise-labs/create-rise-app).

## Getting Started

### Prerequisites

- Node.js 18+ 
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Development

1. Start the local blockchain:
   \`\`\`bash
   npm run chain
   \`\`\`

2. Deploy contracts:
   \`\`\`bash
   npm run deploy-and-sync
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

\`\`\`
.
├── contracts/          # Smart contracts (Foundry)
│   ├── src/           # Contract source files
│   ├── script/        # Deployment scripts
│   └── test/          # Contract tests
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/       # App pages
│   │   ├── components/# React components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utility libraries
│   │   └── config/    # Configuration files
│   └── public/        # Static assets
└── scripts/           # Build and deployment scripts
\`\`\`

## Available Scripts

- \`npm run dev\` - Start the development server
- \`npm run build\` - Build for production
- \`npm run chain\` - Start local blockchain
- \`npm run deploy\` - Deploy contracts
- \`npm run deploy-and-sync\` - Deploy and sync contracts to frontend
- \`npm run test\` - Run contract tests

## Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`
PRIVATE_KEY=your_private_key_here
RISE_RPC_URL=https://testnet.risechain.com
\`\`\`

## Learn More

- [RISE Documentation](https://docs.risechain.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Foundry Book](https://book.getfoundry.sh/)

## License

MIT
`;

async function createReadmeTemplate() {
  const baseDir = path.join(__dirname, '../templates/base');
  await fs.writeFile(
    path.join(baseDir, 'README.md'), 
    readmeContent
  );
  
  console.log('✅ README.md template created');
}

createReadmeTemplate();