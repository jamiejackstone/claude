// Build the Hoop Hub viewers as self-contained pages: each viewer bundled with its scenes, and every image
// and font inlined. three.js still loads from the CDN. For each version it writes:
//   <out>/index.html      the published artifact (the host supplies the document skeleton)
//   <out>/<name>.html     the download: double-click to open in any browser
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const root = new URL('../', import.meta.url);
const MIME = { '.png': 'image/png', '.ttf': 'font/ttf' };
const dataUri = async (rel) => `data:${MIME[extname(rel)]};base64,${(await readFile(new URL(rel, root))).toString('base64')}`;

// swap 'assets/...' string literals for data URIs as the sources are read, leaving the files untouched
const inlineAssets = {
  name: 'inline-assets',
  setup(b) {
    b.onLoad({ filter: /court-viz\/(viewer|phase2|scene|install).*\.js$/ }, async ({ path }) => {
      let src = await readFile(path, 'utf8');
      const found = [...new Set([...src.matchAll(/(['"])(assets\/[\w\-./]+\.(?:png|ttf))\1/g)].map((m) => m[2]))];
      for (const rel of found) src = src.replaceAll(`'${rel}'`, JSON.stringify(await dataUri(rel))).replaceAll(`"${rel}"`, JSON.stringify(await dataUri(rel)));
      return { contents: src, loader: 'js' };
    });
  },
};

const VERSIONS = [
  { shell: 'hub.html', entry: 'viewer/main.js', out: 'dist-final/', name: 'Hoop Hub Final Concept' },
  { shell: 'covered.html', entry: 'viewer/covered.js', out: 'dist-covered/', name: 'Heroes Hub Concept' },
];
for (const v of VERSIONS) {
  const out = await build({
    entryPoints: [new URL(v.entry, root).pathname],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    minify: true,
    external: ['three', 'three/addons/*'],
    plugins: [inlineAssets],
  });
  const js = out.outputFiles[0].text.replaceAll('</script', '<\\/script');
  const shell = await readFile(new URL(v.shell, root), 'utf8');
  const tag = `<script type="module" src="${v.entry}"></script>`;
  const full = shell.replace(tag, () => `<script type="module">${js}</script>`);
  if (full === shell) throw new Error(`viewer script tag not found in ${v.shell}`);
  const page = full
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*|<\/html>\s*/gi, '')
    .replace(/<head>\s*|<\/head>\s*/gi, '')
    .replace(/<body>\s*|<\/body>\s*/gi, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  await mkdir(new URL(v.out, root), { recursive: true });
  await writeFile(new URL(`${v.out}index.html`, root), page);
  await writeFile(new URL(`${v.out}${v.name}.html`, root), full);
  console.log(`${v.out} ready: ${(full.length / 1e6).toFixed(2)} MB`);
}
