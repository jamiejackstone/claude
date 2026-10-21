// Fly-through as a short edit of camera moves. Each segment is a smooth spline move;
// the video exporter cross-fades between segments, the live viewer simply cuts.
import * as THREE from 'three';

const v = (a) => new THREE.Vector3(...a);
const ease = (t) => t * t * (3 - 2 * t);

export const SEGMENTS = [
  {
    name: 'arrive',
    duration: 9,
    pos: [[-10, 14, 30], [-8, 8, 22], [-7, 2.4, 15], [-6.6, 1.2, 12.6]],
    target: [[0, 0, 3], [0, 0.4, 3], [-1, 1.0, 2], [-0.6, 1.6, 1.0]],
    fov: [40, 45],
    state: () => ({ mini: false, rimFt: 10, doors: 0 }),
  },
  {
    name: 'approach',
    duration: 9,
    pos: [[-3.4, 1.3, 11], [-3.0, 1.3, 8.8], [-2.9, 1.25, 7.0]],
    target: [[0, 2.2, 1.0], [0, 2.3, 0.8], [0.1, 2.15, 0.4]],
    fov: [42, 40],
    state: (t) => ({ mini: false, rimFt: 10 - 3 * ease(THREE.MathUtils.clamp((t - 0.35) / 0.6, 0, 1)), doors: 0 }),
  },
  {
    name: 'container',
    duration: 9,
    pos: [[-5.5, 2.2, 3.5], [-4, 2.4, -6.5], [4, 2.0, -9], [9.6, 1.7, -2.6]],
    target: [[0, 1.6, 0], [0.6, 1.4, -1.5], [4.4, 1.2, -3.1], [4.6, 1.0, -3.2]],
    fov: [42, 46],
    state: (t) => ({ mini: false, rimFt: 7, doors: ease(THREE.MathUtils.clamp((t - 0.55) / 0.4, 0, 1)) }),
  },
  {
    name: 'mini',
    duration: 12,
    pos: [[19, 6, 6], [15, 10, 18], [0, 14, 21], [-15, 12, 15]],
    target: [[0, 0.5, 5], [0, 0.4, 4.5], [0, 0.3, 4], [0, 0.3, 4]],
    fov: [42, 42],
    state: () => ({ mini: true, rimFt: 7, doors: 0 }),
  },
  {
    name: 'finale',
    duration: 8,
    pos: [[-10, 22, 16], [0, 28, 8], [0, 34, 3.2]],
    target: [[0, 0, 4], [0, 0, 3.4], [0, 0, 3.0]],
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
