// Phase 2 copy of the Phase 1 scene (frozen at 67a6f01). Shared parts for the enclosed hub in hub.js;
// the Phase 1 scene in ../scene.js is never edited for Phase 2.
// World axes: x runs along the 14.8 m baseline (-7.4 left .. +7.4 right, seen from the open end),
// z runs 10 m from the Mega Slam baseline (0) to the open end line (10), y is up. Metres.
// The cross-court mini court runs along x, between portable hoops on the two 10 m sidelines.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const COL = {
  navy: '#14264e',
  gold: '#fba91a',
  court: '#6e7276',
  key: '#a7a9ac',
  border: '#9a9da1',
  white: '#ffffff',
  tarmac: '#3b3d40',
  rim: '#e0531f',
};

export const DIM = {
  L: 10,
  W: 14.8,
  tileT: 0.015,
  lineW: 0.05,
  goldW: 0.04,
  basketZ: 1.575,
  boardZ10: 1.2,
  keyD: 5.8,
  keyW: 4.9,
  ftR: 1.8,
  arcR: 6.75,
  cornerIn: 1.0, // from the tile edge: 0.9 m in from the white sideline
  noChargeR: 1.25,
  whiteInset: 0.1, // gold mini-court boundary on the tile edge, white 3x3 boundary just inside it
  miniStart: 0,
  miniKeyZ: 5,
  miniKeyW: 2.5,
  miniKeyD: 2.75,
  miniFtR: 1.25,
  miniRimIn: 0.6,
  mini3R: 4.0,
  mini3CornerIn: 1.2,
  miniCircleR: 0.6,
  // logo image box (the PNG carries its own margin): open end, left of the halfway line
  logo: { x: -4.38, z: 8.27, w: 2.98 },
  borderW: 0.09,
  // 10 ft container, 2.99 x 2.44 x 2.59 m: the whole hub ships in it
  container: { x0: 3.5, x1: 6.49, z0: -4.44, z1: -2.0, h: 2.59 },
  // floor: 60 panels, 12 across the baseline x 5 deep, stored flat on a trolley
  panel: { w: 14.8 / 12, d: 2.0, cols: 12, rows: 5, pitch: 0.02 },
};

// Court markings as signed off by Hoop Heroes (21 Oct 2026): all keys light grey, and no
// no-charge semicircle, mini halfway line or centre circle, to keep the surface clean.
// lines: 'two-tone' = white 3x3 with a gold mini court and its own gold boundary;
// 'white' = every line white, one shared boundary on the edge of the floor
export const MARKINGS = { keyFill: COL.key, miniKeyFill: COL.key, halfway: false, noCharge: false, lines: 'two-tone' };

