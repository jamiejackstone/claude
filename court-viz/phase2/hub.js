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
import { COL, DIM, FT, canvas, tex, std, shadowed, buildCourt, buildSurroundings, cloudDome, corrugation, loadImage, fitText, MegaSlam, PortableHoop, ballRack, rimAndNet, boardDecal } from './scene.js';

export const HUB = {
  x0: -9,
  x1: 9,
  z0: -1.095,
  z1: 11.095,
  cw: 2.44, // container width
  ch: 2.59, // container height: the arch springs from the roofs
  crown: 7.6,
  runoff: COL.court, // same grey panels as the court (Jamie, 21 Oct 2026)
  reception: { z0: -1.095, z1: 11.095 }, // 40 ft, left
  hhStore: { z0: -1.095, z1: 4.963 }, // 20 ft navy, right, Mega Slam end
  schoolStore: { z0: 5.032, z1: 11.095 }, // 20 ft gold, right, entrance end
  roller: { w: 6.0, h: 4.5 },
  fe1: { x0: 4.5, x1: 5.5, h: 2.1 }, // the single fire exit, in the Mega Slam end wall right of the hoop
  navyTo: 6.0, // end walls navy to here, white fabric above
  glazedDoor: { z0: 7.0, z1: 8.0 }, // reception door onto the court
  entranceDoor: { x0: -10.2, x1: -9.3 }, // public entrance in the reception's front end, beside the roller door
  sill: 1.05, // reception windows above a container-wall sill
  lights: { x: [-6, -2, 2, 6], z: [0.9, 5.0, 9.1] },
  storageBenches: [
    [-6.4, -4.6],
    [4.6, 6.4],
  ], // across the entrance end wall, either side of the roller door (Jamie, 26 Oct 2026)
  benches: [
    [0.6, 2.4],
    [2.6, 4.4],
    [8.6, 10.4],
  ],
  ribs: 7,
};
// wall pads on the containers' court sides: about the bottom half, 1.2 m panels, 5 cm foam
const PAD = { h: 1.3, w: 1.2, t: 0.05, lift: 0.04 };
const RISE = HUB.crown - HUB.ch;
const W_IN = DIM.W / 2 - 0.02; // centre of the gold boundary line across the court
let HALF = (HUB.x1 - HUB.x0) / 2; // half the clear span; setSpan() narrows it before a build
// inside face of the arch: an elliptical profile springing near-vertical off the container roofs
// Narrow (or widen) the clear span between the container faces, keeping the court centred. Mutates HUB once,
// before the scene is built, like shiftHub below.
function setSpan(span) {
  if (!span || HUB.span) return;
  HUB.span = span;
  HUB.x0 = -span / 2;
  HUB.x1 = span / 2;
  HALF = span / 2;
}
// Slide the whole hub along the court (negative = towards the main hoop end), so one end gets more run-off.
// Mutates HUB in place once, before the scene is built; the court and its markings stay put.
function shiftHub(dz) {
  if (!dz || HUB.shift) return;
  HUB.shift = dz;
  HUB.z0 += dz;
  HUB.z1 += dz;
  for (const k of ['reception', 'hhStore', 'schoolStore', 'glazedDoor']) {
    HUB[k].z0 += dz;
    HUB[k].z1 += dz;
  }
  HUB.lights.z = HUB.lights.z.map((z) => z + dz);
}
export const archY = (x, inset = 0) => HUB.ch + (RISE - inset) * Math.sqrt(Math.max(0, 1 - (x / (HALF - inset)) ** 2));
const LEN = HUB.z1 - HUB.z0;

const box = (w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};

// ---------------------------------------------------------------- branding

// draw an image centred at (cx, cy) metres from the panel's bottom-left, w metres wide
function drawImg(g, s, H, im, cx, cy, w) {
  if (!im) return;
  const h = (w * im.height) / im.width;
  g.drawImage(im, (cx - w / 2) * s, (H - cy - h / 2) * s, w * s, h * s);
}
function drawText(g, s, H, text, cx, cy, size, color, maxW) {
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitText(g, text, '"Lilita One", sans-serif', size * s, maxW * s);
  g.fillText(text, cx * s, (H - cy) * s);
}
function stripe(g, s, W, H, color) {
  // the brand stripe low down, at the same height on every wall and container
  g.fillStyle = color;
  g.fillRect(0, (H - 0.67) * s, W * s, 0.25 * s);
}
// arena boards: one bright board per sport (sport colour, ball badge, sport name) plus the Heroes Arena board
const BOARD = {
  hoop: { bg: '#fba91a', ink: '#14264e', word: 'BASKETBALL' },
  pickle: { bg: '#9bd13b', ink: '#14264e', word: 'PICKLEBALL' },
  dodge: { bg: '#e63950', ink: '#ffffff', word: 'DODGEBALL' },
  arena: { bg: '#14264e', ink: '#ffffff', word: 'HEROES ARENA' },
};
function boardTexture(kind, w, h) {
  const s = 220;
  const c = canvas(Math.round(w * s), Math.round(h * s));
  const g = c.getContext('2d');
  const b = BOARD[kind];
  g.fillStyle = b.bg;
  g.fillRect(0, 0, c.width, c.height);
  const r = h * 0.3 * s;
  const cy = c.height / 2;
  const word = (x0) => {
    g.fillStyle = b.ink;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    fitText(g, b.word, '"Lilita One", sans-serif', h * 0.42 * s, c.width - x0 - 0.25 * s);
    g.fillText(b.word, x0, cy + 0.02 * s);
  };
  if (kind === 'arena') {
    // the name with the family stripe underneath
    const sw = c.width - 0.6 * s;
    ['#fba91a', '#9bd13b', '#e63950'].forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(0.3 * s + (i * sw) / 3, c.height - 0.16 * s, sw / 3, 0.07 * s);
    });
    g.fillStyle = b.ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitText(g, b.word, '"Lilita One", sans-serif', h * 0.46 * s, c.width - 0.5 * s);
    g.fillText(b.word, c.width / 2, cy - 0.03 * s);
    return tex(c, { aniso: 8 });
  }
  // ball badge on the left, the name beside it
  const cx = 0.25 * s + r;
  g.lineWidth = 0.025 * s;
  g.strokeStyle = '#14264e';
  g.fillStyle = b.bg;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  if (kind === 'hoop') {
    g.lineWidth = 0.02 * s;
    g.beginPath();
    g.moveTo(cx, cy - r);
    g.lineTo(cx, cy + r);
    g.moveTo(cx - r, cy);
    g.lineTo(cx + r, cy);
    g.moveTo(cx - r * 0.7, cy - r * 0.75);
    g.quadraticCurveTo(cx - r * 0.25, cy, cx - r * 0.7, cy + r * 0.75);
    g.moveTo(cx + r * 0.7, cy - r * 0.75);
    g.quadraticCurveTo(cx + r * 0.25, cy, cx + r * 0.7, cy + r * 0.75);
    g.stroke();
  } else if (kind === 'pickle') {
    g.fillStyle = '#14264e';
    for (const [dx, dy] of [[0, -0.55], [-0.42, -0.25], [0.42, -0.25], [0, 0], [-0.42, 0.25], [0.42, 0.25], [0, 0.55]]) {
      g.beginPath();
      g.arc(cx + dx * r, cy + dy * r, r * 0.13, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.strokeStyle = '#ffffff';
    g.lineWidth = r * 0.16;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, r * 0.62, Math.PI * 1.05, Math.PI * 1.45);
    g.stroke();
  }
  g.restore();
  word(cx + r + 0.18 * s);
  return tex(c, { aniso: 8 });
}

// a painted panel laid over a face; normal is '+x' | '-x' | '+z' | '-z'
function facePanel(w, h, base, draw, { ribs = true, s = 200 } = {}) {
  const c = canvas(Math.round(w * s), Math.round(h * s));
  const g = c.getContext('2d');
  if (base) {
    g.fillStyle = base;
    g.fillRect(0, 0, c.width, c.height);
  }
  draw(g, s, w, h);
  const mat = std('#ffffff', { map: tex(c), roughness: 0.6, metalness: 0.15, transparent: !base, ...(ribs ? { bumpMap: corrugation(w, h), bumpScale: 2 } : {}) });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
}
const FACING = { '+x': Math.PI / 2, '-x': -Math.PI / 2, '+z': 0, '-z': Math.PI };
function place(m, normal, x, y, z) {
  m.rotation.y = FACING[normal];
  m.position.set(x, y, z);
  return m;
}

function exitSignTexture() {
  // green running-man sign with an arrow, as the brief's elevations
  const c = canvas(360, 160);
  const g = c.getContext('2d');
  g.fillStyle = '#009a44';
  g.fillRect(0, 0, 360, 160);
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineWidth = 14;
  // running man
  g.beginPath();
  g.arc(118, 34, 13, 0, Math.PI * 2);
  g.fill();
  const seg = (pts) => {
    g.beginPath();
    g.moveTo(...pts[0]);
    for (const p of pts.slice(1)) g.lineTo(...p);
    g.stroke();
  };
  seg([[108, 56], [92, 98]]);
  seg([[92, 98], [118, 112], [112, 140]]);
  seg([[92, 98], [70, 116], [52, 112]]);
  seg([[104, 62], [130, 76], [146, 66]]);
  seg([[104, 62], [80, 70], [70, 86]]);
  // door
  g.lineWidth = 8;
  g.strokeRect(168, 22, 52, 118);
  // arrow
  g.lineWidth = 16;
  seg([[250, 80], [330, 80]]);
  seg([[300, 50], [330, 80], [300, 110]]);
  return tex(c);
}

