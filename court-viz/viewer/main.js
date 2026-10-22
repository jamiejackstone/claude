// Hoop Hub Final Concept: one renderer and camera rig, the Phase 1 outdoor court and the Phase 2 covered hub
// swapped behind a switch. Both phases share the same controls (views, mini hoops, installation, rim height);
// Night is Phase 2 only. Play runs the whole story: the court installed, then the hub built around it, with
// time estimates on screen. Each phase is built the first time it is shown.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { phase1 } from './p1.js';
import { phase2 } from './p2.js';

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('view').appendChild(renderer.domElement);

const persp = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 3000);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const DESIGN = 16 / 9;
// views are framed for 16:9; on narrower screens widen the view so the same width of scene fits
function setFov(designFov) {
  persp.userData.fov = designFov;
  const aspect = persp.aspect;
  if (aspect >= DESIGN) persp.fov = designFov;
  else {
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(designFov / 2)) * DESIGN);
    persp.fov = Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / aspect)));
  }
  persp.updateProjectionMatrix();
}
function orthoFrame({ cx, cz, height }) {
  ortho.userData.frame = { cx, cz, height };
  const aspect = innerWidth / innerHeight;
  // keep most of the design width on a portrait phone
  const h = aspect >= DESIGN ? height : Math.max(height, (height * DESIGN * 0.72) / aspect);
  ortho.left = (-h * aspect) / 2;
  ortho.right = (h * aspect) / 2;
  ortho.top = h / 2;
  ortho.bottom = -h / 2;
  ortho.position.set(cx, 60, cz);
  ortho.up.set(0, 0, -1);
  ortho.lookAt(cx, 0, cz);
  ortho.updateProjectionMatrix();
}
const controls = new OrbitControls(persp, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.minDistance = 0.3;
controls.maxDistance = 90;

// shared controls: the phase modules fill in what each button does
const VIEWS = [
  ['3d', '3D'],
  ['top', 'Top-down'],
  ['slam', 'Mega Slam'],
];
const bar = $('controls');
for (const [id, label] of VIEWS) {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.view = id;
  b.onclick = () => active?.view(id);
  bar.appendChild(b);
}
const sep = document.createElement('div');
sep.className = 'sep';
bar.appendChild(sep);
const button = (label, fn) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => {
    stopTour();
    fn();
  };
  return b;
};
const hoopsBtn = button('Mini hoops', () => active?.toggleHoops());
const installBtn = button('Installation', () => active?.install());
const nightBtn = button('Night', () => active?.night?.());
bar.append(hoopsBtn, installBtn, nightBtn);
for (const b of bar.querySelectorAll('[data-view]')) {
  const fn = b.onclick;
  b.onclick = () => {
    stopTour();
    fn();
  };
}

// captions over the scene: installation steps with time estimates, and the chapter titles in Play
let captionKey = '';
let captionTimer = 0;
function caption(lines, hold = 0, title = false) {
  const el = $('caption');
  clearTimeout(captionTimer);
  if (!lines) {
    if (captionKey) el.classList.remove('on');
    captionKey = '';
    return;
  }
  const key = lines.join('|') + title;
  if (key !== captionKey) {
    captionKey = key;
    el.classList.toggle('title', title);
    el.replaceChildren(...lines.map((t, i) => Object.assign(document.createElement(i ? 'span' : 'strong'), { textContent: t })));
    el.classList.add('on');
  }
  if (hold) captionTimer = setTimeout(() => caption(null), hold * 1000);
}