export const FT = 0.3048;
const PX = 400; // court texture pixels per metre

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function tex(c, { srgb = true, repeat, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

export function shadowed(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

// ---------------------------------------------------------------- court surface

// multi: the multi-sport floor (Covered Concept, floor markings plan 'multi-sport with 3x3'): every basketball
// line gold, the 3x3 key filled light grey, no white boundary or logo, a gold dodgeball halfway line and blue lines for three
// children's pickleball / badminton courts
export function paintCourt(logo, { keyFill = MARKINGS.keyFill, miniKeyFill = MARKINGS.miniKeyFill, halfway = MARKINGS.halfway, noCharge = MARKINGS.noCharge, lines = MARKINGS.lines, logoBox = DIM.logo, multi = false } = {}) {
  const allWhite = lines === 'white';
  const miniCol = allWhite ? COL.white : COL.gold;
  const { L, W } = DIM;
  const c = canvas(Math.round(W * PX), Math.round(L * PX));
  const g = c.getContext('2d');
  const X = (x) => (x + W / 2) * PX;
  const Z = (z) => z * PX;
  const rnd = mulberry(7);

  // large floor panels, each with a slightly different tone
  const pw = DIM.panel.w * PX;
  const pd = DIM.panel.d * PX;
  for (let ty = 0; ty < c.height; ty += pd) {
    for (let tx = 0; tx < c.width; tx += pw) {
      const v = 110 + Math.round((rnd() - 0.5) * 4);
      g.fillStyle = `rgb(${v},${v + 4},${v + 8})`;
      g.fillRect(tx, ty, pw + 1, pd + 1);
    }
  }
  // key fill
  const inset = allWhite ? 0 : DIM.whiteInset;
  g.fillStyle = keyFill;
  if (multi) g.fillRect(X(-DIM.keyW / 2), Z(DIM.goldW), DIM.keyW * PX, 5.8 * PX); // from the gold baseline
  else g.fillRect(X(-DIM.keyW / 2), Z(inset), DIM.keyW * PX, (DIM.keyD - inset) * PX);

  const stroke = (color, w, draw) => {
    g.strokeStyle = color;
    g.lineWidth = w * PX;
    g.lineCap = 'butt';
    g.beginPath();
    draw();
    g.stroke();
  };

  // gold mini court, under the white: boundary on the tile edge (optional halfway line and centre
  // circle), and at each end a key, free-throw semicircle and a small three-point line
  const gw = allWhite ? DIM.lineW : DIM.goldW;
  const gh = gw / 2;
  if (!allWhite) stroke(COL.gold, gw, () => g.rect(X(-W / 2 + gh), Z(gh), (W - gw) * PX, (L - gw) * PX));
  if (halfway) {
    stroke(miniCol, gw, () => {
      g.moveTo(X(0), Z(0));
      g.lineTo(X(0), Z(L));
    });
    stroke(miniCol, gw, () => g.arc(X(0), Z(DIM.miniKeyZ), DIM.miniCircleR * PX, 0, Math.PI * 2));
  }
  for (const s of [-1, 1]) {
    const edge = s * (W / 2);
    const inner = s * (W / 2 - DIM.miniKeyD);
    const z0 = DIM.miniKeyZ - DIM.miniKeyW / 2;
    g.fillStyle = miniKeyFill;
    g.fillRect(X(Math.min(edge, inner)), Z(z0), DIM.miniKeyD * PX, DIM.miniKeyW * PX);
    if (miniKeyFill !== miniCol)
      stroke(miniCol, gw, () => g.rect(X(Math.min(edge, inner)) + (s < 0 ? 0 : gh * PX), Z(z0 + gh), (DIM.miniKeyD - gh) * PX, (DIM.miniKeyW - gw) * PX));
    const a0 = s < 0 ? -Math.PI / 2 : Math.PI / 2;
    stroke(miniCol, gw, () => g.arc(X(inner), Z(DIM.miniKeyZ), DIM.miniFtR * PX, a0, a0 + Math.PI));
    // three-point line: straight corner lines parallel to the 14.8 m sides, then the arc
    const rimX = s * (W / 2 - DIM.miniRimIn);
    const dz = L / 2 - DIM.mini3CornerIn;
    const dx = Math.sqrt(DIM.mini3R ** 2 - dz ** 2);
    const ang = Math.atan2(dz, dx);
    stroke(miniCol, gw, () => {
      g.moveTo(X(edge), Z(DIM.miniKeyZ - dz));
      g.lineTo(X(rimX - s * dx), Z(DIM.miniKeyZ - dz));
      if (s < 0) g.arc(X(rimX), Z(DIM.miniKeyZ), DIM.mini3R * PX, -ang, ang);
      else g.arc(X(rimX), Z(DIM.miniKeyZ), DIM.mini3R * PX, Math.PI + ang, Math.PI - ang, true);
      g.lineTo(X(edge), Z(DIM.miniKeyZ + dz));
    });
  }

  if (multi) {
    // dodgeball halfway line
    stroke(COL.gold, gw, () => {
      g.moveTo(X(0), Z(gh));
      g.lineTo(X(0), Z(L - gh));
    });
    // 3x3 key and three-point line in gold, from the gold boundary as the baseline
    const kd = gw + 5.8 - gh;
    stroke(COL.gold, gw, () => {
      g.moveTo(X(-2.45 + gh), Z(gw));
      g.lineTo(X(-2.45 + gh), Z(kd));
      g.lineTo(X(2.45 - gh), Z(kd));
      g.lineTo(X(2.45 - gh), Z(gw));
    });
    stroke(COL.gold, gw, () => g.arc(X(0), Z(kd), (1.8 - gh) * PX, 0, Math.PI));
    const bz = gw + 1.575;
    const r3 = 6.75 - gh;
    const cx3 = W / 2 - gw - 0.9 - gh;
    const meet3 = bz + Math.sqrt(r3 ** 2 - cx3 ** 2);
    const a3 = Math.atan2(meet3 - bz, cx3);
    stroke(COL.gold, gw, () => {
      g.moveTo(X(-cx3), Z(gw));
      g.lineTo(X(-cx3), Z(meet3));
      g.arc(X(0), Z(bz), r3 * PX, Math.PI - a3, a3, true);
      g.lineTo(X(cx3), Z(gw));
    });
    // racket courts: inner sidelines at ±2.60, service lines 1.80 m either side of the net, centre lines
    const blue = '#2f9bdc';
    const rw = 0.04;
    const mid = (W / 2 - gh + 2.6) / 2;
    stroke(blue, rw, () => {
      for (const x of [-2.6, 2.6]) {
        g.moveTo(X(x), Z(gh));
        g.lineTo(X(x), Z(L - gh));
      }
      for (const z of [5 - 1.8, 5 + 1.8]) {
        g.moveTo(X(-W / 2 + gh), Z(z));
        g.lineTo(X(W / 2 - gh), Z(z));
      }
      for (const x of [-mid, mid]) {
        g.moveTo(X(x), Z(gh));
        g.lineTo(X(x), Z(5 - 1.8));
        g.moveTo(X(x), Z(5 + 1.8));
        g.lineTo(X(x), Z(L - gh));
      }
    });
  }

  // white 3x3 half court, its boundary set just inside the gold
  const lw = DIM.lineW;
  if (!multi) {
  const h = lw / 2;
  const b = inset + h; // centre of the white boundary lines
  stroke(COL.white, lw, () => g.rect(X(-W / 2 + b), Z(b), (W - 2 * b) * PX, (L - 2 * b) * PX));
  stroke(COL.white, lw, () => {
    g.moveTo(X(-DIM.keyW / 2 + h), Z(inset));
    g.lineTo(X(-DIM.keyW / 2 + h), Z(DIM.keyD - h));
    g.lineTo(X(DIM.keyW / 2 - h), Z(DIM.keyD - h));
    g.lineTo(X(DIM.keyW / 2 - h), Z(inset));
  });
  stroke(COL.white, lw, () => g.arc(X(0), Z(DIM.keyD - h), DIM.ftR * PX, 0, Math.PI));
  // two-point arc with straight corner lines
  const cx = W / 2 - DIM.cornerIn;
  const meet = DIM.basketZ + Math.sqrt(DIM.arcR ** 2 - cx ** 2);
  const ang = Math.atan2(meet - DIM.basketZ, cx);
  stroke(COL.white, lw, () => {
    g.moveTo(X(-cx), Z(inset));
    g.lineTo(X(-cx), Z(meet));
    g.arc(X(0), Z(DIM.basketZ), DIM.arcR * PX, Math.PI - ang, ang, true);
    g.lineTo(X(cx), Z(inset));
  });
  // no-charge semicircle with its short straight ends to the board line
  if (noCharge)
    stroke(COL.white, lw, () => {
    const r = DIM.noChargeR;
    g.moveTo(X(-r), Z(DIM.boardZ10));
    g.lineTo(X(-r), Z(DIM.basketZ));
    g.arc(X(0), Z(DIM.basketZ), r * PX, Math.PI, 0, true);
    g.lineTo(X(r), Z(DIM.boardZ10));
  });

  }

  // panel joints, faint, over everything
  g.strokeStyle = 'rgba(40,42,46,0.55)';
  g.lineWidth = 0.012 * PX;
  g.beginPath();
  for (let x = pw; x < c.width - 1; x += pw) {
    g.moveTo(x, 0);
    g.lineTo(x, c.height);
  }
  for (let y = pd; y < c.height - 1; y += pd) {
    g.moveTo(0, y);
    g.lineTo(c.width, y);
  }
  g.stroke();

  // logo at the open end, upright for someone standing there
  if (logo && !multi) {
    const { x, z, w } = logoBox;
    g.globalAlpha = 0.97;
    g.drawImage(logo, X(x), Z(z), w * PX, ((w * logo.height) / logo.width) * PX);
    g.globalAlpha = 1;
  }
  return c;
}

function tileBump() {
  const n = 256;
  const c = canvas(n, n);
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, n, n);
  // perforated grid
  g.fillStyle = '#4a4a4a';
  const step = n / 16;
  for (let y = step / 2; y < n; y += step)
    for (let x = step / 2; x < n; x += step) {
      g.beginPath();
      g.arc(x, y, step * 0.26, 0, Math.PI * 2);
      g.fill();
    }
  return tex(c, { srgb: false, repeat: [DIM.W / 0.3, DIM.L / 0.3] });
}

function bevelStrip(inner, outer, hIn, hOut, mat) {
  // ring around a rectangle, sloping from hIn at the tile edge to hOut at the outside
  const [x0, z0, x1, z1] = inner;
  const d = outer;
  const pIn = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const pOut = [
    [x0 - d, z0 - d],
    [x1 + d, z0 - d],
    [x1 + d, z1 + d],
    [x0 - d, z1 + d],
  ];
  const pos = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const a = [pIn[i][0], hIn, pIn[i][1]];
    const b = [pIn[j][0], hIn, pIn[j][1]];
    const c = [pOut[j][0], hOut, pOut[j][1]];
    const e = [pOut[i][0], hOut, pOut[i][1]];
    pos.push(...a, ...e, ...c, ...a, ...c, ...b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

export function buildCourt(logo, renderer, markings = {}) {
  // the court is laid as separate panels so the install can be shown panel by panel
  const grp = new THREE.Group();
  const { L, W, tileT } = DIM;
  const { w: pw, d: pd, cols, rows } = DIM.panel;
  const map = tex(paintCourt(logo, markings), { aniso: renderer.capabilities.getMaxAnisotropy() });
  const bump = tileBump();
  const top = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.86 });
  const side = std(COL.border, { roughness: 0.9 });
  const gap = 0.004;
  grp.userData.panels = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cx = -W / 2 + (c + 0.5) * pw;
      const cz = (r + 0.5) * pd;
      const geo = new THREE.BoxGeometry(pw - gap, tileT, pd - gap);
      // map the top face onto this panel's piece of the court artwork
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 8; i < 12; i++) uv.setXY(i, (cx + pos.getX(i) + W / 2) / W, 1 - (cz + pos.getZ(i)) / L);
      const m = new THREE.Mesh(geo, [side, side, top, side, side, side]);
      m.receiveShadow = true;
      m.castShadow = true;
      m.userData.home = new THREE.Vector3(cx, tileT / 2, cz);
      m.position.copy(m.userData.home);
      grp.add(m);
      grp.userData.panels.push(m);
    }
  grp.userData.border = bevelStrip([-W / 2, 0, W / 2, L], DIM.borderW, tileT, 0.002, side);
  grp.add(grp.userData.border);
  return grp;
}

