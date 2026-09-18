import type { Lut } from "../types";
import trust from "../data/own-preview-trust.json";
import samples from "../data/samples.json";
import { beforeFrameFor } from "./photoStyle";
import { choosePreview, type Preview } from "./preview";
export const DEFAULT_PREVIEW = "@default";
export const OFFICIAL_PREVIEW = "@official";
export const ownPairIsTrustworthy = (code: string) =>
  (trust as Record<string, boolean>)[code] !== false;
export const ownStillOf = (lut: Lut) =>
  lut.thumb.after ? { before: lut.thumb.before, after: lut.thumb.after } : null;
export function defaultPreviewOf(lut: Lut): Preview {
  return choosePreview({
    code: lut.code,
    own: ownStillOf(lut),
    fallbackId: samples.fallbackId,
    beforeFrame: (id) => beforeFrameFor(lut.photoStyle, id),
  });
}
export function previewOf(
  lut: Lut,
  selection: string | null | undefined,
): Preview {
  const own = ownStillOf(lut);
  if (selection === OFFICIAL_PREVIEW && own) return { kind: "own", ...own };
  if (
    !selection ||
    selection === DEFAULT_PREVIEW ||
    selection === OFFICIAL_PREVIEW
  )
    return defaultPreviewOf(lut);
  return {
    kind: "shared",
    sampleId: selection,
    before: beforeFrameFor(lut.photoStyle, selection),
    after: `sample/${selection}/${lut.code}.webp`,
  };
}
