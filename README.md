# Lumix LUT Simulator

## Startup

```sh
npm ci
npm run dev
```

Open the local URL shown in the terminal. LUT List is a planning list, not camera synchronization. The list is stored in localStorage, and user-owned LUTs are stored in IndexedDB; different browsers, ports, or domains do not share them. Clearing site data or using private browsing may cause data loss. Writing the list requires a modern browser that supports Web Locks; unsupported browsers show an error and preserve the existing data.

## Production build and subpath acceptance

```sh
BASE_PATH=/lumix-lut-simulator/ npm run build
BASE_PATH=/lumix-lut-simulator/ npm run preview -- --port 4189
```

Open `http://127.0.0.1:4189/lumix-lut-simulator/`. Without BASE_PATH, relative paths are used. There is no API, account, backend, official LUT file, download, or conversion/export functionality.

```sh
npm test
npm run check:assets
npm run test:browser
```

`test:browser` requires the 4189 production preview above to be started first and Playwright Chromium to be installed (`npx playwright install chromium`), or an existing Chrome specified with `CHROME_PATH`.

`check:assets` requires a build first and checks the 6567 previews in the source assets and dist, their counts, prohibited asset types, and symlinks.

## User-owned LUT input and preview

3D `.cube` files are supported (2³–65³). If a file is not tagged with an identifiable Photo Style, the input must be selected manually. V-Log, Rec.709, Like709, Cinelike D2, Cinelike V2, and Flat use the corresponding existing sample signal images; other known Photo Styles can be saved and added to the planning list, but the interface clearly shows that previewing is unavailable when the correct sample signal is missing.

The browser preview uses 8-bit scene images and display output; results outside 0–1 are clipped. This is a selection preview and does not represent floating-point grading or the camera's final image. Uploaded original LUT values are retained in IndexedDB; preview results are not written back to the LUT.

## Release status

This pass did not create a remote repository, deploy the site, or select a code license. Under the authorization, only pre-generated after images were compressed: original-resolution WebP quality 100, with the original file retained when the output is larger. All 6567 images were retained; official examples, before/signal images, and avatars were not quality-modified. The current complete dist is approximately 911.3 MB, below the GitHub Pages 1 GB site limit with approximately 88.7 MB of headroom; see VALIDATION.md for the exact size. Public-use rights for third-party assets have also not been verified; see [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md).

The original project was used only to read the necessary components, metadata, and existing scene images; the new project does not depend on the original project to start and has no writable link back to it.

## Image processing record

[docs/compression-trial.json](docs/compression-trial.json) records the quality trial for 198 representative images; [docs/preview-compression.json](docs/preview-compression.json) records the dimensions, original/processed SHA-256 values, and bytes for all 6567 images.

The processor `scripts/compress-previews.mjs` must be given the uncompressed source `public/sample` directory to avoid accumulating re-encoding loss; it writes only to this project's after paths. A normal build does not require the original project or reprocessing the images.

[docs/RESTORATION_AUDIT.md](docs/RESTORATION_AUDIT.md) lists the comparison with the original S9/detail/sample strip.
