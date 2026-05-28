import { existsSync } from 'fs';
import { join } from 'path';

const vendorFiles = [
  'papaparse.min.js',
  'chart.umd.min.js',
  'tabulator.min.css',
  'tabulator.min.js',
];

let failed = false;
for (const f of vendorFiles) {
  const p = join('vendor', f);
  if (!existsSync(p)) {
    console.error('Missing vendor file:', p);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('All vendor files present.');
