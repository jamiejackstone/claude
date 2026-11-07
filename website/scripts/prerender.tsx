import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppShell } from '../App';
import { SITEMAP_PATHS, SPA_SHELL_MARKER, prerenderMarker } from '../lib/prerenderRoutes';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(websiteRoot, 'dist');
const shellPath = path.join(distDir, 'index.html');
const ROOT_DIV = '<div id="root"></div>';

function sitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*https:\/\/www\.hoopheroes\.co\.uk([^<]*?)\s*<\/loc>/g)].map((match) => {
    const value = match[1] || '/';
    if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1);
    return value || '/';
  });
}

function assertSitemap(): void {
  const xml = fs.readFileSync(path.join(websiteRoot, 'public/sitemap.xml'), 'utf8');
  const found = sitemapPaths(xml);
  const expected = [...SITEMAP_PATHS];
  if (found.length !== expected.length || found.some((entry, index) => entry !== expected[index])) {
    throw new Error(`Sitemap does not match the 14 prerender routes.\nfound: ${found.join(', ')}\nexpected: ${expected.join(', ')}`);
  }
}

function writePage(shell: string, route: string, markup: string): void {
  const page = shell.replace(ROOT_DIV, `${prerenderMarker(route)}<div id="root">${markup}</div>`);
  const outfile = route === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, route.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(outfile), { recursive: true });
  fs.writeFileSync(outfile, page);
}

function main(): void {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Prerender must run with NODE_ENV=production so the HTML matches the production client.');
  }
  const shell = fs.readFileSync(shellPath, 'utf8');
  if (!shell.includes(ROOT_DIV)) {
    throw new Error('Built index.html is missing <div id="root"></div>');
  }
  assertSitemap();

  const spaShell = shell.replace(ROOT_DIV, `${SPA_SHELL_MARKER}${ROOT_DIV}`);
  fs.writeFileSync(path.join(distDir, '_shell.html'), spaShell);

  for (const route of SITEMAP_PATHS) {
    const markup = renderToString(
      <React.StrictMode>
        <StaticRouter location={route}>
          <AppShell />
        </StaticRouter>
      </React.StrictMode>,
    );
    if (!markup.includes('<h1')) {
      throw new Error(`Prerender of ${route} did not include an H1`);
    }
    writePage(shell, route, markup);
    console.log(`prerendered ${route}`);
  }
}

main();
