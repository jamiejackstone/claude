// Render fly-through frames per segment: node tools/video.mjs --w 1920 --h 1080 --fps 30 --out renders/video/frames
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openPage } from './browser.mjs';

const { values } = parseArgs({
  options: {
    w: { type: 'string', default: '1920' },
    h: { type: 'string', default: '1080' },
    fps: { type: 'string', default: '30' },
    out: { type: 'string', default: 'renders/video/frames' },
    ao: { type: 'string', default: '1' },
    // preview: render only this many evenly spaced frames per segment
    sample: { type: 'string', default: '0' },
    seq: { type: 'string', default: 'fly' }, // fly | install
    resume: { type: 'boolean', default: false }, // keep frames already rendered
  },
});
const fps = +values.fps;
const { page, close } = await openPage({ w: +values.w, h: +values.h, query: `shot=1&ao=${values.ao}` });
const segments = values.seq === 'install' ? [{ name: 'install', duration: await page.evaluate(() => window.INSTALL_DURATION) }] : await page.evaluate(() => window.SEGMENTS);
const t0 = Date.now();
for (const [i, seg] of segments.entries()) {
  const dir = join(values.out, `seg${i}-${seg.name}`);
  await mkdir(dir, { recursive: true });
  const n = Math.round(seg.duration * fps);
  const sample = +values.sample;
  const frames = sample ? Array.from({ length: sample }, (_, k) => Math.round((k * (n - 1)) / (sample - 1))) : [...Array(n).keys()];
  for (const f of frames) {
    const file = join(dir, `${String(f).padStart(5, '0')}.jpg`);
    if (values.resume && (await stat(file).catch(() => null))?.size) continue;
    const data = await page.evaluate(
      ([i, t, seq]) => {
        if (seq === 'install') window.renderInstall(t);
        else window.renderSeg(i, t);
        return document.querySelector('canvas').toDataURL('image/jpeg', 0.95);
      },
      [i, f / fps, values.seq],
    );
    await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`${seg.name}: ${frames.length} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
}
await close();
