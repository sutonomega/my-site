const { cpSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
mkdirSync(output, { recursive: true });
for (const name of ['json', 'lyrics', 'images', 'CNAME']) {
  cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
