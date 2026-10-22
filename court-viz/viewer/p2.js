// Phase 2 in the combined viewer: the covered hub. The roller door and storage shutters stay up, so
// zooming in from the 3D view carries the camera through the doorway and inside.
import * as THREE from 'three';
import { createPhase2, SHOTS, BUILD } from '../phase2/hub.js';

const VIEW_SHOT = { '3d': '1', top: '3', slam: 'slam' };
const HOOPS_TIME = 5;
// build captions: [from second, step, estimate]. Time estimates are optimistic concept figures.
export const P2_STEPS = [
  [0, 'Step 1 of 5 · Containers craned into place', 'About ½ day'],
  [7.2, 'Step 2 of 5 · Canopy frames go up', 'About 1 day'],
  [12.6, 'Step 3 of 5 · Canopy fabric pulled over', 'About ½ day'],
  [17.6, 'Step 4 of 5 · End walls, roller door and fire exit', 'About 1 day'],
  [22.6, 'Step 5 of 5 · Fit-out: lights, reception and storage', 'About 2 days'],
];
export const P2_DONE = ['Covered hub ready to open', 'About 5 days on site in total · estimate'];
// camera for the build: high over the front left as the containers land, round to the front, inside for the
// fit-out, then back out to the 3D view; kept inside the line of trees so nothing blocks the view
const KEYS = [
  [0, [-12, 15, 27], [0, 1, 4.5]],
  [7.0, [-17, 9.5, 21], [0, 1.6, 4.5]],
  [12.5, [-15, 12, 27], [0, 3, 5]],
  [18.5, [5, 8.5, 31], [0, 3.5, 5]],
  [22.6, [-6, 3.6, 24], [0, 2.4, 6]],
  // in through the raised roller door to watch the storage open and the mini hoops roll out
  [25.2, [0.5, 2.3, 14.5], [0, 1.8, 4]],
  [27.0, [-6.5, 4.6, 10.4], [3, 0.8, 4.5]],
  [31.6, [-6.8, 4.9, 10.0], [2.5, 0.8, 4.5]],
  // and back out to the 3D view
  [33.6, [0.3, 2.4, 14.2], [0, 2.2, 6]],
  [BUILD.end, [-13.5, 3.4, 27.5], [0.6, 2.6, 6.0]],
];
const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
const targetCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');
function sampleBuild(t) {
  // piecewise in time between keys, so each move lands on its key on cue
  const i = Math.min(KEYS.length - 2, Math.max(0, KEYS.findLastIndex((k) => t >= k[0])));
  const [a, b] = [KEYS[i][0], KEYS[i + 1][0]];
  const u = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  const e = u * u * (3 - 2 * u);
  const v = (i + e) / (KEYS.length - 1);
  return { pos: posCurve.getPoint(v), target: targetCurve.getPoint(v), fov: 42 };
}

export async function phase2({ renderer, persp, ortho, controls, setFov, orthoFrame, ui, caption }) {
  const hub = await createPhase2(renderer, { logoUrl: 'assets/logo.png' });
  let camera = persp;
  let view = '3d';
  let hoopsAnim = null;
  let buildT0 = null;

  function setView(v) {
    view = v;
    const s = SHOTS[VIEW_SHOT[v]];
    // top-down lifts the canopy off; every other view has it on
    hub.apply({ roller: 1, storeDoors: 1, cutaway: !!s.ortho });
    if (s.ortho) {
      orthoFrame(s.ortho);
      camera = ortho;
    } else {
      camera = persp;
      setFov(s.fov);
      persp.position.set(...s.pos);
      controls.target.set(...s.target);
      controls.update();
    }
    ui.sync();
  }
  function stopBuild(finished = false) {
    if (buildT0 === null) return;
    buildT0 = null;
    hub.apply({ build: null, roller: 1, storeDoors: 1 });
    caption(finished ? P2_DONE : null, finished ? 5 : 0);
    controls.enabled = true;
    ui.sync();
  }
  function applyBuildCam(t) {
    const f = sampleBuild(t);
    hub.apply({ build: t });
    const step = P2_STEPS.findLast(([at]) => t >= at);
    caption([step[1], step[2]]);
    setFov(f.fov);
    persp.position.copy(f.pos);
    persp.lookAt(f.target);
    return f;
  }

  return {
    scene: hub.scene,
    get camera() {
      return camera;
    },
    hint: 'Drag to orbit · scroll or pinch to zoom in through the door',
    status: () => ({ view: buildT0 === null ? view : null, hoops: hub.state.mini, installing: buildT0 !== null, night: hub.state.night, rimFt: hub.state.rimFt }),
    enter({ view: v, rimFt }) {
      hub.apply({ rimFt });
      controls.enabled = true;
      setView(v);
    },
    leave() {
      stopBuild();
      hoopsAnim = null;
      hub.apply({ hoopsT: null });
    },
    view(v) {
      stopBuild();
      setView(v);
    },
    // Mini hoops: roll out of containers 2 and 3 and go up, or fold and roll back in
    toggleHoops() {
      if (buildT0 !== null) return;
      const out = !hub.state.mini;
      const from = hoopsAnim ? hoopsAnim.p() : out ? 0 : 1;
      const t0 = performance.now();
      hoopsAnim = { out, p: () => Math.min(1, Math.max(0, from + ((out ? 1 : -1) * (performance.now() - t0)) / 1000 / HOOPS_TIME)) };
      hub.apply({ mini: out });
      ui.sync();
    },
    // Installation: the hub built around the finished court, in daylight
    install() {
      if (buildT0 !== null) return stopBuild();
      hub.apply({ night: false, cutaway: false });
      buildT0 = performance.now();
      controls.enabled = false;
      camera = persp;
      ui.sync();
    },
    night() {
      if (buildT0 !== null) return;
      hub.apply({ night: !hub.state.night });
      ui.sync();
    },
    setRim(ft) {
      hub.apply({ rimFt: ft });
    },
    tick(now) {
      if (buildT0 !== null) {
        const t = (now - buildT0) / 1000;
        if (t > BUILD.end) {
          const f = applyBuildCam(BUILD.end);
          stopBuild(true);
          view = '3d';
          controls.target.copy(f.target);
          ui.sync();
        } else applyBuildCam(t);
        return;
      }
      if (hoopsAnim) {
        const p = hoopsAnim.p();
        const done = (hoopsAnim.out && p >= 1) || (!hoopsAnim.out && p <= 0);
        hub.apply({ hoopsT: done ? null : p });
        if (done) hoopsAnim = null;
      }
      controls.update();
    },
  };
}
