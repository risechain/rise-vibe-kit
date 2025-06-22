import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template-specific file mappings
const TEMPLATE_MAPPINGS = {
  chat: {
    pageReplacements: {
      'page.tsx': 'src/app/page.tsx' // Chat replaces the home page
    },
    navItems: [
      { href: '/', label: 'Chat', icon: 'MessageCircle' }
    ]
  },
  pump: {
    navItems: [
      { href: '/pump', label: 'Pump', icon: 'Rocket' }
    ]
  },
  frenpet: {
    navItems: [
      { href: '/frenpet', label: 'FrenPet', icon: 'PawPrint' }
    ]
  },
  perps: {
    navItems: [
      { href: '/perps', label: 'Perps', icon: 'BarChart3' }
    ]
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
  
  // Update navigation if needed
  if (templateName !== 'base' && TEMPLATE_MAPPINGS[templateName]?.navItems) {
    await updateNavigation(targetDir, TEMPLATE_MAPPINGS[templateName].navItems);
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

async function updateNavigation(targetDir, navItems) {
  const navPath = path.join(targetDir, 'frontend/src/components/NavigationBar.tsx');
  
  if (!fs.existsSync(navPath)) {
    console.warn('NavigationBar.tsx not found, skipping navigation update');
    return;
  }
  
  let navContent = await fs.readFile(navPath, 'utf-8');
  
  // Find the navigation links section
  const navLinksStart = navContent.indexOf('{/* Navigation Links */}');
  const navLinksEnd = navContent.indexOf('</nav>', navLinksStart);
  
  if (navLinksStart === -1 || navLinksEnd === -1) {
    console.warn('Could not find navigation links section, skipping update');
    return;
  }
  
  // Generate new nav items
  const newNavItems = navItems.map(item => `
              <Link 
                href="${item.href}"
                className={\`text-sm font-medium transition-colors \${
                  pathname === '${item.href}' 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }\`}
              >
                ${item.label}
              </Link>`).join('');
  
  // Insert new nav items before the existing debug/events links
  const debugLinkStart = navContent.indexOf('<Link', navLinksStart);
  const beforeDebug = navContent.substring(0, debugLinkStart);
  const afterNav = navContent.substring(debugLinkStart);
  
  navContent = beforeDebug + newNavItems + '\n' + afterNav;
  
  // Add necessary imports if not present
  if (navItems.some(item => item.icon) && !navContent.includes('lucide-react')) {
    const icons = navItems.map(item => item.icon).filter(Boolean).join(', ');
    const importStatement = `import { ${icons} } from 'lucide-react';\n`;
    const lastImportIndex = navContent.lastIndexOf('import');
    const endOfLastImport = navContent.indexOf('\n', lastImportIndex);
    navContent = navContent.substring(0, endOfLastImport + 1) + importStatement + navContent.substring(endOfLastImport + 1);
  }
  
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
    base: {
      name: 'Base Template',
      description: 'Minimal RISE dApp with core infrastructure'
    },
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
    },
    perps: {
      name: 'Perpetuals Exchange',
      description: 'Decentralized perpetual futures trading'
    },
    minimal: {
      name: 'Minimal',
      description: 'Bare minimum setup for starting from scratch'
    }
  };
  
  return templates[templateName] || templates.base;
}