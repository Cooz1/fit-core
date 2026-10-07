import * as THREE from 'three';
/** multiplies each material's roughness factor (glTF: factor × the roughness texture) */
export declare const ROUGHNESS_FACTOR = 0.5;
/** strength of the studio environment map */
export declare const ENVIRONMENT_INTENSITY = 0.8;
/** The prefiltered studio environment, one per renderer. */
export declare function studioEnvironment(renderer: any): any;
/** Give a scene the studio environment at the standard strength. */
export declare function lightWithStudio(scene: any, renderer: any): void;
/**
 * Give a loaded model its own copies of its materials, then the default look and any per-product
 * override. The copies matter: the loader's clone(true) shares material objects with its cache, so
 * editing them in place would leak into every other copy of that model.
 * @param {import('three').Object3D} object
 * @param {import('./schema.js').MaterialOverride} [override]   the product's / rifle's `material`
 */
export declare function applyLook(object: import('three').Object3D, override?: import('./schema.js').MaterialOverride): THREE.Object3D<THREE.Object3DEventMap>;
