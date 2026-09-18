import { FRAME_GROUPS, groupOf, type FrameGroup } from '../lib/sampleGroups';

interface Props {
  /** The shared frames the strip offers, to count each group. */
  ids: string[];
  value: FrameGroup | 'all';
  onChange: (group: FrameGroup | 'all') => void;
}

/** Narrows a frame strip to one kind of picture. See lib/sampleGroups.ts. */
export function FrameGroupTabs({ ids, value, onChange }: Props) {
  return (
    <div className="chips frame-groups" role="tablist" aria-label="Which frames to show">
      {FRAME_GROUPS.map((group) => {
        const count = ids.filter((id) => groupOf(id) === group.id).length;
        if (!count) return null;
        return (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={value === group.id}
            className={value === group.id ? 'chip on' : 'chip'}
            onClick={() => onChange(group.id)}
          >
            {group.label} <em>{count}</em>
          </button>
        );
      })}
      <button
        type="button"
        role="tab"
        aria-selected={value === 'all'}
        className={value === 'all' ? 'chip on' : 'chip'}
        onClick={() => onChange('all')}
      >
        All <em>{ids.length}</em>
      </button>
    </div>
  );
}