// ---------------------------------------------------------------- playground

function tarmacTexture() {
  const n = 1024;
  const c = canvas(n, n);
  const g = c.getContext('2d');
  const rnd = mulberry(3);
  g.fillStyle = '#5a5d61';
  g.fillRect(0, 0, n, n);
  for (let i = 0; i < 60000; i++) {
    const v = 62 + Math.floor(rnd() * 50);
    g.fillStyle = `rgba(${v},${v + 1},${v + 3},${0.35 + rnd() * 0.4})`;
    const s = 1 + rnd() * 2.5;
    g.fillRect(rnd() * n, rnd() * n, s, s);
  }
  // soft weathering blotches
  for (let i = 0; i < 18; i++) {
    const x = rnd() * n;
    const y = rnd() * n;
    const r = 40 + rnd() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() > 0.5;
    gr.addColorStop(0, light ? 'rgba(140,142,144,0.07)' : 'rgba(20,20,22,0.07)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return c;
}

function playMarkings() {
  // faded hopscotch and number snake, no numbers or text
  const S = 60;
  const c = canvas(8 * S, 16 * S);
  const g = c.getContext('2d');
  g.lineWidth = 0.08 * S;
  g.strokeStyle = 'rgba(235,225,180,0.32)';
  // hopscotch
  const hx = 0.6 * S;
  let y = 1 * S;
  const sq = 0.6 * S;
  const rows = [1, 1, 2, 1, 2, 1, 1];
  for (const r of rows) {
    if (r === 1) g.strokeRect(hx + sq / 2, y, sq, sq);
    else {
      g.strokeRect(hx, y, sq, sq);
      g.strokeRect(hx + sq, y, sq, sq);
    }
    y += sq;
  }
  g.beginPath();
  g.arc(hx + sq, y + sq / 2, sq / 2, 0, Math.PI * 2);
  g.stroke();
  // number snake: wavy band of coloured blocks
  const cols = ['rgba(190,80,70,0.28)', 'rgba(80,120,180,0.28)', 'rgba(220,190,80,0.28)', 'rgba(90,150,100,0.28)'];
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const cy = 1.2 * S + t * 13.5 * S;
    const cx = 5.2 * S + Math.sin(t * Math.PI * 3) * 1.4 * S;
    g.fillStyle = cols[i % 4];
    g.beginPath();
    g.arc(cx, cy, 0.3 * S, 0, Math.PI * 2);
    g.fill();
  }
  // wear: knock back with tarmac-coloured speckle
  const rnd = mulberry(11);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.6})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 2 + rnd() * 4, 2 + rnd() * 4);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

function brickTexture() {
  const c = canvas(1024, 512);
  const g = c.getContext('2d');
  const rnd = mulberry(5);
  g.fillStyle = '#8d8478';
  g.fillRect(0, 0, c.width, c.height);
  const bw = 32;
  const bh = 12;
  for (let row = 0; row * bh < c.height; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < c.width; x += bw) {
      const r = 128 + Math.floor(rnd() * 30);
      g.fillStyle = `rgb(${r},${Math.floor(r * 0.48)},${Math.floor(r * 0.36)})`;
      g.fillRect(x + off + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  return c;
}

function schoolBlock() {
  // generic two-storey brick block, softly in the background, no signage
  const grp = new THREE.Group();
  const len = 46;
  const h = 7.6;
  const d = 12;
  const brick = tex(brickTexture(), { repeat: [len / 8, h / 4] });
  const wall = std('#ffffff', { map: brick, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, h, d), wall);
  body.position.y = h / 2;
  grp.add(body);
  // flat roof fascia
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.5, d + 0.4), std('#e9e7e1'));
  fascia.position.y = h + 0.2;
  grp.add(fascia);
  // windows
  const glass = std('#3c4b57', { roughness: 0.15, metalness: 0.3 });
  const frame = std('#f1f1ee');
  for (const fy of [1.1, 4.6]) {
    for (let x = -len / 2 + 2.5; x < len / 2 - 2; x += 3.6) {
      if (fy < 2 && Math.abs(x - 3.7) < 1.5) continue;
      const f = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 0.1), frame);
      f.position.set(x, fy + 0.95, d / 2 + 0.03);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 0.1), glass);
      gl.position.set(x, fy + 0.95, d / 2 + 0.06);
      grp.add(f, gl);
    }
  }
  // double doors
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 0.12), std('#33506b', { roughness: 0.5 }));
  door.position.set(3.7, 1.15, d / 2 + 0.05);
  grp.add(door);
  return shadowed(grp);
}

function house(w, d, h, roofCol, wallCol) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(wallCol, { roughness: 0.95 }));
  body.position.y = h / 2;
  const roofH = d * 0.42;
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2 - 0.3, 0);
  shape.lineTo(0, roofH);
  shape.lineTo(d / 2 + 0.3, 0);
  shape.lineTo(-d / 2 - 0.3, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: w + 0.4, bevelEnabled: false }), std(roofCol));
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-w / 2 - 0.2, h, 0);
  const win = std('#38444f', { roughness: 0.2 });
  for (const x of [-w / 4, w / 4])
    for (const y of [1.3, 3.9]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.1), win);
      m.position.set(x, y, d / 2 + 0.02);
      grp.add(m);
    }
  grp.add(body, roof);
  return grp;
}

