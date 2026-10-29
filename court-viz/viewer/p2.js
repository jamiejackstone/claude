// Phase 2 in the combined viewer: the covered hub. The roller door and storage shutters stay up, so
// zooming in from the 3D view carries the camera through the doorway and inside.
import * as THREE from 'three';
import { createPhase2, SHOTS, BUILD, FULL_BUILD, HUB, archY } from '../phase2/hub.js';

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

// the covered-only version: the whole arena from an empty playground, a day at a time
export const FULL_STEPS = [
  [0, 'Day 1 · Containers craned in and set out to the canopy span', 'About ½ day'],
  [7.2, 'Days 1–2 · Canopy frames up and fabric pulled over', 'About 1½ days'],
  [18.0, 'Day 3 · End walls, roller door and fire exit', 'About 1 day'],
  [24.0, 'Day 4 · Court floor laid under cover, out of storage', 'About 3 hours with a team of three'],
  [37.4, 'Days 4–5 · Fit-out: lights, boards, reception, kit stored', 'About 1½ days'],
  [40.6, 'Ready · Hoops out of storage', 'Hoops, nets and balls live in the containers'],
];
export const FULL_DONE = (title) => [`${title} ready to open`, 'About 5 days on site in total · estimate'];
const FULL_KEYS = [
  [0, [-12, 15, 27], [0, 1, 4.5]],
  // canopy going over
  [7.2, [-15, 12, 27], [0, 3, 5]],
  [12.4, [-14, 10, 26], [0, 3, 5]],
  [18.0, [5, 8.5, 31], [0, 3.5, 5]],
  // in through the roller door to watch the floor go down under cover
  [22.4, [-1.5, 3.0, 21], [0, 1.6, 6]],
  [25.0, [0, 5.6, 10.6], [0, 0, 2.6]],
  [31.0, [-5, 5.4, 10.4], [1.5, 0, 3]],
  [37.0, [-6, 4.4, 10.4], [2, 0.6, 3.5]],
  // hoops out
  [40.6, [0, 3.0, 10.4], [0, 1.4, 4]],
  [46.0, [-6, 3.6, 24], [0, 2.4, 6]],
  [FULL_BUILD.end, [-13.5, 3.4, 27.5], [0.6, 2.6, 6.0]],
];

function cameraPath(keys) {
  const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
  const targetCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');
  return (t) => {
    // piecewise in time between keys, so each move lands on its key on cue
    const i = Math.min(keys.length - 2, Math.max(0, keys.findLastIndex((k) => t >= k[0])));
    const [a, b] = [keys[i][0], keys[i + 1][0]];
    const u = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
    const e = u * u * (3 - 2 * u);
    const v = (i + e) / (keys.length - 1);
    return { pos: posCurve.getPoint(v), target: targetCurve.getPoint(v), fov: 42 };
  };
}

export const phase2 = (ctx) => makePhase2(ctx, {});
export const coveredOnly = (ctx) => makePhase2(ctx, { mainHoop: 'microArena', fullBuild: true, layout: 'reception', markings: { multi: true, keyFill: '#6e7276' }, sports: true, name: 'HEROES ARENA', roofs: '#14264e', insideToggle: true, span: 17, arena: true });

// what each sport sets out: mini hoops (1 out), nets, dodgeballs, and how far the main hoop is lowered
const KIT = {
  basketball: { hoops: 1, nets: 0, balls: 0, low: 0 },
  pickleball: { hoops: 0, nets: 1, balls: 0, low: 1 },
  dodgeball: { hoops: 0, nets: 0, balls: 1, low: 1 },
};

// is a camera position inside the hub (under the canopy or in a container)?
const isInside = (p) => Math.abs(p.x) < HUB.x1 + HUB.cw && p.z > HUB.z0 && p.z < HUB.z1 && p.y < archY(Math.min(Math.abs(p.x), HUB.x1));
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

