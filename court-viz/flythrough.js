// Fly-through as a short edit of camera moves. Each segment is a smooth spline move;
// the video exporter cross-fades between segments, the live viewer simply cuts.
import * as THREE from 'three';

const v = (a) => new THREE.Vector3(...a);
const ease = (t) => t * t * (3 - 2 * t);

export const SEGMENTS = [
  {
    name: 'arrive',
    duration: 9,
    pos: [[-6, 14, 34], [-4, 8, 26], [-3.2, 2.4, 19], [-3.0, 1.2, 16.4]],
    target: [[0, 0, 4], [0, 0.4, 5], [-0.6, 1.2, 3], [-0.2, 1.9, 1.0]],
    fov: [40, 45],
    state: () => ({ mini: false, rimFt: 10, doors: 0 }),
  },
  {
    name: 'approach',
    duration: 9,
    pos: [[-2.6, 1.3, 13.5], [-2.6, 1.3, 10], [-2.9, 1.25, 7.5]],
    target: [[0, 2.2, 1.0], [0, 2.3, 0.8], [0.1, 2.15, 0.4]],
    fov: [42, 40],
    state: (t) => ({ mini: false, rimFt: 10 - 3 * ease(THREE.MathUtils.clamp((t - 0.35) / 0.6, 0, 1)), doors: 0 }),
  },
  {
    name: 'container',
    duration: 9,
    pos: [[-5.5, 2.2, 3.5], [-4, 2.4, -6.5], [3, 2.0, -9], [8.6, 1.7, -2.6]],
    target: [[0, 1.6, 0], [0.6, 1.4, -1.5], [3.4, 1.2, -3.1], [3.6, 1.0, -3.2]],
    fov: [42, 46],
    state: (t) => ({ mini: false, rimFt: 7, doors: ease(THREE.MathUtils.clamp((t - 0.55) / 0.4, 0, 1)) }),
  },
  {
    name: 'mini',
    duration: 12,
    pos: [[16, 6, 14], [12, 10, 24], [0, 14, 26], [-11, 12, 20]],
    target: [[0, 0.5, 9], [0, 0.4, 8], [0, 0.3, 7], [0, 0.3, 6.5]],
    fov: [40, 40],
    state: () => ({ mini: true, rimFt: 7, doors: 0 }),
  },
  {
    name: 'finale',
    duration: 8,
    pos: [[-8, 22, 20], [0, 28, 12], [0, 34, 6.2]],
    target: [[0, 0, 6.5], [0, 0, 6.2], [0, 0, 6.0]],
    fov: [40, 38],
    state: () => ({ mini: true, rimFt: 10, doors: 0 }),
  },
];

for (const s of SEGMENTS) {
  s.posCurve = new THREE.CatmullRomCurve3(s.pos.map(v), false, 'centripetal');
  s.targetCurve = new THREE.CatmullRomCurve3(s.target.map(v), false, 'centripetal');
}

export const FLY = { duration: SEGMENTS.reduce((a, s) => a + s.duration, 0) };

export function sampleSegment(i, t) {
  // t in seconds within segment i
  const s = SEGMENTS[i];
  const u = THREE.MathUtils.clamp(t / s.duration, 0, 1);
  const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
  const k = 0.25 * u + 0.75 * e; // gentle ease in and out
  return {
    pos: s.posCurve.getPoint(k),
    target: s.targetCurve.getPoint(k),
    fov: THREE.MathUtils.lerp(s.fov[0], s.fov[1], k),
    state: s.state(u),
  };
}

export function sampleFly(t) {
  let acc = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    const d = SEGMENTS[i].duration;
    if (t <= acc + d || i === SEGMENTS.length - 1) return sampleSegment(i, t - acc);
    acc += d;
  }
}