function tree(seed, height = 9) {
  const rnd = mulberry(seed);
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, height * 0.5, 8), std('#4a3b2e', { roughness: 1 }));
  trunk.position.y = height * 0.25;
  grp.add(trunk);
  const leafMats = ['#45612c', '#506d33', '#5d7638', '#3f5728'].map((c) => std(c, { roughness: 1 }));
  for (let i = 0; i < 34; i++) {
    const r = 0.9 + rnd() * 1.1;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), leafMats[i % 4]);
    const a = rnd() * Math.PI * 2;
    const rad = Math.sqrt(rnd()) * height * 0.28;
    const y = height * 0.5 + rnd() * height * 0.42;
    m.position.set(Math.cos(a) * rad, y - (rad / (height * 0.28)) * height * 0.08, Math.sin(a) * rad);
    m.scale.set(1, 0.8, 1);
    grp.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, height * 0.35, 6), trunk.material);
    b.position.y = height * 0.5;
    b.rotation.set((rnd() - 0.5) * 1.1, 0, (rnd() - 0.5) * 1.1);
    grp.add(b);
  }
  return shadowed(grp);
}

function fenceRun(x0, z0, x1, z1, h = 2.4) {
  const grp = new THREE.Group();
  const len = Math.hypot(x1 - x0, z1 - z0);
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff';
  g.lineWidth = 9;
  for (let x = 0; x <= 128; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  for (let y = 0; y <= 256; y += 128) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y);
    g.stroke();
  }
  const alpha = tex(c, { srgb: false, repeat: [len / 0.2, h / 0.4] });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(len, h),
    std('#2f5d3a', { alphaMap: alpha, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.7 }),
  );
  mesh.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  mesh.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  grp.add(mesh);
  const postMat = std('#284f32', { roughness: 0.6 });
  const n = Math.ceil(len / 2.5);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, h + 0.1, 0.08), postMat);
    p.position.set(x0 + (x1 - x0) * t, (h + 0.1) / 2, z0 + (z1 - z0) * t);
    p.castShadow = true;
    grp.add(p);
  }
  return grp;
}

export function buildSurroundings() {
  const grp = new THREE.Group();
  const tm = tex(tarmacTexture(), { repeat: [24, 24] });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(96, 96), std('#ffffff', { map: tm, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 4);
  ground.receiveShadow = true;
  grp.add(ground);
  // grass beyond the playground
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std('#5c7340', { roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grp.add(grass);

  const pm = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 16),
    std('#ffffff', { map: tex(playMarkings()), transparent: true, roughness: 0.95, depthWrite: false }),
  );
  pm.rotation.x = -Math.PI / 2;
  pm.position.set(-16.6, 0.004, 5);
  pm.receiveShadow = true;
  grp.add(pm);

  grp.add(fenceRun(-20, -12, 22, -12));
  grp.add(fenceRun(-20, -12, -20, 26));
  grp.add(fenceRun(22, -12, 22, 26));

  const school = schoolBlock();
  school.position.set(-4, 0, -22);
  grp.add(school);

  const trees = [
    [-17, -9, 1, 10],
    [16, -16, 2, 11],
    [-24, 14, 3, 12],
    [26, 8, 4, 10],
    [30, -6, 6, 12],
    [-30, -4, 8, 11],
  ];
  for (const [x, z, s, h] of trees) {
    const t = tree(s, h);
    t.position.set(x, 0, z);
    grp.add(t);
  }
  const houses = [
    [-40, -55, '#5a3d33', '#b9a58c'],
    [-26, -58, '#4b4d52', '#c9b79d'],
    [-12, -60, '#5a3d33', '#a88d73'],
    [10, -58, '#4b4d52', '#c2ad90'],
    [26, -56, '#5a3d33', '#b49b80'],
    [44, -52, '#4b4d52', '#c9b79d'],
    [52, -20, '#5a3d33', '#b9a58c'],
    [-52, -24, '#4b4d52', '#a88d73'],
  ];
  for (const [x, z, roof, wall] of houses) {
    const hs = house(8, 7, 5.4, roof, wall);
    hs.position.set(x, 0, z);
    hs.lookAt(0, 0, 4);
    grp.add(hs);
  }
  return grp;
}

// ---------------------------------------------------------------- hoops

function netTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  for (let i = -128; i <= 256; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 128, 128);
    g.moveTo(i, 128);
    g.lineTo(i + 128, 0);
    g.stroke();
  }
  return tex(c, { srgb: false, repeat: [4, 1] });
}

let NET_ALPHA;
export function rimAndNet(radius = 0.2286) {
  const grp = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 10, 40), std(COL.rim, { roughness: 0.45, metalness: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  grp.add(rim);
  NET_ALPHA ??= netTexture();
  const net = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.62, 0.42, 24, 1, true),
    std('#f4f4f4', { alphaMap: NET_ALPHA, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 }),
  );
  net.position.y = -0.21;
  net.castShadow = true;
  grp.add(net);
  return grp;
}

export function boardDecal(w, h, borderW, box, badge) {
  const s = 300;
  const c = canvas(Math.round(w * s), Math.round(h * s));
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff';
  g.lineWidth = borderW * s;
  g.strokeRect((borderW * s) / 2, (borderW * s) / 2, c.width - borderW * s, c.height - borderW * s);
  if (box) {
    const [bw, bh, bottom] = box;
    g.strokeRect(((w - bw) / 2) * s + (borderW * s) / 2, (h - bottom - bh) * s, bw * s - borderW * s, bh * s);
  }
  if (badge) {
    // round logo centred above the target box: [image, diameter, height of its centre above the board bottom]
    const [im, dia, cy] = badge;
    g.drawImage(im, ((w - dia) / 2) * s, (h - cy - dia / 2) * s, dia * s, dia * s);
  }
  return tex(c);
}

