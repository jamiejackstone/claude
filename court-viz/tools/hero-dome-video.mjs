// Hero Dome video frames: the installation from an empty playground, then a tour inside.
// node tools/hero-dome-video.mjs --w 1280 --h 720 --fps 25 --ao 0 --out renders/video/hero-dome-frames
// Each segment gets a folder of JPEG frames and manifest.json lists segments and captions for
// tools/hero_dome_video.py. Captions carry no timings or dates (KB "Head teacher concerns" sheet).
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openPage } from './browser.mjs';

const { values } = parseArgs({
  options: {
    w: { type: 'string', default: '1280' },
    h: { type: 'string', default: '720' },
    fps: { type: 'string', default: '25' },
    ao: { type: 'string', default: '0' },
    out: { type: 'string', default: 'renders/video/hero-dome-frames' },
    only: { type: 'string', default: '' }, // comma list of segment names
    sample: { type: 'string', default: '0' }, // preview: this many evenly spaced frames per segment
    resume: { type: 'boolean', default: false },
  },
});
const fps = +values.fps;

// the Hero Dome as the 3D concept builds it (viewer/p2.js coveredOnly)
const QUERY = 'full&span=17&arena&multi&no3key&layout=reception&main=microArena&roofs=%2314264e&name=HERO%20DOME';
const BASE = { groundwork: 0, build: null, mini: true, roller: 1, cutaway: false, storeDoors: 1, night: false, netsT: 0, ballsT: 0, mainLowT: 0, court3: 0, hoopsT: null, people: null };

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
// keys: [time, pos, target, fov]; eased between neighbouring keys so each lands on cue
function camAt(keys, t) {
  const i = Math.max(0, Math.min(keys.length - 2, keys.findLastIndex((k) => t >= k[0])));
  const [a, b] = [keys[i], keys[i + 1]];
  const u = ease((t - a[0]) / (b[0] - a[0]));
  return { pos: lerp3(a[1], b[1], u), target: lerp3(a[2], b[2], u), fov: lerp(a[3], b[3], u) };
}

// installation camera: the 3D concept's own build path (FULL_KEYS in viewer/p2.js), in build seconds
const BUILD_KEYS = [
  [0, [-12, 15, 27], [0, 1, 4.5], 42],
  [7.2, [-15, 12, 27], [0, 3, 5], 42],
  [12.4, [-14, 10, 26], [0, 3, 5], 42],
  [18.0, [5, 8.5, 31], [0, 3.5, 5], 42],
  [22.4, [-1.5, 3.0, 21], [0, 1.6, 6], 42],
  [25.0, [0, 5.6, 10.6], [0, 0, 2.6], 42],
  [31.0, [-5, 5.4, 10.4], [1.5, 0, 3], 42],
  [37.0, [-6, 4.4, 10.4], [2, 0.6, 3.5], 42],
  [40.6, [0, 3.0, 10.4], [0, 1.4, 4], 42],
  [46.0, [-6, 3.6, 24], [0, 2.4, 6], 42],
  [50, [-13.5, 3.4, 27.5], [0.6, 2.6, 6.0], 42],
];
const BUILD_END = 50;
// video seconds -> build seconds, piecewise: the long floor-laying stretch is quickened most
const REMAP = [
  [0, 0],
  [4, 7.2],
  [8, 18.0],
  [10.5, 24.0],
  [14, 37.4],
  [17, 45.0],
  [20, 50],
];
const INSTALL_SECS = REMAP[REMAP.length - 1][0];
function pw(pairs, x, from = 0, to = 1) {
  const i = Math.max(0, Math.min(pairs.length - 2, pairs.findLastIndex((p) => x >= p[from])));
  const [a, b] = [pairs[i], pairs[i + 1]];
  return a[to] + ((x - a[from]) / (b[from] - a[from])) * (b[to] - a[to]);
}
const buildAt = (t) => pw(REMAP, t, 0, 1);
const videoAt = (b) => pw(REMAP, b, 1, 0);