function runoffTexture() {
  // navy-grey interlocking tiles around the court, on the same panel grid as the court
  const s = 60;
  const c = canvas(Math.round(2 * HALF * s), Math.round(LEN * s));
  const g = c.getContext('2d');
  g.fillStyle = HUB.runoff;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(20, 22, 26, 0.45)';
  g.lineWidth = 2;
  const pw = DIM.panel.w;
  for (let x = -7.4 - pw * Math.ceil((HALF - 7.4) / pw); x <= HALF; x += pw) {
    g.beginPath();
    g.moveTo((x + HALF) * s, 0);
    g.lineTo((x + HALF) * s, c.height);
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

function endWallTexture(kind, art, name = 'HOOP HUB', plain = false) {
  // navy up to about 6 m with the gold stripe low down, white fabric above; artwork in the wall's own
  // left-to-right as seen from that side. Returns the map and a mask of the fabric that glows at night.
  const s = 110;
  const W = 2 * HALF;
  const H = HUB.crown;
  const c = canvas(Math.round(W * s), Math.round(H * s));
  const g = c.getContext('2d');
  const X = (x) => x + HALF; // wall x (-9..9) to panel metres
  g.fillStyle = '#f4f5f6';
  g.fillRect(0, 0, c.width, c.height);
  // the arena look raises the navy so the name sits on it with room above the roller door
  const navyTo = plain ? 6.8 : HUB.navyTo;
  g.fillStyle = COL.navy;
  g.fillRect(0, (H - navyTo) * s, c.width, navyTo * s);
  // arena look: arena boards run along the bottom inside, so the inner walls lose the stripe and the logos;
  // the only sign is the name, over the door outside and above the main hoop inside
  if (!(plain && kind.endsWith('-in'))) stripe(g, s, W, H, COL.gold);
  if (plain) {
    if (kind === 'entrance-out') {
      drawText(g, s, H, name, X(0), 6.05, 1.0, COL.gold, 6.4);
      drawText(g, s, H, 'YOUR HOME COURT', X(0), 5.32, 0.32, '#ffffff', 4);
    }
    if (kind === 'slam-in') {
      // the back wall: the name big, with the three sport colours as a bar beneath it, in the boards' order
      // (Jamie, 29 Oct 2026)
      drawText(g, s, H, name, X(0), 5.65, 1.1, '#ffffff', 8);
      const tw = g.measureText(name).width / s;
      ['#fba91a', '#9bd13b', '#e63950'].forEach((col, i) => {
        g.fillStyle = col;
        g.fillRect((X(-tw / 2) + (i * tw) / 3) * s, (H - 4.86) * s, (tw / 3) * s, 0.14 * s);
      });
    }
  } else if (kind === 'entrance-out') {
    // HOOP HUB above the door, a logo either side
    drawText(g, s, H, name, X(0), 5.5, 1.05, COL.gold, 6.4);
    drawImg(g, s, H, art.logo, X(-6.0), 3.3, 3.0);
    drawImg(g, s, H, art.logo, X(6.0), 3.3, 3.0);
  } else if (kind === 'entrance-in') {
    drawImg(g, s, H, art.logo, X(0), 5.5, 1.85); // between the roller hood and the top of the navy
    drawImg(g, s, H, art.roundWhite, X(-6.1), 3.1, 1.6);
    drawImg(g, s, H, art.roundWhite, X(6.1), 3.1, 1.6);
  } else if (kind === 'slam-in') {
    // big logo above the Mega Slam board, round badges either side
    drawImg(g, s, H, art.logo, X(0), 5.0, 3.9);
    drawImg(g, s, H, art.roundWhite, X(-6.4), 3.3, 1.7);
    drawImg(g, s, H, art.roundWhite, X(6.6), 3.6, 1.5);
    drawText(g, s, H, name, X(-6.4), 1.55, 0.5, COL.gold, 3);
  } else if (kind === 'slam-out') {
    drawImg(g, s, H, art.logo, X(0), 3.7, 4.6);
  }
  const m = canvas(64, Math.round(H * 8));
  const mg = m.getContext('2d');
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, 64, m.height);
  mg.fillStyle = '#fff';
  mg.fillRect(0, 0, 64, (H - navyTo) * 8);
  return { map: tex(c, { aniso: 16 }), glow: tex(m) };
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
  // color paints the court side and the roof (what shows from inside and from above); shell paints the outside
  constructor({ z0, z1, side, color, shell = color, roof = color, glazed = false, door = null, brand = {}, kit = ['balls', 'balls'] }) {
    const { cw, ch } = HUB;
    this.group = new THREE.Group();
    const len = z1 - z0;
    const cx = side * (HALF + cw / 2);
    const cz = (z0 + z1) / 2;
    const paint = std(shell, { roughness: 0.6, metalness: 0.15 });
    const ribbed = std(shell, { roughness: 0.6, metalness: 0.15, bumpMap: corrugation(len, ch), bumpScale: 2 });
    const frame = std(shell === COL.gold ? '#c9861a' : '#0d1a38', { roughness: 0.55, metalness: 0.3 });
    const g = this.group;
    const outerX = side * (HALF + cw);
    const faceX = side * HALF;
    // roof and floor
    this.roof = box(cw, 0.06, len, std(roof, { roughness: 0.6, metalness: 0.15 }), cx, ch - 0.03, cz);
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
    if (glazed) this.glaze(z0, z1, faceX, side, brand.art ?? {}, brand.welcome);
    else {
      // court side: ribbed steel with one roller shutter at the corner end, rolling up inside
      const [da, db] = door;
      const sw = db - da;
      const sy0 = 0.14;
      const sh = 2.1;
      const rib = (a, b, y0, y1) =>
        g.add(box(0.04, y1 - y0, b - a, std(color, { roughness: 0.6, metalness: 0.15, bumpMap: corrugation(b - a, y1 - y0), bumpScale: 2 }), faceX + side * 0.02, (y0 + y1) / 2, (a + b) / 2));
      if (da - z0 > 0.01) rib(z0, da, 0.12, ch - 0.12);
      if (z1 - db > 0.01) rib(db, z1, 0.12, ch - 0.12);
      rib(da, db, sy0 + sh, ch - 0.12);
      // painted steel lining, lit, with ball racks (or other sports' kit) against the back wall where they show
      // through the shutter
      g.add(box(cw - 0.3, ch - 0.3, len - 0.3, std('#9ba1a8', { roughness: 0.9, side: THREE.BackSide }), cx, ch / 2, cz));
      g.add(box(cw - 0.32, 0.02, len - 0.32, std('#8a7458', { roughness: 0.85 }), cx, 0.13, cz));
      for (const [i, k] of [0.27, 0.73].entries()) {
        const r = { balls: ballRack, dodgeball: dodgeCart, rackets: racketShelf, wheelchairs: sportsChair }[kit[i]]();
        r.rotation.y = Math.PI / 2;
        r.position.set(outerX - side * 0.42, 0.14, da + sw * k);
        g.add(r);
      }
      const lamp = new THREE.PointLight('#fff4e0', 2.2, 5, 1.5);
      lamp.position.set(cx, ch - 0.35, (da + db) / 2);
      g.add(lamp);
      this.lamp = lamp;
      const trim = std('#5f6670', { roughness: 0.5, metalness: 0.5 });
      for (const z of [da, db]) g.add(box(0.07, sh, 0.08, trim, faceX - side * 0.01, sy0 + sh / 2, z));
      g.add(box(0.07, 0.08, sw + 0.08, trim, faceX - side * 0.01, sy0 + sh, (da + db) / 2));
      const c = canvas(64, 256);
      const cg = c.getContext('2d');
      cg.fillStyle = '#c3c7cc';
      cg.fillRect(0, 0, 64, 256);
      for (let y = 0; y < 256; y += 16) {
        cg.fillStyle = '#9da2a8';
        cg.fillRect(0, y, 64, 3);
        cg.fillStyle = '#d8dbdf';
        cg.fillRect(0, y + 3, 64, 2);
      }
      this.slats = tex(c, { repeat: [1, sh / 1.1] });
      this.curtain = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), std('#ffffff', { map: this.slats, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide }));
      this.curtain.rotation.y = (-side * Math.PI) / 2;
      this.curtain.position.set(faceX + side * 0.01, sy0 + sh / 2, (da + db) / 2);
      this.curtain.receiveShadow = true;
      g.add(this.curtain);
      this.shutter = { y0: sy0, h: sh };
    }
    if (brand.base) this.brandFaces({ z0, z1, side, door }, brand);
  }
  brandFaces({ z0, z1, side, door }, brand) {
    // painted wraps laid just proud of each face
    const { cw, ch } = HUB;
    const len = z1 - z0;
    const cx = side * (HALF + cw / 2);
    const outerX = side * (HALF + cw);
    const faceX = side * HALF;
    const out = side > 0 ? '+x' : '-x';
    const inn = side > 0 ? '-x' : '+x';
    const add = (m) => this.group.add(m);
    const base = brand.base;
    if (brand.outer) add(place(facePanel(len - 0.32, ch - 0.32, base, brand.outer), out, outerX + side * 0.004, ch / 2, (z0 + z1) / 2));
    if (brand.endBack) add(place(facePanel(cw - 0.32, ch - 0.32, base, brand.endBack), '-z', cx, ch / 2, z0 - 0.004));
    if (brand.endFront) add(place(facePanel(cw - 0.32, ch - 0.32, base, brand.endFront), '+z', cx, ch / 2, z1 + 0.004));
    if (brand.court && door) {
      // the solid stretch of the court side, away from the shutter
      const [da, db] = door;
      const [a, b] = da - z0 > z1 - db ? [z0 + 0.16, da - 0.06] : [db + 0.06, z1 - 0.16];
      add(place(facePanel(b - a, ch - 0.32, brand.courtBase ?? base, brand.court), inn, faceX - side * 0.004, ch / 2, (a + b) / 2));
    }
  }
  setDoors(open) {
    // roller shutter: 0 down, 1 rolled right up
    if (!this.curtain) return;
    const { y0, h } = this.shutter;
    const vis = Math.max(0.001, h * (1 - open));
    this.curtain.scale.y = vis / h;
    this.curtain.position.y = y0 + h - vis / 2;
    this.slats.repeat.y = vis / 1.1;
    this.curtain.visible = open < 0.999;
  }

  glaze(z0, z1, faceX, side, art, welcome = null) {
    // reception: container wall up to the sill on the court side with windows above and a glazed door onto
    // the court; the public entrance is a door in the outside wall (Jamie, 22 Oct 2026)
    const g = this.group;
    const { ch, cw } = HUB;
    const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8f5', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
    const alu = std('#2b2f35', { roughness: 0.4, metalness: 0.6 });
    const { z0: d0, z1: d1 } = HUB.glazedDoor;
    const sill = HUB.sill;
    const court = side > 0 ? '-x' : '+x';
    const pane = (a, b, y0, y1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), glass);
      m.rotation.y = Math.PI / 2;
      m.position.set(faceX, (y0 + y1) / 2, (a + b) / 2);
      g.add(m);
    };
    // ribbed lower wall either side of the door, with the brand stripe
    for (const [a, b] of [
      [z0 + 0.16, d0 - 0.04],
      [d1 + 0.04, z1 - 0.16],
    ]) {
      g.add(box(0.04, sill - 0.12, b - a, std(COL.navy, { roughness: 0.6, metalness: 0.15 }), faceX + side * 0.02, (sill + 0.12) / 2, (a + b) / 2));
      const p = facePanel(b - a, sill - 0.16, COL.navy, (cg, s2, w, h) => stripe(cg, s2, w, h + 0.16, COL.gold));
      g.add(place(p, court, faceX - side * 0.004, (sill + 0.16) / 2, (a + b) / 2));
    }
    const y1 = ch - 0.16;
    // windows with mullions about every 1.5 m, either side of the door
    const cuts = [z0 + 0.16];
    for (let z = z0 + 1.6; z < d0 - 0.3; z += 1.5) cuts.push(z);
    cuts.push(d0, d1);
    for (let z = d1 + 1.5; z < z1 - 0.5; z += 1.5) cuts.push(z);
    cuts.push(z1 - 0.16);
    for (let i = 0; i < cuts.length - 1; i++) {
      if (cuts[i] === d0) continue; // the door
      pane(cuts[i], cuts[i + 1], sill, y1);
    }
    for (const z of cuts) g.add(box(0.08, y1 - sill, 0.06, alu, faceX, (y1 + sill) / 2, z));
    g.add(box(0.14, 0.05, z1 - z0 - 0.32, alu, faceX, sill, (z0 + z1) / 2));
    // door onto the court: full-height glass leaf with a transom and a pull handle
    const y0 = 0.16;
    for (const z of [d0, d1]) g.add(box(0.08, y1 - y0, 0.06, alu, faceX, (y0 + y1) / 2, z));
    pane(d0 + 0.04, d1 - 0.04, y0 + 0.04, 2.2);
    pane(d0 + 0.04, d1 - 0.04, 2.28, y1);
    g.add(box(0.08, 0.07, d1 - d0, alu, faceX, 2.24, (d0 + d1) / 2));
    g.add(box(0.06, 0.9, 0.03, std('#c9ccd0', { metalness: 0.9, roughness: 0.25 }), faceX - side * 0.05, 1.05, d1 - 0.14));
    // inside: pale walls and floor, WC at the Mega Slam end, waiting chairs, the desk between the two doors
    const inner = std('#f1eee8', { roughness: 0.9 });
    const cx = side * (HALF + cw / 2);
    const outerX = side * (HALF + cw);
    g.add(box(cw - 0.1, 0.02, z1 - z0 - 0.1, std('#d9d4ca', { roughness: 0.7 }), cx, 0.13, (z0 + z1) / 2));
    g.add(box(0.02, ch - 0.3, z1 - z0 - 0.1, inner, outerX - side * 0.06, ch / 2, (z0 + z1) / 2));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.1, z1 - z0 - 0.1), inner);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, ch - 0.07, (z0 + z1) / 2);
    g.add(ceil);
    this.ceil = ceil;
    const wcX0 = outerX - side * 0.06;
    const wcX1 = side * (HALF + 0.65);
    if (welcome) {
      // accessible WC across the whole end of the container: 2.3 x 1.6 m, more than the usual 2.2 x 1.5 m,
      // a 1 m door by the glazing side, grab rails, and frosted glass where it meets the windows
      const wz = z0 + 1.6;
      const xIn = faceX + side * 0.06;
      const doorA = xIn + side * 0.1;
      const doorB = doorA + side * 1.0;
      const wcMat = std('#d9dbe0', { roughness: 0.7 });
      g.add(box(Math.abs(wcX0 - doorB), 2.3, 0.06, wcMat, (wcX0 + doorB) / 2, 1.27, wz));
      g.add(box(Math.abs(doorA - xIn), 2.3, 0.06, wcMat, (doorA + xIn) / 2, 1.27, wz));
      g.add(box(1.0, 0.25, 0.06, wcMat, (doorA + doorB) / 2, 2.27, wz));
      const leaf = box(0.96, 2.0, 0.04, std('#c9ced6', { roughness: 0.6 }), (doorA + doorB) / 2, 1.13, wz + 0.01);
      g.add(leaf);
      g.add(box(0.02, 1.9, wz - z0, std('#e8ecf1', { roughness: 0.2, transparent: true, opacity: 0.92 }), faceX + side * 0.09, 1.3, (z0 + wz) / 2));
      for (const y of [0.75, 0.9]) g.add(box(0.04, 0.04, 0.9, std('#c9ccd0', { metalness: 0.8, roughness: 0.3 }), wcX0 - side * 0.05, y, z0 + 0.6));
      const wcSign = facePanel(0.62, 0.3, '#ffffff', (cg, s2, w, h) => drawText(cg, s2, h, 'ACCESSIBLE WC', w / 2, h / 2, 0.11, COL.navy, w - 0.08), { ribs: false });
      g.add(place(wcSign, '+z', (doorA + doorB) / 2, 1.75, wz + 0.04));
    }
    const wc = new THREE.Group();
    wc.visible = !welcome;
    const wcMat = std('#d9dbe0', { roughness: 0.7 });
    wc.add(box(Math.abs(wcX1 - wcX0), 2.3, 0.05, wcMat, (wcX0 + wcX1) / 2, 1.27, 0.75));
    wc.add(box(0.05, 2.3, 0.75 - z0, wcMat, wcX1, 1.27, (z0 + 0.75) / 2));
    wc.add(box(0.03, 2.0, 0.75, std('#bfc3ca', { roughness: 0.6 }), wcX1 - side * 0.03, 1.13, 0.0));
    g.add(wc);
    const wcSign = facePanel(0.3, 0.3, '#ffffff', (cg, s2, w, h) => drawText(cg, s2, h, 'WC', w / 2, h / 2, 0.16, COL.navy, 0.26), { ribs: false });
    wcSign.visible = !welcome;
    g.add(place(wcSign, court, wcX1 - side * 0.05, 1.55, 0));
    if (welcome) {
      // level access: a low threshold ramp from the court to the glazed door, the wheelchair route between
      // reception and court; the public goes in by the step or through the roller door (Jamie, 29 Oct 2026)
      const tr = box(0.5, 0.03, d1 - d0 + 0.2, std('#2b2f35', { roughness: 0.6, metalness: 0.4 }), faceX - side * 0.25, 0.06, (d0 + d1) / 2);
      tr.rotation.z = side * Math.atan(0.12 / 0.5);
      g.add(tr);
    }
    const chairMat = std(COL.navy, { roughness: 0.6 });
    for (const z of [1.6, 2.15, 2.7, 3.25]) {
      g.add(box(0.46, 0.06, 0.46, chairMat, outerX - side * 0.4, 0.58, z));
      g.add(box(0.06, 0.45, 0.46, chairMat, outerX - side * 0.16, 0.83, z));
      g.add(box(0.4, 0.44, 0.04, std('#2a2d31', { metalness: 0.6 }), outerX - side * 0.4, 0.34, z));
    }
    const dz = 9.2;
    if (welcome) {
      // check-in counter just inside the entrance, like a small gym: navy front, gold top, a tablet to sign in
      const cw2 = 0.62;
      const cxc = outerX - side * (0.12 + cw2 / 2);
      g.add(box(cw2, 1.0, 1.7, std(COL.navy, { roughness: 0.55 }), cxc, 0.62, dz));
      g.add(box(cw2 + 0.08, 0.05, 1.78, std(COL.gold, { roughness: 0.4 }), cxc, 1.145, dz));
      const front = facePanel(1.5, 0.5, null, (cg, s2, w, h) => drawText(cg, s2, h, 'CHECK IN HERE', w / 2, h / 2, 0.2, '#ffffff', w - 0.1), { ribs: false });
      g.add(place(front, court, cxc - side * (cw2 / 2 + 0.005), 0.72, dz));
      const tablet = box(0.03, 0.2, 0.28, std('#1b1f27', { roughness: 0.3, metalness: 0.4 }), cxc - side * 0.1, 1.27, dz + 0.3);
      tablet.rotation.z = side * 0.35;
      g.add(tablet);
      // screen on the WC wall, facing the seats: today's sessions
      const wcMid = outerX - side * 0.7;
      const screen = facePanel(0.95, 0.55, '#0d1a38', (cg, s2, w, h) => {
        drawText(cg, s2, h, welcome, w / 2, h - 0.1, 0.09, COL.gold, w - 0.2);
        const rows = [['4:00', 'Basketball · Rookies'], ['5:00', 'Pickleball · Rising Stars'], ['6:15', 'Dodgeball · Ballers']];
        rows.forEach(([t, n], i) => {
          drawText(cg, s2, h, t, 0.12, h - 0.24 - i * 0.1, 0.055, '#ffffff', 0.2);
          drawText(cg, s2, h, n, 0.56, h - 0.24 - i * 0.1, 0.055, '#d6dcea', 0.68);
        });
      }, { ribs: false });
      const sz = z0 + 1.6 + 0.05;
      g.add(box(1.0, 0.6, 0.04, std('#16181b', { roughness: 0.3, metalness: 0.4 }), wcMid, 1.65, sz));
      g.add(place(screen, '+z', wcMid, 1.65, sz + 0.025));
      // welcome sign above the seats, facing the court
      const hello = facePanel(2.4, 0.34, null, (cg, s2, w, h) => drawText(cg, s2, h, `WELCOME TO ${welcome}`, w / 2, h / 2, 0.2, COL.navy, w - 0.1), { ribs: false });
      g.add(place(hello, court, outerX - side * 0.08, 1.95, 2.45));
      // feature wall: navy below, the three sport colours as a band, along the long outer wall
      const fz0 = 0.85;
      const fz1 = z1 - 0.2;
      const fx = outerX - side * 0.078;
      g.add(box(0.012, 1.0, fz1 - fz0, std(COL.navy, { roughness: 0.6 }), fx, 0.63, (fz0 + fz1) / 2));
      ['#fba91a', '#9bd13b', '#e63950'].forEach((col, i) => {
        const len = (fz1 - fz0) / 3;
        g.add(box(0.014, 0.07, len, std(col, { roughness: 0.5 }), fx, 1.17, fz0 + len * (i + 0.5)));
      });
      // a big timetable on the long wall, Monday to Friday, in the sport colours (an example week, as the deck)
      const SPORT = { b: ['#fba91a', COL.navy], p: ['#9bd13b', COL.navy], d: ['#e63950', '#ffffff'], c: ['#00bb7f', COL.navy] };
      const days = [
        ['MON', 'b', [['Breakfast Hoops', 'b'], ['Rookies, Rising Stars', 'b'], ['Rising Stars, Ballers', 'b']]],
        ['TUE', 'p', [['Breakfast Hoops', 'b'], ['Rookies, Rising Stars', 'p'], ['Rising Stars, Ballers', 'p']]],
        ['WED', 'b', [['Breakfast Hoops', 'b'], ['Rookies, Rising Stars', 'b'], ['Girls-only sessions', 'c']]],
        ['THU', 'd', [['Breakfast Hoops', 'b'], ['Rookies, Rising Stars', 'd'], ['Rising Stars, Ballers', 'd']]],
        ['FRI', 'b', [['Breakfast Hoops', 'b'], ['Dodgeball Night', 'd'], ['League and pickup', 'b']]],
      ];
      const lead = { b: 'BASKETBALL', p: 'PICKLEBALL', d: 'DODGEBALL' };
      const ttW = 3.9;
      const ttH = 1.08;
      const timetable = facePanel(ttW, ttH, COL.navy, (cg, s2, w, h) => {
        const rect = (x, yTop, rw, rh, col) => {
          cg.fillStyle = col;
          cg.beginPath();
          cg.roundRect(x * s2, (h - yTop) * s2, rw * s2, rh * s2, 0.025 * s2);
          cg.fill();
        };
        drawText(cg, s2, h, `THIS WEEK AT ${welcome}`, w / 2, h - 0.09, 0.09, '#ffffff', w - 0.4);
        ['#fba91a', '#9bd13b', '#e63950'].forEach((col, i) => {
          cg.fillStyle = col;
          cg.fillRect((w / 2 - 0.6 + i * 0.4) * s2, (h - 0.16) * s2, 0.4 * s2, 0.014 * s2);
        });
        const lx = 0.06;
        const lw = 0.5;
        const cw2 = (w - lx - lw - 0.06) / 5;
        const rows = ['MORNING', 'AFTER SCHOOL', 'EVENING'];
        rows.forEach((r, j) => {
          drawText(cg, s2, h, r, lx + lw / 2, h - 0.42 - j * 0.2, 0.045, '#d6dcea', lw - 0.04);
        });
        days.forEach(([d, sp, cells], i) => {
          const x = lx + lw + i * cw2;
          const [bg, ink] = SPORT[sp];
          rect(x + 0.015, h - 0.2, cw2 - 0.03, 0.11, bg);
          drawText(cg, s2, h, `${d} · ${lead[sp]}`, x + cw2 / 2, h - 0.255, 0.045, ink, cw2 - 0.07);
          cells.forEach(([t, k], j) => {
            const [cb, ci] = SPORT[k];
            const yTop = h - 0.335 - j * 0.2;
            rect(x + 0.015, yTop, cw2 - 0.03, 0.17, cb);
            drawText(cg, s2, h, t, x + cw2 / 2, yTop - 0.085, 0.042, ci, cw2 - 0.08);
          });
        });
        drawText(cg, s2, h, 'Example week · weekends: sessions, leagues and Hero Parties', w / 2, 0.05, 0.035, '#d6dcea', w - 0.4);
      }, { ribs: false, s: 400 });
      g.add(place(timetable, court, outerX - side * 0.09, 1.86, 5.9));
      // cafe tables by the windows, so parents can sit and watch the court; chairs in the sport colours
      const tableTop = std('#ffffff', { roughness: 0.4 });
      const tableLeg = std(COL.navy, { roughness: 0.5, metalness: 0.4 });
      [[4.95, ['#fba91a', '#9bd13b']], [6.3, ['#e63950', '#fba91a']]].forEach(([tz, cols]) => {
        const tx = faceX + side * 0.5;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), tableTop);
        top.position.set(tx, 0.86, tz);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 10), tableLeg);
        leg.position.set(tx, 0.49, tz);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 20), tableLeg);
        foot.position.set(tx, 0.145, tz);
        for (const m of [top, leg, foot]) {
          m.castShadow = true;
          g.add(m);
        }
        cols.forEach((col, k) => {
          const dz2 = k ? 0.48 : -0.48;
          const cm = std(col, { roughness: 0.55 });
          g.add(box(0.4, 0.04, 0.38, cm, tx, 0.58, tz + dz2));
          g.add(box(0.4, 0.4, 0.04, cm, tx, 0.8, tz + dz2 * 1.42));
          for (const [ox, oz] of [[-0.17, -0.15], [0.17, -0.15], [-0.17, 0.15], [0.17, 0.15]]) g.add(box(0.025, 0.44, 0.025, tableLeg, tx + ox, 0.35, tz + dz2 + oz));
        });
      });
      // a couple of plants
      for (const z of [4.4, 7.6]) {
        g.add(box(0.34, 0.42, 0.34, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.32, 0.33, z));
        const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), std('#3f8a3a', { roughness: 0.8, flatShading: true }));
        leaves.position.set(outerX - side * 0.32, 0.86, z);
        leaves.castShadow = true;
        g.add(leaves);
      }
    } else {
      g.add(box(0.7, 0.04, 1.8, std(COL.gold, { roughness: 0.5 }), outerX - side * 0.5, 0.86, dz));
      g.add(box(0.66, 0.72, 0.05, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.5, 0.48, dz - 0.85));
      g.add(box(0.66, 0.72, 0.05, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.5, 0.48, dz + 0.85));
    }
    if (!welcome) g.add(box(0.22, 0.62, 0.6, std('#f6f6f6', { roughness: 0.4 }), faceX + side * 0.45, 0.47, 4.3));
    // the public entrance: a door in the front end, facing the playground, with a step and an ENTRANCE sign
    const { x0: e0, x1: e1 } = welcome ? { x0: HUB.entranceDoor.x0 - 0.1, x1: HUB.entranceDoor.x1 + 0.1 } : HUB.entranceDoor;
    const door = new THREE.Group();
    const ew = e1 - e0;
    const leafMat = std('#e9ebee', { roughness: 0.45, metalness: 0.3 });
    const frame = std('#0d1a38', { roughness: 0.5, metalness: 0.4 });
    door.add(box(ew - 0.04, 2.08, 0.05, leafMat, 0, 0.12 + 1.04, 0));
    door.add(box(ew - 0.36, 0.9, 0.055, glass, 0, 1.55, 0));
    for (const x of [-ew / 2, ew / 2]) door.add(box(0.06, 2.16, 0.1, frame, x, 0.12 + 1.08, 0));
    door.add(box(ew + 0.12, 0.06, 0.1, frame, 0, 0.12 + 2.13, 0));
    door.add(box(0.04, 0.32, 0.04, std('#c9ccd0', { metalness: 0.9, roughness: 0.25 }), ew / 2 - 0.12, 1.1, 0.06));
    door.position.set((e0 + e1) / 2, 0, z1 + 0.03);
    g.add(door);
    // the arena's entrance is level, with no step (Jamie, 29 Oct 2026)
    if (!welcome) g.add(box(ew + 0.5, 0.11, 0.6, std('#9a9da1', { roughness: 0.9 }), (e0 + e1) / 2, 0.055, z1 + 0.3));
    // the arena's entrance sign is plain gold lettering, like the name (Jamie, 29 Oct 2026)
    const sign = welcome
      ? facePanel(1.1, 0.26, null, (cg, s2, w, h) => drawText(cg, s2, h, 'ENTRANCE', w / 2, h / 2, 0.15, COL.gold, w - 0.16), { ribs: false })
      : facePanel(1.1, 0.26, COL.gold, (cg, s2, w, h) => drawText(cg, s2, h, 'ENTRANCE', w / 2, h / 2, 0.17, COL.navy, w - 0.16), { ribs: false });
    g.add(place(sign, '+z', (e0 + e1) / 2, 2.41, z1 + 0.012));
    // ceiling lights inside the reception
    for (const z of [1.2, 5.0, 9.0]) {
      const l = new THREE.PointLight('#fff1dc', 2.4, 6, 1.5);
      l.position.set(cx, ch - 0.3, z);
      g.add(l);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e3', emissiveIntensity: 1.2 }));
      panel.rotation.x = Math.PI / 2;
      panel.position.set(cx, ch - 0.075, z);
      g.add(panel);
    }
  }
}