const ui = {
  sync() {
    if (!active) return;
    const s = active.status();
    for (const b of bar.querySelectorAll('[data-view]')) b.classList.toggle('on', b.dataset.view === s.view);
    for (const [b, on] of [
      [hoopsBtn, s.hoops],
      [installBtn, s.installing],
      [nightBtn, !!s.night],
    ]) {
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    nightBtn.hidden = !active.night;
    $('play').textContent = tour ? '■ Stop' : '▶ Play';
    $('play').setAttribute('aria-pressed', String(!!tour));
    $('rim').value = s.rimFt;
    $('rimv').textContent = `${s.rimFt} ft`;
    $('hint').textContent = active.hint;
    for (const b of document.querySelectorAll('[data-phase]')) {
      const on = b.dataset.phase === String(current);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  },
};
const ctx = { renderer, persp, ortho, controls, setFov, orthoFrame, ui, caption };

const builders = { 1: phase1, 2: phase2 };
const phases = {};
let active = null;
let current = 0;
let switching = false;
async function show(n, view) {
  if (switching || n === current) return;
  switching = true;
  const first = !phases[n];
  if (first) {
    $('fade').classList.add('on');
    if (!active) $('fade').classList.remove('on');
  } else $('fade').classList.add('on');
  await new Promise((r) => setTimeout(r, active ? 260 : 0));
  if (first) phases[n] = await builders[n](ctx);
  const rimFt = active ? active.status().rimFt : 10;
  active?.leave();
  active = phases[n];
  current = n;
  active.enter({ view: view ?? '3d', rimFt });
  $('loading')?.remove();
  ui.sync();
  try {
    history.replaceState(null, '', `?phase=${n}`);
  } catch {}
  requestAnimationFrame(() => $('fade').classList.remove('on'));
  switching = false;
}
for (const b of document.querySelectorAll('[data-phase]'))
  b.onclick = () => {
    stopTour();
    show(+b.dataset.phase, active?.status().view ?? '3d');
  };

// Play: the whole story, from the empty playground to the covered hub
let tour = null;
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const until = (fn) =>
  new Promise((r) => {
    const check = () => (fn() ? r() : requestAnimationFrame(check));
    check();
  });
function stopTour() {
  if (!tour) return;
  tour = null;
  ui.sync();
}
async function play() {
  if (tour) {
    stopTour();
    active?.view(active.status().view ?? '3d');
    caption(null);
    return;
  }
  const me = (tour = {});
  const live = () => tour === me;
  const chapter = async (n, lines) => {
    await show(n, '3d');
    if (!live()) return false;
    caption(lines, 0, true);
    await sleep(3);
    if (!live()) return false;
    caption(null);
    active.install();
    ui.sync();
    await until(() => !live() || !active.status().installing);
    if (!live()) return false;
    await sleep(4.5);
    return live();
  };
  ui.sync();
  if (!(await chapter(1, ['Phase 1 · Outdoor Court', 'A permanent Mega Slam, and the rest of the court in one container']))) return;
  if (!(await chapter(2, ['Phase 2 · Covered Hub', 'The same court under cover, ready all year round']))) return;
  tour = null;
  ui.sync();
}
$('play').onclick = play;
$('rim').oninput = (e) => {
  stopTour();
  active?.setRim(+e.target.value);
  ui.sync();
};

function setCollapsed(c) {
  $('bar').classList.toggle('collapsed', c);
  $('collapse').textContent = c ? 'Controls' : 'Hide';
  $('collapse').setAttribute('aria-expanded', String(!c));
  try {
    localStorage.setItem('hh-controls-collapsed', c ? '1' : '0');
  } catch {}
}
let startCollapsed = false;
try {
  startCollapsed = localStorage.getItem('hh-controls-collapsed') === '1';
} catch {}
setCollapsed(startCollapsed);
$('collapse').onclick = () => setCollapsed(!$('bar').classList.contains('collapsed'));

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  persp.aspect = innerWidth / innerHeight;
  setFov(persp.userData.fov ?? persp.fov);
  if (ortho.userData.frame) orthoFrame(ortho.userData.frame);
});

let start = 1;
try {
  start = new URLSearchParams(location.search).get('phase') === '2' ? 2 : 1;
} catch {}
await show(start);
window.__ready = true;
window.viewer = { show, play, get active() {
  return active;
} };
renderer.setAnimationLoop(() => {
  if (!active) return;
  active.tick(performance.now());
  renderer.render(active.scene, active.camera);
});
