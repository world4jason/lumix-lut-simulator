import { useState } from "react";
import type { Lut } from "../types";
import samples from "../data/samples.json";
import { asset } from "../lib/format";
import { FrameGroupTabs } from "./FrameGroupTabs";
import {
  groupForScene,
  initialGroup,
  groupOf,
  type FrameGroup,
} from "../lib/sampleGroups";
import {
  DEFAULT_PREVIEW,
  OFFICIAL_PREVIEW,
  ownPairIsTrustworthy,
} from "../lib/ownStill";
export const GLOBAL_SAMPLES = samples.samples;
export const FALLBACK_SAMPLE_ID = samples.fallbackId;
export type SampleChoice =
  | { kind: "global"; id: string }
  | { kind: "own" }
  | { kind: "user"; id: string };
export function SampleStrip({
  id,
  onChange,
  lut,
  includeOwn = true,
}: {
  id: string;
  onChange: (id: string) => void;
  lut?: Lut;
  includeOwn?: boolean;
}) {
  const ownGroup = lut ? groupForScene(lut.ownScene ?? lut.scene) : null;
  const [group, setGroup] = useState<FrameGroup | "all">(() =>
    id === OFFICIAL_PREVIEW
      ? (ownGroup ?? "all")
      : initialGroup(id === DEFAULT_PREVIEW ? null : id, FALLBACK_SAMPLE_ID),
  );
  const visible = GLOBAL_SAMPLES.filter(
    (s) => group === "all" || groupOf(s.id) === group,
  );
  const ownAvailable = includeOwn && (!lut || !!lut.thumb.after);
  const ownShown =
    ownAvailable && (!lut || group === "all" || ownGroup === group);
  const selected = GLOBAL_SAMPLES.find((s) => s.id === id);
  return (
    <div className="frame-bar">
      <div className="frame-bar-head">
        <span className="chips-label">Shown on</span>
        <strong>
          {id === DEFAULT_PREVIEW
            ? "Each LUT’s official sample"
            : id === OFFICIAL_PREVIEW
              ? "Official sample"
              : selected?.name}
        </strong>
      </div>
      <FrameGroupTabs
        ids={GLOBAL_SAMPLES.map((s) => s.id)}
        value={group}
        onChange={setGroup}
      />
      <div className="strip" aria-label="Sample selection">
        {ownShown ? (
          <button
            type="button"
            className={`strip-item${id === (lut ? OFFICIAL_PREVIEW : DEFAULT_PREVIEW) ? " on" : ""}`}
            title={lut ? "Official sample" : "Each LUT’s official sample"}
            aria-pressed={id === (lut ? OFFICIAL_PREVIEW : DEFAULT_PREVIEW)}
            onClick={() => onChange(lut ? OFFICIAL_PREVIEW : DEFAULT_PREVIEW)}
          >
            {lut?.thumb.after ? (
              <img src={asset(lut.thumb.after)} alt="Official sample" loading="lazy" />
            ) : (
              <span className="strip-glyph">
                <span className="strip-glyph-grid" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                Own
              </span>
            )}
          </button>
        ) : null}
        {visible.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`strip-item${s.id === id ? " on" : ""}`}
            title={s.name}
            aria-pressed={s.id === id}
            onClick={() => onChange(s.id)}
          >
            <img
              src={asset(
                lut && lut.source !== "upload"
                  ? `sample/${s.id}/${lut.code}.webp`
                  : s.before,
              )}
              alt={s.name}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {lut && id === OFFICIAL_PREVIEW && !ownPairIsTrustworthy(lut.code) ? (
        <p className="provenance provenance-interpreted">
          The official sample may use a different input signal than this LUT expects. This is a heuristic assessment, not a definitive finding. Compare with a shared sample.
        </p>
      ) : null}
    </div>
  );
}