export class MegaSlam {
  // In-ground Mega Slam 72. Parallelogram arms: board face sits 1.22 m off the post at 10 ft,
  // about 1.52 m at 7.5 ft, so the rim travels onto the court as it is lowered.
  constructor(badge) {
    this.group = new THREE.Group();
    this.L = 1.3;
    this.d = 0.25;
    this.postFront = -0.02;
    this.h0 = 3.05 - this.L * Math.sqrt(1 - ((DIM.boardZ10 - this.postFront - this.d) / this.L) ** 2);
    const black = std('#16181b', { roughness: 0.45, metalness: 0.5 });
    this.padMat = std(COL.gold, { roughness: 0.7 });
    const postW = 0.152;
    const postD = 0.203;
    const postH = 2.75;
    const post = new THREE.Mesh(new THREE.BoxGeometry(postW, postH, postD), black);
    post.position.set(0, postH / 2, this.postFront - postD / 2);
    this.group.add(post);
    // padding around the post, with a small logo panel
    const pad = new THREE.Mesh(new RoundedBoxGeometry(postW + 0.1, 1.8, postD + 0.1, 3, 0.03), this.padMat);
    pad.position.set(0, 0.9, this.postFront - postD / 2);
    this.group.add(pad);
    this.padLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.116), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.7 }));
    this.padLogo.position.set(0, 1.45, this.postFront + 0.001 + 0.05);
    this.group.add(this.padLogo);
    // padded base cover over the gussets
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.22, 0.62, 3, 0.05), this.padMat);
    base.position.set(0, 0.11, this.postFront - postD / 2);
    this.group.add(base);
    // crank handle on the post side
    const crankBox = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.12), black);
    crankBox.position.set(postW / 2 + 0.03, 2.05, this.postFront - postD / 2);
    const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), std('#9aa0a6', { metalness: 0.8, roughness: 0.3 }));
    crank.rotation.z = Math.PI / 2;
    crank.position.set(postW / 2 + 0.2, 2.02, this.postFront - postD / 2 + 0.05);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), black);
    knob.position.set(postW / 2 + 0.34, 1.97, this.postFront - postD / 2 + 0.05);
    this.group.add(crankBox, crank, knob);

    // moving parts
    this.arms = [];
    const armGeo = new THREE.BoxGeometry(0.05, 0.08, 1);
    for (const side of [-1, 1])
      for (const lvl of [0, 1]) {
        const a = new THREE.Mesh(armGeo, black);
        a.userData = { side, lvl };
        this.arms.push(a);
        this.group.add(a);
      }
    this.carriage = new THREE.Group();
    this.group.add(this.carriage);
    // board frame behind the glass
    const bw = 1.829;
    const bh = 1.067;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), black);
    for (const s of [-1, 1]) {
      const f = frame.clone();
      f.position.set(s * 0.3, 0.25, -0.2);
      this.carriage.add(f);
    }
    const braceGeo = new THREE.BoxGeometry(0.66, 0.05, 0.05);
    for (const y of [-0.1, 0.65]) {
      const b = new THREE.Mesh(braceGeo, black);
      b.position.set(0, y, -0.2);
      this.carriage.add(b);
    }
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.2), black);
    strut.position.set(0, 0.3, -0.1);
    this.carriage.add(strut);
    // glass board: carriage origin is at rim height on the board face
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, 0.0127),
      new THREE.MeshPhysicalMaterial({ color: '#cfe3e8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.4 }),
    );
    glass.position.set(0, -0.15 + bh / 2, -0.0064);
    this.carriage.add(glass);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.02, bh + 0.02, 0.008), std('#b9c0c4', { metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0 }));
    edge.position.copy(glass.position);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: boardDecal(bw, bh, 0.05, [0.59, 0.45, 0.15], badge && [badge, 0.36, 0.83]), transparent: true, roughness: 0.6 }),
    );
    decal.position.set(0, -0.15 + bh / 2, 0.0005);
    this.carriage.add(decal);
    // bottom edge pad
    const bpad = new THREE.Mesh(new RoundedBoxGeometry(bw + 0.04, 0.06, 0.06, 2, 0.02), this.padMat);
    bpad.position.set(0, -0.15 - 0.02, -0.01);
    this.carriage.add(bpad);
    for (const s of [-1, 1]) {
      const sp = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.4, 0.06, 2, 0.02), this.padMat);
      sp.position.set(s * (bw / 2 + 0.01), -0.15 + 0.18, -0.01);
      this.carriage.add(sp);
    }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.15), std(COL.rim, { roughness: 0.45, metalness: 0.4 }));
    plate.position.set(0, -0.02, 0.07);
    this.carriage.add(plate);
    const rn = rimAndNet();
    rn.position.set(0, 0, 0.151 + 0.2286);
    this.carriage.add(rn);
    shadowed(this.group);
    glass.castShadow = false;
    decal.castShadow = false;
    this.setHeight(10 * FT);
  }

  setPadding(color, logoTex) {
    this.padMat.color.set(color);
    if (logoTex) {
      this.padLogo.material.map = logoTex;
      this.padLogo.material.needsUpdate = true;
    }
  }

  setHeight(rim) {
    rim = THREE.MathUtils.clamp(rim, 5 * FT, 10 * FT);
    const s = (rim - this.h0) / this.L;
    const c = Math.sqrt(1 - s * s);
    const reach = this.L * c;
    this.overhang = this.d + reach;
    this.rimHeight = rim;
    const face = this.postFront + this.overhang;
    this.carriage.position.set(0, rim, face);
    const ang = Math.asin(s);
    for (const a of this.arms) {
      const { side, lvl } = a.userData;
      const off = lvl ? 0.3 : -0.2;
      const y0 = this.h0 + off;
      a.position.set(side * 0.12, y0 + (this.L * s) / 2, this.postFront + reach / 2);
      a.rotation.set(-ang, 0, 0);
      a.scale.z = this.L;
    }
    this.boardFace = face;
  }
}

