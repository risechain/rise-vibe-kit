import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function copyTemplate(templateName, targetDir) {
  const templatePath = path.join(__dirname, '../templates', templateName);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateName} not found`);
  }
  
  // Copy contracts
  const contractsSource = path.join(templatePath, 'contracts');
  if (fs.existsSync(contractsSource)) {
    const contractsTarget = path.join(targetDir, 'contracts/src');
    await fs.copy(contractsSource, contractsTarget);
  }
  
  // Copy frontend pages
  const pagesSource = path.join(templatePath, 'pages');
  if (fs.existsSync(pagesSource)) {
    const pagesTarget = path.join(targetDir, 'frontend/src/app');
    await fs.copy(pagesSource, pagesTarget);
  }
  
  // Copy hooks
  const hooksSource = path.join(templatePath, 'hooks');
  if (fs.existsSync(hooksSource)) {
    const hooksTarget = path.join(targetDir, 'frontend/src/hooks');
    await fs.copy(hooksSource, hooksTarget);
  }
  
  // Copy deployment scripts
  const scriptsSource = path.join(templatePath, 'scripts');
  if (fs.existsSync(scriptsSource)) {
    const scriptsTarget = path.join(targetDir, 'contracts/script');
    await fs.copy(scriptsSource, scriptsTarget);
  }
}

export async function updatePackageJson(targetDir, projectName) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  packageJson.name = projectName;
  packageJson.version = '0.1.0';
  
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}