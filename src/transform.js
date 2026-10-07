// three.js bridge for the pure-data Transform in schema.js.
// Keeps three.js out of the schema so the JSON model stays framework-free,
// while both apps share the exact same apply/read/compose math.

import * as THREE from 'three';
import { identityTransform } from './records.js';

/** Write a schema Transform onto an Object3D. */
export function applyTransform(obj, t) {
  obj.position.fromArray(t.position);
  obj.quaternion.fromArray(t.rotation);
  obj.scale.fromArray(t.scale);
  obj.updateMatrix();
}

/** Read a schema Transform off an Object3D (its LOCAL transform). */
export function readTransform(obj) {
  return {
    position: obj.position.toArray(),
    rotation: obj.quaternion.toArray(),
    scale: obj.scale.toArray(),
  };
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/** Build a Matrix4 from a schema Transform. */
export function matrixFromTransform(t, out = new THREE.Matrix4()) {
  _p.fromArray(t.position);
  _q.fromArray(t.rotation);
  _s.fromArray(t.scale);
  return out.compose(_p, _q, _s);
}

/** Decompose a Matrix4 into a schema Transform. */
export function transformFromMatrix(m) {
  m.decompose(_p, _q, _s);
  return { position: _p.toArray(), rotation: _q.toArray(), scale: _s.toArray() };
}

/**
 * Compose a slot's mount-point transform with an accessory's per-item offset.
 * final = mount ∘ offset  (offset is applied in the mount's local frame).
 * The viewer uses this to place an accessory: parent it under the weapon root
 * and give it the returned transform.
 */
export function composeMountAndOffset(mount, offset) {
  const mm = matrixFromTransform(mount, _m.clone());
  if (!offset) return transformFromMatrix(mm);
  const om = matrixFromTransform(offset, new THREE.Matrix4());
  return transformFromMatrix(mm.multiply(om));
}

/**
 * Given a slot default and an object's current LOCAL transform, return the
 * offset (delta) that, composed after the mount, reproduces the object.
 * offset = mount⁻¹ ∘ current.  Used by the calibration tool's "save as offset".
 */
export function offsetFromCurrent(mount, currentTransform) {
  const mm = matrixFromTransform(mount).invert();
  const cm = matrixFromTransform(currentTransform);
  return transformFromMatrix(mm.multiply(cm));
}

// ── weapon-relative mounts ────────────────────────────────────────────────────
// The calibration tool keeps the weapon and accessories as separate scene
// children (so world == local for each). Mount points must be stored in the
// WEAPON's frame, not scene space, so nudging the weapon can't silently corrupt
// them. When the weapon sits at the origin these reduce to plain readTransform /
// composeMountAndOffset, so on-disk values are unchanged for a weapon at origin.

/** Read an accessory's transform expressed in the weapon's local frame:  weapon⁻¹ ∘ accessory. */
export function readMountRelative(weaponObj, accObj) {
  weaponObj.updateMatrix(); accObj.updateMatrix();
  const wInv = weaponObj.matrix.clone().invert();
  return transformFromMatrix(wInv.multiply(accObj.matrix.clone()));
}

/** Scene-space transform to place an accessory from a weapon-relative mount (+ optional offset):  weapon ∘ mount ∘ offset. */
export function worldFromMountRelative(weaponObj, mount, offset) {
  weaponObj.updateMatrix();
  const mm = matrixFromTransform(mount, new THREE.Matrix4());
  if (offset) mm.multiply(matrixFromTransform(offset, new THREE.Matrix4()));
  return transformFromMatrix(weaponObj.matrix.clone().multiply(mm));
}

export { identityTransform };
