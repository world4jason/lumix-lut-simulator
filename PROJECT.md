# LUMIX S9 standalone

## User-authorized scope
- Source: /Users/world4jason/code_ground/lumix-lab-gallery — STRICTLY READ ONLY. No writes, builds, git operations changing state, generated files, shared writable symlinks, or dependency installation there.
- All implementation goes in /Users/world4jason/code_ground/lumix-lut-simulator.
- Extract and simplify existing S9 page, LUT details, and all 33 shared sample images. Preserve existing visual design and React/TypeScript/Vite stack.
- Search only the LUMIX Lab official catalog, including its published creator LUTs (current source=lumix: 199 entries).
- Add official LUT metadata to S9 list, preserve current slot/candidate arrangement, removal and reordering.
- Users can import their own LUT and preview on built-in samples, and add it to their S9 list.
- User explicitly chose browser-only persistence for lists and uploaded LUTs. No backend or accounts.
- Do not distribute official LUT files, encoded LUT tables, LUT strips, download endpoints, or equivalent recoverable transforms. Serve pre-rendered sample previews; all 199 x 33 previews currently exist.
- Do not add unrelated galleries, collections, favorites, conversion/export tools, camera connection, redesign, deployment, or extra product behavior.

## Necessary details / limits
- S9 list is a planning list, not physical camera sync.
- An uploaded LUT needs the correct input color space/Photo Style; reuse existing color logic where possible, and do not guess a base silently when the file lacks metadata. Ask only if a material unresolved product decision remains.
- Keep uploaded LUT data local to the browser, with clear failure handling and persistence across reloads.
- Verify official samples do not require runtime access to a LUT table.
- Reuse generated images by copying regular files, no writable links to the original project.
- Public use rights for samples, creator images, descriptions and rendered outputs have not been established merely by omitting LUT files. Record source/provenance and unresolved rights; no public deployment requested.
- Original shared samples metadata: src/data/samples.json. Previews: public/sample/<sample-id>/<lut-code>.webp.
- Existing source modules: src/components/S9Page.tsx, LutDetail.tsx, SampleStrip.tsx; src/lib/s9-model.ts, s9.ts, glLut.ts. Current s9.ts uses a Vite file-write endpoint and must be adapted in this new project only.

## Execution
Read source instructions and /Users/world4jason/.codex/RTK.md. Prefix shell calls with rtk. Follow user scope discipline. Use narrow custom agent roles when delegating; verifier must be read-only. Implement the minimum working standalone version, run relevant build and meaningful checks, and report actual results and limitations. Do not claim completed implementation on setup alone.

## User follow-up: open source and GitHub Pages
- User confirms approximately 200 official LUTs (199 in current source).
- Independently perform development and acceptance checks.
- Intended future distribution: open-source repository hosted on GitHub Pages. Build as a static site with working repository subpath asset URLs and routing, no server-only functionality.
- Document static build and GitHub Pages deployment steps; verify a production preview under a non-root base path.
- Keep third-party LUT files and reversible LUT encodings out of source and dist, not just hidden in UI. Inspect all copied files and symlinks.
- Record third-party asset provenance and unresolved publication permissions for future public release. Do not invent licensing rights or choose a source-code license on the user's behalf.
- No current authorization to publish a repository or deploy publicly.

## Authorized follow-up: preview compression and responsive acceptance
- User approved lossy WebP quality compression of after previews only in this new project; retain all 199 LUTs × 33 samples and original pixel dimensions.
- Target complete static dist below 1 GB with reasonable headroom. Compare representative skin/detail/gradient scenes before choosing highest reasonable quality. Do not alter original project, before/signal/creator assets, or hosting.
- Verify desktop and mobile search, S9 ordering/removal, detail comparison/sample switching and upload; repair responsive behavior within existing design. No public deployment/repository creation authorized.

## Follow-up corrections to preserved behavior
- Restore the original official per-LUT before/after thumbnails and default selection heuristic; suspect published pairs remain accessible with their warning and default to the shared fallback. Count official images in final size without recompressing them.
- Restore original sampleGroups classifications, names, order, membership and selection behavior, keeping every shared sample. Audit the authorized S9/detail/strip surface against the read-only original for further omissions, excluding explicitly removed unrelated functionality.
