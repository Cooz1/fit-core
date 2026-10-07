// Shared GLB loading with a per-URL cache. Both apps go through this so a model
// is only fetched + parsed once. The viewer relies on lazy loading: it calls
// loadGLB() only when an accessory is actually selected, never up front.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { applyLook } from './look.js';

// Draco decoder is self-hosted in /public/draco (no CDN dependency, so the embed
// stays self-contained). Geometry is Draco-compressed; textures are EXT_texture_webp
// which GLTFLoader decodes natively. Override the path with window.LOADOUT_DRACO_PATH
// if the app is served from a sub-path.
const _draco = new DRACOLoader();
_draco.setDecoderPath((typeof window !== 'undefined' && window.LOADOUT_DRACO_PATH) || '/draco/');
/** Where the Draco decoder lives. The embed sets it from assetsBaseUrl before its first load; it
 *  only matters until the decoder has been fetched once. */
export function setDecoderPath(path) { _draco.setDecoderPath(path); }
const _loader = new GLTFLoader();
_loader.setDRACOLoader(_draco);
/** @type {Map<string, Promise<import('three').Object3D>>} */
const _cache = new Map();

/**
 * @typedef {Object} NormalizeSpec
 * @property {number} realLength   target size (metres) for the model's LONGEST axis
 * @property {string} [forward]    which RAW model axis is "forward" → mapped to +X (default '+x')
 * @property {string} [up]         which RAW model axis is "up"      → mapped to +Y (default '+y')
 */

const _AXIS = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0],
  '+y': [0, 1, 0], '-y': [0, -1, 0],
  '+z': [0, 0, 1], '-z': [0, 0, -1],
};

// Rotation that takes the raw basis (forward, up, right) onto the standard
// basis (+X, +Y, +Z): forward→+X, up→+Y, right→+Z.  A = [f|u|r] as columns
// maps standard→raw, so its transpose maps raw→standard.
function orientationQuat(forward = '+x', up = '+y') {
  const f = new THREE.Vector3(...(_AXIS[forward] || _AXIS['+x']));
  const u = new THREE.Vector3(...(_AXIS[up] || _AXIS['+y']));
  const r = new THREE.Vector3().crossVectors(f, u);
  if (r.lengthSq() < 1e-6) return new THREE.Quaternion(); // forward∥up → give up, stay as-is
  const A = new THREE.Matrix4().makeBasis(f, u, r).transpose();
  return new THREE.Quaternion().setFromRotationMatrix(A);
}

/**
 * Normalize a raw Meshy (or any) model into a predictable pose ONCE, so every
 * weapon/accessory lands the same way regardless of how it came out of the AI:
 *   • orient  — forward axis → +X, up axis → +Y
 *   • scale   — uniform, so the longest bounding-box axis = realLength (metres)
 *   • centre  — bounding-box centre → origin
 *
 * The result is an outer Group whose OWN transform is identity, with all of the
 * above baked into a single child. That keeps the gizmo/mount maths clean: the
 * calibration gizmo and the saved mount points operate on the identity outer
 * group (position in metres, scale a clean 1.0), while the real-world-sized
 * geometry rides along inside.
 *
 * @param {import('three').Object3D} obj  a freshly-loaded (cloned) scene — mutated
 * @param {NormalizeSpec} [spec]
 * @returns {import('three').Object3D}
 */
export function normalizeModel(obj, spec) {
  if (!spec) return obj;
  const { realLength, forward = '+x', up = '+y' } = spec;
  const inner = obj;

  // 1. orient, then measure the oriented (unscaled) bounding box
  inner.quaternion.copy(orientationQuat(forward, up));
  inner.position.set(0, 0, 0);
  inner.scale.setScalar(1);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // 2. uniform scale so the longest axis hits realLength
  const longest = Math.max(size.x, size.y, size.z) || 1;
  const s = realLength ? realLength / longest : 1;

  // 3. bake scale + recentre onto the inner child. world = pos + s·R(v), and the
  //    oriented centre is `center`, so pos = -s·center puts the centre at origin.
  inner.scale.setScalar(s);
  inner.position.copy(center).multiplyScalar(-s);
  inner.updateMatrix();

  const outer = new THREE.Group();
  outer.add(inner);
  outer.userData.normalize = { realLength, forward, up, scale: s };
  return outer;
}

/**
 * Load a GLB by URL and resolve its scene (an Object3D). Cached by URL.
 * Returns a fresh clone each call so the same model can be placed in multiple
 * scenes / slots without sharing a transform. Pass a NormalizeSpec to bake a
 * predictable pose/scale into the returned object (see normalizeModel).
 * Every copy gets its own materials with the runtime look (shared/look.js) applied,
 * plus the product's own `material` override when given.
 * @param {string} url
 * @param {NormalizeSpec} [normalize]
 * @param {import('./schema.js').MaterialOverride} [material]
 * @returns {Promise<import('three').Object3D>}
 */
export async function loadGLB(url, normalize, material) {
  return applyLook(await loadGLBAsAuthored(url, normalize), material);
}

/** The model with its materials exactly as authored (shared with the cache — don't edit them). Diagnostics only. */
export async function loadGLBAsAuthored(url, normalize) {
  if (!_cache.has(url)) {
    _cache.set(
      url,
      _loader.loadAsync(url).then((gltf) => gltf.scene),
    );
  }
  const scene = await _cache.get(url);
  return normalizeModel(scene.clone(true), normalize);
}

/** Load directly from a File/Blob (calibration "load GLB from disk"). Not cached. */
export async function loadGLBFromFile(file, normalize) {
  const url = URL.createObjectURL(file);
  try {
    const gltf = await _loader.loadAsync(url);
    return applyLook(normalizeModel(gltf.scene, normalize));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function clearGLBCache() {
  _cache.clear();
}
