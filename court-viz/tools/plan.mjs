// Export the flat court artwork (exactly what the 3D model paints) for sign-off.
// node tools/plan.mjs --out renders/plan
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openPage } from './browser.mjs';

const { values } = parseArgs({ options: { out: { type: 'string', default: 'renders/plan' } } });
await mkdir(values.out, { recursive: true });
const { page, close } = await openPage({ w: 320, h: 180, query: 'shot=2&ao=0' });
const variants = {
  'B-as-brief': { halfwayStart: 6.8, edgeLine: false },
  'A-from-8.4m': { halfwayStart: 8.4, edgeLine: false },
  'C-edge-line': { halfwayStart: 6.8, edgeLine: true },
};
for (const [name, opts] of Object.entries(variants)) {
  const data = await page.evaluate(async (opts) => {
    const { paintCourt } = await import('/scene.js');
    const logo = await new Promise((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.src = 'assets/logo.png';
    });
    return paintCourt(logo, opts).toDataURL('image/png');
  }, opts);
  const file = join(values.out, `court-${name}.png`);
  await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log(file);
}
await close();
