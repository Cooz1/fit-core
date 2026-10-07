// ─────────────────────────────────────────────────────────────────────────────
// LOOK — how models are shaded at runtime. Shared by the calibration tool and the viewer
// (and diagnostics/lighting-test), so a product looks the same everywhere.
//
// The Meshy exports come out uniformly matte — their roughness texture averages 0.53–0.60 —
// which measured as the biggest gap to the product photos (brightest highlights 128 vs 204).
// So every model's roughness is halved (≈0.27–0.30 effective; the texture's own variation is
// kept), and both scenes get a dark softbox studio as environment map so the gloss has
// something to reflect. A product can tune its own look with `material` in the accessory
// registry, a rifle with `material` in its config (see schema.js). Runtime only: the GLB files
// are never changed.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

/** multiplies each material's roughness factor (glTF: factor × the roughness texture) */
export const ROUGHNESS_FACTOR = 0.5;
/** strength of the studio environment map */
export const ENVIRONMENT_INTENSITY = 0.8;

// The studio: black surroundings and four softboxes, like a product-photo set. Glossy parts
// reflect the softboxes as crisp highlights, and since most of the sphere is black the map adds
// little light to faces that don't see a softbox. (three's RoomEnvironment, used at first, is a
// bright grey room: it lit every face from every side and lifted the black anodised bodies to
// mid-grey — the ARO EVO's dark tones went 42 → 85 against the photo's 50.)
// Measured in diagnostics/lighting-test against the product photos.
const SOFTBOXES = [
  // [width, height, position, radiance] — each turned to face the centre of the studio
  [8, 1.2, [0, 6, 0.01], 18],   // overhead strip: the long highlight along the top of a body (a hair off vertical so it runs along x)
  [4, 3, [3, 4, 4], 6],         // key: front right, above
  [1, 6, [-6, 1.5, 1], 8],      // strip, left
  [1, 6, [4, 1.5, -5], 8],      // strip, back right (rim)
];
function softboxStudio() {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x000000);  // PMREM would otherwise use the renderer's clear colour
  for (const [w, h, [x, y, z], radiance] of SOFTBOXES) {
    const box = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    box.material.color.setScalar(radiance);
    box.position.set(x, y, z);
    box.lookAt(0, 0, 0);
    studio.add(box);
  }
  return studio;
}

const _env = new WeakMap();
/** The prefiltered studio environment, one per renderer. */
export function studioEnvironment(renderer) {
  if (!_env.has(renderer)) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const studio = softboxStudio();
    _env.set(renderer, pmrem.fromScene(studio, 0.04).texture);
    studio.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    pmrem.dispose();
  }
  return _env.get(renderer);
}
/** Give a scene the studio environment at the standard strength. */
export function lightWithStudio(scene, renderer) {
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
}

/**
 * Give a loaded model its own copies of its materials, then the default look and any per-product
 * override. The copies matter: the loader's clone(true) shares material objects with its cache, so
 * editing them in place would leak into every other copy of that model.
 * @param {import('three').Object3D} object
 * @param {import('./schema.js').MaterialOverride} [override]   the product's / rifle's `material`
 */
export function applyLook(object, override) {
  const copies = new Map();                          // one copy per original, if a model reuses a material
  const own = (m) => { if (!copies.has(m)) copies.set(m, tune(m.clone(), override)); return copies.get(m); };
  object.traverse((o) => {
    if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material);
  });
  return object;
}

function tune(m, o = {}) {
  if (!m.isMeshStandardMaterial) return m;
  m.roughness *= ROUGHNESS_FACTOR;
  // baseColor tints the base-colour texture (glTF baseColorFactor) — a colour, or a number / [r,g,b]
  // that scales it in linear light (may exceed 1); roughness / metalness set an ABSOLUTE value for the whole
  // model, replacing that channel of its texture (a factor can't raise a texture that's ~0, nor
  // correct one that's simply wrong — the Marksman's claims 0.96 metal, polymer stock included)
  if (typeof o.baseColor === 'number') m.color.multiplyScalar(o.baseColor);
  else if (Array.isArray(o.baseColor)) m.color.multiply(new THREE.Color().setRGB(...o.baseColor));   // linear, like the number
  else if (o.baseColor) m.color.multiply(new THREE.Color(o.baseColor));
  if (o.roughness != null) { m.roughness = o.roughness; m.roughnessMap = null; }
  if (typeof o.metalness === 'number') { m.metalness = o.metalness; m.metalnessMap = null; }
  else if (o.metalness?.baseColorAbove != null) metalWhereLight(m, o.metalness.baseColorAbove);
  m.needsUpdate = true;
  return m;
}

// metalness { baseColorAbove }: metal wherever the base-colour texture — as authored, before baseColor —
// is light, non-metal elsewhere. Only for a model whose light parts are its metal ones (the bipod's steel
// yoke; its legs are black). The metal keeps the texture's own colour: baseColor levels / neutralises the
// non-metal paint, and on the steel its per-channel factors showed as a green cast.
const LUMA = 'vec3( 0.2126, 0.7152, 0.0722 )';
function metalWhereLight(m, threshold) {
  const t = threshold.toFixed(3);
  m.metalness = 1; m.metalnessMap = null;
  m.onBeforeCompile = (shader) => {
    const include = '#include <metalnessmap_fragment>';
    if (!shader.fragmentShader.includes(include)) return console.warn('[look] metalness baseColorAbove: no metalness step in this shader — ignored');
    shader.fragmentShader = shader.fragmentShader.replace(include, `
      vec3 authored = diffuseColor.rgb / max( diffuse, vec3( 1e-4 ) );   // the texture before baseColor
      float metalnessFactor = step( ${t}, dot( authored, ${LUMA} ) );
      diffuseColor.rgb = mix( diffuseColor.rgb, authored, metalnessFactor );`);
  };
  m.customProgramCacheKey = () => `metal-where-light-${t}`;
}
