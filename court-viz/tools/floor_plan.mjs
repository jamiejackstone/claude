// Export the floor markings plan SVG to an A3 PDF and a PNG preview with headless Chromium.
// node tools/floor_plan.mjs renders/floor
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const dir = process.argv[2] ?? 'renders/floor';
const name = 'Hoop Hub floor markings plan';
const svg = await readFile(join(dir, `${name}.svg`), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 }, deviceScaleFactor: 2 });
await page.setContent(`<!doctype html><html><head><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}svg{display:block;width:420mm;height:297mm}</style></head><body>${svg}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: join(dir, `${name}.pdf`), width: '420mm', height: '297mm', printBackground: true });
await page.setViewportSize({ width: 1587, height: 1123 });
await page.evaluate(() => {
  const s = document.querySelector('svg');
  s.style.width = '1587px';
  s.style.height = '1123px';
});
await page.screenshot({ path: join(dir, `${name}.png`), clip: { x: 0, y: 0, width: 1587, height: 1123 } });
await browser.close();
console.log(`${dir}/${name}.pdf, .png`);