// storage kit for the other sports, sized to sit where a ball rack would (0.95 m wide along x, 0.45 m deep)
function dodgeCart() {
  // wheeled mesh cart heaped with foam dodgeballs
  const grp = new THREE.Group();
  const frame = std(COL.navy, { roughness: 0.5, metalness: 0.4 });
  const mesh = std('#1b1f27', { roughness: 0.8, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const [w, d, h, y0] = [0.9, 0.45, 0.62, 0.12];
  grp.add(box(w, 0.02, d, frame, 0, y0, 0));
  for (const sx of [-1, 1]) {
    grp.add(box(0.02, h, d, mesh, (sx * w) / 2, y0 + h / 2, 0));
    for (const sz of [-1, 1]) {
      grp.add(box(0.025, h, 0.025, frame, (sx * w) / 2, y0 + h / 2, (sz * d) / 2));
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), std('#0d0d0e', { roughness: 0.9 }));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(sx * (w / 2 - 0.05), 0.05, sz * (d / 2 - 0.05));
      grp.add(wheel);
    }
  }
  for (const sz of [-1, 1]) grp.add(box(w, h, 0.02, mesh, 0, y0 + h / 2, (sz * d) / 2));
  grp.add(box(w + 0.03, 0.025, 0.025, frame, 0, y0 + h, -d / 2), box(w + 0.03, 0.025, 0.025, frame, 0, y0 + h, d / 2));
  const cols = ['#e63946', '#2a7de1', COL.gold, '#3bb273', '#ff7a1a'];
  const geo = new THREE.SphereGeometry(0.09, 16, 12);
  const mats = cols.map((c) => std(c, { roughness: 0.75 }));
  let i = 0;
  for (const [y, n, dz] of [[0.25, 2, 0], [0.42, 2, 0], [0.59, 2, 0], [0.74, 1, 0]])
    for (let ix = 0; ix < 4; ix++)
      for (let iz = 0; iz < n; iz++) {
        const b = new THREE.Mesh(geo, mats[(i += 3) % mats.length]);
        b.position.set(-0.32 + ix * 0.21 + ((i * 7) % 5) * 0.008, y + y0 - 0.1 + ((i * 3) % 4) * 0.01, n === 1 ? dz : -0.1 + iz * 0.2);
        b.castShadow = true;
        grp.add(b);
      }
  return grp;
}
function sportsChair() {
  // a basketball wheelchair parked side-on: cambered wheels, low seat, small front casters
  const grp = new THREE.Group();
  const frame = std('#1b1f27', { roughness: 0.4, metalness: 0.6 });
  const tyre = std('#0d0d0e', { roughness: 0.9 });
  const rim = std('#c3c7cc', { roughness: 0.35, metalness: 0.7 });
  grp.add(box(0.42, 0.05, 0.42, std(COL.navy, { roughness: 0.7 }), 0, 0.5, 0));
  grp.add(box(0.42, 0.22, 0.04, std(COL.navy, { roughness: 0.7 }), 0, 0.66, -0.2));
  grp.add(box(0.46, 0.03, 0.5, frame, 0, 0.44, 0.05));
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.022, 10, 36), tyre);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.008, 6, 36), rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), rim);
    hub.rotation.x = Math.PI / 2;
    w.add(t, r, hub);
    w.rotation.y = Math.PI / 2;
    w.rotation.x = 0;
    w.rotation.z = sx * 0.28; // camber
    w.position.set(sx * 0.3, 0.3, -0.04);
    grp.add(w);
  }
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), tyre);
    c.rotation.z = Math.PI / 2;
    c.position.set(sx * 0.16, 0.035, 0.3);
    grp.add(c);
  }
  grp.traverse((m) => m.isMesh && (m.castShadow = true));
  return grp;
}
function racketShelf() {
  // four-tier shelf of children's pickleball and badminton paddles, ball tubs and the net bags
  const grp = new THREE.Group();
  const steel = std(COL.gold, { roughness: 0.45, metalness: 0.4 });
  const board = std('#d9dde2', { roughness: 0.7 });
  const [w, d] = [0.95, 0.42];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) grp.add(box(0.03, 1.6, 0.03, steel, (sx * w) / 2, 0.8, (sz * d) / 2));
  const levels = [0.12, 0.55, 0.98, 1.41];
  for (const y of levels) grp.add(box(w, 0.02, d, board, 0, y, 0));
  // bottom: two net bags
  const bag = std(COL.navy, { roughness: 0.8 });
  for (const x of [-0.22, 0.22]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.26, 0.34, 3, 0.06), bag);
    b.position.set(x, 0.26, 0);
    b.castShadow = true;
    grp.add(b, box(0.41, 0.04, 0.01, steel, x, 0.3, 0.172));
  }
  // middle shelves: paddles standing in a row, navy and gold
  const pad = [std(COL.navy, { roughness: 0.5 }), std(COL.gold, { roughness: 0.5 }), std('#2a7de1', { roughness: 0.5 })];
  const face = new RoundedBoxGeometry(0.016, 0.24, 0.19, 2, 0.006);
  const grip = new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8);
  for (const [li, y] of [[0, levels[1]], [1, levels[2]]])
    for (let k = 0; k < 9; k++) {
      const p = new THREE.Group();
      const f = new THREE.Mesh(face, pad[(k + li) % 3]);
      f.position.y = 0.24;
      const h = new THREE.Mesh(grip, std('#16181b', { roughness: 0.8 }));
      h.position.y = 0.07;
      p.add(f, h);
      p.position.set(-0.4 + k * 0.1, y + 0.01, 0);
      p.rotation.z = 0.08;
      grp.add(p);
    }
  // top: tubs of pickleballs and shuttlecocks
  for (const [x, c] of [[-0.25, '#d7e84a'], [0.05, '#ffffff'], [0.3, '#d7e84a']]) {
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.18, 20), std('#e9edf1', { roughness: 0.4, transparent: true, opacity: 0.55 }));
    tub.position.set(x, levels[3] + 0.1, 0);
    grp.add(tub);
    const ballM = std(c, { roughness: 0.7 });
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.037, 10, 8), ballM);
      const a = (k / 7) * Math.PI * 2;
      b.position.set(x + (k ? Math.cos(a) * 0.07 : 0), levels[3] + 0.21, k ? Math.sin(a) * 0.07 : 0);
      grp.add(b);
    }
  }
  return grp;
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

