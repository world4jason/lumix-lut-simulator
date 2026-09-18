import { useCallback, useRef, type ReactNode } from 'react';

interface Props {
  /** Wipe position in [0,1], or null to show the frame with no wipe at all. */
  split: number | null;
  onSplitChange: (split: number) => void;
  label: string;
  leftTag?: string;
  rightTag?: string;
  children: ReactNode;
}

/**
 * Drag-to-wipe chrome: the handle, the edge labels and the pointer maths.
 * What sits underneath is the caller's business -- two stills, or a canvas
 * that renders its own split.
 *
 * The frame stays mounted even when the wipe is off, so a <canvas> child keeps
 * its identity: remounting it would orphan the WebGL context bound to the old
 * element and leave the canvas blank.
 */
export function WipeFrame({
  split,
  onSplitChange,
  label,
  leftTag = 'BEFORE',
  rightTag = 'AFTER',
  children,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const active = split !== null;

  const moveTo = useCallback(
    (clientX: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      onSplitChange(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
    },
    [onSplitChange],
  );

  return (
    <div
      ref={frameRef}
      className={active ? 'wipe' : 'wipe wipe-off'}
      onPointerDown={(event) => {
        if (!active) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (!active) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
      }}
    >
      {children}
      {active ? (
        <>
          <div className="wipe-handle" style={{ left: `${split * 100}%` }} aria-hidden />
          <span className="wipe-tag wipe-tag-left">{leftTag}</span>
          <span className="wipe-tag wipe-tag-right">{rightTag}</span>
          <input
            className="wipe-input"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={split}
            aria-label={label}
            onChange={(event) => onSplitChange(Number(event.target.value))}
          />
        </>
      ) : null}
    </div>
  );
}
