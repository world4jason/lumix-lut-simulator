# Validation record

Compression and restoration of the official examples/sample classifications are complete; the desktop and mobile production builds passed acceptance; the site has not been published.

## Assets and size

- 199 official LUTs; 398 official before/after original-quality images.
- 33 shared samples and 6567 generated after images; all dimensions and counts were retained.
- after: 1,241,799,712 → 821,033,478 bytes; quality 100, 3863 re-encoded, 2704 original files retained.
- public: 910,857,186 bytes.
- final dist: 911,296,622 bytes, leaving 88,703,378 bytes below the 1,000,000,000-byte limit.
- Official thumbs, before/signal images, and creator images were not quality-modified. Per-file hashes and dimensions are in docs/preview-compression.json.
- The local original project remains read-only; all new assets are regular files, with no symlinks for LUTs, strips, download endpoints, or links back to the source.

## Passed

- TypeScript + Vite repository subpath build.
- English runtime: the current main header is `Lumix LUT Simulator`, the masthead subtitle is removed, and the document language is `en`.
- 16 unit tests: S9 state and storage failure, Cube parser/domain/finite, IndexedDB abort and reload, color input, official selection fallback, and original classification integrity.
- Full production flow at http://127.0.0.1:4189/lumix-lut-simulator/: 199 searches, 33 sample details, wipe, drag into a slot, remove, reload, and user-owned cube import/preview/save. Zero JS errors and HTTP 4xx responses.
- Desktop 1440 and mobile 390: all 199 official cards used the same Own image, official detail images, paired marker warnings, categories 9/13/8/3 and All 33, category switching without changing the selected image, official/shared switching, CNED2 original/neutral before paths, and no horizontal overflow.
- Mobile upload error prompt, STD can be saved without producing an error preview, Escape closes, and detail has no horizontal overflow.

- Responsive production build 3/3 passed: desktop 1440×1000, mobile 390×844, and mobile 360×800. Chrome DevTools Protocol sent real touchStart/Move/End events; dragging a finger to the top of the list triggered the existing auto-scroll, followed by dropping into a slot, swapping order, and removing. Search, official/shared samples, RawLog, wipe, user-owned cube import, and IndexedDB reload all passed; controls were operable, with zero horizontal overflow and no HTTP 4xx or JS errors. No defect required an additional CSS revision.
- Seven production browser scenarios passed in total (4 main flow/preview classification scenarios + 3 complete responsive flows); checks were not repeated merely because they had already passed.

## Not yet claimed

Public-use rights for the images and a code license still require confirmation/selection; passing the size check does not mean publication rights have been obtained. No remote repository or deployment was created.

## Final independent read-only check

Verifier conclusion: no blocking issues within the authorized scope. Independently checked the source/output SHA-256 values, bytes, dimensions, and re-encode flags for 6567 after images; all 398 official thumbs, 363 before/signal images, and 54 avatars were byte-identical to the original. The original classification metadata, S9 model, and raw/neutral paths were confirmed consistent at that time; the Own rule was corrected according to the latest user request below. There are no symlinks, LUT tables/strips, or prohibited directories. Representative images were also compared visually, with no degradation affecting the preview.

Minor differences: the original detail's scene/subject labels, measured character information, and related/similar navigation are still absent from this simplified version; this round focused on official examples, classifications, comparison, and the S9 flow, and does not claim to replicate every original detail feature.

## Own display rule correction

Per the user request, when Own has an official image it always displays the official image, consistently in cards and detail; legacy trust markers are retained only as notices and no longer replace the official image. A shared sample is used only when the official image is missing.

This build, two selection/classification unit tests, and two browser flows at 1440/390px passed; coverage included an individual comparison of the image source for all 199 cards and switching from a shared sample back to Own.
