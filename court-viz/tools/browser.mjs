// Headless Chromium harness: serves court-viz locally and maps the three.js CDN to node_modules.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };

export async function openPage({ w, h, query }) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '');
    try {
      const body = await readFile(join(ROOT, path || 'index.html'));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const page = await browser.newPage({ viewport: { width: Math.min(w, 1920), height: Math.min(h, 1080) } });
  page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', async (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.169.0/', '');
    route.fulfill({ body: await readFile(join(ROOT, 'node_modules/three', rel)), contentType: 'text/javascript' });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${port}/index.html?w=${w}&h=${h}&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 600000 });

  const grab = async (file) => {
    const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    const { writeFile } = await import('node:fs/promises');
    await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  };
  const close = async () => {
    await browser.close();
    server.close();
  };
  return { page, grab, close };
}
