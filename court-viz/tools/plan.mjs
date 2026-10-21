// Export the flat court artwork (exactly what the 3D model paints) for sign-off.
// node tools/plan.mjs --out renders/plan
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openPage } from './browser.mjs';

const { values } = parseArgs({ options: { out: { type: 'string', default: 'renders/plan' } } });
await mkdir(values.out, { recursive: true });
const { page, close } = await openPage({ w: 320, h: 180, query: 'shot=2&ao=0' });
// each variant: court artwork options, plus which logo file to paint
const variants = {
  court: {},
  'logo-a-landscape': {},
  'logo-b-round-centre': { logo: 'assets/logo-round-white.png', logoBox: { x: -0.6, z: 4.4, w: 1.2 } },
  'logo-c-round-large': { logo: 'assets/logo-round-white.png', logoBox: { x: -1.0, z: 3.1, w: 2.0 } },
};
for (const [name, opts] of Object.entries(variants)) {
  const data = await page.evaluate(async ({ logo: src = 'assets/logo.png', ...opts }) => {
    const { paintCourt } = await import('/scene.js');
    const logo = await new Promise((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.src = src;
    });
    return paintCourt(logo, opts).toDataURL('image/png');
  }, opts);
  const file = join(values.out, `${name}.png`);
  await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log(file);
}
await close();
