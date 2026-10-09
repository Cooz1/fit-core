// ─────────────────────────────────────────────────────────────────────────────
// GIZMO — the keyboard, nudge and history layer around three's TransformControls.
//
// The gizmo itself is TransformControls, a stock three addon. There is nothing to
// share there: both apps construct their own. What IS worth sharing is everything
// around it — how far an arrow key moves a thing, what local versus world means
// for a nudge, how far a pixel of drag-scrub moves a field, and the undo stack
// every change funnels through. Those were written once for the weapon
// calibration tool and are wanted identically in the loadout one, which is the
// definition of a thing that belongs in this package.
//
// Framework-free on purpose, and that is the whole constraint. The weapon tool
// drives this from vanilla DOM handlers (`$('stepMM').value`,
// `classList.toggle('on')`); the loadout tool drives it from React state. Neither
// flavour of wiring can live here — not because it would be ugly, but because
// fit-core is imported by Next server routes that must never see a `document`.
// So this module takes numbers and objects and gives back numbers and objects.
// Which button is lit is the app's problem.
//
// The split, for anyone wondering why this file is small: of the ~260 lines that
// surround the gizmo in the weapon tool, about 110 are portable (here), about 90
// are DOM wiring that can only be rewritten per app, and about 60 are
// weapon-specific (adapter carry, mirror across the rail, solo/isolate). This is
// the 110.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { readTransform, applyTransform, sameTransform } from './transform.js';

/** @typedef {'translate'|'rotate'|'scale'} GizmoMode */
/** @typedef {'local'|'world'} GizmoSpace */
/** @typedef {'X'|'Y'|'Z'} GizmoAxis */

export const GIZMO_MODES = /** @type {const} */ (['translate', 'rotate', 'scale']);
export const GIZMO_AXES = /** @type {const} */ (['X', 'Y', 'Z']);

/** Shift coarsens a nudge, Alt refines it. Shift wins if somebody holds both. */
export const NUDGE_COARSE = 10;
export const NUDGE_FINE = 0.1;

/**
 * Scale applies in object units, not millimetres, so it has no step field to read
 * from — it nudges by a fixed 1%.
 */
export const SCALE_NUDGE = 0.01;

/** A scale factor can approach zero but must not reach it; a zero-scaled object cannot be recovered by dragging. */
export const MIN_SCALE = 0.01;

/** Units a single pixel of horizontal drag-scrub is worth, per field kind. */
export const SCRUB_UNITS_PER_PX = { pos: 0.0005, rot: 0.2, scl: 0.004 };

/** How far a drag must travel before it counts as a scrub rather than a click. */
export const SCRUB_DEADZONE_PX = 3;

/** How far a pointer may travel between down and up and still count as a pick, not an orbit. */
export const PICK_SLOP_PX = 5;

const _ax = new THREE.Vector3();
const _prev = new THREE.Vector3();

/** @returns {number} 10 with Shift, 0.1 with Alt, 1 with neither. Shift wins. */
export function nudgeMultiplier(coarse = false, fine = false) {
  return coarse ? NUDGE_COARSE : fine ? NUDGE_FINE : 1;
}

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
export function nudgeObject(obj, opts = {}) {
  const {
    mode = 'translate', space = 'local', axis = 'X', sign = 1,
    stepMM = 1, stepDeg = 1, coarse = false, fine = false,
  } = opts;

  const ai = GIZMO_AXES.indexOf(axis);
  if (ai < 0) throw new Error(`nudgeObject: axis must be one of ${GIZMO_AXES.join(', ')}, got ${JSON.stringify(axis)}`);
  if (!GIZMO_MODES.includes(mode)) throw new Error(`nudgeObject: mode must be one of ${GIZMO_MODES.join(', ')}, got ${JSON.stringify(mode)}`);
  if (sign !== 1 && sign !== -1) throw new Error(`nudgeObject: sign must be 1 or -1, got ${JSON.stringify(sign)}`);

  const mult = nudgeMultiplier(coarse, fine);

  if (mode === 'translate') {
    // steps are authored in mm because that is what a caliper reads; the scene is metres
    const d = ((stepMM || 0) / 1000) * mult * sign;
    if (space === 'local') { _ax.set(0, 0, 0).setComponent(ai, 1); obj.translateOnAxis(_ax, d); }
    else obj.position.setComponent(ai, obj.position.getComponent(ai) + d);
  } else if (mode === 'rotate') {
    const ang = ((stepDeg || 0) * Math.PI / 180) * mult * sign;
    _ax.set(0, 0, 0).setComponent(ai, 1);
    if (space === 'local') obj.rotateOnAxis(_ax, ang); else obj.rotateOnWorldAxis(_ax, ang);
  } else {
    const d = SCALE_NUDGE * mult * sign;
    obj.scale.setComponent(ai, Math.max(MIN_SCALE, obj.scale.getComponent(ai) + d));
  }

  obj.updateMatrix();
  return obj;
}

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
export function scrubValue(startVal, dx, kind, { coarse = false, fine = false } = {}) {
  const per = typeof kind === 'number' ? kind : SCRUB_UNITS_PER_PX[kind];
  if (per == null) throw new Error(`scrubValue: unknown field kind ${JSON.stringify(kind)}`);
  return startVal + dx * per * nudgeMultiplier(coarse, fine);
}

