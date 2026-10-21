// Build the published page: the artifact host supplies the document skeleton, so strip ours.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

const src = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const page = src
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*|<\/html>\s*/gi, '')
  .replace(/<head>\s*|<\/head>\s*/gi, '')
  .replace(/<body>\s*|<\/body>\s*/gi, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
await mkdir(new URL('../dist/assets/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/index.html', import.meta.url), page);
await mkdir(new URL('../dist/assets/fonts/', import.meta.url), { recursive: true });
for (const f of [
  'scene.js',
  'flythrough.js',
  'assets/logo.png',
  'assets/logo-white-navy.png',
  'assets/logo-round-navy.png',
  'assets/logo-round-white.png',
  'assets/qr.png',
  'assets/fonts/LilitaOne-Regular.ttf',
  'assets/fonts/Montserrat-Bold.ttf',
]) await copyFile(new URL(`../${f}`, import.meta.url), new URL(`../dist/${f}`, import.meta.url));
console.log('dist/ ready');
