import fs from 'fs';
import path from 'path';

// Create a mathnet.json for backward compatibility (first chunk)
const chunk0 = JSON.parse(fs.readFileSync('./public/mathnet_0.json', 'utf8'));
fs.writeFileSync('./public/mathnet.json', JSON.stringify(chunk0, null, 2));
console.log("Created legacy mathnet.json with 500 questions.");
