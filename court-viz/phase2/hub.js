// Hoop Hub Phase 2: the Phase 1 court enclosed under a translucent PVC arch on two 40 ft container rows,
// built to the Phase 2 brief v3 and its plan and elevations. Concept only, not to supplier spec.
// Hub coordinates in the brief (across 0..18 m from the left inner face) map to world x = across - 9.
// Revised 21 Oct 2026 (Jamie): the canopy and floor are cut to the 40 ft container length, 12.19 m, with no
// corner gaps, so the end walls sit flush with the container ends and the court is centred between them.
// The Phase 1 court is unchanged at x ±7.4, z 0..10.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { COL, DIM, FT, canvas, tex, std, shadowed, buildCourt, buildSurroundings, cloudDome, corrugation, loadImage, MegaSlam, PortableHoop, ballRack } from './scene.js';

export const HUB = {
  x0: -9,
  x1: 9,
  z0: -1.095,
  z1: 11.095,
  cw: 2.44, // container width
  ch: 2.59, // container height: the arch springs from the roofs
  crown: 7.6,
  runoff: '#3b4a6b',
  reception: { z0: -1.095, z1: 11.095 }, // 40 ft, left
  hhStore: { z0: -1.095, z1: 4.963 }, // 20 ft navy, right, Mega Slam end
  schoolStore: { z0: 5.032, z1: 11.095 }, // 20 ft gold, right, entrance end
  roller: { w: 6.0, h: 4.5 },
  fe1: { x0: 4.5, x1: 5.5, h: 2.1 }, // the single fire exit, in the Mega Slam end wall right of the hoop
  navyTo: 6.0, // end walls navy to here, white fabric above
  glazedDoor: { z0: 7.0, z1: 8.0 },
  lights: { x: [-6, -2, 2, 6], z: [0.9, 5.0, 9.1] },
  benches: [
    [0.6, 2.4],
    [2.6, 4.4],
    [8.6, 10.4],
  ],
  ribs: 7,
  racks: [
    [-3.4, -0.55, 0],
    [3.4, -0.55, 0],
    [8.5, 2.8, Math.PI / 2],
    [8.5, 7.25, Math.PI / 2],
  ],
};
const RISE = HUB.crown - HUB.ch;
const HALF = (HUB.x1 - HUB.x0) / 2;
// inside face of the arch: an elliptical profile springing near-vertical off the container roofs
export const archY = (x, inset = 0) => HUB.ch + (RISE - inset) * Math.sqrt(Math.max(0, 1 - (x / (HALF - inset)) ** 2));
const LEN = HUB.z1 - HUB.z0;

const box = (w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};

function runoffTexture() {
  // navy-grey interlocking tiles around the court, on the same panel grid as the court
  const s = 60;
  const c = canvas(18 * s, Math.round(LEN * s));
  const g = c.getContext('2d');
  g.fillStyle = HUB.runoff;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(10, 18, 36, 0.55)';
  g.lineWidth = 2;
  const pw = DIM.panel.w;
  for (let x = -7.4 - pw * 2; x <= 9; x += pw) {
    g.beginPath();
    g.moveTo((x + 9) * s, 0);
    g.lineTo((x + 9) * s, c.height);
    g.stroke();
  }
  for (let z = -2; z <= 12; z += 2) {
    g.beginPath();
    g.moveTo(0, (z - HUB.z0) * s);
    g.lineTo(c.width, (z - HUB.z0) * s);
    g.stroke();
  }
  return tex(c);
}

function archGeometry() {
  // fabric skin: a thin elliptical band extruded along the hub
  const t = 0.04;
  const pts = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI * i) / N;
    pts.push(new THREE.Vector2(-(HALF + t) * Math.cos(a), HUB.ch + (RISE + t) * Math.sin(a)));
  }
  for (let i = N; i >= 0; i--) {
    const a = (Math.PI * i) / N;
    pts.push(new THREE.Vector2(-HALF * Math.cos(a), HUB.ch + RISE * Math.sin(a)));
  }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: LEN + 0.1, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, HUB.z0 - 0.05);
  return geo;
}

