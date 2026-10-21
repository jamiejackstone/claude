// Camera for the installation video: one continuous move timed against the install timeline.
import * as THREE from 'three';

const KEYS = [
  // [time s, camera position, look-at]
  [0, [11.5, 4.6, 15.5], [1.5, 2.8, -1.2]], // step 1: Mega Slam goes in
  [4.5, [13.6, 3.0, 6.0], [6.2, 1.0, -3.0]], // step 2: doors, trolley out
  [9.0, [12.6, 8.8, 15.5], [1.0, 0, 4.4]], // floor laid
  [23.0, [-4.5, 10.8, 18.2], [0, 0, 4.6]],
  [27.5, [2.0, 11.5, 19.5], [2.5, 0.3, 3.0]], // step 3: hoops roll out
  [33.0, [-3.6, 6.5, 18.5], [0, 0.9, 4.0]],
  [37.0, [-3.6, 5.4, 18.5], [0, 0.8, 4.0]],
];
const times = KEYS.map((k) => k[0]);
const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
const targetCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');

export const INSTALL = { duration: times.at(-1), fov: 42 };

export function sampleInstall(t) {
  // map time onto the curve so each key is reached at its own time
  t = THREE.MathUtils.clamp(t, 0, INSTALL.duration);
  let i = times.findIndex((k) => k > t) - 1;
  if (i < 0) i = times.length - 2;
  const f = (t - times[i]) / (times[i + 1] - times[i]);
  const s = 0.5 - 0.5 * Math.cos(Math.PI * f);
  const u = (i + s) / (times.length - 1);
  return { pos: posCurve.getPoint(u), target: targetCurve.getPoint(u), fov: INSTALL.fov };
}
