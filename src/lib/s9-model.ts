export const DEFAULT_SLOT = '@s9-vlog';
export interface S9Doc {
  version: 1;
  rev: number;
  slots: (string | null)[];
  candidates: string[];
}
export type S9Target = { kind: 'slot'; index: number } | { kind: 'slot-insert'; before: number } | { kind: 'candidate'; before: string | null };
export type S9Action =
  | { type: 'add'; code: string }
  | { type: 'remove'; code: string }
  | { type: 'move'; code: string; target: S9Target };
export const emptyS9 = (): S9Doc => ({ version: 1, rev: 0, slots: [DEFAULT_SLOT, ...Array(38).fill(null)], candidates: [] });
export function validS9(value: unknown): value is S9Doc {
  if (!value || typeof value !== 'object') return false;
  const d = value as S9Doc;
  if (d.version !== 1 || !Number.isSafeInteger(d.rev) || d.rev < 0 || !Array.isArray(d.slots) ||
      d.slots.length !== 39 || d.slots[0] !== DEFAULT_SLOT || !Array.isArray(d.candidates)) return false;
  if (!d.slots.every(c => c === null || (typeof c === 'string' && c.length > 0)) ||
      !d.candidates.every(c => typeof c === 'string' && c.length > 0)) return false;
  const all = [...d.slots.filter(c => c !== null), ...d.candidates];
  return new Set(all).size === all.length;
}
export function s9Location(doc: S9Doc, code: string): string | null {
  const slot = doc.slots.indexOf(code);
  if (slot >= 0) return `List ${String(slot + 1).padStart(2, '0')}`;
  const candidate = doc.candidates.indexOf(code);
  return candidate < 0 ? null : `Candidates · ${candidate + 1}`;
}
/** Row drops swap; slot gaps reorder the intervening slots, including empty ones. */
export function applyS9(doc: S9Doc, action: S9Action): S9Doc {
  if (action.code === DEFAULT_SLOT) return doc;
  const slots = [...doc.slots];
  const candidates = [...doc.candidates];
  const si = slots.indexOf(action.code);
  const ci = candidates.indexOf(action.code);
  if (action.type === 'add') {
    if (si >= 0 || ci >= 0 || !action.code) return doc;
    candidates.push(action.code);
  } else if (action.type === 'remove') {
    if (si > 0) slots[si] = null;
    else if (ci >= 0) candidates.splice(ci, 1);
    else return doc;
  } else {
    if (si < 0 && ci < 0) return doc;
    if (action.target.kind === 'slot-insert') {
      const before = action.target.before;
      // Only reorder existing camera slots. Candidate placement remains an explicit slot choice.
      if (si < 1 || !Number.isInteger(before) || before < 1 || before > 39 || before === si || before === si + 1) return doc;
      slots.splice(si, 1);
      slots.splice(before > si ? before - 1 : before, 0, action.code);
    } else if (action.target.kind === 'slot') {
      const ti = action.target.index;
      if (!Number.isInteger(ti) || ti < 1 || ti > 38 || ti === si) return doc;
      const replaced = slots[ti];
      slots[ti] = action.code;
      if (si > 0) slots[si] = replaced;
      else if (replaced) candidates[ci] = replaced;
      else candidates.splice(ci, 1);
    } else {
      const before = action.target.before;
      if (before === action.code || (before !== null && !candidates.includes(before))) return doc;
      if (si > 0) slots[si] = null;
      if (ci >= 0) candidates.splice(ci, 1);
      const index = before === null ? candidates.length : candidates.indexOf(before);
      candidates.splice(index, 0, action.code);
    }
  }
  return { ...doc, slots, candidates };
}