function endWallShape(notches, flip) {
  // under the arch, with door openings notched up from the floor; flip mirrors x for walls seen from -z
  const ns = notches.map(([a, b, h]) => (flip ? [-b, -a, h] : [a, b, h])).sort((p, q) => p[0] - q[0]);
  const s = new THREE.Shape();
  s.moveTo(-HALF, 0);
  for (const [a, b, h] of ns) {
    s.lineTo(a, 0);
    s.lineTo(a, h);
    s.lineTo(b, h);
    s.lineTo(b, 0);
  }
  s.lineTo(HALF, 0);
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI * i) / N;
    s.lineTo(HALF * Math.cos(a), HUB.ch + RISE * Math.sin(a));
  }
  s.lineTo(-HALF, 0);
  const geo = new THREE.ShapeGeometry(s, 4);
  // planar UVs over the full wall, so one canvas can carry the artwork
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + HALF) / (2 * HALF), pos.getY(i) / HUB.crown);
  return geo;
}

function endWallTexture(kind) {
  // navy up to about 6 m with a gold stripe low down, white fabric above
  const s = 80;
  const c = canvas(18 * s, Math.round(HUB.crown * s));
  const g = c.getContext('2d');
  const Y = (m) => c.height - m * s;
  g.fillStyle = '#f4f5f6';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = COL.navy;
  g.fillRect(0, Y(HUB.navyTo), c.width, HUB.navyTo * s);
  g.fillStyle = COL.gold;
  g.fillRect(0, Y(0.67), c.width, 0.25 * s);
  void kind;
  return tex(c);
}

class RollerDoor {
  // 6.0 x 4.5 m slatted steel door, rolling up into a hood on the outside face
  constructor() {
    const { w, h } = HUB.roller;
    this.group = new THREE.Group();
    const c = canvas(64, 256);
    const g = c.getContext('2d');
    g.fillStyle = '#c3c7cc';
    g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 16) {
      g.fillStyle = '#9da2a8';
      g.fillRect(0, y, 64, 3);
      g.fillStyle = '#d8dbdf';
      g.fillRect(0, y + 3, 64, 2);
    }
    this.map = tex(c, { repeat: [1, h / 1.1] });
    this.map.wrapS = this.map.wrapT = THREE.RepeatWrapping;
    this.curtain = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std('#ffffff', { map: this.map, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide }));
    this.curtain.castShadow = this.curtain.receiveShadow = true;
    this.group.add(this.curtain);
    const frame = std('#5f6670', { roughness: 0.5, metalness: 0.5 });
    this.group.add(box(0.12, h, 0.16, frame, -w / 2 - 0.06, h / 2, 0.02));
    this.group.add(box(0.12, h, 0.16, frame, w / 2 + 0.06, h / 2, 0.02));
    this.group.add(box(w + 0.36, 0.52, 0.55, frame, 0, h + 0.26, 0.22));
    this.bottomBar = box(w, 0.06, 0.07, frame, 0, 0, 0.01);
    this.group.add(this.bottomBar);
    this.set(0);
  }
  set(open) {
    const { h } = HUB.roller;
    const visible = Math.max(0.001, h * (1 - open));
    this.curtain.scale.y = visible / h;
    this.curtain.position.y = h - visible / 2;
    this.map.repeat.y = visible / 1.1;
    this.map.offset.y = 0;
    this.curtain.visible = open < 0.999;
    this.bottomBar.position.y = h - visible;
  }
}

function exitDoor(w, h) {
  // outward-opening steel fire door with a frame and push bar, local +z = outside
  const grp = new THREE.Group();
  const steel = std('#e6e8eb', { roughness: 0.45, metalness: 0.3 });
  const frame = std('#5f6670', { roughness: 0.5, metalness: 0.5 });
  grp.add(box(w - 0.04, h - 0.02, 0.05, steel, 0, h / 2, 0));
  grp.add(box(0.06, h + 0.06, 0.1, frame, -w / 2, (h + 0.06) / 2, 0));
  grp.add(box(0.06, h + 0.06, 0.1, frame, w / 2, (h + 0.06) / 2, 0));
  grp.add(box(w + 0.12, 0.06, 0.1, frame, 0, h + 0.03, 0));
  grp.add(box(w * 0.75, 0.05, 0.05, std('#2a2d31', { metalness: 0.6, roughness: 0.35 }), 0, 1.0, -0.06));
  return grp;
}

