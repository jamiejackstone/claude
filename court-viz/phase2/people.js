// Scale figures for the Heroes Arena stills: plain, faceless figures in the architectural way, children in
// sport-coloured bibs, coaches in navy and parents in grey, so a render reads as children's sport at a glance
// without pretending to be a photo (Jamie, 29 Oct 2026). Each figure faces +z, feet on the floor.
import * as THREE from 'three';

const NAVY = '#14264e';
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
const SKIN = mat('#f3f1ec');
const PARENT = mat('#c9ced6');
const BIB = { gold: mat('#fba91a'), navy: mat(NAVY), green: mat('#9bd13b'), red: mat('#e63950'), coach: mat(NAVY), parent: PARENT };

// a limb segment hanging from its joint: a capsule of length len and radius r
function segment(len, r, m) {
  const joint = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10), m);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  joint.add(mesh);
  return joint;
}

// poses: lean forward, thigh and knee angles per leg, upper arm [forward, out] and elbow per arm; negative
// angles swing a limb forward, positive knees and elbows bend back
const POSES = {
  stand: { armL: [0, 0.12], armR: [0, 0.12], elbowL: -0.15, elbowR: -0.15 },
  walk: { thighL: -0.35, kneeL: 0.25, thighR: 0.3, kneeR: 0.35, armL: [0.3, 0.1], armR: [-0.3, 0.1], elbowL: -0.3, elbowR: -0.3 },
  run: { lean: 0.25, thighL: -0.85, kneeL: 0.7, thighR: 0.45, kneeR: 1.1, armL: [0.75, 0.1], armR: [-0.8, 0.1], elbowL: -1.2, elbowR: -1.3 },
  shoot: { thighL: -0.15, kneeL: 0.3, thighR: -0.1, kneeR: 0.25, armL: [-2.75, 0.18], armR: [-2.75, 0.18], elbowL: -0.45, elbowR: -0.45 },
  dribble: { lean: 0.3, thighL: -0.55, kneeL: 0.8, thighR: 0.2, kneeR: 0.6, armL: [-0.5, 0.35], armR: [-0.45, 0.2], elbowL: -0.6, elbowR: -0.3 },
  defend: { lean: 0.2, spread: 0.28, thighL: -0.3, kneeL: 0.6, thighR: -0.3, kneeR: 0.6, armL: [-0.5, 1.0], armR: [-0.5, 1.0], elbowL: -0.3, elbowR: -0.3 },
  throw: { lean: 0.1, thighL: -0.55, kneeL: 0.3, thighR: 0.35, kneeR: 0.2, armL: [-1.25, 0.2], armR: [-2.5, 0.45], elbowL: -0.2, elbowR: 1.3 },
  dodge: { lean: -0.05, spread: 0.45, thighL: -0.1, kneeL: 0.5, thighR: 0.1, kneeR: 0.3, armL: [-0.3, 1.1], armR: [-0.2, 0.9], elbowL: -0.4, elbowR: -0.5 },
  swing: { lean: 0.25, spread: 0.25, thighL: -0.45, kneeL: 0.75, thighR: -0.2, kneeR: 0.7, armL: [-0.6, 0.45], armR: [-1.3, 0.55], elbowL: -0.5, elbowR: -0.25 },
  ready: { lean: 0.2, spread: 0.2, thighL: -0.35, kneeL: 0.6, thighR: -0.35, kneeR: 0.6, armL: [-0.8, 0.25], armR: [-0.9, 0.2], elbowL: -0.7, elbowR: -0.6 },
  coach: { armL: [0, 0.1], armR: [-1.45, 0.35], elbowL: -0.2, elbowR: 0 },
  clap: { armL: [-0.9, -0.15], armR: [-0.9, -0.15], elbowL: -1.2, elbowR: -1.2 },
  sit: { thighL: -1.5, kneeL: 1.45, thighR: -1.5, kneeR: 1.45, armL: [-0.45, 0.1], armR: [-0.45, 0.1], elbowL: -1.0, elbowR: -1.0 },
  wheel: { lean: 0.15, thighL: -1.45, kneeL: 1.2, thighR: -1.45, kneeR: 1.2, armL: [-0.25, 0.35], armR: [-0.25, 0.35], elbowL: -0.5, elbowR: -0.5 },
  wheelShoot: { lean: 0.05, thighL: -1.45, kneeL: 1.2, thighR: -1.45, kneeR: 1.2, armL: [-2.7, 0.18], armR: [-2.7, 0.18], elbowL: -0.45, elbowR: -0.45 },
};

