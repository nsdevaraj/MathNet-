import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const forbiddenPaths = [];

const visit = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'images') forbiddenPaths.push(entryPath);
      visit(entryPath);
      continue;
    }

    if (/^mathnet(?:_index|_\d+)?\.json$/i.test(entry.name) || /\.(?:db|sqlite|sqlite3)$/i.test(entry.name)) {
      forbiddenPaths.push(entryPath);
    }
  }
};

if (!existsSync(distDirectory)) {
  throw new Error('Expected Vite to create dist before checking the shell build.');
}

visit(distDirectory);

if (forbiddenPaths.length > 0) {
  const relativePaths = forbiddenPaths.map((filePath) => relative(distDirectory, filePath));
  throw new Error(`Corpus assets must not be packaged in the app shell:\n${relativePaths.join('\n')}`);
}

console.log('Verified shell-only build: no corpus data or image directory in dist.');