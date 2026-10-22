// Phase 1 in the combined viewer: the open court with its 10 ft container, as signed off.
import { createHoopHub, SHOTS } from '../scene.js';
import { INSTALL, sampleInstall } from '../install.js';

const VIEW_SHOT = { '3d': '1', top: '2', slam: '3c' };
// installation captions: [from second, step, estimate]. Time estimates are optimistic concept figures.
export const P1_STEPS = [
  [0, 'Step 1 of 3 · Mega Slam goes in', 'About ½ day to fit, once its concrete base has cured'],
  [9.0, 'Step 2 of 3 · Floor laid from the container', 'About 1½ hours with a team of three'],
  [24.8, 'Step 3 of 3 · Mini hoops out and up', 'About 30 minutes'],
];
export const P1_DONE = ['Outdoor court ready to play', 'About 1 day on site in total · estimate'];
const HOOPS_TIME = 5;

export async function phase1({ renderer, persp, ortho, controls, setFov, orthoFrame, ui, caption }) {
  const hub = await createHoopHub(renderer, { logoUrl: 'assets/logo.png' });
  let camera = persp;
  let view = '3d';
  let installT0 = null;
  let hoopsAnim = null;

  function setView(v) {
    view = v;
    const s = SHOTS[VIEW_SHOT[v]];
    // every view shows the finished hub, keeping the visitor's hoops and rim height
    hub.apply({ floor: hub.nPanels, kit: 'inuse', install: null, ...s.state, mini: hub.state.mini, rimFt: hub.state.rimFt });
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
  function stopInstall(finished = false) {
    if (installT0 === null) return;
    installT0 = null;
    caption(finished ? P1_DONE : null, finished ? 5 : 0);
    // land on the finished court with the mini hoops out, as the sequence ends
    hub.apply({ install: null, mini: true, hoopsT: null, doors: 0 });
    controls.enabled = true;
    ui.sync();
  }
  function applyInstallCam(t) {
    const f = sampleInstall(t);
    const step = P1_STEPS.findLast(([at]) => t >= at);
    caption([step[1], step[2]]);
    hub.apply({ install: t });
    setFov(f.fov);
    persp.position.copy(f.pos);
    persp.lookAt(f.target);
    return f;
  }
  function stepHoops() {
    if (!hoopsAnim) return;
    const p = hoopsAnim.p();
    if ((hoopsAnim.out && p >= 1) || (!hoopsAnim.out && p <= 0)) {
      hoopsAnim = null;
      hub.apply({ hoopsT: null, doors: 0 });
    } else hub.apply({ hoopsT: p });
  }

  return {
    scene: hub.scene,
    get camera() {
      return camera;
    },
    hint: 'Drag to orbit · scroll or pinch to zoom',
    status: () => ({ view: installT0 === null ? view : null, hoops: hub.state.mini, installing: installT0 !== null, rimFt: hub.state.rimFt }),
    enter({ view: v, rimFt }) {
      hub.apply({ rimFt });
      controls.enabled = true;
      setView(v);
    },
    leave() {
      stopInstall();
      hoopsAnim = null;
      hub.apply({ hoopsT: null, doors: 0 });
    },
    view(v) {
      stopInstall();
      setView(v);
    },
    // Mini hoops: roll out of the container and go up, or fold and roll back in
    toggleHoops() {
      if (installT0 !== null) return;
      const out = !hub.state.mini;
      const from = hoopsAnim ? hoopsAnim.p() : out ? 0 : 1;
      const t0 = performance.now();
      hoopsAnim = { out, p: () => Math.min(1, Math.max(0, from + ((out ? 1 : -1) * (performance.now() - t0)) / 1000 / HOOPS_TIME)) };
      hub.apply({ mini: out });
      ui.sync();
    },
    // Installation: the three-step sequence, always with the Mega Slam at full height
    install() {
      if (installT0 !== null) return stopInstall();
      hoopsAnim = null;
      hub.apply({ hoopsT: null, rimFt: 10 });
      installT0 = performance.now();
      controls.enabled = false;
      camera = persp;
      ui.sync();
    },
    setRim(ft) {
      hub.apply({ rimFt: ft });
    },
    tick(now) {
      if (installT0 !== null) {
        const t = (now - installT0) / 1000;
        if (t > INSTALL.duration) {
          const f = applyInstallCam(INSTALL.duration);
          stopInstall(true);
          controls.target.copy(f.target);
        } else applyInstallCam(t);
      } else {
        stepHoops();
        controls.update();
      }
    },
  };
}
