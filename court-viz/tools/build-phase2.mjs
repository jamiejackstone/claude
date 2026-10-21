// Build the published Phase 2 page into dist-phase2/: the artifact host supplies the document skeleton, so strip ours.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const out = new URL('../dist-phase2/', import.meta.url);
const src = await readFile(new URL('phase2.html', root), 'utf8');
const page = src
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*|<\/html>\s*/gi, '')
  .replace(/<head>\s*|<\/head>\s*/gi, '')
  .replace(/<body>\s*|<\/body>\s*/gi, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
for (const d of ['phase2/', 'assets/fonts/']) await mkdir(new URL(d, out), { recursive: true });
await writeFile(new URL('index.html', out), page);
for (const f of [
  'phase2/hub.js',
  'phase2/scene.js',
  'assets/logo.png',
  'assets/logo-white-navy.png',
  'assets/logo-round-navy.png',
  'assets/logo-round-white.png',
  'assets/qr.png',
  'assets/fonts/LilitaOne-Regular.ttf',
  'assets/fonts/Montserrat-Bold.ttf',
]) await copyFile(new URL(f, root), new URL(f, out));
console.log('dist-phase2/ ready');
