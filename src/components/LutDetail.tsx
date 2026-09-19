import { useEffect, useRef, useState } from "react";
import type { Lut } from "../types";
import { asset } from "../lib/format";
import {
  beforeFrameFor,
  photoStyleLabel,
  signalStyles,
} from "../lib/photoStyle";
import { previewOf, OFFICIAL_PREVIEW, DEFAULT_PREVIEW } from "../lib/ownStill";
import { renderUpload, type UploadedLut } from "../lib/uploads";
import { changeS9, useS9 } from "../lib/s9";
import { s9Location } from "../lib/s9-model";
import { BeforeAfter } from "./BeforeAfter";
import {
  GLOBAL_SAMPLES,
  FALLBACK_SAMPLE_ID,
  SampleStrip,
} from "./SampleStrip";

export function LutDetail({
  lut,
  upload,
  sampleId,
  onClose,
}: {
  lut: Lut;
  upload?: UploadedLut;
  sampleId: string;
  onClose: () => void;
}) {
  const initial = previewOf(lut, sampleId);
  const [choice, setChoice] = useState(
    upload
      ? sampleId === DEFAULT_PREVIEW
        ? FALLBACK_SAMPLE_ID
        : sampleId
      : initial.kind === "own"
        ? OFFICIAL_PREVIEW
        : initial.sampleId,
  );
  const [rawLogBefore, setRawLogBefore] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { doc, ready, busy } = useS9();
  const location = s9Location(doc, lut.code);
  const sample = GLOBAL_SAMPLES.find((s) => s.id === choice);
  const picture = previewOf(lut, choice);

  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setPreview(null);
    setError("");
    if (upload) {
      void renderUpload(upload, choice)
        .then((url) => {
          if (alive) setPreview(url);
        })
        .catch((e) => {
          if (alive) setError(String(e.message));
        });
    }
    return () => {
      alive = false;
    };
  }, [upload, choice]);

  const logStyle =
    lut.photoStyle === "VLOG" || signalStyles.has(lut.photoStyle);
  const after = upload ? preview : asset(picture.after);
  const raw = sample
    ? signalStyles.has(lut.photoStyle)
      ? `sample/_before/${sample.id}-${lut.photoStyle.toLowerCase()}.webp`
      : sample.beforeLog
    : null;
  const before = sample
    ? rawLogBefore && logStyle
      ? raw
      : beforeFrameFor(lut.photoStyle, sample.id)
    : picture.before;

  const addLabel = location ?? "Add to LUT List";
  const addDisabled = !ready || busy || !!location;
  const addToList = () => void changeS9({ type: "add", code: lut.code });

  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          ) {
            onClose();
          }
        }
      }}
      aria-label={`${lut.title} LUT details`}
    >
      <div className="sheet-head">
        <div>
          <h2>{lut.title}</h2>
          <p>
            {lut.creator.name} · {photoStyleLabel(lut.photoStyle)}
          </p>
        </div>
        <button className="ghost" onClick={onClose} autoFocus>
          Close
        </button>
      </div>

      <div className="detail-mobile-action">
        <button
          className="primary detail-mobile-primary"
          disabled={addDisabled}
          onClick={addToList}
        >
          {addLabel}
        </button>
      </div>

      <div className="detail-body">
        <section>
          {error ? (
            <p role="alert" className="note">
              {error}
            </p>
          ) : after ? (
            <BeforeAfter
              before={before ? asset(before) : null}
              after={after}
              alt={lut.title}
              beforeSignal={
                sample
                  ? rawLogBefore && logStyle
                    ? photoStyleLabel(lut.photoStyle) + " raw signal"
                    : "Display reference"
                  : "Official original"
              }
            />
          ) : (
            <p role="status">Generating local preview…</p>
          )}

          <SampleStrip
            id={choice}
            onChange={setChoice}
            lut={lut}
            includeOwn={!upload}
          />

          {sample && logStyle ? (
            <label className="toggle before-mode">
              <input
                type="checkbox"
                checked={rawLogBefore}
                onChange={(e) => setRawLogBefore(e.target.checked)}
              />
              Compare raw {photoStyleLabel(lut.photoStyle)} signal
            </label>
          ) : null}

          <p className="fineprint">
            {sample
              ? `${sample.name} · ${sample.note}`
              : "Official sample image, separate from the rendered shared samples."}
          </p>
          <p className="fineprint">
            {upload
              ? "Your LUT uses the selected Photo Style input. The 8-bit preview may clip values outside the display range."
              : sample
                ? "After is a pre-rendered image. Before shows a display reference; Log styles also offer the raw input. Official LUT files are not distributed."
                : !picture.before
                  ? "No official before image is available; only after is shown."
                  : "Before and after belong to the same official sample."}
          </p>

          {lut.clamp?.nodes ? (
            <p className="note">
              This LUT contains values outside the 8-bit display range. The
              preview clips those values and does not represent floating-point
              grading output.
            </p>
          ) : null}
        </section>

        <aside>
          <p className="overview">{lut.overview}</p>
          <dl className="facts">
            <div>
              <dt>Input Photo Style</dt>
              <dd>{photoStyleLabel(lut.photoStyle)}</dd>
            </div>
            <div>
              <dt>Grid</dt>
              <dd>{lut.gridSize}³</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>{lut.code}</dd>
            </div>
          </dl>
          <button
            className="primary detail-primary"
            disabled={addDisabled}
            onClick={addToList}
          >
            {addLabel}
          </button>
        </aside>
      </div>
    </dialog>
  );
}
