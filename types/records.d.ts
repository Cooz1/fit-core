/** @returns {Transform} the identity transform (no move / no rotation / unit scale) */
export declare const identityTransform: () => Transform;
/** Deep-clone a Transform (defensive copy for editing). @returns {Transform} */
export declare const cloneTransform: (t: any) => Transform;
/** Round every component of a Transform to `p` decimals (keeps JSON tidy). */
export declare function roundTransform(t: any, p?: number): {
    position: any;
    rotation: any;
    scale: any;
};
/** @returns {string[]} validate an optional NormalizeSpec ([] means valid / absent) */
export declare function validateNormalize(nz: any, where?: string): string[];
/** @returns {string[]} list of problems ([] means valid) */
export declare function validateTransform(t: any, where?: string): string[];
/** @returns {string[]} */
/** @returns {string[]} */
export declare function validateMaterialOverride(m: any, where?: string): string[];