const SEGMENTS = [
  {
    name: 'install',
    duration: INSTALL_SECS,
    state: (t) => ({ build: buildAt(t) }),
    cam: (t) => camAt(BUILD_KEYS, buildAt(t)),
    // caption times in build seconds, converted below
    buildCaptions: [
      [0, 7.0, 'Containers craned into place', 'Installed during a school holiday'],
      [7.2, 17.8, 'Canopy frames up, fabric over', 'A 17 m steel-framed fabric canopy'],
      [18.0, 23.8, 'End walls, roller door and fire exit', 'Covered and enclosed'],
      [24.0, 37.2, 'Court floor laid under cover', 'A tiled 14.8 × 10 m sports floor'],
      [37.4, 44.6, 'Fit-out', 'Lights, boards, reception and kit storage'],
      [45.8, 50, 'Ready to open', 'Your Hero Dome'],
    ],
  },
  {
    name: 'outside',
    duration: 5,
    state: (t) => ({ roller: ease((t - 1.2) / 2.6), people: 'basketball' }),
    cam: (t) => camAt([[0, [-13.5, 2.2, 29], [0.4, 2.6, 6.0], 40], [5, [-7.5, 2.0, 24.5], [0.2, 2.4, 6.0], 40]], t),
    captions: [[0.4, 5, 'Hero Dome', 'Your home court']],
  },
  {
    name: 'basketball',
    duration: 5,
    state: () => ({ people: 'basketball' }),
    cam: (t) => camAt([[0, [0.4, 2.3, 17.5], [0, 2.1, 6], 50], [1.8, [0, 2.1, 10.5], [-0.8, 2.0, 3], 52], [5, [4.6, 1.8, 10.7], [-2.2, 2.0, 0.8], 54]], t),
    captions: [[0.8, 5, 'Basketball first', 'Mini basketball for ages 5 to 12']],
  },
  {
    name: '3x3',
    duration: 4,
    state: () => ({ court3: 1, people: '3x3' }),
    cam: (t) => camAt([[0, [3.6, 2.2, 10.2], [-0.4, 1.6, -1.0], 50], [4, [2.2, 2.0, 9.4], [-0.6, 1.6, -1.0], 48]], t),
    captions: [[0.3, 4, 'Full-size 3x3', 'For ages 13 and over']],
  },
  {
    name: 'wheelchair',
    duration: 4,
    state: () => ({ court3: 1, people: 'wheelchair' }),
    cam: (t) => camAt([[0, [-4.4, 1.9, 11.0], [0.2, 1.0, 0.0], 50], [4, [-3.2, 1.8, 10.2], [0.4, 1.0, 0.0], 48]], t),
    captions: [[0.3, 4, 'Wheelchair basketball', 'Step-free access onto the court']],
  },
  {
    name: 'pickleball',
    duration: 4,
    state: () => ({ mini: false, netsT: 1, people: 'pickleball' }),
    cam: (t) => camAt([[0, [-6.4, 4.8, 10.7], [1.8, 0.4, 2.6], 60], [4, [-5.2, 4.2, 10.2], [2.2, 0.4, 2.6], 58]], t),
    captions: [[0.3, 4, 'Pickleball and mini tennis', 'With portable nets']],
  },
  {
    name: 'dodgeball',
    duration: 4,
    state: () => ({ mini: false, ballsT: 1, people: 'dodgeball' }),
    cam: (t) => camAt([[0, [6.2, 3.2, 10.4], [-1.5, 0.2, 3.0], 58], [4, [5.0, 2.8, 9.8], [-1.8, 0.2, 2.8], 56]], t),
    captions: [[0.3, 4, 'Dodgeball', 'Soft foam balls, for all ages']],
  },
  {
    name: 'reception',
    duration: 4.5,
    state: () => ({ people: 'reception' }),
    cam: (t) => camAt([[0, [-9.0, 1.6, 6.6], [-10.2, 1.4, 1.2], 60], [4.5, [-9.05, 1.7, 10.4], [-10.0, 1.15, 0.6], 64]], t),
    captions: [[0.3, 4.5, 'Reception and viewing', 'With an accessible WC']],
  },
  {
    name: 'night',
    duration: 5,
    state: () => ({ night: true, people: 'basketball' }),
    cam: (t) => camAt([[0, [-9.5, 2.3, 23.5], [-0.4, 2.9, 5.5], 42], [5, [-12.5, 2.6, 27.5], [-0.6, 3.0, 5.5], 42]], t),
    captions: [[0.3, 5, 'Covered and LED lit', 'Sport all year, whatever the weather']],
  },
];
for (const s of SEGMENTS) {
  if (s.buildCaptions) s.captions = s.buildCaptions.map(([a, b, ...txt]) => [videoAt(a), videoAt(b), ...txt]);
}

const w = +values.w;
const h = +values.h;
const only = values.only ? values.only.split(',') : null;
const { page, close } = await openPage({ w, h, page: 'phase2.html', query: `shot=1&ao=${values.ao}&${QUERY}` });
await mkdir(values.out, { recursive: true });
const manifest = { fps, w, h, segments: SEGMENTS.map((s, i) => ({ dir: `seg${String(i).padStart(2, '0')}-${s.name}`, name: s.name, duration: s.duration, captions: s.captions })) };
await writeFile(join(values.out, 'manifest.json'), JSON.stringify(manifest, null, 2));
const t0 = Date.now();
for (const [i, seg] of SEGMENTS.entries()) {
  if (only && !only.includes(seg.name)) continue;
  const dir = join(values.out, manifest.segments[i].dir);
  await mkdir(dir, { recursive: true });
  const n = Math.round(seg.duration * fps);
  const sample = +values.sample;
  const frames = sample ? Array.from({ length: sample }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, sample - 1))) : [...Array(n).keys()];
  for (const f of frames) {
    const file = join(dir, `${String(f).padStart(5, '0')}.jpg`);
    if (values.resume && (await stat(file).catch(() => null))?.size) continue;
    const t = f / fps;
    const c = seg.cam(t);
    const state = { ...BASE, ...seg.state(t) };
    const data = await page.evaluate(
      ([c, state]) => {
        window.renderCam(c.pos, c.target, c.fov, state);
        return document.querySelector('canvas').toDataURL('image/jpeg', 0.92);
      },
      [c, state],
    );
    await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`${seg.name}: ${frames.length} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
}
await close();