export class PortableHoop {
  // Tarmak B900 Box style: wheeled ballast base outside the tiles, board facing across the court.
  // baseLen shortens the base for tight run-off (drawn short in the 17 m Heroes Hub; real base 1.45 m)
  constructor(badge, baseLen = 1.45) {
    this.faceX = 0.32; // board face forward of the base front edge [ASSUMED]
    this.braceX = -baseLen + 0.25;
    this.rimLocal = this.faceX + 0.151 + 0.2286;
    this.group = new THREE.Group();
    this.out = new THREE.Group();
    this.folded = new THREE.Group();
    this.group.add(this.out, this.folded);
    const body = std('#1b1d20', { roughness: 0.55 });
    const grey = std('#5d6166', { roughness: 0.5, metalness: 0.4 });
    const tyre = std('#0d0d0e', { roughness: 0.9 });
    // local axes: +x points onto the court (board faces +x). Base 1.45 x 0.77.
    const makeBase = (grp) => {
      const base = new THREE.Mesh(new RoundedBoxGeometry(baseLen, 0.3, 0.77, 4, 0.08), body);
      base.position.set(-baseLen / 2, 0.2, 0);
      grp.add(base);
      const wGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18);
      for (const wx of [-baseLen + 0.15, -baseLen / 2, -0.16])
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(wGeo, tyre);
          w.rotation.x = Math.PI / 2;
          w.position.set(wx, 0.11, s * 0.41);
          grp.add(w);
        }
    };
    makeBase(this.out);
    makeBase(this.folded);
    // ballast filler cap on the base top
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), grey);
    cap.position.set(-baseLen + 0.33, 0.36, 0);
    this.out.add(cap);
    // upright near the front of the base, slightly raked, with a rear brace and two arms to the board
    this.mast = new THREE.Group();
    this.mast.position.set(-0.42, 0.35, 0);
    const mastInner = new THREE.Group();
    mastInner.position.set(0.42, -0.35, 0);
    this.mast.add(mastInner);
    this.out.add(this.mast);
    this.pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), grey);
    this.brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), grey);
    mastInner.add(this.pole, this.brace);
    this.armU = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), grey);
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), grey);
    mastInner.add(this.armU, this.armL);
    this.board = new THREE.Group();
    const bw = 1.32;
    const bh = 0.78;
    const pc = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, bh, bw),
      new THREE.MeshPhysicalMaterial({ color: '#d7e3ea', transparent: true, opacity: 0.35, roughness: 0.15 }),
    );
    pc.position.set(-0.01, bh / 2 - 0.15, 0);
    const frameMat = std('#2a2c30', { roughness: 0.5 });
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.035, bh + 0.04, bw + 0.04), frameMat);
    fr.position.copy(pc.position);
    fr.position.x = -0.03;
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: boardDecal(bw, bh, 0.04, [0.5, 0.36, 0.12], badge && [badge, 0.25, 0.62]), transparent: true }),
    );
    decal.rotation.y = Math.PI / 2;
    decal.position.set(0.001, bh / 2 - 0.15, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.5), frameMat);
    back.position.set(-0.06, 0.2, 0);
    this.board.add(fr, pc, decal, back);
    fr.visible = false;
    const edges = [
      [0, bh / 2 + 0.005, bw + 0.04, 0.03],
      [0, -bh / 2 - 0.005, bw + 0.04, 0.03],
      [bw / 2 + 0.005, 0, 0.03, bh],
      [-bw / 2 - 0.005, 0, 0.03, bh],
    ];
    for (const [z, y, w, h] of edges) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, w), frameMat);
      e.position.set(-0.012, bh / 2 - 0.15 + y, z);
      this.board.add(e);
    }
    const rn = rimAndNet();
    rn.position.set(0.15 + 0.2286, 0, 0);
    this.board.add(rn);
    mastInner.add(this.board);
    // folded: pole tilted back along the base, board lying flat on top, long side along the base
    const fPole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.12), grey);
    fPole.position.set(-0.7, 0.42, 0);
    const fBoard = new THREE.Group();
    fBoard.add(new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.02, 0.78), pc.material));
    for (const [w, d, x, z] of [
      [1.36, 0.03, 0, 0.405],
      [1.36, 0.03, 0, -0.405],
      [0.03, 0.78, 0.675, 0],
      [0.03, 0.78, -0.675, 0],
    ]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), frameMat);
      e.position.set(x, 0, z);
      fBoard.add(e);
    }
    const fRim = rimAndNet();
    fRim.children[1].visible = false;
    fRim.position.set(0.3, 0.03, 0);
    fBoard.add(fRim);
    fBoard.position.set(-0.72, 0.62, 0);
    const fBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.6), frameMat);
    fBack.position.set(-0.72, 0.56, 0);
    this.folded.add(fPole, fBoard, fBack);
    shadowed(this.group);
    this.setHeight(2.6);
    this.setFolded(false);
  }

  // 1 = standing, 0 = mast laid back over the base
  setUnfold(f) {
    this.mast.rotation.z = (1 - f) * 1.35;
  }

  setFolded(f) {
    this.out.visible = !f;
    this.folded.visible = f;
  }

  setHeight(rim) {
    const faceX = this.faceX;
    this.board.position.set(faceX, rim, 0);
    const beam = (mesh, x0, y0, x1, y1) => {
      mesh.scale.y = Math.hypot(x1 - x0, y1 - y0);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      mesh.rotation.z = -Math.atan2(x1 - x0, y1 - y0);
    };
    const poleBase = [-0.42, 0.35];
    const poleTop = [-0.3, rim + 0.35];
    beam(this.pole, ...poleBase, ...poleTop);
    const at = (y) => poleBase[0] + ((poleTop[0] - poleBase[0]) * (y - poleBase[1])) / (poleTop[1] - poleBase[1]);
    beam(this.brace, this.braceX, 0.36, at(1.5), 1.5);
    for (const [arm, dy] of [
      [this.armU, 0.28],
      [this.armL, -0.02],
    ]) {
      const x0 = at(rim + dy);
      const x1 = faceX - 0.06;
      arm.scale.x = x1 - x0;
      arm.position.set((x0 + x1) / 2, rim + dy, 0);
    }
  }
}

// ---------------------------------------------------------------- container

// Container wraps: each is a billboard - huge logo and tagline on the long sides,
// a QR code and call to action on the doors, the round logo on the far end.
export const WRAPS = {
  navy: { base: COL.navy, stripe: COL.gold, ink: COL.gold, logo: 'logo', round: 'roundWhite' },
  gold: { base: COL.gold, stripe: COL.navy, ink: COL.navy, logo: 'logoWhiteNavy', round: 'roundNavy' },
};

export function fitText(g, text, font, px, maxW) {
  g.font = `${px}px ${font}`;
  const w = g.measureText(text).width;
  if (w > maxW) g.font = `${(px * maxW) / w}px ${font}`;
}

function containerFace(w, h, wrap, art, kind) {
  const s = 300;
  const c = canvas(Math.round(w * s), Math.round(h * s));
  const g = c.getContext('2d');
  const W = c.width;
  const Y = (m) => m * s; // metres down from the top edge
  g.fillStyle = wrap.base;
  g.fillRect(0, 0, W, c.height);
  // stripe low down on every face
  g.fillStyle = wrap.stripe;
  g.fillRect(0, Y(h - 0.5), W, Y(0.16));
  const img = (im, x, y, iw) => im && g.drawImage(im, x * s, y * s, iw * s, ((iw * im.height) / im.width) * s);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  if (kind === 'side') {
    img(art[wrap.logo], 0.04, 0.04, w - 0.08);
    g.fillStyle = wrap.ink;
    // the hub's name, big, between the logo and the stripe
    fitText(g, 'HOOP HUB', '"Lilita One", sans-serif', Y(0.5), W - Y(0.3));
    g.fillText('HOOP HUB', W / 2, Y(h - 0.64));
  } else if (kind === 'end') {
    img(art[wrap.round], (w - 1.3) / 2, 0.2, 1.3);
  } else if (kind === 'doorLogo') {
    // artwork kept between the two locking bars (0.18 m in from each edge)
    img(art[wrap.round], (w - 0.6) / 2, 0.3, 0.6);
    g.fillStyle = wrap.ink;
    fitText(g, 'HOOP HEROES', '"Lilita One", sans-serif', Y(0.13), Y(0.6));
    g.fillText('HOOP HEROES', W / 2, Y(1.32));
  } else if (kind === 'doorQr') {
    // white panel so the code scans on either wrap
    const pw = 0.6;
    const px = (w - pw) / 2;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(px * s, Y(0.12), pw * s, Y(1.25), Y(0.06));
    g.fill();
    g.fillStyle = COL.navy;
    fitText(g, 'SCAN TO BOOK A', '"Lilita One", sans-serif', Y(0.11), (pw - 0.1) * s);
    g.fillText('SCAN TO BOOK A', W / 2, Y(0.3));
    fitText(g, 'FREE TRIAL', '"Lilita One", sans-serif', Y(0.16), (pw - 0.1) * s);
    g.fillText('FREE TRIAL', W / 2, Y(0.48));
    img(art.qr, px + 0.06, 0.56, pw - 0.12);
  }
  return tex(c);
}