export class MicroArena {
  // Portable full-size goal, to the Net World Sports MicroArena listing: base 155 x 99 cm, 152 x 91 cm board
  // in 8 mm tempered glass with a 2.5 cm pad, 45 cm rim, rim 2.3 to 3.05 m, folds to 1.8 x 2.5 x 0.9 m to move.
  // The base is drawn shortened to 1.05 m so it fits in the 1.1 m run-off behind the baseline, assuming a
  // shorter base or a slight change to the end wall (Jamie, 26 Oct 2026). The reach from the base to the board
  // is not published: assumed so the board face sits 1.2 m inside the baseline.
  constructor(badge, bz0 = -1.07, baseLen = 1.05) {
    this.group = new THREE.Group();
    const black = std('#16181b', { roughness: 0.45, metalness: 0.5 });
    this.padMat = std(COL.navy, { roughness: 0.7 });
    this.face = DIM.boardZ10;
    // base: steel ballast box under a padded navy cover, wheels at the corners
    const bz1 = bz0 + baseLen;
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.99, 0.34, baseLen, 4, 0.06), this.padMat);
    base.position.set(0, 0.2, (bz0 + bz1) / 2);
    this.group.add(base);
    const wGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
    for (const x of [-0.45, 0.45])
      for (const z of [bz0 + 0.12, bz1 - 0.12]) {
        const w = new THREE.Mesh(wGeo, std('#0d0d0e', { roughness: 0.9 }));
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.06, z);
        this.group.add(w);
      }
    // everything above the base hinges at the foot of the post to fold back for moving
    this.rake = 0.1;
    this.poleZ = bz0 + 0.35;
    this.poleY = 0.37;
    this.upper = new THREE.Group();
    this.upper.position.set(0, this.poleY, this.poleZ);
    const inner = new THREE.Group();
    inner.position.set(0, -this.poleY, -this.poleZ);
    this.upper.add(inner);
    this.group.add(this.upper);
    const pole = new THREE.Group();
    pole.position.set(0, this.poleY, this.poleZ);
    pole.rotation.x = this.rake;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), black);
    post.position.y = 1.6;
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.27, 1.7, 0.27, 3, 0.04), this.padMat);
    pad.position.y = 0.85;
    pole.add(post, pad);
    inner.add(pole);
    // arms from the post to the board frame; they slide with the board as the height changes
    this.arms = [0, 1].flatMap((lvl) =>
      [-1, 1].map((side) => {
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 1), black);
        a.userData = { side, lvl };
        inner.add(a);
        return a;
      }),
    );
    // carriage: origin at rim height on the board face
    this.carriage = new THREE.Group();
    inner.add(this.carriage);
    const bw = 1.52;
    const bh = 0.91;
    // board frame behind the glass
    for (const x of [-0.3, 0.3]) this.carriage.add(box(0.06, 0.8, 0.06, black, x, 0.25, -0.18));
    for (const y of [-0.08, 0.6]) this.carriage.add(box(0.66, 0.05, 0.05, black, 0, y, -0.18));
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, 0.008),
      new THREE.MeshPhysicalMaterial({ color: '#cfe3e8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.4 }),
    );
    glass.position.set(0, -0.15 + bh / 2, -0.004);
    this.carriage.add(glass);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: boardDecal(bw, bh, 0.05, [0.59, 0.45, 0.15], badge && [badge, 0.3, 0.72]), transparent: true, roughness: 0.6 }),
    );
    decal.position.set(0, -0.15 + bh / 2, 0.0005);
    this.carriage.add(decal);
    // 2.5 cm pad along the bottom and up the sides of the board
    const bpad = new THREE.Mesh(new RoundedBoxGeometry(bw + 0.05, 0.05, 0.025, 2, 0.01), this.padMat);
    bpad.position.set(0, -0.17, -0.004);
    this.carriage.add(bpad);
    for (const sx of [-1, 1]) {
      const sp = new THREE.Mesh(new RoundedBoxGeometry(0.025, 0.36, 0.025, 2, 0.01), this.padMat);
      sp.position.set(sx * (bw / 2 + 0.0125), 0.02, -0.004);
      this.carriage.add(sp);
    }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.15), std(COL.rim, { roughness: 0.45, metalness: 0.4 }));
    plate.position.set(0, -0.02, 0.07);
    this.carriage.add(plate);
    const rn = rimAndNet();
    rn.position.set(0, 0, 0.151 + 0.2286);
    this.carriage.add(rn);
    shadowed(this.group);
    glass.castShadow = decal.castShadow = false;
    this.setHeight(10 * FT);
  }
  setPadding(color) {
    this.padMat.color.set(color);
  }
  setHeight(rim) {
    rim = THREE.MathUtils.clamp(rim, 7.5 * FT, 10 * FT);
    this.rimHeight = rim;
    this.carriage.position.set(0, rim, this.face);
    const back = this.face - 0.18;
    for (const a of this.arms) {
      const { side, lvl } = a.userData;
      const y = rim + (lvl ? 0.45 : -0.05);
      const zp = this.poleZ + Math.tan(this.rake) * (y - this.poleY);
      a.position.set(side * 0.2, y, (zp + back) / 2);
      a.scale.z = back - zp;
    }
  }
  // 0 up and playing, 1 folded back over the base to be wheeled about
  setFold(f) {
    this.upper.rotation.x = -f * THREE.MathUtils.degToRad(78);
  }
}

