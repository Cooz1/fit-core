import * as THREE from 'three';
import { identityTransform } from './records.js';
/** Write a schema Transform onto an Object3D. */
export declare function applyTransform(obj: any, t: any): void;
/** Read a schema Transform off an Object3D (its LOCAL transform). */
export declare function readTransform(obj: any): {
    position: any;
    rotation: any;
    scale: any;
};
/** Build a Matrix4 from a schema Transform. */
export declare function matrixFromTransform(t: any, out?: THREE.Matrix4): THREE.Matrix4;
/** Decompose a Matrix4 into a schema Transform. */
export declare function transformFromMatrix(m: any): {
    position: THREE.Vector3Tuple;
    rotation: THREE.QuaternionTuple;
    scale: THREE.Vector3Tuple;
};
/**
 * Compose a slot's mount-point transform with an accessory's per-item offset.
 * final = mount ∘ offset  (offset is applied in the mount's local frame).
 * The viewer uses this to place an accessory: parent it under the weapon root
 * and give it the returned transform.
 */
export declare function composeMountAndOffset(mount: any, offset: any): {
    position: THREE.Vector3Tuple;
    rotation: THREE.QuaternionTuple;
    scale: THREE.Vector3Tuple;
};
/**
 * Given a slot default and an object's current LOCAL transform, return the
 * offset (delta) that, composed after the mount, reproduces the object.
 * offset = mount⁻¹ ∘ current.  Used by the calibration tool's "save as offset".
 */
export declare function offsetFromCurrent(mount: any, currentTransform: any): {
    position: THREE.Vector3Tuple;
    rotation: THREE.QuaternionTuple;
    scale: THREE.Vector3Tuple;
};
/** Read an accessory's transform expressed in the weapon's local frame:  weapon⁻¹ ∘ accessory. */
export declare function readMountRelative(weaponObj: any, accObj: any): {
    position: THREE.Vector3Tuple;
    rotation: THREE.QuaternionTuple;
    scale: THREE.Vector3Tuple;
};
/** Scene-space transform to place an accessory from a weapon-relative mount (+ optional offset):  weapon ∘ mount ∘ offset. */
export declare function worldFromMountRelative(weaponObj: any, mount: any, offset: any): {
    position: THREE.Vector3Tuple;
    rotation: THREE.QuaternionTuple;
    scale: THREE.Vector3Tuple;
};
export { identityTransform };
/**
 * Do two Transform records describe the same placement?
 *
 * 1e-7 is the tolerance, which is 0.0001 mm at the scene's metre scale — far below
 * anything a GLB or a gizmo can express, so this is an equality test with float
 * slack, not a "close enough" test. Used both to keep no-op edits out of the undo
 * stack and to decide an accessory never moved and should follow the disk mount.
 */
export declare function sameTransform(a: any, b: any): any;
