// ─────────────────────────────────────────────────────────────────────────────
// RECORD PRIMITIVES — the transform record and its validators.
//
// Extracted verbatim from weapon-configurator/src/shared/schema.js. Nothing here knows
// what a rail or a webbing row is: it is the shape of a saved placement, not its domain.
// ─────────────────────────────────────────────────────────────────────────────

/** @returns {Transform} the identity transform (no move / no rotation / unit scale) */
export const identityTransform = () => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
});

/** Deep-clone a Transform (defensive copy for editing). @returns {Transform} */
export const cloneTransform = (t) => ({
  position: [...t.position],
  rotation: [...t.rotation],
  scale: [...t.scale],
});

/** Round every component of a Transform to `p` decimals (keeps JSON tidy). */
export function roundTransform(t, p = 5) {
  const r = (n) => Number(n.toFixed(p));
  return { position: t.position.map(r), rotation: t.rotation.map(r), scale: t.scale.map(r) };
}


// ── Validation ──────────────────────────────────────────────────────────────

const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));

const AXES = ['+x', '-x', '+y', '-y', '+z', '-z'];

/** @returns {string[]} validate an optional NormalizeSpec ([] means valid / absent) */
export function validateNormalize(nz, where = 'normalize') {
  if (nz == null) return [];
  const e = [];
  if (typeof nz !== 'object') return [`${where}: not an object`];
  if (typeof nz.realLength !== 'number' || !(nz.realLength > 0)) e.push(`${where}.realLength must be a positive number (metres)`);
  if (nz.forward != null && !AXES.includes(nz.forward)) e.push(`${where}.forward must be one of ${AXES.join(', ')}`);
  if (nz.up != null && !AXES.includes(nz.up)) e.push(`${where}.up must be one of ${AXES.join(', ')}`);
  return e;
}

/** @returns {string[]} list of problems ([] means valid) */
export function validateTransform(t, where = 'transform') {
  const e = [];
  if (!t || typeof t !== 'object') return [`${where}: not an object`];
  if (!isVec(t.position, 3)) e.push(`${where}.position must be [x,y,z]`);
  if (!isVec(t.rotation, 4)) e.push(`${where}.rotation must be a quaternion [x,y,z,w]`);
  if (!isVec(t.scale, 3)) e.push(`${where}.scale must be [x,y,z]`);
  return e;
}

/** @returns {string[]} */


/** @returns {string[]} */
export function validateMaterialOverride(m, where = 'material') {
  if (typeof m !== 'object' || Array.isArray(m)) return [`${where} must be an object`];
  const e = [];
  for (const k of Object.keys(m)) if (!['baseColor', 'roughness', 'metalness'].includes(k)) e.push(`${where}: unknown key "${k}" (baseColor, roughness, metalness)`);
  const factor = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const okBase = (b) => (Array.isArray(b) ? b.length === 3 && b.every(factor) : typeof b === 'number' ? factor(b) : /^#[0-9a-f]{6}$/i.test(b));
  if (m.baseColor != null && !okBase(m.baseColor)) e.push(`${where}.baseColor must be "#rrggbb", a brightness factor ≥ 0, or [r, g, b] factors ≥ 0`);
  const unit = (x) => typeof x === 'number' && x >= 0 && x <= 1;
  if (m.roughness != null && !unit(m.roughness)) e.push(`${where}.roughness must be a number 0–1`);
  const mt = m.metalness;
  if (mt != null && !(unit(mt) || (typeof mt === 'object' && !Array.isArray(mt) && Object.keys(mt).join() === 'baseColorAbove' && unit(mt.baseColorAbove)))) {
    e.push(`${where}.metalness must be a number 0–1, or { "baseColorAbove": 0–1 }`);
  }
  return e;
}

