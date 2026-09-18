import { useState } from "react";
import type { Lut } from "../types";
import { previewOf, DEFAULT_PREVIEW } from "../lib/ownStill";
import { FALLBACK_SAMPLE_ID } from "./SampleStrip";
import { asset } from "../lib/format";
import { beforeFrameFor, photoStyleLabel } from "../lib/photoStyle";
import { changeS9, useS9 } from "../lib/s9";
import { s9Location } from "../lib/s9-model";
interface Props {
  lut: Lut;
  previewUrl?: string;
  sampleId?: string | null;
  onSelect: (lut: Lut) => void;
  onCollect?: (code: string) => void;
}
export function LutCard({ lut, previewUrl, sampleId = "s9", onSelect }: Props) {
  const [hover, setHover] = useState(false);
  const { doc, ready, busy } = useS9();
  const own = lut.source === "upload";
  const picture = previewOf(lut, sampleId);
  const sharedId =
    !sampleId || sampleId === DEFAULT_PREVIEW ? FALLBACK_SAMPLE_ID : sampleId;
  const after = own ? previewUrl : asset(picture.after);
  const before = own
    ? asset(beforeFrameFor(lut.photoStyle, sharedId))
    : picture.before
      ? asset(picture.before)
      : null;
  const location = s9Location(doc, lut.code);
  return (
    <article className="card" data-lut-code={lut.code}>
      <button
        className="card-open"
        onClick={() => onSelect(lut)}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <span className="card-frame">
          {after ? (
            <img
              src={hover && before ? before : after}
              alt={lut.title}
              loading="lazy"
            />
          ) : (
            <span className="s9-empty-frame">Your LUT · Open details to preview</span>
          )}
          <span className="badge">{photoStyleLabel(lut.photoStyle)}</span>
        </span>
        <span className="card-title">{lut.title}</span>
        <span className="card-meta">
          {lut.creator.icon ? (
            <img
              className="avatar"
              src={asset(lut.creator.icon)}
              alt=""
              loading="lazy"
            />
          ) : null}
          <span>{lut.creator.name}</span>
        </span>
      </button>
      <button
        className="ghost card-add"
        disabled={!ready || busy || !!location}
        onClick={() => void changeS9({ type: "add", code: lut.code })}
      >
        {location ?? "Add to LUT List"}
      </button>
    </article>
  );
}
