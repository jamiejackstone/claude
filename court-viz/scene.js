// Hoop Hub Phase 1 concept scene, built to the v2 brief (21 Oct 2026).
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
  container: { x0: 3.5, x1: 5.94, z0: -4.2, z1: -2.0, h: 2.26 },
};

// Court markings as signed off by Hoop Heroes (21 Oct 2026): all keys light grey, and no
// no-charge semicircle, mini halfway line or centre circle, to keep the surface clean.
export const MARKINGS = { keyFill: COL.key, miniKeyFill: COL.key, halfway: false, noCharge: false };

const FT = 0.3048;
const PX = 400; // court texture pixels per metre

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, { srgb = true, repeat, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

function shadowed(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

// ---------------------------------------------------------------- court surface

export function paintCourt(logo, { keyFill = MARKINGS.keyFill, miniKeyFill = MARKINGS.miniKeyFill, halfway = MARKINGS.halfway, noCharge = MARKINGS.noCharge, logoBox = DIM.logo } = {}) {
  const { L, W } = DIM;
  const c = canvas(Math.round(W * PX), Math.round(L * PX));
  const g = c.getContext('2d');
  const X = (x) => (x + W / 2) * PX;
  const Z = (z) => z * PX;
  const rnd = mulberry(7);

  // tiles with a little per-tile tone variation
  const tile = 0.3 * PX;
  for (let ty = 0; ty < c.height; ty += tile) {
    for (let tx = 0; tx < c.width; tx += tile) {
      const v = 110 + Math.round((rnd() - 0.5) * 5);
      g.fillStyle = `rgb(${v},${v + 4},${v + 8})`;
      g.fillRect(tx, ty, tile + 1, tile + 1);
    }
  }
  // key fill
  const inset = DIM.whiteInset;
  g.fillStyle = keyFill;
  g.fillRect(X(-DIM.keyW / 2), Z(inset), DIM.keyW * PX, (DIM.keyD - inset) * PX);

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
  const gw = DIM.goldW;
  const gh = gw / 2;
  stroke(COL.gold, gw, () => g.rect(X(-W / 2 + gh), Z(gh), (W - gw) * PX, (L - gw) * PX));
  if (halfway) {
    stroke(COL.gold, gw, () => {
      g.moveTo(X(0), Z(0));
      g.lineTo(X(0), Z(L));
    });
    stroke(COL.gold, gw, () => g.arc(X(0), Z(DIM.miniKeyZ), DIM.miniCircleR * PX, 0, Math.PI * 2));
  }
  for (const s of [-1, 1]) {
    const edge = s * (W / 2);
    const inner = s * (W / 2 - DIM.miniKeyD);
    const z0 = DIM.miniKeyZ - DIM.miniKeyW / 2;
    g.fillStyle = miniKeyFill;
    g.fillRect(X(Math.min(edge, inner)), Z(z0), DIM.miniKeyD * PX, DIM.miniKeyW * PX);
    if (miniKeyFill !== COL.gold)
      stroke(COL.gold, gw, () => g.rect(X(Math.min(edge, inner)) + (s < 0 ? 0 : gh * PX), Z(z0 + gh), (DIM.miniKeyD - gh) * PX, (DIM.miniKeyW - gw) * PX));
    const a0 = s < 0 ? -Math.PI / 2 : Math.PI / 2;
    stroke(COL.gold, gw, () => g.arc(X(inner), Z(DIM.miniKeyZ), DIM.miniFtR * PX, a0, a0 + Math.PI));
    // three-point line: straight corner lines parallel to the 14.8 m sides, then the arc
    const rimX = s * (W / 2 - DIM.miniRimIn);
    const dz = L / 2 - DIM.mini3CornerIn;
    const dx = Math.sqrt(DIM.mini3R ** 2 - dz ** 2);
    const ang = Math.atan2(dz, dx);
    stroke(COL.gold, gw, () => {
      g.moveTo(X(edge), Z(DIM.miniKeyZ - dz));
      g.lineTo(X(rimX - s * dx), Z(DIM.miniKeyZ - dz));
      if (s < 0) g.arc(X(rimX), Z(DIM.miniKeyZ), DIM.mini3R * PX, -ang, ang);
      else g.arc(X(rimX), Z(DIM.miniKeyZ), DIM.mini3R * PX, Math.PI + ang, Math.PI - ang, true);
      g.lineTo(X(edge), Z(DIM.miniKeyZ + dz));
    });
  }

  // white 3x3 half court, its boundary set just inside the gold
  const lw = DIM.lineW;
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

  // logo at the open end, upright for someone standing there
  if (logo) {
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
  // seam
  g.strokeStyle = '#1e1e1e';
  g.lineWidth = 3;
  g.strokeRect(0, 0, n, n);
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

function buildCourt(logo, renderer) {
  const grp = new THREE.Group();
  const { L, W, tileT } = DIM;
  const map = tex(paintCourt(logo), { aniso: renderer.capabilities.getMaxAnisotropy() });
  const bump = tileBump();
  const top = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.86 });
  const side = std(COL.border, { roughness: 0.9 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, tileT, L), [side, side, top, side, side, side]);
  slab.position.set(0, tileT / 2, L / 2);
  slab.receiveShadow = true;
  grp.add(slab);
  grp.add(bevelStrip([-W / 2, 0, W / 2, L], DIM.borderW, tileT, 0.002, side));
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

function buildSurroundings() {
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
  pm.position.set(-14.5, 0.004, 5);
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
function rimAndNet(radius = 0.2286) {
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

function boardDecal(w, h, borderW, box) {
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
  return tex(c);
}

export class MegaSlam {
  // In-ground Mega Slam 72. Parallelogram arms: board face sits 1.22 m off the post at 10 ft,
  // about 1.52 m at 7.5 ft, so the rim travels onto the court as it is lowered.
  constructor() {
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
      new THREE.MeshStandardMaterial({ map: boardDecal(bw, bh, 0.05, [0.59, 0.45, 0.15]), transparent: true, roughness: 0.6 }),
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
  constructor() {
    this.faceX = 0.32; // board face forward of the base front edge [ASSUMED]
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
      const base = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.3, 0.77, 4, 0.08), body);
      base.position.set(-0.725, 0.2, 0);
      grp.add(base);
      const wGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18);
      for (const wx of [-1.3, -0.73, -0.16])
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
    cap.position.set(-1.12, 0.36, 0);
    this.out.add(cap);
    // upright near the front of the base, slightly raked, with a rear brace and two arms to the board
    this.pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), grey);
    this.brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), grey);
    this.out.add(this.pole, this.brace);
    this.armU = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), grey);
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), grey);
    this.out.add(this.armU, this.armL);
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
      new THREE.MeshStandardMaterial({ map: boardDecal(bw, bh, 0.04, [0.5, 0.36, 0.12]), transparent: true }),
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
    this.out.add(this.board);
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
    beam(this.brace, -1.2, 0.36, at(1.5), 1.5);
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