// h: height; top: bib colour; seat: hip height for a seated figure (otherwise feet on the floor); lift: off the
// floor (a jump shot); hold: 'ball' (colour), 'paddle'
export function figure(h, pose, top = 'gold', { seat = null, lift = 0, hold = null, ballColor = '#e0531f' } = {}) {
  const P = { lean: 0, spread: 0, thighL: 0, kneeL: 0, thighR: 0, kneeR: 0, armL: [0, 0.1], armR: [0, 0.1], elbowL: 0, elbowR: 0, ...POSES[pose] };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.53 * h;
  body.add(hips);
  const skin = top === 'parent' || top === 'coach' ? BIB[top] : SKIN;
  // legs, in the bib colour for the coach and parents (trousers), white for the children
  const legM = top === 'coach' ? BIB.coach : top === 'parent' ? mat('#9aa1ab') : SKIN;
  for (const [side, thigh, knee] of [
    [1, P.thighL, P.kneeL],
    [-1, P.thighR, P.kneeR],
  ]) {
    const t = segment(0.25 * h, 0.05 * h, legM);
    t.position.x = side * 0.055 * h;
    t.rotation.x = thigh;
    t.rotation.z = side * P.spread * 0.5;
    const s = segment(0.27 * h, 0.042 * h, legM);
    s.position.y = -0.25 * h;
    s.rotation.x = knee;
    t.add(s);
    hips.add(t);
  }
  // torso and head, leaning from the hips
  const torso = new THREE.Group();
  torso.rotation.x = P.lean;
  hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.088 * h, 0.13 * h, 4, 12), BIB[top]);
  chest.position.y = 0.155 * h;
  chest.scale.z = 0.72;
  chest.castShadow = true;
  torso.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.068 * h, 16, 12), top === 'coach' || top === 'parent' ? SKIN : SKIN);
  head.position.y = 0.39 * h;
  head.castShadow = true;
  torso.add(head);
  let hand = null;
  for (const [side, [fwd, out], elbow] of [
    [1, P.armL, P.elbowL],
    [-1, P.armR, P.elbowR],
  ]) {
    const u = segment(0.17 * h, 0.032 * h, skin);
    u.position.set(side * 0.112 * h, 0.285 * h, 0);
    u.rotation.order = 'ZXY';
    u.rotation.x = fwd;
    u.rotation.z = side * out;
    const f = segment(0.17 * h, 0.028 * h, SKIN);
    f.position.y = -0.17 * h;
    f.rotation.x = elbow;
    u.add(f);
    torso.add(u);
    if (side < 0) hand = f; // the right hand holds the ball or paddle
  }
  if (hold === 'ball') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), new THREE.MeshStandardMaterial({ color: ballColor, roughness: 0.6 }));
    b.position.set(0.04 * h, -0.17 * h - 0.1, 0.05);
    b.castShadow = true;
    hand.add(b);
  } else if (hold === 'paddle') {
    const p = new THREE.Group();
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.015), new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.5 }));
    face.position.y = -0.2;
    p.add(face, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#222' })));
    p.position.y = -0.17 * h - 0.02;
    p.traverse((m) => m.isMesh && (m.castShadow = true));
    hand.add(p);
  }
  root.updateMatrixWorld(true);
  if (seat !== null) hips.position.y = seat;
  else {
    const box = new THREE.Box3().setFromObject(root);
    body.position.y = -box.min.y + lift;
  }
  return root;
}

