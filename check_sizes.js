import fs from 'fs';
import path from 'path';

function checkSizes(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`${file}: ${sizeMB} MB`);
  });
}

checkSizes('./public');
