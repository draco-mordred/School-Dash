import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const target = path.join(__dirname, 'api', 'index.js');

if (fs.existsSync(target)) {
  fs.unlinkSync(target);
}

console.log('Removed stale Vercel build artifact:', target);
