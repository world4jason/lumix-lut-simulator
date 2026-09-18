# Read-only comparison with the original functionality

Scope: the original S9Page, S9Add, LutDetail, SampleStrip, GalleryFrameBar, FrameGroupTabs, sampleGroups, ownStill, preview, and corresponding image metadata.

Retained/restored:
- S9 39 slots, fixed slot 1, candidate adding, swapping at the center of a row, inserting at a row edge, candidate ordering, drag auto-scroll, and removal.
- The 398 official before/after original-quality regular files for 199 official LUTs; cards and detail follow the same default image-selection rule.
- Per the latest user request, Own always displays the official image for every LUT with an official image; the 43 `ownFrameIsLog=false` markers are retained only as heuristic notices and do not replace images.
- When an official image lacks a before image, no false comparison slider is shown; when an official after image is missing, the shared fallback is selected. All current 199 LUTs have paired images, and the missing-image branches are covered by selection-function tests.
- The original category names, order, mappings, and in-group `samples.json` order: People (9), Street & buildings (13), Landscape & nature (8), Colour reference (3), All (33). Category filtering itself does not change the current image selection.
- Global Own mode is retained; official images in detail appear only in their original `ownScene` category or All. User-owned LUTs have no official-image entry point.
- Detail before/after pointer wipe, keyboard range, 33 shared samples, original Log/style signal before switching, Escape/background closing, and the clamp notice.
- Cards switch to before on hover and after on leave, following the same image-selection rule; the detail starting image matches the card.

Omitted under the explicit reduced scope: favorites, collections, comparison shortlists, other sources/packs, official LUT download/conversion/input-version export, and custom photo live preview that depends on the official LUT table. Local file upload and sample preview for user-owned LUTs are implemented separately with IndexedDB.

Browser local storage replaces the original Vite file-write endpoint; pure static hosting and repository subpath support are retained.

The simplified version still does not include the original detail's scene/subject labels, measured character information, or related/similar LUT navigation. This comparison focuses on the restored functionality above and does not claim full equivalence with the entire original detail view.
