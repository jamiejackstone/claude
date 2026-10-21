# Hoop Hub Phase 1 concept visuals

Browser-based 3D model of the Hoop Hub Phase 1 concept, built to *Hoop Hub Phase 1 - Concept Visual Brief v2* (21 Oct 2026, in the KB). Three.js scene, to the brief's plan dimensions.

- `index.html` interactive viewer (shot presets, mini set-up, container doors, rim height, padding colour, fly-through)
- `scene.js` the model: court markings, Mega Slam 72, two portable hoops, 8 ft container, playground
- `flythrough.js` camera moves for the fly-through
- `tools/render.mjs` headless still renderer, e.g. `node tools/render.mjs --shots 1,2,4 --w 3840 --h 2160 --out renders/final/clean`
- `tools/label.py` adds the "CONCEPT - NOT A REAL INSTALL" label
- `tools/build-artifact.mjs` builds `dist/` for publishing

Concept only, not a real install.