// ── history ───────────────────────────────────────────────────────────────────

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
export class TransformHistory {
  /**
   * `limit` is Infinity by default. A silently capped stack is a Ctrl+Z that
   * stops working after a long session with nothing to say for itself; a caller
   * that wants a cap can ask for one.
   *
   * @param {{limit?:number, onChange?:(h:TransformHistory)=>void,
   *          apply?:(obj:import('three').Object3D, t:object)=>void,
   *          afterMutate?:(obj:import('three').Object3D, before:object)=>void}} [opts]
   */
  constructor({ limit = Infinity, onChange = null, apply = null, afterMutate = null } = {}) {
    this.limit = limit;
    this.onChange = onChange;
    this._apply = apply || ((obj, t) => { applyTransform(obj, t); obj.updateMatrix(); });
    this._afterMutate = afterMutate;
    /** @type {{object:import('three').Object3D, before:object, after:object}[]} */
    this.undoStack = [];
    /** @type {{object:import('three').Object3D, before:object, after:object}[]} */
    this.redoStack = [];
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  _changed() { this.onChange?.(this); }

  /**
   * Record a change somebody else already made. No-op if nothing actually moved,
   * so a click that selects without dragging does not litter the stack.
   * @returns {boolean} whether it was recorded
   */
  record(object, before, after) {
    if (sameTransform(before, after)) return false;
    this.undoStack.push({ object, before, after });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
    this._changed();
    return true;
  }

  /**
   * Snapshot, mutate, snapshot, record — the shape of every discrete command.
   * @returns {boolean} whether anything changed
   */
  commit(object, mutate) {
    const before = readTransform(object);
    mutate();
    object.updateMatrix();
    this._afterMutate?.(object, before);
    return this.record(object, before, readTransform(object));
  }

  /** @returns {{object:import('three').Object3D, before:object, after:object}|null} the entry undone */
  undo() {
    const c = this.undoStack.pop();
    if (!c) return null;
    this._apply(c.object, c.before);
    this.redoStack.push(c);
    this._changed();
    return c;
  }

  /** @returns {{object:import('three').Object3D, before:object, after:object}|null} the entry redone */
  redo() {
    const c = this.redoStack.pop();
    if (!c) return null;
    this._apply(c.object, c.after);
    this.undoStack.push(c);
    this._changed();
    return c;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this._changed();
  }
}

/**
 * Move an object's position while carrying a rider by the same delta.
 * Exported because both apps have a case for it — the weapon tool's adapters,
 * and anything the loadout tool later parents to a patch.
 */
export function carryDelta(object, prevPosition, rider) {
  if (!rider) return;
  _prev.copy(object.position).sub(prevPosition);
  if (_prev.lengthSq() < 1e-14) return;
  rider.position.add(_prev);
  rider.updateMatrix();
}

// ── keyboard ──────────────────────────────────────────────────────────────────

/**
 * The shared shortcut table, for rendering a legend. Apps append their own.
 * @type {[string, string][]}
 */
export const GIZMO_SHORTCUTS = [
  ['W / E / R', 'Move / Rotate / Scale'],
  ['X', 'Toggle local ↔ world'],
  ['1 / 2 / 3', 'Nudge axis X / Y / Z'],
  ['Arrows', 'Nudge along the active axis'],
  ['Shift + arrows', 'Nudge ×10'],
  ['Alt + arrows', 'Nudge ×0.1'],
  ['Ctrl+Z', 'Undo'],
  ['Ctrl+Shift+Z', 'Redo'],
];

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
export function gizmoKeyAction(e) {
  const tag = /** @type {HTMLElement|null} */ (e.target)?.tagName || '';
  const typing = /input|select|textarea/i.test(tag) ||
    /** @type {HTMLElement|null} */ (e.target)?.isContentEditable === true;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = typeof e.key === 'string' ? e.key : '';

  // undo/redo work even while typing — a field edit is itself an undoable change
  if (ctrl && k.toLowerCase() === 'z') return { type: e.shiftKey ? 'redo' : 'undo', preventDefault: true };
  if (ctrl && k.toLowerCase() === 'y') return { type: 'redo', preventDefault: true };

  if (typing) return null;   // the focused field owns its keys, arrows included
  if (ctrl) return null;     // leave other browser shortcuts alone
  if (e.altKey && !k.startsWith('Arrow')) return null;   // Alt is only meaningful for fine-nudge arrows

  switch (k) {
    case 'w': case 'W': return { type: 'mode', mode: 'translate' };
    case 'e': case 'E': return { type: 'mode', mode: 'rotate' };
    case 'r': case 'R': return { type: 'mode', mode: 'scale' };
    case 'x': case 'X': return { type: 'space' };
    case '1': return { type: 'axis', axis: 'X' };
    case '2': return { type: 'axis', axis: 'Y' };
    case '3': return { type: 'axis', axis: 'Z' };
    case 'ArrowUp': case 'ArrowRight':
      return { type: 'nudge', sign: 1, coarse: e.shiftKey, fine: e.altKey, preventDefault: true };
    case 'ArrowDown': case 'ArrowLeft':
      return { type: 'nudge', sign: -1, coarse: e.shiftKey, fine: e.altKey, preventDefault: true };
  }
  return { type: 'passthrough', key: k };
}

/** The other space. Spelled out so neither app re-types the ternary. */
export const otherSpace = (space) => (space === 'local' ? 'world' : 'local');
