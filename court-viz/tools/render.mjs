// Render stills: node tools/render.mjs --shots 1,2,4 --w 1920 --h 1080 --out renders
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openPage } from './browser.mjs';

const { values } = parseArgs({
  options: {
    shots: { type: 'string', default: '1,2,3a,3b,3c,4,5,6' },
    w: { type: 'string', default: '3840' },
    h: { type: 'string', default: '2160' },
    out: { type: 'string', default: 'renders' },
    ao: { type: 'string', default: '1' },
    state: { type: 'string', default: '' },
    suffix: { type: 'string', default: '' },
    query: { type: 'string', default: '' }, // extra page options, e.g. lines=white
    page: { type: 'string', default: 'index.html' }, // phase2.html for the enclosed hub
  },
});
const w = +values.w;
const h = +values.h;
await mkdir(values.out, { recursive: true });
const { page, grab, close } = await openPage({ w, h, page: values.page, query: `shot=1&ao=${values.ao}${values.query ? `&${values.query}` : ''}` });
for (const id of values.shots.split(',')) {
  const t0 = Date.now();
  await page.evaluate(([id, extra]) => window.renderShot(id, extra ? JSON.parse(extra) : null), [id, values.state]);
  const file = join(values.out, `shot-${id}${values.suffix}.png`);
  await grab(file);
  console.log(`${file}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await close();