class Unit {
  // a container along z, its court-facing side at x = face; side = -1 on the left row, +1 on the right
  constructor({ z0, z1, side, color, glazed = false, doors = [] }) {
    const { cw, ch } = HUB;
    this.group = new THREE.Group();
    const len = z1 - z0;
    const cx = side * (HALF + cw / 2);
    const cz = (z0 + z1) / 2;
    const paint = std(color, { roughness: 0.6, metalness: 0.15 });
    const ribbed = std(color, { roughness: 0.6, metalness: 0.15, bumpMap: corrugation(len, ch), bumpScale: 2 });
    const frame = std(color === COL.gold ? '#c9861a' : '#0d1a38', { roughness: 0.55, metalness: 0.3 });
    const g = this.group;
    const outerX = side * (HALF + cw);
    const faceX = side * HALF;
    // roof and floor
    this.roof = box(cw, 0.06, len, paint, cx, ch - 0.03, cz);
    g.add(this.roof);
    g.add(box(cw, 0.12, len, frame, cx, 0.06, cz));
    // outer long side, ribbed
    const outer = box(0.04, ch - 0.12, len, ribbed, outerX - side * 0.02, ch / 2 + 0.03, cz);
    g.add(outer);
    this.outer = outer;
    // the two ends
    for (const [z, s] of [
      [z0, -1],
      [z1, 1],
    ]) {
      const e = box(cw, ch - 0.12, 0.04, paint, cx, ch / 2 + 0.03, z - s * 0.02);
      g.add(e);
      if (s > 0) this.endFront = e;
      else this.endBack = e;
    }
    // corner posts and top/bottom rails
    for (const x of [faceX + side * 0.08, outerX - side * 0.08])
      for (const z of [z0 + 0.08, z1 - 0.08]) g.add(box(0.16, ch, 0.16, frame, x, ch / 2, z));
    for (const x of [faceX + side * 0.08, outerX - side * 0.08]) {
      g.add(box(0.16, 0.16, len, frame, x, ch - 0.08, cz));
      g.add(box(0.16, 0.16, len, frame, x, 0.08, cz));
    }
    if (glazed) this.glaze(z0, z1, faceX, side);
    else {
      // court side: ribbed steel with side-opening door pairs
      g.add(box(0.04, ch - 0.12, len, ribbed, faceX + side * 0.02, ch / 2 + 0.03, cz));
      const leaf = std(color, { roughness: 0.55, metalness: 0.15, bumpMap: corrugation(1.1, 2.3), bumpScale: 2 });
      const bar = std('#9aa0a6', { roughness: 0.35, metalness: 0.8 });
      for (const [dz0, dz1] of doors) {
        const n = 2;
        const w = (dz1 - dz0) / n;
        for (let i = 0; i < n; i++) {
          const z = dz0 + w * (i + 0.5);
          g.add(box(0.03, 2.3, w - 0.02, leaf, faceX - side * 0.005, 1.29, z));
          for (const o of [-w * 0.25, w * 0.25]) g.add(box(0.03, 2.2, 0.03, bar, faceX - side * 0.03, 1.29, z + o));
        }
      }
    }
  }
  glaze(z0, z1, faceX, side) {
    // reception: glazed court side in aluminium frames, with a glazed door
    const g = this.group;
    const { ch } = HUB;
    const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8f5', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
    const alu = std('#2b2f35', { roughness: 0.4, metalness: 0.6 });
    const { z0: d0, z1: d1 } = HUB.glazedDoor;
    const pane = (a, b, y0, y1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), glass);
      m.rotation.y = Math.PI / 2;
      m.position.set(faceX, (y0 + y1) / 2, (a + b) / 2);
      g.add(m);
    };
    const y0 = 0.16;
    const y1 = ch - 0.16;
    // mullions about every 1.5 m, either side of the door
    const cuts = [z0 + 0.16];
    for (let z = z0 + 1.6; z < d0 - 0.3; z += 1.5) cuts.push(z);
    cuts.push(d0, d1);
    for (let z = d1 + 1.5; z < z1 - 0.5; z += 1.5) cuts.push(z);
    cuts.push(z1 - 0.16);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i];
      const b = cuts[i + 1];
      if (a === d0) continue; // the door
      pane(a, b, y0, y1);
    }
    for (const z of cuts) g.add(box(0.08, y1 - y0, 0.06, alu, faceX, (y0 + y1) / 2, z));
    g.add(box(0.08, 0.08, z1 - z0, alu, faceX, y0, (z0 + z1) / 2));
    // door: full-height glass leaf with a transom and a pull handle
    pane(d0 + 0.04, d1 - 0.04, y0 + 0.04, 2.2);
    pane(d0 + 0.04, d1 - 0.04, 2.28, y1);
    g.add(box(0.08, 0.07, d1 - d0, alu, faceX, 2.24, (d0 + d1) / 2));
    g.add(box(0.06, 0.9, 0.03, std('#c9ccd0', { metalness: 0.9, roughness: 0.25 }), faceX - side * 0.05, 1.05, d1 - 0.14));
    // inside: pale walls and floor, WC at the Mega Slam end, desk, chairs and a heater by the entrance end
    const inner = std('#f1eee8', { roughness: 0.9 });
    const cx = side * (HALF + HUB.cw / 2);
    const outerX = side * (HALF + HUB.cw);
    g.add(box(HUB.cw - 0.1, 0.02, z1 - z0 - 0.1, std('#d9d4ca', { roughness: 0.7 }), cx, 0.13, (z0 + z1) / 2));
    g.add(box(0.02, ch - 0.3, z1 - z0 - 0.1, inner, outerX - side * 0.06, ch / 2, (z0 + z1) / 2));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HUB.cw - 0.1, z1 - z0 - 0.1), inner);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, ch - 0.07, (z0 + z1) / 2);
    g.add(ceil);
    this.ceil = ceil;
    const wcX0 = outerX - side * 0.06;
    const wcX1 = side * (HALF + 0.65);
    const wc = new THREE.Group();
    const wcMat = std('#d9dbe0', { roughness: 0.7 });
    wc.add(box(Math.abs(wcX1 - wcX0), 2.3, 0.05, wcMat, (wcX0 + wcX1) / 2, 1.27, 0.75));
    wc.add(box(0.05, 2.3, 0.75 - z0, wcMat, wcX1, 1.27, (z0 + 0.75) / 2));
    wc.add(box(0.03, 2.0, 0.75, std('#bfc3ca', { roughness: 0.6 }), wcX1 - side * 0.03, 1.13, 0.0));
    g.add(wc);
    g.add(box(0.7, 0.04, 1.8, std(COL.gold, { roughness: 0.5 }), outerX - side * 0.5, 0.86, 7.5));
    g.add(box(0.66, 0.72, 0.05, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.5, 0.48, 6.65));
    g.add(box(0.66, 0.72, 0.05, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.5, 0.48, 8.35));
    const chairMat = std(COL.navy, { roughness: 0.6 });
    for (const z of [9.0, 9.55, 10.1, 10.65]) {
      g.add(box(0.46, 0.06, 0.46, chairMat, outerX - side * 0.4, 0.58, z));
      g.add(box(0.06, 0.45, 0.46, chairMat, outerX - side * 0.16, 0.83, z));
      g.add(box(0.4, 0.44, 0.04, std('#2a2d31', { metalness: 0.6 }), outerX - side * 0.4, 0.34, z));
    }
    g.add(box(0.22, 0.62, 0.6, std('#f6f6f6', { roughness: 0.4 }), faceX + side * 0.45, 0.47, 10.6));
  }
}

