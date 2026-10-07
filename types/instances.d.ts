import * as THREE from 'three';
/** How many copies an accessory renders (default 1). */
export declare function instanceCount(def: any): number;
/**
 * Turn a freshly loaded accessory (loadGLB's identity outer group) into `def.instances`
 * copies laid out along its local +X. Call straight after loadGLB, before placing it.
 * No-op for single-instance accessories, and idempotent.
 * Records `userData.instances = { count, length, spacing }` (metres; `length` is one
 * copy's extent along the rail). Spacing defaults to `length` (copies end to end).
 * @returns {THREE.Object3D} the same object, mutated
 */
export declare function applyInstances(obj: any, def: any): THREE.Object3D;
/** Live-update the centre-to-centre spacing (metres). False if `obj` isn't instanced. */
export declare function setInstanceSpacing(obj: any, spacing: any): boolean;
