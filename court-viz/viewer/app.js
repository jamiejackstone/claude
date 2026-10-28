// The Hoop Hub viewer shell: one renderer and camera rig with the phases it is given swapped behind a switch
// (no switch when there is only one), and the same few controls throughout: 3D, 2D, Mini hoops, Installation
// and rim height, plus Night where the phase has it. Installation plays that phase's sequence with time
// estimates on screen. Each phase is built the first time it is shown.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export async function startViewer({ builders, navTools = false }) {
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
    ortho.zoom = 1;
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
    ['top', '2D'],
  ];
  const bar = $('controls');
  for (const [id, label] of VIEWS) {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.view = id;
    b.onclick = () => active?.view(id);
    bar.appendChild(b);
  }
  // Mini hoops rolls the portable hoops out, or puts them away in the container (Phase 1) or storage (Phase 2).
  // Installation plays the current phase's sequence: the court laid in Phase 1, the hub built in Phase 2.
  const hoopsBtn = document.createElement('button');
  hoopsBtn.textContent = 'Mini hoops';
  hoopsBtn.onclick = () => active?.toggleHoops();
  // sports, where the phase has them: these replace Mini hoops
  const sportBtns = ['basketball', 'pickleball', 'dodgeball'].map((name) => {
    const b = document.createElement('button');
    b.textContent = name[0].toUpperCase() + name.slice(1);
    b.dataset.sport = name;
    b.onclick = () => active?.setSport(name);
    return b;
  });
  const installBtn = document.createElement('button');
  installBtn.onclick = () => active?.install();
  // Night: Phase 2 only, the hub lit up with the canopy glowing
  const nightBtn = document.createElement('button');
  nightBtn.textContent = 'Night';
  nightBtn.onclick = () => active?.night?.();
  // Inside: where the phase has it (Heroes Hub), flies the camera in through the door and back out
  const insideBtn = document.createElement('button');
  insideBtn.textContent = 'Inside';
  insideBtn.onclick = () => active?.insideOut?.();
  bar.append(hoopsBtn, ...sportBtns, installBtn, nightBtn, insideBtn);

  // captions over the scene: the installation steps with their time estimates
  let captionKey = '';
  let captionTimer = 0;
  function caption(lines, hold = 0) {
    const el = $('caption');
    clearTimeout(captionTimer);
    if (!lines) {
      if (captionKey) el.classList.remove('on');
      captionKey = '';
      return;
    }
    const key = lines.join('|');
    if (key !== captionKey) {
      captionKey = key;
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
      hoopsBtn.classList.toggle('on', s.hoops);
      hoopsBtn.setAttribute('aria-pressed', String(s.hoops));
      hoopsBtn.hidden = !!active.sports;
      for (const b of sportBtns) {
        b.hidden = !active.sports;
        b.classList.toggle('on', s.sport === b.dataset.sport);
        b.setAttribute('aria-pressed', String(s.sport === b.dataset.sport));
      }
      installBtn.textContent = s.installing ? '■ Stop' : '▶ Installation';
      nightBtn.hidden = !active.night;
      insideBtn.hidden = !active.insideOut;
      insideBtn.classList.toggle('on', !!s.inside);
      insideBtn.setAttribute('aria-pressed', String(!!s.inside));
      nightBtn.classList.toggle('on', !!s.night);
      nightBtn.setAttribute('aria-pressed', String(!!s.night));
      installBtn.classList.toggle('on', s.installing);
      installBtn.setAttribute('aria-pressed', String(s.installing));
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

  const phases = {};
  const only = Object.keys(builders).length === 1;
  let active = null;
  let current = 0;
  let switching = false;
  async function show(n, view) {
    if (switching || n === current) return;
    switching = true;
    const first = !phases[n];
    if (active) $('fade').classList.add('on');
    await new Promise((r) => setTimeout(r, active ? 260 : 0));
    if (first) phases[n] = await builders[n](ctx);
    const rimFt = active ? active.status().rimFt : 10;
    active?.leave();
    caption(null);
    active = phases[n];
    current = n;
    active.enter({ view: view ?? '3d', rimFt });
    $('loading')?.remove();
    ui.sync();
    if (!only)
      try {
        history.replaceState(null, '', `?phase=${n}`);
      } catch {}
    requestAnimationFrame(() => $('fade').classList.remove('on'));
    switching = false;
  }
  for (const b of document.querySelectorAll('[data-phase]')) b.onclick = () => show(+b.dataset.phase, active?.status().view ?? '3d');
  $('rim').oninput = (e) => {
    active?.setRim(+e.target.value);
    ui.sync();
  };

  // desktop view tools: zoom in and out, turn left and right, and back to the view's framing
  let tween = null;
  const UP = new THREE.Vector3(0, 1, 0);
  function nudge(scale, turn) {
    if (!active || !controls.enabled) return;
    if (active.camera === ortho) {
      ortho.zoom = THREE.MathUtils.clamp(ortho.zoom / scale, 0.6, 5);
      ortho.updateProjectionMatrix();
      return;
    }
    const off = persp.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(off.length() * scale, controls.minDistance, controls.maxDistance);
    tween = { t0: performance.now(), off, len0: off.length(), len, turn };
  }
  function stepTween(now) {
    if (!tween) return;
    const u = Math.min(1, (now - tween.t0) / 350);
    const e = u * u * (3 - 2 * u);
    const off = tween.off.clone().setLength(THREE.MathUtils.lerp(tween.len0, tween.len, e)).applyAxisAngle(UP, tween.turn * e);
    persp.position.copy(controls.target).add(off);
    if (u >= 1) tween = null;
  }
  if (navTools) {
    const nav = document.createElement('div');
    nav.className = 'nav';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'View tools');
    for (const [label, title, fn] of [
      ['+', 'Zoom in', () => nudge(0.75, 0)],
      ['−', 'Zoom out', () => nudge(1 / 0.75, 0)],
      ['⟲', 'Turn left', () => nudge(1, -Math.PI / 8)],
      ['⟳', 'Turn right', () => nudge(1, Math.PI / 8)],
      ['⌂', 'Reset view', () => active?.view(active.status().view ?? '3d')],
    ]) {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.onclick = fn;
      nav.appendChild(b);
    }
    document.body.appendChild(nav);
  }

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

  // one phase only: no switch
  if (only) for (const el of [document.querySelector('.phase'), document.querySelector('.phase + .sep')]) el?.remove();
  let start = +Object.keys(builders)[0];
  try {
    const asked = +new URLSearchParams(location.search).get('phase');
    if (builders[asked]) start = asked;
  } catch {}
  await show(start);
  window.__ready = true;
  window.viewer = {
    show,
    get active() {
      return active;
    },
  };
  renderer.setAnimationLoop(() => {
    if (!active) return;
    stepTween(performance.now());
    active.tick(performance.now());
    renderer.render(active.scene, active.camera);
  });
}