export function corrugation(w, h) {
  const c = canvas(64, 8);
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#202020');
  gr.addColorStop(0.25, '#e0e0e0');
  gr.addColorStop(0.5, '#e0e0e0');
  gr.addColorStop(0.75, '#202020');
  gr.addColorStop(1, '#202020');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 8);
  return tex(c, { srgb: false, repeat: [w / 0.28, 1] });
}

function basketballTexture() {
  const c = canvas(512, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#c8561e';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#1a1210';
  g.lineWidth = 5;
  for (const x of [0, 128, 256, 384, 512]) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, 128);
  g.lineTo(512, 128);
  g.stroke();
  for (const cx of [64, 320]) {
    g.beginPath();
    g.ellipse(cx, 128, 40, 128, 0, 0, Math.PI * 2);
    g.stroke();
  }
  return tex(c);
}

let BALL_MAT;
function ball() {
  BALL_MAT ??= std('#ffffff', { map: basketballTexture(), roughness: 0.75 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), BALL_MAT);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// gold ball rack, 0.95 x 0.4 x 1.5 m, four shelves of four balls; long side along local x
export function ballRack() {
  const goldM = std(COL.gold, { roughness: 0.45, metalness: 0.4 });
  const rail = (len, axis) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 8), goldM);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.castShadow = true;
    return m;
  };
  const rack = new THREE.Group();
  const rw = 0.95;
  const rd = 0.4;
  const rh = 1.5;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const r = rail(rh, 'y');
      r.position.set((sx * rw) / 2, rh / 2 + 0.05, (sz * rd) / 2);
      rack.add(r);
    }
  const shelves = [0.1, 0.45, 0.8, 1.15];
  for (const y of [...shelves, 1.5]) {
    for (const sz of [-1, 1]) {
      const r = rail(rw, 'x');
      r.position.set(0, y, (sz * rd) / 2);
      rack.add(r);
    }
    for (const sx of [-1, 1]) {
      const r = rail(rd, 'z');
      r.position.set((sx * rw) / 2, y, 0);
      rack.add(r);
    }
  }
  for (const y of shelves)
    for (let j = 0; j < 4; j++) {
      const b = ball();
      b.position.set(-0.36 + j * 0.24, y + 0.13, 0);
      b.rotation.set(j, y * 3, j * 2);
      rack.add(b);
    }
  return rack;
}

export class StorageContainer {
  constructor(art) {
    const { x0, x1, z0, z1, h } = DIM.container;
    const L = x1 - x0;
    const D = z1 - z0;
    this.group = new THREE.Group();
    this.group.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const t = 0.05;
    const bumpL = corrugation(L, h);
    const bumpD = corrugation(D, h);
    const face = (w, map, bump) => new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.5, roughness: 0.55, metalness: 0.25 });
    const inner = std('#cfd2d4', { roughness: 0.8, bumpMap: bumpL, bumpScale: 1.5 });
    const navy = std(COL.navy, { roughness: 0.5, metalness: 0.3 });
    // both wraps are built up front so the viewer can switch between them
    const doorW = D / 2 - 0.05;
    const doorH = h - 0.2;
    this.wraps = {};
    for (const [name, wrap] of Object.entries(WRAPS))
      this.wraps[name] = {
        side: face(L, containerFace(L, h - 0.1, wrap, art, 'side'), bumpL),
        end: face(D, containerFace(D, h - 0.1, wrap, art, 'end'), bumpD),
        doors: [
          face(doorW, containerFace(doorW, doorH, wrap, art, 'doorLogo'), corrugation(doorW, doorH)),
          face(doorW, containerFace(doorW, doorH, wrap, art, 'doorQr'), corrugation(doorW, doorH)),
        ],
        frame: std(wrap.base, { roughness: 0.5, metalness: 0.3 }),
      };
    const front = this.wraps.navy.side;
    const backM = front;
    const endM = this.wraps.navy.end;
    const wall = (w, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.1, t), [inner, inner, inner, inner, mat, inner]);
    const wf = wall(L, front);
    wf.position.set(0, h / 2, D / 2 - t / 2);
    const wb = wall(L, backM);
    wb.rotation.y = Math.PI;
    wb.position.set(0, h / 2, -D / 2 + t / 2);
    const we = wall(D, endM);
    we.rotation.y = -Math.PI / 2;
    we.position.set(-L / 2 + t / 2, h / 2, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, D), [navy, navy, navy, inner, navy, navy]);
    roof.position.y = h - 0.03;
    roof.userData.keep = 3;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, D), [navy, navy, std('#8a6a48', { roughness: 0.9 }), navy, navy, navy]);
    floor.position.y = 0.06;
    floor.userData.keep = 2;
    this.group.add(wf, wb, we, roof, floor);
    this.faces = { side: [wf, wb], end: [we] };
    this.frameMeshes = [roof, floor];
    // corner posts and rails
    const postG = new THREE.BoxGeometry(0.1, h, 0.1);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(postG, navy);
        p.position.set(sx * (L / 2 - 0.05), h / 2, sz * (D / 2 - 0.05));
        this.frameMeshes.push(p);
        this.group.add(p);
      }
    // doors on the outer short end (+x), hinged at the corners
    this.doors = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(L / 2 - 0.02, 0.12, s * (D / 2 - 0.05));
      // seen from outside, the QR leaf is on the left (+z side, towards the court)
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(t, doorH, doorW), [this.wraps.navy.doors[s > 0 ? 1 : 0], inner, inner, inner, inner, inner]);
      leaf.userData.qr = s > 0;
      pivot.userData.leaf = leaf;
      leaf.position.set(0, doorH / 2, -s * (doorW / 2));
      pivot.add(leaf);
      // locking bars
      for (const bz of [0.18, doorW - 0.18]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, doorH - 0.1, 8), std('#9aa0a6', { metalness: 0.8, roughness: 0.35 }));
        bar.position.set(0.04, doorH / 2, -s * bz);
        pivot.add(bar);
      }
      pivot.userData.side = s;
      this.doors.push(pivot);
      this.group.add(pivot);
    }
    // ramp the full width of the doorway, so the hoops roll straight in and out
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.025, D - 0.12), std('#a9adb1', { metalness: 0.8, roughness: 0.4 }));
    ramp.position.set(L / 2 + 0.34, 0.065, 0);
    ramp.rotation.z = -Math.atan2(0.12, 0.7);
    this.ramp = ramp;
    this.group.add(ramp);

    // contents
    this.contents = new THREE.Group();
    this.group.add(this.contents);
    const wallIn = t + 0.02;
    this.backX = -L / 2 + wallIn;
    const goldM = std(COL.gold, { roughness: 0.45, metalness: 0.4 });
    const rail = (len, axis) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 8), goldM);
      if (axis === 'x') m.rotation.z = Math.PI / 2;
      if (axis === 'z') m.rotation.x = Math.PI / 2;
      return m;
    };
    const rack = new THREE.Group();
    const rw = 0.95; // along the container
    const rd = 0.4; // across
    const rh = 1.5;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const r = rail(rh, 'y');
        r.position.set((sx * rw) / 2, rh / 2 + 0.05, (sz * rd) / 2);
        rack.add(r);
      }
    const shelves = [0.1, 0.45, 0.8, 1.15];
    for (const y of [...shelves, 1.5]) {
      for (const sz of [-1, 1]) {
        const r = rail(rw, 'x');
        r.position.set(0, y, (sz * rd) / 2);
        rack.add(r);
      }
      for (const sx of [-1, 1]) {
        const r = rail(rd, 'z');
        r.position.set((sx * rw) / 2, y, 0);
        rack.add(r);
      }
    }
    for (const y of shelves)
      for (let j = 0; j < 4; j++) {
        const b = ball();
        b.position.set(-0.36 + j * 0.24, y + 0.13, 0);
        b.rotation.set(j, y * 3, j * 2);
        rack.add(b);
      }
    // ball rack rides in the gap between the two folded hoops, clear of the trolley stood on end
    rack.position.set(this.backX + 0.25 + rw / 2, 0.12, 0);
    this.contents.add(rack);
    this.stowed = new THREE.Group();
    this.contents.add(this.stowed);
    shadowed(this.group);
    this.setDoors(0);
  }

  // folded hoop base front (group origin) in container space: behind the trolley as delivered,
  // by the doors in everyday use. The bases are 1.45 m long, wheels towards the doors.
  stowX(where) {
    const L = DIM.container.x1 - DIM.container.x0;
    return where === 'back' ? this.backX + 1.46 : L / 2 - 0.12;
  }

  stowZ(i) {
    const D = DIM.container.z1 - DIM.container.z0;
    return (i ? -1 : 1) * (D / 2 - 0.5);
  }

  stow(hoops, where = 'front') {
    hoops.forEach((hp, i) => {
      this.stowed.add(hp.group);
      hp.group.rotation.set(0, 0, 0);
      hp.group.position.set(this.stowX(where), 0.12, this.stowZ(i));
    });
  }

  setWrap(name) {
    const w = this.wraps[name] ?? this.wraps.navy;
    for (const m of this.faces.side) m.material[4] = w.side;
    for (const m of this.faces.end) m.material[4] = w.end;
    for (const d of this.doors) d.userData.leaf.material[0] = w.doors[d.userData.leaf.userData.qr ? 1 : 0];
    // frame steel takes the wrap colour; the ceiling and floorboards (userData.keep) stay as they are
    for (const m of this.frameMeshes) {
      if (Array.isArray(m.material)) m.material = m.material.map((x, i) => (i === m.userData.keep ? x : w.frame));
      else m.material = w.frame;
    }
  }

  setDoors(open) {
    for (const d of this.doors) d.rotation.y = -d.userData.side * open * THREE.MathUtils.degToRad(100);
    this.ramp.visible = open > 0.5;
  }
}

