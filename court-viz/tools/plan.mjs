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
  'A-full-depth': { halfwayStart: 0 },
  'B-from-ft-line': { halfwayStart: 5.8 },
  'C-past-arc': { halfwayStart: 8.4 },
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