export const BUILD = {
  units: [0.8, 2.6, 4.4],
  drop: 2.6,
  rails: 7.4,
  ribs: 7.8,
  ribGap: 0.55,
  fabric: 12.8,
  fabricDur: 4.6,
  wallsSlam: 17.8,
  wallsEntrance: 19.0,
  doors: 20.8,
  fit: 22.8,
  rollerUp: 22.8,
  benches: 23.6,
  shutters: [26.0, 26.3], // containers 2 and 3
  hoops: 27.0, // the mini hoops roll out of containers 2 and 3
  hoopTravel: 6.0, // out of storage and up
  end: 35,
};

// the full installation for the covered-only version, one stage a day: containers craned in and set to the span,
// canopy over, end walls, then the floor laid under cover out of storage, fit-out, and the hoops out last
// (Jamie, 29 Oct 2026)
export const FULL_BUILD = {
  units: [0.8, 2.2, 3.6, 5.0],
  drop: 2.6,
  rails: 7.2,
  ribs: 7.6,
  ribGap: 0.55,
  fabric: 12.4,
  fabricDur: 4.6,
  wallsSlam: 18.0,
  wallsEntrance: 19.2,
  doors: 21.0,
  rollerUp: 22.0,
  shutters: [24.0, 40.0],
  floor: 25.0,
  floorSpan: 11.6,
  flight: 0.9,
  fit: 37.6,
  benches: 38.4,
  main: 40.6,
  mainTravel: 5.0,
  hoops: 40.6, // the hoops come out of storage once everything else is done
  hoopTravel: 6.0,
  end: 50,
};