function bench() {
  // parents' bench: timber slats on two navy steel frames, along z
  const grp = new THREE.Group();
  const wood = std('#c8a36a', { roughness: 0.7 });
  const steel = std(COL.navy, { roughness: 0.5, metalness: 0.4 });
  for (const x of [-0.13, 0, 0.13]) grp.add(box(0.11, 0.04, 1.8, wood, x, 0.45, 0));
  for (const z of [-0.7, 0.7]) {
    grp.add(box(0.05, 0.43, 0.05, steel, -0.15, 0.215, z));
    grp.add(box(0.05, 0.43, 0.05, steel, 0.15, 0.215, z));
    grp.add(box(0.36, 0.04, 0.05, steel, 0, 0.41, z));
  }
  return grp;
}

class HighBay {
  // round LED high-bay on a drop wire from the arch
  constructor(x, z) {
    this.group = new THREE.Group();
    const y = archY(x) - 0.55;
    const housing = std('#3a3f46', { roughness: 0.5, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.14, 24), housing);
    body.position.y = 0.07;
    this.lens = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff4dc', emissiveIntensity: 0.6 }));
    this.lens.rotation.x = Math.PI / 2;
    this.group.add(body, this.lens);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 6), housing);
    wire.position.y = 0.14 + 0.225;
    this.group.add(wire);
    this.group.position.set(x, y, z);
  }
}

