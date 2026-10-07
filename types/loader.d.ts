import * as THREE from 'three';
/** Where the Draco decoder lives. The embed sets it from assetsBaseUrl before its first load; it
 *  only matters until the decoder has been fetched once. */
export declare function setDecoderPath(path: any): void;
export type NormalizeSpec = {
    /**
     * target size (metres) for the axis named by `scaleBy`
     */
    realLength: number;
    /**
     * which ORIENTED axis realLength describes.
     * Axes are named AFTER orientation: forward is +x, up is +y, right is +z. Omitting this
     * means 'longest', which is what every config written before this field existed relies on
     * — correct for a rifle, where the longest axis IS the length, and wrong for anything worn.
     * That silence has cost this project twice: a plate carrier scaled on its DEPTH and read
     * 30% too big, and the mannequin, which is only right on 'longest' by luck because stature
     * happens to be its longest axis. Absence is recorded and reported, not assumed harmless —
     * see implicitScaleAxisWarnings().
     */
    scaleBy?: 'x' | 'y' | 'z' | 'longest';
    /**
     * which RAW model axis is "forward" → mapped to +X (default '+x')
     */
    forward?: string;
    /**
     * which RAW model axis is "up"      → mapped to +Y (default '+y')
     */
    up?: string;
};
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
export declare function normalizeModel(obj: import('three').Object3D, spec?: NormalizeSpec): import('three').Object3D;
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
export declare function loadGLB(url: string, normalize?: NormalizeSpec, material?: import('./schema.js').MaterialOverride): Promise<import('three').Object3D>;
/** The model with its materials exactly as authored (shared with the cache — don't edit them). Diagnostics only. */
export declare function loadGLBAsAuthored(url: any, normalize: any): Promise<THREE.Object3D<THREE.Object3DEventMap>>;
/** Load directly from a File/Blob (calibration "load GLB from disk"). Not cached. */
export declare function loadGLBFromFile(file: any, normalize: any): Promise<THREE.Object3D<THREE.Object3DEventMap>>;
export declare function clearGLBCache(): void;
