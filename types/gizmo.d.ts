export type GizmoMode = 'translate' | 'rotate' | 'scale';
export type GizmoSpace = 'local' | 'world';
export type GizmoAxis = 'X' | 'Y' | 'Z';
/** @typedef {'translate'|'rotate'|'scale'} GizmoMode */
/** @typedef {'local'|'world'} GizmoSpace */
/** @typedef {'X'|'Y'|'Z'} GizmoAxis */
export declare const GIZMO_MODES: readonly ['translate', 'rotate', 'scale'];
export declare const GIZMO_AXES: readonly ['X', 'Y', 'Z'];
/** Shift coarsens a nudge, Alt refines it. Shift wins if somebody holds both. */
export declare const NUDGE_COARSE = 10;
export declare const NUDGE_FINE = 0.1;
/**
 * Scale applies in object units, not millimetres, so it has no step field to read
 * from — it nudges by a fixed 1%.
 */
export declare const SCALE_NUDGE = 0.01;
/** A scale factor can approach zero but must not reach it; a zero-scaled object cannot be recovered by dragging. */
export declare const MIN_SCALE = 0.01;
/** Units a single pixel of horizontal drag-scrub is worth, per field kind. */
export declare const SCRUB_UNITS_PER_PX: {
    pos: number;
    rot: number;
    scl: number;
};
/** How far a drag must travel before it counts as a scrub rather than a click. */
export declare const SCRUB_DEADZONE_PX = 3;
/** How far a pointer may travel between down and up and still count as a pick, not an orbit. */
export declare const PICK_SLOP_PX = 5;
/** @returns {number} 10 with Shift, 0.1 with Alt, 1 with neither. Shift wins. */
export declare function nudgeMultiplier(coarse?: boolean, fine?: boolean): number;
/**
 * Move, turn or scale an object by one nudge step along the active axis.
 *
 * Mutates the object and leaves its matrix updated. Recording it is the caller's
 * job — go through TransformHistory#commit if you want it undoable, which you do.
 *
 * `space` is the distinction that matters and the one that is easy to get wrong:
 * a local translate runs along the object's own axis after rotation, a world one
 * along the scene's. For an unrotated object they are the same, which is exactly
 * why a bug here hides until the first rotated placement.
 *
 * @param {import('three').Object3D} obj
 * @param {{mode?:GizmoMode, space?:GizmoSpace, axis?:GizmoAxis, sign?:1|-1,
 *          stepMM?:number, stepDeg?:number, coarse?:boolean, fine?:boolean}} opts
 * @returns {import('three').Object3D} the same object
 */
export declare function nudgeObject(obj: import('three').Object3D, opts?: {
    mode?: GizmoMode;
    space?: GizmoSpace;
    axis?: GizmoAxis;
    sign?: 1 | -1;
    stepMM?: number;
    stepDeg?: number;
    coarse?: boolean;
    fine?: boolean;
}): import('three').Object3D;
/**
 * The value a drag-scrub should land on.
 *
 * Separate from nudgeObject because a scrub drives a FIELD, not an object — the
 * field may be a pitch or a cell count that no gizmo can touch.
 *
 * @param {number} startVal value when the drag began
 * @param {number} dx pixels travelled horizontally
 * @param {'pos'|'rot'|'scl'|number} kind a known field kind, or units-per-pixel directly
 */
export declare function scrubValue(startVal: number, dx: number, kind: 'pos' | 'rot' | 'scl' | number, { coarse, fine }?: {
    coarse?: boolean;
    fine?: boolean;
}): number;
/**
 * Undo/redo over object transforms.
 *
 * Every change — gizmo drag, typed field, scrub, nudge, reset, mirror — funnels
 * through record() or commit(), which is the only reason undo is trustworthy. A
 * path that mutates an object without telling this stack is a path that silently
 * breaks Ctrl+Z for everything after it.
 *
 * `apply` exists for the weapon tool: an adapter carries its accessory, so undoing
 * the adapter has to move the rider by the same delta. That rule is weapon-shaped
 * and does not belong in this package, so it is injected.
 */