export async function createPhase2(renderer, { logoUrl = 'assets/logo.png', markings = {} } = {}) {
  RectAreaLightUniformsLib.init();
  const art = {};
  const files = { logo: logoUrl, logoWhiteNavy: 'assets/logo-white-navy.png', roundNavy: 'assets/logo-round-navy.png', roundWhite: 'assets/logo-round-white.png', qr: 'assets/qr.png' };
  await Promise.all(Object.entries(files).map(async ([k, url]) => (art[k] = await loadImage(url).catch(() => null))));
  await Promise.all(
    [
      ['Lilita One', 'assets/fonts/LilitaOne-Regular.ttf'],
      ['Montserrat', 'assets/fonts/Montserrat-Bold.ttf', { weight: '700' }],
    ].map(([family, url, desc]) =>
      new FontFace(family, `url(${url})`, desc)
        .load()
        .then((f) => document.fonts.add(f))
        .catch(() => null),
    ),
  );
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#c9d3dc', 60, 260);

  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 5;
  u.rayleigh.value = 2.2;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.82;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 24), THREE.MathUtils.degToRad(58));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);
  scene.add(cloudDome());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene, 0, 1, 5000).texture;
  scene.environmentIntensity = 0.55;

  const hemi = new THREE.HemisphereLight('#dfe8f2', '#4b4a46', 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe2bd', 3.0);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.target.position.set(0, 0, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -24;
  sc.right = 24;
  sc.top = 24;
  sc.bottom = -24;
  sc.near = 10;
  sc.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  // daylight through the translucent canopy: a soft glow over the whole floor
  const glow = new THREE.RectAreaLight('#f3f6fa', 0.9, 2 * HALF, LEN);
  glow.position.set(0, HUB.crown - 0.4, (HUB.z0 + HUB.z1) / 2);
  glow.lookAt(0, 0, (HUB.z0 + HUB.z1) / 2);
  scene.add(glow);

  scene.add(buildSurroundings());
  const court = buildCourt(art.logo, renderer, markings);
  scene.add(court);

  // run-off tiles out to the container faces and end walls
  const runoff = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF, LEN), std('#ffffff', { map: runoffTexture(), roughness: 0.86 }));
  runoff.rotation.x = -Math.PI / 2;
  runoff.position.set(0, 0.012, (HUB.z0 + HUB.z1) / 2);
  runoff.receiveShadow = true;
  scene.add(runoff);

  const megaSlam = new MegaSlam(art.roundNavy);
  scene.add(megaSlam.group);
  let padLogoTex = null;
  if (art.logo) {
    const c = canvas(600, 290);
    c.getContext('2d').drawImage(art.logo, 0, 0, 600, 290);
    padLogoTex = tex(c);
  }
  const hoops = [new PortableHoop(art.roundNavy), new PortableHoop(art.roundNavy)];
  const finalX = hoops.map((hp, i) => (i ? 1 : -1) * (DIM.W / 2 - 0.6 + hp.rimLocal));
  hoops.forEach((hp, i) => {
    scene.add(hp.group);
    hp.group.position.set(finalX[i], 0, DIM.miniKeyZ);
    hp.group.rotation.set(0, i ? Math.PI : 0, 0);
  });

  // containers: 40 ft reception left, 20 ft Hoop Heroes and school storage right, doors on the court side
  const units = {
    reception: new Unit({ ...HUB.reception, side: -1, color: COL.navy, glazed: true }),
    hhStore: new Unit({ ...HUB.hhStore, side: 1, color: COL.navy, doors: [[-0.85, 1.55]] }),
    schoolStore: new Unit({ ...HUB.schoolStore, side: 1, color: COL.gold, doors: [[8.45, 10.85]] }),
  };
  for (const un of Object.values(units)) scene.add(un.group);

  const enclosure = new THREE.Group();
  scene.add(enclosure);
  // arch: translucent white PVC on steel frames, base rails along the container roofs
  const fabric = new THREE.MeshStandardMaterial({ color: '#f7f8f9', roughness: 0.85, side: THREE.DoubleSide });
  const arch = new THREE.Mesh(archGeometry(), fabric);
  arch.castShadow = true;
  arch.receiveShadow = true;
  const archGroup = new THREE.Group();
  archGroup.add(arch);
  const steel = std('#c9ccd0', { roughness: 0.4, metalness: 0.6 });
  const ribPts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (Math.PI * i) / 64;
    ribPts.push(new THREE.Vector3(-(HALF - 0.08) * Math.cos(a), HUB.ch + (RISE - 0.08) * Math.sin(a), 0));
  }
  const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 96, 0.07, 8, false);
  for (let k = 0; k < HUB.ribs; k++) {
    const rib = new THREE.Mesh(ribGeo, steel);
    rib.position.z = THREE.MathUtils.lerp(HUB.z0 + 0.1, HUB.z1 - 0.1, k / (HUB.ribs - 1));
    rib.castShadow = true;
    archGroup.add(rib);
  }
  for (const s of [-1, 1]) archGroup.add(box(0.22, 0.14, LEN, steel, s * (HALF - 0.05), HUB.ch + 0.07, (HUB.z0 + HUB.z1) / 2));
  enclosure.add(archGroup);

  // end walls: fabric, each with an outside and an inside face
  const walls = new THREE.Group();
  const wallFace = (z, outward, notches, map) => {
    const m = new THREE.Mesh(endWallShape(notches, outward < 0), std('#ffffff', { map, roughness: 0.85 }));
    if (outward < 0) m.rotation.y = Math.PI;
    m.position.z = z;
    m.castShadow = m.receiveShadow = true;
    walls.add(m);
    return m;
  };
  const { w: rw, h: rh } = HUB.roller;
  const rollerNotch = [-rw / 2, rw / 2, rh];
  const tEntranceOut = endWallTexture('entrance-out');
  const tEntranceIn = endWallTexture('entrance-in');
  const tSlamIn = endWallTexture('slam-in');
  const tSlamOut = endWallTexture('slam-out');
  wallFace(HUB.z1 + 0.005, 1, [rollerNotch], tEntranceOut);
  wallFace(HUB.z1 - 0.005, -1, [rollerNotch], tEntranceIn);
  const fe1Notch = [HUB.fe1.x0, HUB.fe1.x1, HUB.fe1.h];
  wallFace(HUB.z0 + 0.005, 1, [fe1Notch], tSlamIn);
  wallFace(HUB.z0 - 0.005, -1, [fe1Notch], tSlamOut);
  enclosure.add(walls);

  const roller = new RollerDoor();
  roller.group.position.z = HUB.z1;
  enclosure.add(roller.group);

  const fe1 = exitDoor(HUB.fe1.x1 - HUB.fe1.x0, HUB.fe1.h);
  fe1.position.set((HUB.fe1.x0 + HUB.fe1.x1) / 2, 0, HUB.z0);
  fe1.rotation.y = Math.PI; // opens outward, away from the court
  enclosure.add(fe1);

  // ball racks: either side of the Mega Slam, and in front of the two storage units
  for (const [x, z, ry] of HUB.racks) {
    const r = ballRack();
    r.position.set(x, 0.015, z);
    r.rotation.y = ry;
    enclosure.add(r);
  }

  // parents' benches along the reception glazing
  for (const [a, b] of HUB.benches) {
    const bn = bench();
    bn.position.set(-HALF + 0.5, 0, (a + b) / 2);
    enclosure.add(shadowed(bn));
  }

  const lamps = [];
  for (const x of HUB.lights.x)
    for (const z of HUB.lights.z) {
      const l = new HighBay(x, z);
      lamps.push(l);
      enclosure.add(l.group);
    }

  const state = { mini: true, rimFt: 10, padding: 'navy', roller: 1, cutaway: false };
  const portableRim = () => THREE.MathUtils.clamp(state.rimFt * FT, 2.4, 3.05);
  const apply = (next = {}) => {
    Object.assign(state, next);
    megaSlam.setHeight(state.rimFt * FT);
    megaSlam.setPadding(COL.navy, padLogoTex);
    hoops.forEach((hp) => {
      hp.group.visible = state.mini;
      hp.setFolded(false);
      hp.setUnfold(1);
      hp.setHeight(portableRim());
    });
    roller.set(state.roller);
    // top-down cutaway: lift the canopy and the reception roof off
    archGroup.visible = !state.cutaway;
    for (const l of lamps) l.group.visible = !state.cutaway;
    walls.visible = !state.cutaway;
    roller.group.visible = !state.cutaway;
    units.reception.roof.visible = units.reception.ceil.visible = !state.cutaway;
    sun.castShadow = !state.cutaway; // a clean plan, without the canopy's missing shadow or the trees'
  };
  apply();
  return { scene, sun, megaSlam, hoops, units, roller, lamps, state, apply, FT };
}

// camera presets for the six Phase 2 shots in the brief
export const SHOTS = {
  1: { label: 'Outside', pos: [12.5, 3.6, 28.5], target: [0.4, 3.0, 5.5], fov: 42, state: { roller: 1 } },
  2: { label: 'Inside', pos: [4.6, 1.8, 11.3], target: [-2.2, 2.0, 1.2], fov: 52, state: { roller: 1 } },
  3: { label: 'Top-down', ortho: { cx: 0, cz: 5, height: 16.6 }, state: { roller: 1, cutaway: true } },
};
