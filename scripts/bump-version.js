import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFilePath = path.join(__dirname, '../version.json');

try {
  const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
  const currentVersion = parseFloat(versionData.version);
  const newVersion = (currentVersion + 0.01).toFixed(2);
  
  versionData.version = newVersion;
  
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  console.log(`Version bumped from ${currentVersion} to ${newVersion}`);
} catch (error) {
  console.error('Error updating version:', error);
  process.exit(1);
}