// a figure placed at (x, z) facing the point (fx, fz)
function put(group, fig, x, z, fx, fz, y = 0) {
  fig.position.set(x, y, z);
  fig.rotation.y = Math.atan2(fx - x, fz - z);
  group.add(fig);
  return fig;
}

// the sets: one per sport, plus the reception (shown with any of them). half: the canopy half-span; cw: the
// container width; chair: the sports wheelchair model
export function makePeople({ half, cw, chair }) {
  const group = new THREE.Group();
  const sets = {};
  const set = (name) => (sets[name] = new THREE.Group());

  // mini basketball across the court: hoops at x ±7.5 on z 5
  {
    const g = set('basketball');
    put(g, figure(1.42, 'shoot', 'gold', { lift: 0.12 }), -5.0, 5.7, -7.5, 5);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), new THREE.MeshStandardMaterial({ color: '#e0531f', roughness: 0.6 }));
    ball.position.set(-5.75, 2.6, 5.45);
    g.add(ball);
    put(g, figure(1.36, 'defend', 'navy'), -6.0, 5.3, -5.0, 5.7);
    put(g, figure(1.3, 'dribble', 'gold', { hold: 'ball' }), -1.4, 3.4, -7.5, 5);
    put(g, figure(1.38, 'defend', 'navy'), -2.4, 3.9, -1.4, 3.4);
    put(g, figure(1.33, 'run', 'gold'), -3.3, 7.4, -7, 6);
    put(g, figure(1.45, 'run', 'navy'), 0.6, 6.6, -6, 5);
    put(g, figure(1.25, 'run', 'gold'), 2.6, 2.4, -5, 4);
    put(g, figure(1.4, 'walk', 'navy'), 3.6, 7.8, -3, 5);
    put(g, figure(1.78, 'coach', 'coach'), 1.6, 0.6, -4, 5);
    // two waiting their turn on the bench by the door
    put(g, figure(1.3, 'sit', 'gold', { seat: 0.5 }), 5.1, 10.75, 5.1, 5);
    put(g, figure(1.25, 'sit', 'navy', { seat: 0.5 }), 5.9, 10.75, 5.9, 5);
  }
  // 3x3 on the one hoop at the back wall
  {
    const g = set('3x3');
    put(g, figure(1.48, 'shoot', 'gold', { lift: 0.1 }), 1.0, 4.4, 0, 0.9);
    put(g, figure(1.45, 'defend', 'navy'), 0.75, 3.6, 1.0, 4.4);
    put(g, figure(1.42, 'run', 'gold'), -2.6, 3.4, 0, 1.5);
    put(g, figure(1.4, 'defend', 'navy'), -1.8, 2.6, -2.6, 3.4);
    put(g, figure(1.46, 'walk', 'navy'), 3.2, 2.2, 0, 2);
    put(g, figure(1.4, 'clap', 'gold'), -3.6, 5.9, 0, 2);
    put(g, figure(1.78, 'coach', 'coach'), 5.6, 6.5, 0, 3);
  }
  // wheelchair 3x3: players in sports chairs around the hoop
  {
    const g = set('wheelchair');
    const player = (x, z, fx, fz, top, pose = 'wheel', hold = null) => {
      const unit = new THREE.Group();
      unit.add(chair());
      unit.add(figure(1.5, pose, top, { seat: 0.5, hold }));
      put(g, unit, x, z, fx, fz);
    };
    player(0.9, 4.3, 0, 0.9, 'gold', 'wheelShoot');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), new THREE.MeshStandardMaterial({ color: '#e0531f', roughness: 0.6 }));
    ball.position.set(0.55, 2.35, 3.0);
    g.add(ball);
    player(0.5, 3.3, 0.9, 4.3, 'navy');
    player(-2.4, 3.6, 0, 1.4, 'gold');
    player(-1.4, 2.5, -2.4, 3.6, 'navy');
    player(2.9, 2.3, 0, 2, 'navy');
    player(-3.2, 6.0, 0, 2, 'gold');
    put(g, figure(1.78, 'coach', 'coach'), 5.6, 6.5, 0, 3);
  }
  // pickleball: three junior courts side by side, nets across the middle (z 5)
  {
    const g = set('pickleball');
    [-5.0, 0, 5.0].forEach((x, i) => {
      put(g, figure(1.4 + 0.05 * (i % 2), i === 1 ? 'swing' : 'ready', 'green', { hold: 'paddle' }), x - 0.6, 2.9, x, 7);
      put(g, figure(1.35, i === 1 ? 'ready' : 'swing', 'navy', { hold: 'paddle' }), x + 0.5, 7.2, x, 3);
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: '#d7f04a', roughness: 0.5 }));
    ball.position.set(0.1, 1.25, 4.2);
    g.add(ball);
    put(g, figure(1.78, 'coach', 'coach'), 7.9, 5.0, 5, 6);
  }
  // dodgeball: two teams either side of the halfway line (x 0)
  {
    const g = set('dodgeball');
    put(g, figure(1.4, 'throw', 'red', { hold: 'ball', ballColor: '#e63950' }), -1.9, 3.2, 3, 4);
    put(g, figure(1.36, 'throw', 'navy', { hold: 'ball', ballColor: '#2f9bdc' }), 2.2, 6.6, -3, 6);
    put(g, figure(1.32, 'dodge', 'navy'), 3.4, 3.6, -2, 3.4);
    put(g, figure(1.38, 'dodge', 'red'), -3.6, 6.9, 2, 6.6);
    put(g, figure(1.3, 'run', 'red'), -5.0, 4.4, -2, 7);
    put(g, figure(1.42, 'ready', 'navy'), 5.3, 5.6, 0, 5);
    put(g, figure(1.28, 'ready', 'red'), -2.8, 8.5, 0, 6);
    put(g, figure(1.34, 'run', 'navy'), 1.7, 1.9, 5, 3);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), new THREE.MeshStandardMaterial({ color: '#9bd13b', roughness: 0.6 }));
    ball.position.set(0.6, 1.35, 3.5);
    g.add(ball);
    put(g, figure(1.78, 'coach', 'coach'), 0.2, 10.4, 0, 5);
  }
  // reception: parents on the wall seats and at the cafe tables, a parent and child checking in, a child at
  // the window watching
  {
    const g = set('reception');
    const outerX = -(half + cw);
    const faceX = -half;
    for (const z of [1.55, 2.65, 3.2, 5.4, 6.5]) put(g, figure(1.7 + (z % 0.3) * 0.2, 'sit', 'parent', { seat: 0.62 }), outerX + 0.32, z, outerX + 5, z);
    const tx = faceX - 0.5;
    put(g, figure(1.68, 'sit', 'parent', { seat: 0.62 }), tx, 2.1 - 0.56, tx, 6);
    put(g, figure(1.74, 'sit', 'parent', { seat: 0.62 }), tx, 3.65 - 0.56, tx, 6);
    put(g, figure(1.66, 'sit', 'parent', { seat: 0.62 }), tx, 3.65 + 0.56, tx, 0);
    put(g, figure(1.72, 'stand', 'parent'), faceX - 1.25, 9.1, outerX, 9.1);
    put(g, figure(1.15, 'stand', 'gold'), faceX - 1.1, 8.6, outerX, 9.0);
    put(g, figure(1.1, 'stand', 'navy'), faceX - 0.3, 6.45, 0, 6.45);
  }
  for (const s of Object.values(sets)) {
    s.visible = false;
    group.add(s);
  }
  return {
    group,
    // show one sport's set (with the reception), or none
    show(name) {
      for (const [k, s] of Object.entries(sets)) s.visible = !!name && (k === name || k === 'reception');
    },
  };
}
