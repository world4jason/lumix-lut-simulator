import { useState } from 'react';
import { WipeFrame } from './WipeFrame';

interface Props {
  before: string | null;
  after: string | null;
  alt: string;
  /** The signal on the left of the wipe, named on the label itself. */
  beforeSignal?: string;
}

/** Drag-to-wipe comparison between the catalog's before and after stills. */
export function BeforeAfter({ before, after, alt, beforeSignal }: Props) {
  const [split, setSplit] = useState(0.5);

  return (
    // Not every source publishes an ungraded frame. Passing a null split turns
    // the wipe off -- handle and edge labels included -- rather than putting a
    // BEFORE label on the graded still and letting it be dragged against
    // itself, which would read as a comparison that was never made.
    <WipeFrame
      split={before ? split : null}
      onSplitChange={setSplit}
      label={`Before/after wipe for ${alt}`}
      leftTag={beforeSignal ? `BEFORE · ${beforeSignal}` : 'BEFORE'}
    >
      {after ? <img src={after} alt={`${alt} with the LUT applied`} draggable={false} /> : null}
      {before ? (
        <div className="wipe-clip" style={{ width: `${split * 100}%` }}>
          <img src={before} alt={`${alt} before the LUT`} draggable={false} />
        </div>
      ) : null}
    </WipeFrame>
  );
}