function containerFace(w, h, logo, { logoW = 0, logoY = 0.55, stripe = true } = {}) {
  const s = 300;
  const c = canvas(Math.round(w * s), Math.round(h * s));
  const g = c.getContext('2d');
  g.fillStyle = COL.navy;
  g.fillRect(0, 0, c.width, c.height);
  if (stripe) {
    g.fillStyle = COL.gold;
    g.fillRect(0, (h - 0.5) * s, c.width, 0.2 * s);
  }
  if (logo && logoW) {
    const lh = (logoW * logo.height) / logo.width;
    g.drawImage(logo, ((w - logoW) / 2) * s, (h - logoY - lh) * s, logoW * s, lh * s);
  }
  return tex(c);
}

function corrugation(w, h) {
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

export class StorageContainer {
  constructor(logo) {
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
    // long side facing the court (+z): big logo
    const front = face(L, containerFace(L, h, logo, { logoW: 2.15, logoY: 0.62 }), bumpL);
    const backM = face(L, containerFace(L, h, logo, { logoW: 0 }), bumpL);
    const endM = face(D, containerFace(D, h, logo, { logoW: 0 }), bumpD);
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
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, D), [navy, navy, std('#8a6a48', { roughness: 0.9 }), navy, navy, navy]);
    floor.position.y = 0.06;
    this.group.add(wf, wb, we, roof, floor);
    // corner posts and rails
    const postG = new THREE.BoxGeometry(0.1, h, 0.1);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(postG, navy);
        p.position.set(sx * (L / 2 - 0.05), h / 2, sz * (D / 2 - 0.05));
        this.group.add(p);
      }
    // doors on the outer short end (+x), hinged at the corners
    this.doors = [];
    const doorW = D / 2 - 0.05;
    const doorH = h - 0.2;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(L / 2 - 0.02, 0.12, s * (D / 2 - 0.05));
      const mat = face(doorW, containerFace(doorW, doorH, s > 0 ? logo : null, { logoW: s > 0 ? 0.85 : 0, logoY: 0.75 }), corrugation(doorW, doorH));
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(t, doorH, doorW), [mat, inner, inner, inner, inner, inner]);
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
    // ramp at the sill
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 1.0), std('#a9adb1', { metalness: 0.8, roughness: 0.4 }));
    ramp.position.set(L / 2 + 0.29, 0.065, 0);
    ramp.rotation.z = -Math.atan2(0.12, 0.6);
    this.ramp = ramp;
    this.group.add(ramp);

    // contents
    this.contents = new THREE.Group();
    this.group.add(this.contents);
    const cart = new THREE.Group();
    const goldM = std(COL.gold, { roughness: 0.45, metalness: 0.4 });
    const rail = (len, axis) => {
      const g = axis === 'y' ? new THREE.CylinderGeometry(0.015, 0.015, len, 8) : new THREE.CylinderGeometry(0.015, 0.015, len, 8);
      const m = new THREE.Mesh(g, goldM);
      if (axis === 'x') m.rotation.z = Math.PI / 2;
      if (axis === 'z') m.rotation.x = Math.PI / 2;
      return m;
    };
    const cw = 0.5;
    const cd = 1.0;
    const ch = 1.0;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const r = rail(ch, 'y');
        r.position.set((sx * cw) / 2, ch / 2 + 0.1, (sz * cd) / 2);
        cart.add(r);
      }
    for (const y of [0.15, 0.55, 1.1]) {
      for (const sz of [-1, 1]) {
        const r = rail(cw, 'x');
        r.position.set(0, y, (sz * cd) / 2);
        cart.add(r);
      }
      for (const sx of [-1, 1]) {
        const r = rail(cd, 'z');
        r.position.set((sx * cw) / 2, y, 0);
        cart.add(r);
      }
    }
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 2; k++) {
          const b = ball();
          b.position.set(-0.12 + i * 0.24, 0.29 + k * 0.4, -0.36 + j * 0.24);
          b.rotation.set(i + j, k * 2, j);
          cart.add(b);
        }
    cart.position.set(-L / 2 + 0.38, 0.12, 0);
    this.contents.add(cart);
    // mesh ball bags on wall hooks
    const bagMat = std('#111214', { alphaMap: NET_ALPHA ?? (NET_ALPHA = netTexture()), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
    for (const [bx, bz] of [
      [-0.1, -D / 2 + 0.2],
      [0.45, -D / 2 + 0.2],
      [-0.1, D / 2 - 0.2],
    ]) {
      const bag = new THREE.Group();
      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), std('#9aa0a6', { metalness: 0.8 }));
      hook.position.set(0, 1.75, 0);
      bag.add(hook);
      for (let i = 0; i < 4; i++) {
        const b = ball();
        b.position.set((i % 2) * 0.2 - 0.1, 1.2 + Math.floor(i / 2) * 0.22, (i % 3) * 0.04 - 0.04);
        bag.add(b);
      }
      const net = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), bagMat);
      net.scale.set(1, 1.5, 0.75);
      net.position.set(0, 1.38, 0);
      bag.add(net);
      bag.position.set(bx, 0.12, bz);
      this.contents.add(bag);
    }
    this.stowed = new THREE.Group();
    this.contents.add(this.stowed);
    shadowed(this.group);
    this.setDoors(0);
  }

  stow(hoops, rollOut = 0) {
    // two folded hoops side by side, wheels towards the doors
    const D = DIM.container.z1 - DIM.container.z0;
    const L = DIM.container.x1 - DIM.container.x0;
    hoops.forEach((hp, i) => {
      this.stowed.add(hp.group);
      hp.group.rotation.set(0, 0, 0);
      const z = (i ? -1 : 1) * (D / 4 - 0.02);
      const x = L / 2 - 0.12 + (i === 0 ? rollOut : 0);
      hp.group.position.set(x, 0.12, z);
    });
  }

  setDoors(open) {
    for (const d of this.doors) d.rotation.y = -d.userData.side * open * THREE.MathUtils.degToRad(100);
    this.ramp.visible = open > 0.5;
  }
}

