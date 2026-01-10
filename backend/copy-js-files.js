import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const filesToCopy = [
  { src: 'src/services/nadlanScrapingService.js', dest: 'dist/services/nadlanScrapingService.js' }
];

for (const { src, dest } of filesToCopy) {
  const srcPath = join(__dirname, src);
  const destPath = join(__dirname, dest);
  
  if (existsSync(srcPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
    console.log(`✅ Copied ${src} to ${dest}`);
  } else {
    console.warn(`⚠️ Source file not found: ${srcPath}`);
  }
}



