import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function processDir(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== '.git') {
      processDir(fullPath);
    } else if (entry.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf8');
      if (content.includes(".for('update')")) {
        content = content.replaceAll(".for('update')", '');
        writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDir('./api-server');