// ---------------------------------------------------------------- sky

function cloudDome() {
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

// ---------------------------------------------------------------- scene

export async function createHoopHub(renderer, { logoUrl = 'assets/logo.png' } = {}) {
  const logo = await loadImage(logoUrl).catch(() => null);
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

  // environment for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene, 0, 1, 5000).texture;
  scene.environmentIntensity = 0.55;

  const hemi = new THREE.HemisphereLight('#dfe8f2', '#4b4a46', 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe2bd', 3.0);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.target.position.set(0, 0, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -22;
  sc.right = 22;
  sc.top = 22;
  sc.bottom = -22;
  sc.near = 10;
  sc.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  scene.add(buildSurroundings());
  scene.add(buildCourt(logo, renderer));

  const megaSlam = new MegaSlam();
  scene.add(megaSlam.group);
  let padLogoTex = null;
  if (logo) {
    const c = canvas(600, 290);
    const g = c.getContext('2d');
    g.drawImage(logo, 0, 0, 600, 290);
    padLogoTex = tex(c);
  }

  const container = new StorageContainer(logo);
  scene.add(container.group);

  const hoops = [new PortableHoop(), new PortableHoop()];
  const placeOut = () => {
    hoops.forEach((hp, i) => {
      const side = i ? 1 : -1; // left (-x) and right (+x); local +x always faces the court
      scene.add(hp.group);
      hp.setFolded(false);
      hp.group.position.set(side * (DIM.W / 2 - 0.6 + hp.rimLocal), 0, DIM.miniKeyZ);
      hp.group.rotation.set(0, side > 0 ? Math.PI : 0, 0);
    });
  };

  const state = { mini: true, rimFt: 10, padding: 'gold', doors: 0, rollOut: 0 };
  const apply = (next = {}) => {
    Object.assign(state, next);
    megaSlam.setHeight(state.rimFt * FT);
    megaSlam.setPadding(state.padding === 'navy' ? COL.navy : COL.gold, padLogoTex);
    container.setDoors(state.doors);
    if (state.mini) placeOut();
    else {
      hoops.forEach((h) => h.setFolded(true));
      container.stow(hoops, state.rollOut);
    }
  };
  apply();

  return { scene, sun, megaSlam, container, hoops, state, apply, FT };
}

// camera presets, named after the brief's shot list
export const SHOTS = {
  1: { label: 'Orientation', pos: [-1.0, 6.2, 20.5], target: [0, 0.4, 3.4], fov: 42, state: { mini: false, rimFt: 10, doors: 0 } },
  2: { label: 'Top-down', ortho: { cx: 0, cz: 2.9, height: 16.4 }, state: { mini: true, rimFt: 10, doors: 0 } },
  '3a': { label: 'Mega Slam 7 ft', pos: [-3.1, 1.2, 6.9], target: [0.1, 2.15, 0.2], fov: 39.8, dof: 7.5, state: { mini: false, rimFt: 7, doors: 0 } },
  '3b': { label: 'Mega Slam 8.5 ft', pos: [-3.1, 1.2, 6.9], target: [0.1, 2.15, 0.2], fov: 39.8, dof: 7.5, state: { mini: false, rimFt: 8.5, doors: 0 } },
  '3c': { label: 'Mega Slam 10 ft', pos: [-3.1, 1.2, 6.9], target: [0.1, 2.15, 0.2], fov: 39.8, dof: 7.5, state: { mini: false, rimFt: 10, doors: 0 } },
  4: { label: 'Mini game', pos: [10.5, 7.2, 14.5], target: [-0.6, 0.4, 4.2], fov: 42, state: { mini: true, rimFt: 10, doors: 0 } },
  5: { label: 'Container', pos: [8.9, 1.6, -1.6], target: [4.6, 1.0, -3.4], fov: 45.7, dof: 9, state: { mini: false, rimFt: 10, doors: 1 } },
  6: { label: 'Hero', pos: [-3.6, 1.15, 12.6], target: [-0.3, 0.6, 1.0], fov: 45.7, dof: 13, state: { mini: false, rimFt: 10, doors: 0 } },
  // detail stills for signing off the container and hoops
  c1: { label: 'Container billboard', pos: [9.6, 1.8, 2.6], target: [4.6, 1.1, -3.1], fov: 40, state: { mini: false, rimFt: 10, doors: 0 } },
  c2: { label: 'Container open', pos: [8.9, 1.6, -1.6], target: [4.6, 1.0, -3.4], fov: 45.7, state: { mini: false, rimFt: 10, doors: 1 } },
  h1: { label: 'Mega Slam detail', pos: [2.6, 1.7, -2.3], target: [0, 1.9, 0.4], fov: 45, state: { mini: false, rimFt: 10, doors: 0 } },
  h2: { label: 'Portable hoop', pos: [3.6, 1.8, 8.8], target: [7.3, 1.6, 5.0], fov: 42, state: { mini: true, rimFt: 10, doors: 0 } },
};
