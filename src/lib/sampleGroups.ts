/**
 * The shared frames, sorted by what they are pictures of.
 *
 * Thirty-three frames in one row was a strip nobody could scan, and it put
 * portraits between street corners so choosing "a face" meant reading every
 * label. Grouped by eye from the frames themselves: a person who is the
 * subject makes a portrait even outdoors; people at scale in a street stay
 * with the street.
 *
 * Kept here rather than in scripts/build-samples.mjs so regrouping does not
 * mark every render stale. scripts/test/sample-groups.test.mjs fails when a
 * frame in samples.json has no group, or a group names a frame that is gone.
 */
export type FrameGroup = 'people' | 'street' | 'landscape' | 'reference';

export const FRAME_GROUPS: { id: FrameGroup; label: string }[] = [
  { id: 'people', label: 'People' },
  { id: 'street', label: 'Street & buildings' },
  { id: 'landscape', label: 'Landscape & nature' },
  { id: 'reference', label: 'Colour reference' },
];

export const GROUP_OF: Readonly<Record<string, FrameGroup>> = {
  'vlog-portrait': 'people',
  'vlog-skin': 'people',
  'vlog-interior': 'people',
  mural: 'people',
  sunwall: 'people',
  harbour: 'people',
  pier: 'people',
  phbl30: 'people',
  phbl37: 'people',

  s9: 'street',
  phbl09: 'street',
  phbl10: 'street',
  phbl11: 'street',
  phbl21: 'street',
  phbl24: 'street',
  phbl27: 'street',
  phbl29: 'street',
  phbl33: 'street',
  phbl38: 'street',
  phbl40: 'street',
  's9-street2': 'street',
  s1rii25: 'street',

  's9-wide': 'landscape',
  's9-wide2': 'landscape',
  phbl36: 'landscape',
  phbl39: 'landscape',
  s1rii02: 'landscape',
  s1rii11: 'landscape',
  s1rii24: 'landscape',
  s1rii28: 'landscape',

  reference: 'reference',
  huts: 'reference',
  scooter: 'reference',
};

export function groupOf(id: string): FrameGroup | null {
  return GROUP_OF[id] ?? null;
}

/** Opens on the group holding the frame in use, so the selection is visible. */
export function initialGroup(selectedId: string | null, fallbackId: string): FrameGroup | 'all' {
  return groupOf(selectedId ?? fallbackId) ?? 'all';
}

/**
 * Where a look's own still belongs, from the subject the scene tagger read off
 * it. Null for "other", which names no group and so is only offered under All.
 */
export function groupForScene(scene: string | undefined): FrameGroup | null {
  // "interior" is not a people group: of the 16 looks tagged that way, ten
  // hold no person at all -- the tagger counts furniture, food and tableware
  // as interior (scripts/tag-scenes.mjs). They are offered under All instead
  // of being filed with the portraits.
  if (scene === 'portrait' || scene === 'people') return 'people';
  if (scene === 'urban') return 'street';
  if (scene === 'landscape') return 'landscape';
  return null;
}

/**
 * The strip narrowed to one group.
 *
 * Four kinds of item live in a strip and they do not filter alike, which is
 * the bug this signature exists to prevent: a look's own still was kept in
 * every group, so "Street & buildings" showed a portrait for a look whose
 * author photographed a face, and showed two streets for one whose author
 * photographed a street.
 *
 *   glyph  -- not a picture but a mode ("each LUT on its own sample"), always shown
 *   own    -- the look's own still, shown in the group its subject belongs to
 *   global -- a shared frame, shown in its own group
 *   user   -- a frame the viewer added, always shown
 */
export function inGroup<T extends { choice: { kind: string; id?: string }; glyph?: string }>(
  items: T[],
  group: FrameGroup | 'all',
  ownGroup: FrameGroup | null = null,
): T[] {
  if (group === 'all') return items;
  return items.filter((item) => {
    if (item.glyph) return true;
    if (item.choice.kind === 'global') return groupOf(item.choice.id ?? '') === group;
    if (item.choice.kind === 'own') return ownGroup === group;
    return true;
  });
}
