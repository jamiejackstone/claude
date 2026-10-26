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
  benches: [
    [0.6, 2.4],
    [2.6, 4.4],
    [8.6, 10.4],
  ],
  ribs: 7,
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
  const c = canvas(18 * s, Math.round(LEN * s));
  const g = c.getContext('2d');
  g.fillStyle = HUB.runoff;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(20, 22, 26, 0.45)';
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

function endWallTexture(kind, art) {
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
  g.fillStyle = COL.navy;
  g.fillRect(0, (H - HUB.navyTo) * s, c.width, HUB.navyTo * s);
  stripe(g, s, W, H, COL.gold);
  if (kind === 'entrance-out') {
    // HOOP HUB above the door, a logo either side
    drawText(g, s, H, 'HOOP HUB', X(0), 5.5, 1.05, COL.gold, 6.4);
    drawImg(g, s, H, art.logo, X(-6.0), 3.3, 3.0);
    drawImg(g, s, H, art.logo, X(6.0), 3.3, 3.0);
  } else if (kind === 'entrance-in') {
    drawImg(g, s, H, art.logo, X(0), 5.25, 2.7);
    drawImg(g, s, H, art.roundWhite, X(-6.1), 3.1, 1.6);
    drawImg(g, s, H, art.roundWhite, X(6.1), 3.1, 1.6);
  } else if (kind === 'slam-in') {
    // big logo above the Mega Slam board, round badges either side
    drawImg(g, s, H, art.logo, X(0), 5.0, 3.9);
    drawImg(g, s, H, art.roundWhite, X(-6.4), 3.3, 1.7);
    drawImg(g, s, H, art.roundWhite, X(6.6), 3.6, 1.5);
    drawText(g, s, H, 'HOOP HUB', X(-6.4), 1.55, 0.5, COL.gold, 3);
  } else if (kind === 'slam-out') {
    drawImg(g, s, H, art.logo, X(0), 3.7, 4.6);
  }
  const m = canvas(64, Math.round(H * 8));
  const mg = m.getContext('2d');
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, 64, m.height);
  mg.fillStyle = '#fff';
  mg.fillRect(0, 0, 64, (H - HUB.navyTo) * 8);
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
  constructor({ z0, z1, side, color, shell = color, glazed = false, door = null, brand = {} }) {
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
    this.roof = box(cw, 0.06, len, std(color, { roughness: 0.6, metalness: 0.15 }), cx, ch - 0.03, cz);
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
    if (glazed) this.glaze(z0, z1, faceX, side, brand.art ?? {});
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
      // painted steel lining, lit, with ball racks against the back wall where they show through the shutter
      g.add(box(cw - 0.3, ch - 0.3, len - 0.3, std('#9ba1a8', { roughness: 0.9, side: THREE.BackSide }), cx, ch / 2, cz));
      g.add(box(cw - 0.32, 0.02, len - 0.32, std('#8a7458', { roughness: 0.85 }), cx, 0.13, cz));
      for (const k of [0.27, 0.73]) {
        const r = ballRack();
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

  glaze(z0, z1, faceX, side, art) {
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
    const wc = new THREE.Group();
    const wcMat = std('#d9dbe0', { roughness: 0.7 });
    wc.add(box(Math.abs(wcX1 - wcX0), 2.3, 0.05, wcMat, (wcX0 + wcX1) / 2, 1.27, 0.75));
    wc.add(box(0.05, 2.3, 0.75 - z0, wcMat, wcX1, 1.27, (z0 + 0.75) / 2));
    wc.add(box(0.03, 2.0, 0.75, std('#bfc3ca', { roughness: 0.6 }), wcX1 - side * 0.03, 1.13, 0.0));
    g.add(wc);
    const wcSign = facePanel(0.3, 0.3, '#ffffff', (cg, s2, w, h) => drawText(cg, s2, h, 'WC', w / 2, h / 2, 0.16, COL.navy, 0.26), { ribs: false });
    g.add(place(wcSign, court, wcX1 - side * 0.05, 1.55, 0));
    const chairMat = std(COL.navy, { roughness: 0.6 });
    for (const z of [1.6, 2.15, 2.7, 3.25]) {
      g.add(box(0.46, 0.06, 0.46, chairMat, outerX - side * 0.4, 0.58, z));
      g.add(box(0.06, 0.45, 0.46, chairMat, outerX - side * 0.16, 0.83, z));
      g.add(box(0.4, 0.44, 0.04, std('#2a2d31', { metalness: 0.6 }), outerX - side * 0.4, 0.34, z));
    }
    const dz = 9.2;
    g.add(box(0.7, 0.04, 1.8, std(COL.gold, { roughness: 0.5 }), outerX - side * 0.5, 0.86, dz));
    g.add(box(0.66, 0.72, 0.05, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.5, 0.48, dz - 0.85));
    g.add(box(0.66, 0.72, 0.05, std(COL.gold, { roughness: 0.6 }), outerX - side * 0.5, 0.48, dz + 0.85));
    g.add(box(0.22, 0.62, 0.6, std('#f6f6f6', { roughness: 0.4 }), faceX + side * 0.45, 0.47, 4.3));
    // the public entrance: a door in the front end, facing the playground, with a step and an ENTRANCE sign
    const { x0: e0, x1: e1 } = HUB.entranceDoor;
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
    g.add(box(ew + 0.5, 0.11, 0.6, std('#9a9da1', { roughness: 0.9 }), (e0 + e1) / 2, 0.055, z1 + 0.3));
    const sign = facePanel(1.1, 0.26, COL.gold, (cg, s2, w, h) => drawText(cg, s2, h, 'ENTRANCE', w / 2, h / 2, 0.17, COL.navy, w - 0.16), { ribs: false });
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
  // The reach from the base to the board is not published: assumed so the base back sits against the end wall
  // with the board face 1.2 m inside the baseline, which puts the padded front of the base 0.48 m onto the court.
  constructor(badge) {
    this.group = new THREE.Group();
    const black = std('#16181b', { roughness: 0.45, metalness: 0.5 });
    this.padMat = std(COL.navy, { roughness: 0.7 });
    this.face = DIM.boardZ10;
    // base: steel ballast box under a padded navy cover, wheels at the corners
    const bz0 = -1.07;
    const bz1 = bz0 + 1.55;
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.99, 0.34, 1.55, 4, 0.06), this.padMat);
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
    this.poleZ = -0.72;
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

// the full installation for the covered-only version: containers delivered, floor laid out of storage 1,
// hoops wheeled into place, then the canopy, end walls and fit-out
export const FULL_BUILD = {
  units: [0.8, 2.6, 4.4],
  drop: 2.6,
  shutters: [7.2, 20.6],
  floor: 8.4,
  floorSpan: 11.6,
  flight: 0.9,
  main: 21.0, // the portable main hoop wheeled in folded from the entrance end, then unfolded and raised
  mainTravel: 5.0,
  hoops: 21.4,
  hoopTravel: 6.0,
  rails: 28.2,
  ribs: 28.6,
  ribGap: 0.55,
  fabric: 33.4,
  fabricDur: 4.6,
  wallsSlam: 38.6,
  wallsEntrance: 39.8,
  doors: 41.6,
  fit: 43.8,
  rollerUp: 43.8,
  benches: 44.6,
  end: 50,
};

export async function createPhase2(renderer, { logoUrl = 'assets/logo.png', markings = {}, mainHoop = 'megaSlam', fullBuild = false } = {}) {
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
    const top = std(HUB.runoff, { roughness: 0.86 });
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
  const megaSlam = mainHoop === 'microArena' ? new MicroArena(art.roundNavy) : new MegaSlam(art.roundNavy);
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

  // container wraps: navy with a gold stripe, or gold with a navy stripe, as Phase 1. Big logo and HOOP HUB
  // on the outsides, logos facing the court, round badges on the ends, the free-trial QR by the entrance
  const bigSide = (logo, ink, { logoAt = 0.27, textAt = 0.7, textW = 0.45 } = {}) => (g, s, w, h) => {
    stripe(g, s, w, h + 0.16, ink === COL.gold ? COL.gold : COL.navy);
    drawImg(g, s, h, logo, w * logoAt, 1.32, Math.min(3.6, w * 0.4));
    drawText(g, s, h, 'HOOP HUB', w * textAt, 1.32, 1.1, ink, w * textW);
  };
  const badge = (round, ink) => (g, s, w, h) => {
    stripe(g, s, w, h + 0.16, ink);
    drawImg(g, s, h, round, w / 2, 1.45, 1.3);
  };
  const courtLogo = (logo, ink) => (g, s, w, h) => {
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
  // containers: 40 ft reception left, 20 ft Hoop Heroes and school storage right, side-opening onto the court
  const units = {
    reception: new Unit({ ...HUB.reception, side: -1, color: COL.navy, glazed: true, brand: brand.reception }),
    // containers 2 and 3: a 2.3 m roller shutter each at the corner end, well clear of the right portable hoop
    hhStore: new Unit({ ...HUB.hhStore, side: 1, color: COL.navy, door: [HUB.hhStore.z0 + 0.16, HUB.hhStore.z0 + 2.46], brand: brand.c2 }),
    schoolStore: new Unit({ ...HUB.schoolStore, side: 1, color: COL.gold, shell: COL.navy, door: [HUB.schoolStore.z1 - 2.46, HUB.schoolStore.z1 - 0.16], brand: brand.c3 }),
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
  label('RECEPTION & VIEWING AREA', -lx, (HUB.reception.z0 + HUB.reception.z1) / 2, 'rgba(20, 38, 78, 0.88)', '#ffffff');
  label('STORAGE 1', lx, (HUB.hhStore.z0 + HUB.hhStore.z1) / 2, 'rgba(255, 255, 255, 0.92)', COL.navy);
  label('STORAGE 2', lx, (HUB.schoolStore.z0 + HUB.schoolStore.z1) / 2, 'rgba(20, 38, 78, 0.9)', '#ffffff');
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
  const tEntranceOut = endWallTexture('entrance-out', art);
  const tEntranceIn = endWallTexture('entrance-in', art);
  const tSlamIn = endWallTexture('slam-in', art);
  const tSlamOut = endWallTexture('slam-out', art);
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

  // parents' benches along the reception windows
  const benches = new THREE.Group();
  for (const [a, b] of HUB.benches) {
    const bn = bench();
    bn.position.set(-HALF + 0.5, 0, (a + b) / 2);
    benches.add(shadowed(bn));
  }
  enclosure.add(benches);

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

  // a small downlight over the reception entrance, on at night
  const { x0: ex0, x1: ex1 } = HUB.entranceDoor;
  const ex = (ex0 + ex1) / 2;
  const entranceLamp = new THREE.Group();
  entranceLamp.add(box(0.3, 0.07, 0.22, std('#2b2f35', { roughness: 0.5, metalness: 0.5 }), 0, 0, 0.11));
  const entranceLens = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.16), new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff1d6', emissiveIntensity: 0 }));
  entranceLens.rotation.x = Math.PI / 2;
  entranceLens.position.set(0, -0.036, 0.11);
  entranceLamp.add(entranceLens);
  entranceLamp.position.set(ex, HUB.ch + 0.04, HUB.reception.z1);
  units.reception.group.add(entranceLamp);
  const entranceSpot = new THREE.SpotLight('#fff1dc', 0, 6, 0.9, 0.7, 1.2);
  entranceSpot.position.set(ex, HUB.ch - 0.02, HUB.reception.z1 + 0.14);
  entranceSpot.target.position.set(ex - 0.3, 0, HUB.reception.z1 + 1.2);
  units.reception.group.add(entranceSpot, entranceSpot.target);

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
  const unitList = [units.reception, units.hhStore, units.schoolStore];
  const tmp = new THREE.Vector3();
  const curve = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const hoopPaths = [
    // left hoop: out of container 2's shutter and across the court to the reception side
    curve([[10.9, 0.25], [8.3, 0.6], [4.5, 2.4], [-2, 4.4], [finalX[0], DIM.miniKeyZ]]),
    // right hoop: out of container 3's shutter and along the run-off
    curve([[9.4, 9.8], [8.2, 8.9], [finalX[1], 6.8], [finalX[1], DIM.miniKeyZ]]),
  ];
  // p runs 0 (folded in the storage) to 1 (out and up); played backwards to put them away
  const placeHoops = (p) => {
    hoops.forEach((hp, i) => {
      const u = ease((p - i * 0.06) / 0.72);
      hoopPaths[i].getPoint(u, tmp);
      hp.group.visible = true;
      hp.group.position.set(tmp.x, 0, tmp.z);
      const up = ease((p - 0.8) / 0.2);
      hp.setFolded(up <= 0);
      if (up > 0) {
        hp.setHeight(portableRim());
        hp.setUnfold(up);
      }
    });
  };
  const floorFrom = new THREE.Vector3(9.4, 1.0, 0.2); // out of storage 1's shutter
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
    if (building) {
      roller.set(ease((t - B.rollerUp) / 2.0));
      units.hhStore.setDoors(ease((t - B.shutters[0]) / 1.6));
      units.schoolStore.setDoors(ease((t - B.shutters[1]) / 1.6));
      for (const l of lamps) l.lens.material.emissiveIntensity = 0.6 * ease((t - B.fit) / 1.2);
      // mini hoops: folded inside the storage until the shutters are up, then rolled out and raised
      placeHoops((t - B.hoops) / B.hoopTravel);
      for (const hp of hoops) hp.group.visible = t >= B.hoops - 0.5; // stowed until their containers open
    }
  };

  const state = { mini: true, hoopsT: null, rimFt: 10, padding: 'navy', roller: 1, cutaway: false, storeDoors: 1, night: false, build: null };
  const portableRim = () => THREE.MathUtils.clamp(state.rimFt * FT, 2.4, 3.05);
  const apply = (next = {}) => {
    Object.assign(state, next);
    megaSlam.setHeight(state.rimFt * FT);
    megaSlam.setPadding(COL.navy, padLogoTex);
    // mini hoops: out and up, put away in containers 2 and 3, or hoopsT part way between
    if (state.hoopsT !== null) placeHoops(state.hoopsT);
    else
      hoops.forEach((hp, i) => {
        hp.group.visible = state.mini;
        hp.group.position.set(finalX[i], 0, DIM.miniKeyZ);
        hp.setFolded(false);
        hp.setHeight(portableRim());
        hp.setUnfold(1);
      });
    roller.set(state.roller);
    units.hhStore.setDoors(state.storeDoors);
    units.schoolStore.setDoors(state.storeDoors);
    // top-down cutaway: lift the canopy and the reception roof off
    archGroup.visible = !state.cutaway;
    for (const l of lamps) l.group.visible = !state.cutaway;
    walls.visible = !state.cutaway;
    roller.group.visible = !state.cutaway;
    units.reception.roof.visible = units.reception.ceil.visible = !state.cutaway;
    sun.castShadow = !state.cutaway; // a clean plan, without the canopy's missing shadow or the trees'
    setNight(state.night && state.build === null);
    for (const l of lamps) l.spot.visible = !state.cutaway;
    applyBuild(state.build ?? Infinity, state.build !== null);
    labels.visible = state.cutaway && state.build === null;
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
  // detail for signing off the storage shutters
  s1: { label: 'Storage open', pos: [-5.5, 2.4, 9.8], target: [7.5, 1.2, 3.0], fov: 50, state: {} },
};
