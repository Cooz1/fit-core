// ─────────────────────────────────────────────────────────────────────────────
// @tactical/fit-core — the part of the fit model that is not about rifles.
//
// Two apps place things on other things and save where they went: the weapon configurator
// (accessories on rails) and Loadout Engine (pouches on webbing). The maths, the GLB
// pipeline, the look, the record shape and the catalogue bookkeeping are the same in both.
// Rails, calibers, PALS cells and slot vocabulary are NOT here — those stay in their app.
//
// This exists because the alternative was hand-kept copies, which have cost three bugs:
// the bipod 193 mm apart, the adapters missing from calibration, and the PMAG after them.
// Import it; do not copy out of it.
// ─────────────────────────────────────────────────────────────────────────────

export * from './records.js';
export * from './transform.js';
export * from './loader.js';
export * from './look.js';
export * from './instances.js';
export * from './cart.js';
export * from './catalogue.js';
export * from './gizmo.js';
