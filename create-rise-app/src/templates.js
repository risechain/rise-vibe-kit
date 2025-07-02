import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template-specific file mappings
const TEMPLATE_MAPPINGS = {
  chat: {
    appTitle: 'RISE Chat',
    pageReplacements: {
      'chat/page.tsx': 'src/app/page.tsx' // Chat replaces the home page
    }
  },
  pump: {
    pageReplacements: {
      'page.tsx': 'src/app/page.tsx' // Pump replaces the home page
    },
    appTitle: 'RISE Pump'
  },
  frenpet: {
    pageReplacements: {
      'page.tsx': 'src/app/page.tsx' // FrenPet replaces the home page
    },
    appTitle: 'RISE FrenPet'
  }
};

export async function copyTemplate(templateName, targetDir) {
  const baseTemplatePath = path.join(__dirname, '../templates/base');
  const specificTemplatePath = path.join(__dirname, '../templates', templateName);
  
  // Always copy base template first
  await copyBaseTemplate(baseTemplatePath, targetDir);
  
  // If a specific template was selected, copy its files
  if (templateName !== 'base' && fs.existsSync(specificTemplatePath)) {
    await copySpecificTemplate(specificTemplatePath, targetDir, templateName);
  }
  
  // Update app title in NavigationBar if needed
  if (templateName !== 'base' && TEMPLATE_MAPPINGS[templateName]?.appTitle) {
    await updateAppTitle(targetDir, TEMPLATE_MAPPINGS[templateName].appTitle);
  }
}

async function copyBaseTemplate(baseTemplatePath, targetDir) {
  // Copy entire base template
  await fs.copy(baseTemplatePath, targetDir, {
    filter: (src) => {
      // Skip node_modules and other build artifacts
      const relativePath = path.relative(baseTemplatePath, src);
      return !relativePath.includes('node_modules') && 
             !relativePath.includes('.next') &&
             !relativePath.includes('out');
    }
  });
}

async function copySpecificTemplate(templatePath, targetDir, templateName) {
  const mapping = TEMPLATE_MAPPINGS[templateName];
  
  // Copy contracts
  const contractsSource = path.join(templatePath, 'contracts');
  if (fs.existsSync(contractsSource)) {
    const contractFiles = await glob('**/*', { cwd: contractsSource });
    for (const file of contractFiles) {
      const sourcePath = path.join(contractsSource, file);
      const targetPath = path.join(targetDir, 'contracts/src', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy contracts.ts file to frontend
  const contractsTsSource = path.join(templatePath, 'contracts.ts');
  if (fs.existsSync(contractsTsSource)) {
    const contractsTsTarget = path.join(targetDir, 'frontend/src/contracts/contracts.ts');
    await fs.ensureDir(path.dirname(contractsTsTarget));
    await fs.copy(contractsTsSource, contractsTsTarget, { overwrite: true });
  }
  
  // Copy ABI files
  const abiSource = path.join(templatePath, 'abi');
  if (fs.existsSync(abiSource)) {
    const abiFiles = await glob('**/*', { cwd: abiSource });
    for (const file of abiFiles) {
      const sourcePath = path.join(abiSource, file);
      const targetPath = path.join(targetDir, 'frontend/src/contracts/abi', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy deployment scripts
  const scriptsSource = path.join(templatePath, 'scripts');
  if (fs.existsSync(scriptsSource)) {
    const scriptFiles = await glob('**/*', { cwd: scriptsSource });
    for (const file of scriptFiles) {
      const sourcePath = path.join(scriptsSource, file);
      const targetPath = path.join(targetDir, 'contracts/script', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy pages (with special handling for replacements)
  const pagesSource = path.join(templatePath, 'pages');
  if (fs.existsSync(pagesSource)) {
    const pageFiles = await glob('**/*', { cwd: pagesSource });
    for (const file of pageFiles) {
      const sourcePath = path.join(pagesSource, file);
      let targetPath;
      
      // Check if this page should replace an existing one
      if (mapping?.pageReplacements && mapping.pageReplacements[file]) {
        targetPath = path.join(targetDir, 'frontend', mapping.pageReplacements[file]);
      } else {
        // Otherwise, maintain the directory structure
        targetPath = path.join(targetDir, 'frontend/src/app', file);
      }
      
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
  }
  
  // Copy components
  const componentsSource = path.join(templatePath, 'components');
  if (fs.existsSync(componentsSource)) {
    const componentFiles = await glob('**/*', { cwd: componentsSource });
    for (const file of componentFiles) {
      const sourcePath = path.join(componentsSource, file);
      const targetPath = path.join(targetDir, 'frontend/src/components', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
  
  // Copy hooks
  const hooksSource = path.join(templatePath, 'hooks');
  if (fs.existsSync(hooksSource)) {
    const hookFiles = await glob('**/*', { cwd: hooksSource });
    for (const file of hookFiles) {
      const sourcePath = path.join(hooksSource, file);
      const targetPath = path.join(targetDir, 'frontend/src/hooks', file);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
  }
}

async function updateAppTitle(targetDir, appTitle) {
  const navPath = path.join(targetDir, 'frontend/src/components/NavigationBar.tsx');
  
  if (!fs.existsSync(navPath)) {
    console.warn('NavigationBar.tsx not found, skipping app title update');
    return;
  }
  
  let navContent = await fs.readFile(navPath, 'utf-8');
  
  // Replace the app title
  navContent = navContent.replace('Vibe Kit', appTitle);
  
  await fs.writeFile(navPath, navContent);
}

export async function updatePackageJson(targetDir, projectName) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  packageJson.name = projectName;
  packageJson.version = '0.1.0';
  
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

export function getTemplateInfo(templateName) {
  const templates = {
    chat: {
      name: 'Chat App',
      description: 'Real-time messaging with karma system'
    },
    pump: {
      name: 'Token Launchpad',
      description: 'Create and trade tokens like pump.fun'
    },
    frenpet: {
      name: 'FrenPet',
      description: 'Virtual pet game with VRF battles'
    }
  };
  
  return templates[templateName] || templates.chat;
}