export declare class TransformHistory {
    limit: number;
    onChange: (h: TransformHistory) => void;
    _apply: (obj: import('three').Object3D, t: object) => void;
    _afterMutate: (obj: import('three').Object3D, before: object) => void;
    /** @type {{object:import('three').Object3D, before:object, after:object}[]} */
    undoStack: {
        object: import('three').Object3D;
        before: object;
        after: object;
    }[];
    /** @type {{object:import('three').Object3D, before:object, after:object}[]} */
    redoStack: {
        object: import('three').Object3D;
        before: object;
        after: object;
    }[];
    /**
     * @param {{limit?:number, onChange?:(h:TransformHistory)=>void,
     *          apply?:(obj:import('three').Object3D, t:object)=>void,
     *          afterMutate?:(obj:import('three').Object3D, before:object)=>void}} [opts]
     */
    constructor({ limit, onChange, apply, afterMutate }?: {
        limit?: number;
        onChange?: (h: TransformHistory) => void;
        apply?: (obj: import('three').Object3D, t: object) => void;
        afterMutate?: (obj: import('three').Object3D, before: object) => void;
    });
    get canUndo(): boolean;
    get canRedo(): boolean;
    _changed(): void;
    /**
     * Record a change somebody else already made. No-op if nothing actually moved,
     * so a click that selects without dragging does not litter the stack.
     * @returns {boolean} whether it was recorded
     */
    record(object: any, before: any, after: any): boolean;
    /**
     * Snapshot, mutate, snapshot, record — the shape of every discrete command.
     * @returns {boolean} whether anything changed
     */
    commit(object: any, mutate: any): boolean;
    /** @returns {{object:import('three').Object3D, before:object, after:object}|null} the entry undone */
    undo(): {
        object: import('three').Object3D;
        before: object;
        after: object;
    } | null;
    /** @returns {{object:import('three').Object3D, before:object, after:object}|null} the entry redone */
    redo(): {
        object: import('three').Object3D;
        before: object;
        after: object;
    } | null;
    clear(): void;
}
/**
 * Move an object's position while carrying a rider by the same delta.
 * Exported because both apps have a case for it — the weapon tool's adapters,
 * and anything the loadout tool later parents to a patch.
 */
export declare function carryDelta(object: any, prevPosition: any, rider: any): void;
/**
 * The shared shortcut table, for rendering a legend. Apps append their own.
 * @type {[string, string][]}
 */
export declare const GIZMO_SHORTCUTS: [string, string][];
export type GizmoKeyAction = {
    type: 'undo' | 'redo' | 'space';
    preventDefault?: boolean;
} | {
    type: 'mode';
    mode: GizmoMode;
} | {
    type: 'axis';
    axis: GizmoAxis;
} | {
    type: 'nudge';
    sign: 1 | -1;
    coarse: boolean;
    fine: boolean;
    preventDefault: true;
} | {
    type: 'passthrough';
    key: string;
};
/**
 * @typedef {{type:'undo'|'redo'|'space', preventDefault?:boolean}
 *         | {type:'mode', mode:GizmoMode}
 *         | {type:'axis', axis:GizmoAxis}
 *         | {type:'nudge', sign:1|-1, coarse:boolean, fine:boolean, preventDefault:true}
 *         | {type:'passthrough', key:string}} GizmoKeyAction
 */
/**
 * Map a keydown to a gizmo action.
 *
 * Returns `null` when the event is not the gizmo's to handle at all — somebody is
 * typing in a field, or it is a browser shortcut. Returns `{type:'passthrough'}`
 * when the event IS eligible but matches no shared binding, so an app can run its
 * own switch without re-deriving the guards. Getting those guards right is most of
 * the value here: the reason arrows nudge the selection but not the caret inside a
 * number field is one `typing` test, and every app that forgets it ships the bug.
 *
 * @param {KeyboardEvent} e
 * @returns {GizmoKeyAction|null}
 */
export declare function gizmoKeyAction(e: KeyboardEvent): GizmoKeyAction | null;
/** The other space. Spelled out so neither app re-types the ternary. */
export declare const otherSpace: (space: any) => "local" | "world";
