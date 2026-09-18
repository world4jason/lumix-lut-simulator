# Third-party assets and public-use rights

This project has not been published; removing LUT files does not mean that public-use rights for the images or derived previews have been obtained.

- Official catalog: the 199 entries with `source=lumix` in the original project's `src/data/catalog.json`, including creator LUTs published by LUMIX Lab. Only the name, author, description, input Photo Style, and other metadata are retained; no LUTs, PNG strips, conversion tables, or download endpoints are included.
- Official entry point: https://www.panasonic.com/global/consumer/lumix/lumix-lab.html . The source is an existing local catalog snapshot; this pass did not re-fetch it or claim current completeness.
- Official examples: the 398 `public/thumb/` before/after images corresponding to 199 LUTs were copied from the original directory without recompression; public redistribution permission is pending confirmation.
- Creator avatars: corresponding regular files from the original project's `public/creator/`. Copyright belongs to the respective rights holders; public redistribution permission is pending confirmation.
- 33 shared samples: the name, origin, note, and original `sources` paths from `src/data/samples.json` are retained as provenance records. The original paths only describe the source and are not files included in this project. This metadata is insufficient to prove permission.
- 6567 after and before/signal images: selectively copied from the original project's `public/sample/`; the after images were re-encoded under the user's authorization at WebP quality 100 (the original file was retained when the output was larger), with dimensions unchanged and each file recorded in docs/preview-compression.json. These are ordinary scene images; they do not contain LUT tables or color charts that could directly reconstruct a LUT. The conditions for public use of the pre-generated results by the sample original authors and LUT rights holders still require confirmation.
- Existing React/TS components and CSS: extracted and modified from the user-specified original project; the user has not selected a code license, so no LICENSE was added. The licenses of dependencies remain with their packages.
- User-owned LUTs: selected by the user and stored only in the browser's IndexedDB for this origin; they are not uploaded to a server or written into the source code or release artifacts.

## Decisions still required before release

Confirm public redistribution rights for the samples, avatars, descriptions, and derived previews, and select a code license. GitHub's official limit is that a published site must not exceed 1 GB; the current build passed the size check using the authorized after-image quality compression, but this does not mean public release permission has been obtained.
Official limit: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
