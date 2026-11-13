import { mkdir, cp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const file of ['index.html', 'luna.html', 'luna.css', 'app.js', 'cards.js', 'reading.js', 'storage.js', 'assets']) {
  await cp(resolve(root, file), resolve(root, 'dist', file), { recursive: true });
}
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
if (!html.includes('LunaTarot')) throw new Error('Missing application entry');
console.log('Built static site in dist/');