// layout 'reception': the 40 ft reception on the left (Final Concept). layout 'storage': two 20 ft storage
// containers on each side, navy at the main hoop end and gold at the entrance end (Covered Concept)
// runoff: the run-off tile colour
// name: the name on the building ('HEROES ARENA' for the Covered Concept); roofs: one colour for every container
// roof, or each container's own colour when unset
export async function createPhase2(renderer, { logoUrl = 'assets/logo.png', markings = {}, mainHoop = 'megaSlam', fullBuild = false, layout = 'reception', runoff: runoffColor = HUB.runoff, name = 'HOOP HUB', roofs = null, shift = 0, pads = false, span = 0, arena = false } = {}) {
  setSpan(span);
  shiftHub(shift);
  const storage = layout === 'storage';
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
  const clouds = cloudDome();
  scene.add(clouds);
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
  // the full installation lays the run-off as panels too, on the court's grid, out from the Mega Slam end
  const floorPanels = [];
  if (fullBuild) {
    runoff.visible = false;
    const top = std(runoffColor, { roughness: 0.86 });
    const side = std(COL.border, { roughness: 0.9 });
    const gap = 0.004;
    const xs = [-HALF, -DIM.W / 2, ...Array.from({ length: DIM.panel.cols - 1 }, (_, i) => -DIM.W / 2 + (i + 1) * DIM.panel.w), DIM.W / 2, HALF];
    const zs = [HUB.z0, 0, 2, 4, 6, 8, 10, HUB.z1];
    for (let r = 0; r < zs.length - 1; r++)
      for (let c = 0; c < xs.length - 1; c++) {
        const inCourt = c > 0 && c < xs.length - 2 && r > 0 && r < zs.length - 2;
        if (inCourt) continue;
        const w = xs[c + 1] - xs[c];
        const d = zs[r + 1] - zs[r];
        const m = new THREE.Mesh(new THREE.BoxGeometry(w - gap, DIM.tileT, d - gap), [side, side, top, side, side, side]);
        m.receiveShadow = true;
        m.userData.home = new THREE.Vector3((xs[c] + xs[c + 1]) / 2, DIM.tileT / 2, (zs[r] + zs[r + 1]) / 2);
        m.position.copy(m.userData.home);
        scene.add(m);
        floorPanels.push(m);
      }
    floorPanels.push(...court.userData.panels);
    // laid row by row from the Mega Slam end, each row from the storage side across
    floorPanels.sort((a, b) => a.userData.home.z - b.userData.home.z || b.userData.home.x - a.userData.home.x);
  }
  // main hoop: the in-ground Mega Slam, or the portable MicroArena in the covered-only version
  const megaSlam = mainHoop === 'microArena' ? new MicroArena(art.roundNavy, HUB.shift ? HUB.z0 + 0.03 : undefined) : new MegaSlam(art.roundNavy);
  scene.add(megaSlam.group);
  let padLogoTex = null;
  if (art.logo) {
    const c = canvas(600, 290);
    c.getContext('2d').drawImage(art.logo, 0, 0, 600, 290);
    padLogoTex = tex(c);
  }
  // in a narrowed hub the mini hoop bases are drawn short so they fit the side run-off (Heroes Arena at 17 m)
  const rimLocal = 0.32 + 0.151 + 0.2286; // PortableHoop board face + rim offset, as in scene.js
  const miniBase = HALF < 9 ? Math.min(1.45, HALF - 0.04 - (DIM.W / 2 - 0.6 + rimLocal)) : undefined;
  const hoops = [new PortableHoop(art.roundNavy, miniBase), new PortableHoop(art.roundNavy, miniBase)];
  const finalX = hoops.map((hp, i) => (i ? 1 : -1) * (DIM.W / 2 - 0.6 + hp.rimLocal));
  hoops.forEach((hp, i) => {
    scene.add(hp.group);
    hp.group.position.set(finalX[i], 0, DIM.miniKeyZ);
    hp.group.rotation.set(0, i ? Math.PI : 0, 0);
  });

  // container wraps: navy with a gold stripe, or gold with a navy stripe, as Phase 1. Big logo and HOOP HUB
  // on the outsides, logos facing the court, round badges on the ends, the free-trial QR by the entrance
  const bigSide = (logo, ink, { logoAt = 0.27, textAt = 0.7, textW = 0.45 } = {}) => (g, s, w, h) => {
    stripe(g, s, w, h + 0.16, ink === COL.gold ? COL.gold : COL.navy);
    drawImg(g, s, h, logo, w * logoAt, 1.32, Math.min(3.6, w * 0.4));
    drawText(g, s, h, name, w * textAt, 1.32, 1.1, ink, w * textW);
  };
  const badge = (round, ink) => (g, s, w, h) => {
    stripe(g, s, w, h + 0.16, ink);
    drawImg(g, s, h, round, w / 2, 1.45, 1.3);
  };
  const courtLogo = (logo, ink) => (g, s, w, h) => {
    if (pads) {
      // wall pads cover the lower half, so the logo sits in the band above them
      if (logo) drawImg(g, s, h, logo, w / 2, PAD.h + 0.42, Math.min(2.9, w - 0.4, (0.9 * logo.width) / logo.height));
      return;
    }
    stripe(g, s, w, h + 0.16, ink);
    drawImg(g, s, h, logo, w / 2, 1.42, Math.min(2.9, w - 0.4));
  };
  // the free-trial QR panel on the reception's front end, beside the entrance door
  const qrPanel = (g, s, w, h) => {
    stripe(g, s, w, h + 0.16, COL.gold);
    const pw = 0.84;
    const px = 0.08;
    const y0 = 0.62; // panel bottom, clear of the stripe
    const y1 = 2.0;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(px * s, (h - y1) * s, pw * s, (y1 - y0) * s, 0.05 * s);
    g.fill();
    drawText(g, s, h, 'SCAN TO BOOK A', px + pw / 2, y1 - 0.13, 0.1, COL.navy, pw - 0.1);
    drawText(g, s, h, 'FREE TRIAL', px + pw / 2, y1 - 0.29, 0.16, COL.navy, pw - 0.1);
    drawImg(g, s, h, art.qr, px + pw / 2, y0 + 0.4, pw - 0.18);
  };
  const brand = {
    reception: {
      base: COL.navy,
      art,
      outer: bigSide(art.logo, COL.gold),
      endBack: badge(art.roundWhite, COL.gold),
      endFront: qrPanel,
    },
    c2: { base: COL.navy, outer: bigSide(art.logo, COL.gold), endBack: badge(art.roundWhite, COL.gold), court: courtLogo(art.logo, COL.gold) },
    // container 3 is navy outside like the rest, gold on the court side and roof (Jamie, 22 Oct 2026)
    c3: { base: COL.navy, courtBase: COL.gold, outer: bigSide(art.logo, COL.gold), endFront: badge(art.roundWhite, COL.gold), court: courtLogo(art.logoWhiteNavy, COL.navy) },
  };
  if (arena) {
    // arena look: plain containers with the gold stripe outside; the boards inside carry the brands
    // the containers' outer sides carry the name and strap line, as on the front, but no logos (Jamie, 29 Oct 2026)
    const plainSide = (g, s, w, h) => {
      stripe(g, s, w, h + 0.16, COL.gold);
      drawText(g, s, h, name, w / 2, 1.6, 0.62, COL.gold, Math.min(w - 0.8, 7));
      drawText(g, s, h, 'YOUR HOME COURT', w / 2, 1.04, 0.2, '#ffffff', Math.min(w - 0.8, 3));
    };
    // the gold stripe runs round every container end too, so the arena reads as one building (Jamie, 29 Oct 2026)
    const endStripe = (g, s2, w, h) => stripe(g, s2, w, h + 0.16, COL.gold);
    // one name per side: the far storage container just has the stripe
    brand.c2 = { base: COL.navy, outer: endStripe, endFront: endStripe, endBack: endStripe, court: () => {} };
    brand.c3 = { base: COL.navy, courtBase: COL.gold, outer: plainSide, endFront: endStripe, endBack: endStripe, court: () => {} };
    // the entrance end kept clean, no QR panel (Jamie, 29 Oct 2026)
    brand.reception = { base: COL.navy, art: {}, outer: plainSide, endFront: endStripe, endBack: endStripe, welcome: name };
  }
  // containers: 40 ft reception left (or two more storage containers), 20 ft navy and gold storage right, each
  // storage container with a 2.3 m roller shutter at its corner end, well clear of the portable hoops
  const storeUnit = (side, gold, b, kit) => {
    const { z0, z1 } = gold ? HUB.schoolStore : HUB.hhStore;
    const door = gold ? [z1 - 2.46, z1 - 0.16] : [z0 + 0.16, z0 + 2.46];
    const color = gold ? COL.gold : COL.navy;
    const unit = new Unit({ z0, z1, side, color, shell: COL.navy, roof: roofs ?? color, door, brand: b, kit });
    if (pads) {
      // velcro wall pads along the solid court side, in the other brand colour, clear of the shutter
      const [a, bz] = door[0] - z0 > z1 - door[1] ? [z0 + 0.06, door[0] - 0.1] : [door[1] + 0.1, z1 - 0.06];
      const n = Math.max(1, Math.round((bz - a) / PAD.w));
      const pw = (bz - a) / n;
      const mat = std(gold ? COL.navy : COL.gold, { roughness: 0.85 });
      const geo = new RoundedBoxGeometry(PAD.t, PAD.h, pw - 0.008, 3, 0.012);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(side * (HALF - PAD.t / 2 - 0.01), PAD.lift + PAD.h / 2, a + pw * (i + 0.5));
        m.castShadow = m.receiveShadow = true;
        unit.group.add(m);
      }
    }
    return unit;
  };
  const units = {
    ...(storage
      ? {
          // basketballs on the right, dodgeball carts and racket-sport kit on the left (Jamie, 26 Oct 2026)
          leftNavy: storeUnit(-1, false, brand.c2, ['dodgeball', 'dodgeball']),
          // the free-trial QR moves to the left gold container's entrance end
          leftGold: storeUnit(-1, true, { ...brand.c3, endFront: qrPanel }, ['rackets', 'rackets']),
        }
      : { reception: new Unit({ ...HUB.reception, side: -1, color: COL.navy, glazed: true, brand: brand.reception }) }),
    // with the reception on the left, the right-hand stores hold the other sports' kit too
    hhStore: storeUnit(1, false, brand.c2, arena && !storage ? ['balls', 'dodgeball'] : undefined),
    schoolStore: storeUnit(1, true, brand.c3, arena && !storage ? ['wheelchairs', 'rackets'] : undefined),
  };
  for (const un of Object.values(units)) scene.add(un.group);

  // 2D labels: small tags along each container, shown only in the 2D view
  const labels = new THREE.Group();
  const label = (text, x, z, bg, ink) => {
    const s = 200;
    const h = 0.52;
    const font = `700 ${0.25 * s}px Montserrat, sans-serif`;
    const probe = canvas(8, 8).getContext('2d');
    probe.font = font;
    const w = probe.measureText(text).width / s + 0.5;
    const c = canvas(Math.round(w * s), Math.round(h * s));
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(0, 0, c.width, c.height, c.height / 2);
    g.fill();
    g.fillStyle = ink;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false, depthTest: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 10;
    // reads up the screen, along the container
    const turn = new THREE.Group();
    turn.rotation.y = Math.PI / 2;
    turn.position.set(x, HUB.ch + 0.1, z);
    turn.add(m);
    labels.add(turn);
  };
  const lx = HALF + HUB.cw / 2;
  const navyTag = ['rgba(255, 255, 255, 0.92)', COL.navy];
  const goldTag = ['rgba(20, 38, 78, 0.9)', '#ffffff'];
  if (storage) {
    label('STORAGE 3', -lx, (HUB.hhStore.z0 + HUB.hhStore.z1) / 2, ...navyTag);
    label('STORAGE 4', -lx, (HUB.schoolStore.z0 + HUB.schoolStore.z1) / 2, ...goldTag);
  } else label('RECEPTION & VIEWING AREA', -lx, (HUB.reception.z0 + HUB.reception.z1) / 2, 'rgba(20, 38, 78, 0.88)', '#ffffff');
  label('STORAGE 1', lx, (HUB.hhStore.z0 + HUB.hhStore.z1) / 2, ...navyTag);
  label('STORAGE 2', lx, (HUB.schoolStore.z0 + HUB.schoolStore.z1) / 2, ...goldTag);
  scene.add(labels);

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
  const ribs = [];
  for (let k = 0; k < HUB.ribs; k++) {
    const rib = new THREE.Mesh(ribGeo, steel);
    ribs.push(rib);
    rib.position.z = THREE.MathUtils.lerp(HUB.z0 + 0.1, HUB.z1 - 0.1, k / (HUB.ribs - 1));
    rib.castShadow = true;
    archGroup.add(rib);
  }
  const rails = [-1, 1].map((s) => box(0.22, 0.14, LEN, steel, s * (HALF - 0.05), HUB.ch + 0.07, (HUB.z0 + HUB.z1) / 2));
  archGroup.add(...rails);
  enclosure.add(archGroup);

  // end walls: fabric, each with an outside and an inside face
  const walls = new THREE.Group();
  const wallMats = [];
  const wallFace = (z, outward, notches, { map, glow }) => {
    const mat = std('#ffffff', { map, roughness: 0.85, emissive: '#fff0d6', emissiveMap: glow, emissiveIntensity: 0 });
    wallMats.push(mat);
    const m = new THREE.Mesh(endWallShape(notches, outward < 0), mat);
    if (outward < 0) m.rotation.y = Math.PI;
    m.position.z = z;
    m.castShadow = m.receiveShadow = true;
    walls.add(m);
    return m;
  };
  const { w: rw, h: rh } = HUB.roller;
  const rollerNotch = [-rw / 2, rw / 2, rh];
  const tEntranceOut = endWallTexture('entrance-out', art, name, arena);
  const tEntranceIn = endWallTexture('entrance-in', art, name, arena);
  const tSlamIn = endWallTexture('slam-in', art, name, arena);
  const tSlamOut = endWallTexture('slam-out', art, name, arena);
  const entranceWalls = [wallFace(HUB.z1 + 0.005, 1, [rollerNotch], tEntranceOut), wallFace(HUB.z1 - 0.005, -1, [rollerNotch], tEntranceIn)];
  const fe1Notch = [HUB.fe1.x0, HUB.fe1.x1, HUB.fe1.h];
  const slamWalls = [wallFace(HUB.z0 + 0.005, 1, [fe1Notch], tSlamIn), wallFace(HUB.z0 - 0.005, -1, [fe1Notch], tSlamOut)];
  enclosure.add(walls);

  const roller = new RollerDoor();
  roller.group.position.z = HUB.z1;
  enclosure.add(roller.group);

  const fe1 = exitDoor(HUB.fe1.x1 - HUB.fe1.x0, HUB.fe1.h);
  fe1.position.set((HUB.fe1.x0 + HUB.fe1.x1) / 2, 0, HUB.z0);
  fe1.rotation.y = Math.PI; // opens outward, away from the court
  enclosure.add(fe1);

  // illuminated green exit signs over the fire exit, inside and out
  const exitTex = exitSignTexture();
  const exitSigns = [];
  for (const [z, ry] of [
    [HUB.z0 + 0.02, 0],
    [HUB.z0 - 0.02, Math.PI],
  ]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.2), new THREE.MeshStandardMaterial({ map: exitTex, emissive: '#ffffff', emissiveMap: exitTex, emissiveIntensity: 0.6 }));
    sign.position.set((HUB.fe1.x0 + HUB.fe1.x1) / 2, HUB.fe1.h + 0.28, z);
    sign.rotation.y = ry;
    exitSigns.push(sign);
    enclosure.add(sign);
  }

  // parents' benches along the reception windows, or with storage either side of the roller door
  const benches = new THREE.Group();
  const doorBenches = storage || arena;
  for (const [a, b] of doorBenches ? HUB.storageBenches : HUB.benches) {
    const bn = bench();
    if (doorBenches) {
      bn.rotation.y = Math.PI / 2;
      bn.position.set((a + b) / 2, 0, HUB.z1 - 0.45);
    } else bn.position.set(-HALF + 0.5, 0, (a + b) / 2);
    benches.add(shadowed(bn));
  }
  enclosure.add(benches);

  // arena boards: low, bright brand boards along the container court sides and both end walls
  const boards = new THREE.Group();
  if (arena) {
    const BH = 0.9;
    const order = ['hoop', 'pickle', 'dodge', 'arena'];
    let n = 0;
    const board = (w, x, z, rotY, kind = order[n++ % order.length]) => {
      const grp = new THREE.Group();
      grp.add(box(w + 0.04, BH + 0.04, 0.03, std(COL.navy, { roughness: 0.6 }), 0, 0, -0.016));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, BH), std('#ffffff', { map: boardTexture(kind, w, BH), roughness: 0.55 }));
      face.receiveShadow = true;
      grp.add(face);
      grp.position.set(x, 0.08 + BH / 2, z);
      grp.rotation.y = rotY;
      boards.add(grp);
    };
    // container court sides: the solid stretch of each container, away from its shutter
    for (const side of storage ? [-1, 1] : [1])
      for (const gold of [false, true]) {
        const { z0, z1 } = gold ? HUB.schoolStore : HUB.hhStore;
        const [a, b] = gold ? [z0 + 0.12, z1 - 2.46 - 0.12] : [z0 + 2.46 + 0.12, z1 - 0.12];
        board(b - a, side * (HALF - 0.04), (a + b) / 2, (-side * Math.PI) / 2);
      }
    // end walls: clear of the main hoop, the fire exit and the roller door
    // back wall: basketball, pickleball and dodgeball, evenly spaced left of the fire exit, in the same order
    // as the colour bar under the name (Jamie, 29 Oct 2026)
    const s0 = -HALF + 0.12;
    const gap = 0.6;
    const bw = (HUB.fe1.x0 - 0.15 - s0 - 2 * gap) / 3;
    ['hoop', 'pickle', 'dodge'].forEach((kind, i) => board(bw, s0 + bw / 2 + i * (bw + gap), HUB.z0 + 0.05, 0, kind));
    const rw = HUB.roller.w / 2 + 0.35;
    const mid = (-HALF + 0.12 - rw) / 2;
    const ent = [[-HALF + 0.12, mid - 0.08], [mid + 0.08, -rw], [rw, -mid - 0.08], [-mid + 0.08, HALF - 0.12]];
    for (const [a, b] of ent) board(b - a, (a + b) / 2, HUB.z1 - 0.05, Math.PI);
    enclosure.add(boards);
  }

  // sports kit: three children's nets across the middle for pickleball and badminton, and foam balls on the
  // halfway line for dodgeball; each set out only for its sport
  const nets = new THREE.Group();
  {
    const c = canvas(64, 64);
    const g = c.getContext('2d');
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    for (let i = 0; i <= 64; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 64);
      g.moveTo(0, i);
      g.lineTo(64, i);
      g.stroke();
    }
    const postMat = std('#22252a', { roughness: 0.4, metalness: 0.6 });
    const tape = std('#ffffff', { roughness: 0.6 });
    const edges = [-(W_IN), -2.6, 2.6, W_IN];
    for (const x of edges) {
      nets.add(box(0.05, 0.95, 0.05, postMat, x, 0.5, 5.0));
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 20), postMat);
      foot.position.set(x, 0.04, 5.0);
      nets.add(foot);
    }
    for (let i = 0; i < 3; i++) {
      const a = edges[i] + 0.03;
      const b = edges[i + 1] - 0.03;
      const t = tex(c, { repeat: [(b - a) / 0.05, 0.72 / 0.05] });
      // a see-through mesh: blended rather than cut out, so it stays a net from across the hall
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 0.72), new THREE.MeshStandardMaterial({ color: '#15171a', alphaMap: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1 }));
      mesh.position.set((a + b) / 2, 0.55, 5.0);
      nets.add(mesh);
      nets.add(box(b - a, 0.05, 0.012, tape, (a + b) / 2, 0.9, 5.0));
    }
    nets.traverse((o) => o.isMesh && (o.castShadow = true));
  }
  scene.add(nets);
  const BALL_COLS = ['#e53935', '#1e88e5', '#fbc02d', '#43a047', '#e53935', '#1e88e5'];
  const balls = BALL_COLS.map((col, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), std(col, { roughness: 0.85 }));
    m.castShadow = true;
    m.userData.z = 1.4 + i * 1.44;
    scene.add(m);
    return m;
  });

  const lamps = [];
  for (const x of HUB.lights.x)
    for (const z of HUB.lights.z) {
      const l = new HighBay(x, z);
      lamps.push(l);
      enclosure.add(l.group);
      // each high-bay throws a wide cone onto the floor (on at night)
      const spot = new THREE.SpotLight('#fff1dc', 0, 16, Math.PI / 3, 0.75, 1.3);
      spot.position.copy(l.group.position);
      spot.target.position.set(l.group.position.x, 0, l.group.position.z);
      l.spot = spot;
      enclosure.add(spot, spot.target);
    }

  // two floodlights on the door hood wash the HOOP HUB sign at night
  const signLights = [-1.6, 1.6].map((x) => {
    const l = new THREE.SpotLight('#fff1dc', 0, 7, 0.55, 0.6, 1.2);
    l.position.set(x, HUB.roller.h + 0.6, HUB.z1 + 0.7);
    l.target.position.set(x * 1.4, 5.5, HUB.z1);
    enclosure.add(l, l.target);
    return l;
  });

  // a small downlight over the reception entrance (or the QR panel in the storage layout), on at night
  const { x0: ex0, x1: ex1 } = HUB.entranceDoor;
  const ex = storage ? -(HALF + HUB.cw) + 0.16 + 0.5 : (ex0 + ex1) / 2;
  const lampUnit = storage ? units.leftGold : units.reception;
  const entranceLamp = new THREE.Group();
  entranceLamp.add(box(0.3, 0.07, 0.22, std('#2b2f35', { roughness: 0.5, metalness: 0.5 }), 0, 0, 0.11));
  const entranceLens = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.16), new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff1d6', emissiveIntensity: 0 }));
  entranceLens.rotation.x = Math.PI / 2;
  entranceLens.position.set(0, -0.036, 0.11);
  entranceLamp.add(entranceLens);
  entranceLamp.position.set(ex, HUB.ch + 0.04, HUB.reception.z1);
  lampUnit.group.add(entranceLamp);
  const entranceSpot = new THREE.SpotLight('#fff1dc', 0, 6, 0.9, 0.7, 1.2);
  entranceSpot.position.set(ex, HUB.ch - 0.02, HUB.reception.z1 + 0.14);
  entranceSpot.target.position.set(ex - 0.3, 0, HUB.reception.z1 + 1.2);
  lampUnit.group.add(entranceSpot, entranceSpot.target);

  // day and night
  const DAY = { bg: null, fog: '#c9d3dc', env: 0.55, hemi: ['#dfe8f2', '#4b4a46', 0.55], sun: ['#ffe2bd', 3.0], glow: ['#f3f6fa', 0.9], fabric: 0, lens: 0.6, spot: 0 };
  const NIGHT = { bg: '#0a1122', fog: '#0a1122', env: 0.05, hemi: ['#41557d', '#151515', 0.14], sun: ['#9fb4dc', 0.25], glow: ['#ffe9c4', 0.55], fabric: 0.42, lens: 4, spot: 14 };
  const setNight = (on) => {
    const m = on ? NIGHT : DAY;
    sky.visible = clouds.visible = !on;
    scene.background = m.bg ? new THREE.Color(m.bg) : null;
    scene.fog.color.set(m.fog);
    scene.environmentIntensity = m.env;
    hemi.color.set(m.hemi[0]);
    hemi.groundColor.set(m.hemi[1]);
    hemi.intensity = m.hemi[2];
    sun.color.set(m.sun[0]);
    sun.intensity = m.sun[1];
    glow.color.set(m.glow[0]);
    glow.intensity = m.glow[1];
    // the translucent fabric glows from the lights inside
    fabric.emissive.set('#fff1d6');
    fabric.emissiveIntensity = m.fabric;
    for (const w of wallMats) w.emissiveIntensity = m.fabric;
    for (const l of signLights) l.intensity = on ? 18 : 0;
    entranceSpot.intensity = on ? 9 : 0;
    entranceLens.material.emissiveIntensity = on ? 3 : 0;
    for (const l of lamps) {
      l.lens.material.emissiveIntensity = m.lens;
      l.spot.intensity = m.spot;
    }
  };

  // the build, in seconds of animation: containers craned in, frames up, fabric pulled over from the Mega Slam
  // end, end walls raised, doors fitted, then lights, benches and storage; the roller door opens last
  const ease = (u) => {
    u = THREE.MathUtils.clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
  };
  const land = (u) => 1 - Math.pow(1 - THREE.MathUtils.clamp(u, 0, 1), 3);
  const unitList = storage ? [units.leftNavy, units.leftGold, units.hhStore, units.schoolStore] : [units.reception, units.hhStore, units.schoolStore];
  const leftStores = storage ? [units.leftNavy, units.leftGold] : [];
  const tmp = new THREE.Vector3();
  const curve = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const hoopPaths = [
    storage
      ? // left hoop: out of the left gold container's shutter and along the run-off
        curve([[-(HALF + 0.4), 9.8], [-(HALF - 0.8), 8.9], [finalX[0], 6.8], [finalX[0], DIM.miniKeyZ]])
      : // left hoop: out of container 2's shutter and across the court to the reception side
        curve([[HALF + 1.9, 0.25], [HALF - 0.7, 0.6], [4.5, 2.4], [-2, 4.4], [finalX[0], DIM.miniKeyZ]]),
    // right hoop: out of container 3's shutter and along the run-off
    curve([[HALF + 0.4, 9.8], [HALF - 0.8, 8.9], [finalX[1], 6.8], [finalX[1], DIM.miniKeyZ]]),
  ];
  // 3x3 (arena look): the first portable hoop stands where the main hoop was, its board face 1.2 m inside the
  // baseline and the rim at full height; it faces down the court, so it turns a quarter as it arrives
  const spot3 = new THREE.Vector3(0, 0, DIM.boardZ10 - hoops[0].faceX);
  const from3 = hoopPaths[0].points[0];
  const path3 = curve([[from3.x, from3.z], [HALF - 0.7, 0.6], [2.5, 1.4], [0, spot3.z]]);
  const swap3 = curve([[finalX[0], DIM.miniKeyZ], [finalX[0] + 1.6, 3.6], [-1.6, 1.8], [0, spot3.z]]);
  // one hoop along a path: p runs 0 (folded in the storage) to 1 (out and up)
  const placeOne = (hp, p, path, turn = 0) => {
    const u = ease(p / 0.72);
    path.getPoint(u, tmp);
    hp.group.visible = true;
    hp.group.position.set(tmp.x, 0, tmp.z);
    if (turn) hp.group.rotation.y = turn * ease((u - 0.6) / 0.4);
    const up = ease((p - 0.8) / 0.2);
    hp.setFolded(up <= 0);
    if (up > 0) {
      hp.setHeight(portableRim());
      hp.setUnfold(up);
    }
  };
  // p runs 0 (folded in the storage) to 1 (out and up); played backwards to put them away
  const placeHoops = (p) => {
    if (arena && state.court3 >= 0.5) {
      placeOne(hoops[0], p, path3, -Math.PI / 2);
      hoops[1].group.visible = false;
      return;
    }
    hoops.forEach((hp, i) => {
      hp.group.rotation.y = i ? Math.PI : 0;
      placeOne(hp, p - i * 0.06, hoopPaths[i]);
    });
  };
  // mini court to 3x3 (c 0 to 1): the far hoop goes back into storage, the near one rolls to the 3x3 spot
  const placeCourt = (c) => {
    placeOne(hoops[1], 1 - THREE.MathUtils.clamp(c / 0.55, 0, 1), hoopPaths[1]);
    hoops[1].group.rotation.y = Math.PI;
    if (c >= 0.999) hoops[1].group.visible = false;
    const u = ease(THREE.MathUtils.clamp((c - 0.35) / 0.65, 0, 1));
    swap3.getPoint(u, tmp);
    const hp = hoops[0];
    hp.group.visible = true;
    hp.group.position.set(tmp.x, 0, tmp.z);
    hp.group.rotation.y = (-Math.PI / 2) * u;
    hp.setFolded(false);
    hp.setHeight(portableRim());
    hp.setUnfold(1);
  };
  const floorFrom = new THREE.Vector3(HALF + 0.4, 1.0, 0.2); // out of storage 1's shutter
  const mainPath = curve([[1.6, 22], [0.9, 13.5], [0.3, 5], [0, 0]]);
  const applyFloor = (t) => {
    const B = FULL_BUILD;
    const n = floorPanels.length;
    floorPanels.forEach((m, k) => {
      const ts = B.floor + (k * (B.floorSpan - B.flight)) / (n - 1);
      m.visible = t >= ts;
      const u = (t - ts) / B.flight;
      if (u >= 1 || !m.visible) m.position.copy(m.userData.home);
      else {
        const e = ease(u);
        m.position.lerpVectors(floorFrom, m.userData.home, e);
        m.position.y += Math.sin(Math.PI * e) * 0.9;
      }
    });
    court.userData.border.visible = t >= B.floor + B.floorSpan;
    // the main hoop is wheeled in at its lowest, then raised to the rim height
    const u = ease((t - B.main) / B.mainTravel);
    megaSlam.group.visible = t >= B.main;
    mainPath.getPoint(u, tmp);
    megaSlam.group.position.set(tmp.x, 0, tmp.z);
    const settle = t - B.main - B.mainTravel;
    megaSlam.setFold(1 - ease(settle / 1.4));
    megaSlam.setHeight(THREE.MathUtils.lerp(7.5 * FT, state.rimFt * FT, ease((settle - 1.2) / 1.2)));
  };
  const applyBuild = (t, building) => {
    const B = fullBuild ? FULL_BUILD : BUILD;
    if (fullBuild) applyFloor(t);
    unitList.forEach((un, i) => {
      const u = land((t - B.units[i]) / B.drop);
      un.group.visible = t >= B.units[i];
      un.group.position.y = 7 * (1 - u);
    });
    for (const r of rails) r.visible = t >= B.rails;
    ribs.forEach((rib, k) => {
      const u = ease((t - B.ribs - k * B.ribGap) / 1.1);
      rib.visible = u > 0;
      rib.scale.y = Math.max(u, 0.001);
      rib.position.y = HUB.ch * (1 - u);
    });
    const f = ease((t - B.fabric) / B.fabricDur);
    arch.visible = f > 0;
    arch.scale.z = Math.max(f, 0.001);
    arch.position.z = (HUB.z0 - 0.05) * (1 - f);
    for (const [list, at] of [
      [slamWalls, B.wallsSlam],
      [entranceWalls, B.wallsEntrance],
    ])
      for (const w of list) {
        const u = ease((t - at) / 1.8);
        w.visible = u > 0;
        w.scale.y = Math.max(u, 0.001);
      }
    roller.group.visible = roller.group.visible && t >= B.doors;
    fe1.visible = t >= B.doors;
    for (const sgn of exitSigns) sgn.visible = t >= B.doors;
    for (const l of lamps) l.group.visible = l.group.visible && t >= B.fit;
    benches.visible = t >= B.benches;
    boards.visible = t >= B.fit; // fitted with the lights, once the walls are in
    if (building) {
      roller.set(ease((t - B.rollerUp) / 2.0));
      units.hhStore.setDoors(ease((t - B.shutters[0]) / 1.6));
      units.schoolStore.setDoors(ease((t - B.shutters[1]) / 1.6));
      for (const un of leftStores) un.setDoors(ease((t - B.shutters[1]) / 1.6));
      for (const l of lamps) l.lens.material.emissiveIntensity = 0.6 * ease((t - B.fit) / 1.2);
      // mini hoops: folded inside the storage until the shutters are up, then rolled out and raised
      placeHoops((t - B.hoops) / B.hoopTravel);
      for (const hp of hoops) hp.group.visible = t >= B.hoops - 0.5; // stowed until their containers open
    }
  };

  // netsT and ballsT run 0 (away) to 1 (set out); mainLowT lowers the main hoop to its lowest for other sports
  const state = { mini: true, hoopsT: null, rimFt: 10, padding: 'navy', roller: 1, cutaway: false, storeDoors: 1, night: false, build: null, netsT: 0, ballsT: 0, mainLowT: 0, court3: 0 };
  const portableRim = () => THREE.MathUtils.clamp(state.rimFt * FT, 2.4, 3.05);
  const apply = (next = {}) => {
    Object.assign(state, next);
    megaSlam.setHeight(state.rimFt * FT);
    megaSlam.setPadding(COL.navy, padLogoTex);
    // mini hoops: out and up, put away in containers 2 and 3, or hoopsT part way between
    if (state.hoopsT !== null) placeHoops(state.hoopsT);
    else if (arena && state.court3 > 0 && state.mini) placeCourt(state.court3);
    else
      hoops.forEach((hp, i) => {
        hp.group.rotation.y = i ? Math.PI : 0;
        hp.group.visible = state.mini;
        hp.group.position.set(finalX[i], 0, DIM.miniKeyZ);
        hp.setFolded(false);
        hp.setHeight(portableRim());
        hp.setUnfold(1);
      });
    roller.set(state.roller);
    units.hhStore.setDoors(state.storeDoors);
    units.schoolStore.setDoors(state.storeDoors);
    for (const un of leftStores) un.setDoors(state.storeDoors);
    // top-down cutaway: lift the canopy and the reception roof off
    archGroup.visible = !state.cutaway;
    for (const l of lamps) l.group.visible = !state.cutaway;
    walls.visible = !state.cutaway;
    roller.group.visible = !state.cutaway;
    if (units.reception) units.reception.roof.visible = units.reception.ceil.visible = !state.cutaway;
    sun.castShadow = !state.cutaway; // a clean plan, without the canopy's missing shadow or the trees'
    setNight(state.night && state.build === null);
    for (const l of lamps) l.spot.visible = !state.cutaway;
    applyBuild(state.build ?? Infinity, state.build !== null);
    if (arena) megaSlam.group.visible = false;
    labels.visible = state.cutaway && state.build === null;
    if (state.build === null) {
      // sports kit: nets rise out of the floor, balls drop onto the halfway line one after another
      const n = ease(state.netsT);
      nets.visible = n > 0.01;
      nets.scale.y = Math.max(n, 0.001);
      balls.forEach((b, i) => {
        const u = THREE.MathUtils.clamp(state.ballsT * 1.6 - i * 0.12, 0, 1);
        b.visible = u > 0;
        b.position.set(0, 0.115 + 2.4 * (1 - land(u)), b.userData.z);
      });
      if (arena) {
        // no big main hoop in the arena: 3x3 uses a portable hoop instead
      } else if (state.mainLowT > 0) megaSlam.setHeight(THREE.MathUtils.lerp(state.rimFt * FT, 7.5 * FT, ease(state.mainLowT)));
    } else {
      nets.visible = false;
      for (const b of balls) b.visible = false;
    }
  };
  apply();
  return { scene, sun, megaSlam, hoops, units, roller, lamps, state, apply, FT, BUILD: fullBuild ? FULL_BUILD : BUILD };
}