async function makePhase2({ renderer, persp, ortho, controls, setFov, orthoFrame, ui, caption }, { mainHoop, fullBuild = false, layout, markings, runoff, sports = false, name, roofs, insideToggle = false, pads = false, span = 0, arena = false }) {
  const hub = await createPhase2(renderer, { logoUrl: 'assets/logo.png', mainHoop, fullBuild, layout, markings, runoff, name, roofs, pads, span, arena });
  // 'HEROES ARENA' -> 'Heroes Arena' for captions
  const title = (name ?? 'HOOP HUB').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  let sport = 'basketball';
  let kitAnim = null;
  let courtAnim = null;
  const B = hub.BUILD;
  const STEPS = fullBuild ? FULL_STEPS : P2_STEPS;
  const DONE = fullBuild ? FULL_DONE(title) : P2_DONE;
  const sampleBuild = cameraPath(fullBuild ? FULL_KEYS : KEYS);
  let camera = persp;
  let view = '3d';
  let hoopsAnim = null;
  let buildT0 = null;
  let fly = null;
  let wasInside = false;

  // Inside / Outside: fly between the outside (3D) view and the inside view, through the roller door
  function flyTo(id) {
    const s = SHOTS[id];
    if (camera === ortho) {
      // from the 2D plan: start from high above the entrance
      camera = persp;
      hub.apply({ cutaway: false });
      persp.position.set(0, 26, HUB.z1 + 2);
      controls.target.set(0, 0, 5);
    }
    view = '3d';
    const p0 = persp.position.clone();
    const t0 = controls.target.clone();
    const p1 = new THREE.Vector3(...s.pos);
    const t1 = new THREE.Vector3(...s.target);
    const pts = [p0];
    if (isInside(p0) !== isInside(p1)) {
      const out = isInside(p0) ? p1 : p0;
      const near = new THREE.Vector3(THREE.MathUtils.clamp(out.x * 0.15, -1.5, 1.5), 2.3, HUB.z1 + 3.5);
      const inner = new THREE.Vector3(0, 2.1, HUB.z1 - 2.5);
      pts.push(...(isInside(p0) ? [inner, near] : [near, inner]));
    }
    pts.push(p1);
    const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const fov0 = persp.userData.fov ?? persp.fov;
    const dur = pts.length > 2 ? 3.2 : 1.8;
    const start = performance.now();
    controls.enabled = false;
    fly = (now) => {
      const u = easeInOut(Math.min(1, (now - start) / 1000 / dur));
      persp.position.copy(path.getPoint(u));
      controls.target.lerpVectors(t0, t1, u);
      setFov(THREE.MathUtils.lerp(fov0, s.fov, u));
      persp.lookAt(controls.target);
      if (u >= 1) {
        fly = null;
        controls.enabled = true;
        ui.sync();
      }
    };
    ui.sync();
  }

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
    caption(finished ? DONE : null, finished ? 5 : 0);
    controls.enabled = true;
    ui.sync();
  }
  function applyBuildCam(t) {
    const f = sampleBuild(t);
    hub.apply({ build: t });
    const step = STEPS.findLast(([at]) => t >= at);
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
    status: () => ({
      view: buildT0 === null ? view : null,
      hoops: hub.state.mini,
      installing: buildT0 !== null,
      night: hub.state.night,
      rimFt: hub.state.rimFt,
      sport,
      court: hub.state.court3 >= 0.5 ? '3x3' : 'mini',
      inside: camera === persp && isInside(persp.position),
    }),
    sports: sports ? Object.keys(KIT) : null,
    // basketball layouts in the arena: two hoops across the mini court, or one at full height for 3x3
    courts: arena ? ['mini', '3x3'] : null,
    // switch sport: what is out goes away first (hoops roll back into storage, nets drop, balls go), then the
    // mini court or 3x3: the far hoop goes away and the near one rolls to the main hoop's spot, or back
    setCourt(name) {
      if (buildT0 !== null || !arena || sport !== 'basketball' || kitAnim) return;
      const to = name === '3x3' ? 1 : 0;
      if (to === hub.state.court3 && !courtAnim) return;
      courtAnim = { t0: performance.now(), from: hub.state.court3, to, dur: 3.2 };
      ui.sync();
    },
    // new sport's kit comes out
    setSport(name) {
      if (buildT0 !== null || name === sport || !KIT[name]) return;
      const from = { hoops: hub.state.hoopsT ?? (hub.state.mini ? 1 : 0), nets: hub.state.netsT, balls: hub.state.ballsT, low: hub.state.mainLowT };
      const to = KIT[name];
      const goes = (k) => to[k] < from[k];
      const plan = { hoops: [goes('hoops') ? 0 : 1.2, HOOPS_TIME], nets: [goes('nets') ? 0 : 2.4, 1.4], balls: [goes('balls') ? 0 : 2.4, 1.6], low: [0, arena ? 4.5 : 1.6] };
      kitAnim = { t0: performance.now(), from, to, plan, end: Math.max(...Object.values(plan).map(([d, s]) => d + s)) };
      sport = name;
      hoopsAnim = null;
      hub.apply({ mini: to.hoops > 0.5 });
      ui.sync();
    },
    enter({ view: v, rimFt }) {
      hub.apply({ rimFt });
      controls.enabled = true;
      setView(v);
    },
    leave() {
      stopBuild();
      hoopsAnim = null;
      kitAnim = null;
      hub.apply({ hoopsT: null });
    },
    view(v) {
      stopBuild();
      fly = null;
      controls.enabled = true;
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
      fly = null;
      // the installation finishes set out for basketball
      kitAnim = null;
      sport = 'basketball';
      hub.apply({ night: false, cutaway: false, mini: true, hoopsT: null, netsT: 0, ballsT: 0, mainLowT: 0, court3: 0 });
      courtAnim = null;
      buildT0 = performance.now();
      controls.enabled = false;
      camera = persp;
      ui.sync();
    },
    // the Heroes Arena swaps Night for Inside / Outside
    night: insideToggle
      ? undefined
      : () => {
          if (buildT0 !== null) return;
          hub.apply({ night: !hub.state.night });
          ui.sync();
        },
    insideOut: insideToggle
      ? () => {
          if (buildT0 !== null || fly) return;
          flyTo(camera === persp && isInside(persp.position) ? '1' : '2');
        }
      : undefined,
    setRim(ft) {
      hub.apply({ rimFt: ft });
    },
    tick(now) {
      if (buildT0 !== null) {
        const t = (now - buildT0) / 1000;
        if (t > B.end) {
          const f = applyBuildCam(B.end);
          stopBuild(true);
          view = '3d';
          controls.target.copy(f.target);
          ui.sync();
        } else applyBuildCam(t);
        return;
      }
      if (kitAnim) {
        const e = (now - kitAnim.t0) / 1000;
        const v = {};
        for (const [k, [delay, dur]] of Object.entries(kitAnim.plan)) v[k] = kitAnim.from[k] + (kitAnim.to[k] - kitAnim.from[k]) * Math.min(1, Math.max(0, (e - delay) / dur));
        const done = e > kitAnim.end;
        hub.apply({ hoopsT: done ? null : v.hoops, netsT: v.nets, ballsT: v.balls, mainLowT: v.low });
        if (done) kitAnim = null;
      }
      if (courtAnim) {
        const k = Math.min(1, (now - courtAnim.t0) / 1000 / courtAnim.dur);
        hub.apply({ court3: courtAnim.from + (courtAnim.to - courtAnim.from) * k });
        if (k >= 1) {
          courtAnim = null;
          ui.sync();
        }
      }
      if (hoopsAnim) {
        const p = hoopsAnim.p();
        const done = (hoopsAnim.out && p >= 1) || (!hoopsAnim.out && p <= 0);
        hub.apply({ hoopsT: done ? null : p });
        if (done) hoopsAnim = null;
      }
      if (fly) fly(now);
      else controls.update();
      // keep the Inside button true when the visitor zooms through the door themselves
      const inside = camera === persp && isInside(persp.position);
      if (insideToggle && inside !== wasInside) {
        wasInside = inside;
        ui.sync();
      }
    },
  };
}
