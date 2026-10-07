// ─────────────────────────────────────────────────────────────────────────────
// ACCESSORY INSTANCES — a product sold as a SET renders as ONE accessory.
// e.g. a pair of scope rings: the store sells the pair under one SKU, but the model
// is a single ring. We instance the same normalized model `instances` times, spaced
// centre-to-centre by `instanceSpacing` metres along the accessory's local +X — the
// mount axis, i.e. along the rail. The outer group stays the ONE object that gets
// transformed, selected, saved and bought; instances are presentation only (one cart
// line, quantity 1, one price). Used by both the calibration tool and the viewer.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const MAX_INSTANCES = 8;
const _box = new THREE.Box3(), _size = new THREE.Vector3();

/** How many copies an accessory renders (default 1). */
export function instanceCount(def) {
  const n = Math.floor(Number(def?.instances) || 1);
  return Math.min(Math.max(n, 1), MAX_INSTANCES);
}

// centre the copies on the mount point: offsets -s/2, +s/2 for a pair
function layout(obj) {
  const { spacing } = obj.userData.instances;
  const copies = obj.children.filter((c) => c.userData.isInstance);
  copies.forEach((g, i) => g.position.set((i - (copies.length - 1) / 2) * spacing, 0, 0));
}

/**
 * Turn a freshly loaded accessory (loadGLB's identity outer group) into `def.instances`
 * copies laid out along its local +X. Call straight after loadGLB, before placing it.
 * No-op for single-instance accessories, and idempotent.
 * Records `userData.instances = { count, length, spacing }` (metres; `length` is one
 * copy's extent along the rail). Spacing defaults to `length` (copies end to end).
 * @returns {THREE.Object3D} the same object, mutated
 */
export function applyInstances(obj, def) {
  const n = instanceCount(def);
  if (n <= 1 || obj.userData.instances) return obj;
  obj.updateMatrixWorld(true);
  const length = _box.setFromObject(obj, true).getSize(_size).x;
  const kids = [...obj.children];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    g.name = `instance ${i + 1}/${n}`;
    g.userData.isInstance = true;
    for (const k of kids) g.add(i === 0 ? k : k.clone(true));   // copy 1 keeps the originals
    obj.add(g);
  }
  const s = Number(def.instanceSpacing);
  obj.userData.instances = { count: n, length, spacing: Number.isFinite(s) && s >= 0 ? s : length };
  layout(obj);
  return obj;
}

/** Live-update the centre-to-centre spacing (metres). False if `obj` isn't instanced. */
export function setInstanceSpacing(obj, spacing) {
  const inst = obj?.userData?.instances;
  if (!inst || !(spacing >= 0)) return false;
  inst.spacing = spacing;
  layout(obj);
  return true;
}