// camera presets for the six Phase 2 shots in the brief; every shot starts from the default state
export const SHOTS = {
  1: { label: 'Outside', pos: [-13.5, 3.4, 27.5], target: [0.6, 2.6, 6.0], fov: 42, state: {} },
  2: { label: 'Inside', pos: [4.6, 1.8, 10.7], target: [-2.2, 2.0, 0.8], fov: 54, state: {} },
  3: { label: 'Top-down', ortho: { cx: 0, cz: 5, height: 16.6 }, state: { cutaway: true } },
  slam: { label: 'Mega Slam', pos: [-3.4, 2.5, 8.6], target: [0.1, 3.1, 0.2], fov: 44, state: {} },
  4: { label: 'Reception', pos: [2.2, 1.65, 6.4], target: [-9.6, 1.3, 4.6], fov: 46, state: { mini: false } },
  5: { label: 'Night', pos: [-11.5, 2.4, 25.5], target: [-0.6, 3.0, 5.5], fov: 42, state: { night: true } },
  6: { label: 'Billboard', pos: [17.5, 1.8, 20.5], target: [3.2, 2.5, 6.0], fov: 40, state: { roller: 0 } },
  // detail for signing off the portable main hoop (render with ?main=microArena)
  ma: { label: 'Main hoop', pos: [5.2, 1.7, 2.6], target: [0, 1.5, 0.1], fov: 46, state: {} },
  // looking back at the main hoop from just inside the entrance, for the run-off comparison
  end: { label: 'Main hoop end', pos: [3.2, 2.1, 9.9], target: [-0.4, 1.6, -1.0], fov: 50, state: {} },
  // detail for signing off the storage shutters
  door: { label: 'Entrance end', pos: [1.2, 2.2, 1.0], target: [0, 1.3, 11.0], fov: 56, state: {} },
  rec: { label: 'Reception', pos: [-9.05, 1.7, 10.4], target: [-10.0, 1.15, 0.6], fov: 64, state: {} },
  recIn: { label: 'Reception counter', pos: [-9.0, 1.55, 5.6], target: [-10.4, 1.0, 9.6], fov: 60, state: {} },
  recSeat: { label: 'Reception seats', pos: [-9.0, 1.6, 6.6], target: [-10.2, 1.4, 1.2], fov: 60, state: {} },
  s3: { label: 'Storage left', pos: [5.5, 2.4, 9.8], target: [-7.5, 1.2, 3.0], fov: 50, state: {} },
  kitA: { label: 'Basketball and dodgeball kit', pos: [4.6, 1.5, 1.9], target: [10.4, 0.9, 1.9], fov: 46, state: { mini: false } },
  kitB: { label: 'Wheelchairs and rackets', pos: [4.6, 1.5, 8.1], target: [10.4, 0.9, 8.1], fov: 46, state: { mini: false } },
  wc: { label: 'Accessible WC', pos: [-9.4, 1.6, 4.2], target: [-9.8, 1.2, -1.0], fov: 60, state: {} },
  s1: { label: 'Storage open', pos: [-5.5, 2.4, 9.8], target: [7.5, 1.2, 3.0], fov: 50, state: {} },
};