// ---------------------------------------------------------------- panel trolley

export class Trolley {
  // flat-bed trolley the floor panels travel on. Local origin is the bottom of its -x end,
  // so it can tip up onto that end against the container's back wall when empty.
  constructor() {
    this.group = new THREE.Group();
    const { w: pw, d: pd, pitch } = DIM.panel;
    this.len = pw + 0.07;
    this.wid = pd + 0.08;
    const steel = std('#3a3d42', { roughness: 0.5, metalness: 0.6 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(this.len, 0.05, this.wid), steel);
    deck.position.set(this.len / 2, 0.155, 0);
    this.group.add(deck);
    const tyre = std('#111214', { roughness: 0.9 });
    const castor = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
    for (const x of [0.12, this.len - 0.12])
      for (const z of [-1, 1]) {
        const w = new THREE.Mesh(castor, tyre);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.06, z * (this.wid / 2 - 0.12));
        this.group.add(w);
      }
    // pull handle on the +x end, gold so it reads as ours
    const goldM = std(COL.gold, { roughness: 0.45, metalness: 0.4 });
    for (const z of [-0.35, 0.35]) {
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 10), goldM);
      up.position.set(this.len - 0.02, 0.58, z);
      this.group.add(up);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 10), goldM);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(this.len - 0.02, 0.98, 0);
    this.group.add(bar);
    this.handleParts = this.group.children.slice(-3);
    // the panel stack: one box whose height follows the panel count, with striped edges
    const c = canvas(64, 256);
    const g = c.getContext('2d');
    for (let y = 0; y < 256; y += 16) {
      g.fillStyle = '#6e7276';
      g.fillRect(0, y, 64, 12);
      g.fillStyle = '#4a4d51';
      g.fillRect(0, y + 12, 64, 4);
    }
    this.edgeTex = tex(c, { repeat: [1, 1] });
    this.edgeTex.wrapT = THREE.RepeatWrapping;
    const edge = std('#ffffff', { map: this.edgeTex, roughness: 0.85 });
    const topM = std(COL.court, { roughness: 0.85 });
    this.stack = new THREE.Mesh(new THREE.BoxGeometry(pw, 1, pd), [edge, edge, topM, topM, edge, edge]);
    this.group.add(this.stack);
    this.pitch = pitch;
    shadowed(this.group);
    this.setCount(DIM.panel.cols * DIM.panel.rows);
  }

  // the handle folds flat when the empty trolley is stood on end
  handle(up) {
    for (const p of this.handleParts) p.visible = up;
  }

  setCount(n) {
    const h = Math.max(n * this.pitch, 0.0001);
    this.stack.visible = n > 0;
    this.stack.scale.y = h;
    this.stack.position.set(this.len / 2, 0.18 + h / 2, 0);
    this.edgeTex.repeat.set(1, n / 16);
    this.top = 0.18 + h;
  }

  // world-space centre of the stack top
  topCentre(v = new THREE.Vector3()) {
    return this.group.localToWorld(v.set(this.len / 2, this.top, 0));
  }
}

// ---------------------------------------------------------------- sky

export function cloudDome() {
  // light, high cloud painted onto an inward-facing dome
  const c = canvas(2048, 1024);
  const g = c.getContext('2d');
  const rnd = mulberry(21);
  for (let i = 0; i < 420; i++) {
    const x = rnd() * c.width;
    const v = 0.12 + Math.pow(rnd(), 0.7) * 0.34; // keep above the horizon
    const y = v * c.height;
    const rx = 40 + rnd() * 220 * (v + 0.3);
    const ry = rx * (0.12 + rnd() * 0.12);
    const a = 0.05 + rnd() * 0.12;
    for (const dx of [-c.width, 0, c.width]) {
      g.save();
      g.translate(x + dx, y);
      g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 48, 24),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  return m;
}
