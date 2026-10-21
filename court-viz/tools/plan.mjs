// Export the flat court artwork (exactly what the 3D model paints) for sign-off.
// node tools/plan.mjs --out renders/plan
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openPage } from './browser.mjs';

const { values } = parseArgs({ options: { out: { type: 'string', default: 'renders/plan' } } });
await mkdir(values.out, { recursive: true });
const { page, close } = await openPage({ w: 320, h: 180, query: 'shot=2&ao=0' });
const GOLD = '#fba91a';
const GREY = '#a7a9ac';
const variants = {
  court: {},
  'keys-1-gold-mini': { keyFill: GREY, miniKeyFill: GOLD },
  'keys-2-gold-main': { keyFill: GOLD, miniKeyFill: GREY },
  'keys-3-all-grey': { keyFill: GREY, miniKeyFill: GREY },
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
  const file = join(values.out, `${name}.png`);
  await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log(file);
}
await close();
