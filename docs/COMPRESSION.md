# Pre-generated after compression

The user's authorization covers changing only the pre-generated after WebP quality in the new project, retaining 199×33 and the original dimensions; official thumbs, before/signal images, and creator images are not compressed.

Trial: all 33 samples × 6 representative LUTs (Natural, V-Log, Monochrome D, Cinelike D2, Vivid, and reference conversion), 198 images total, comparing quality 90/92/94/96/98/100. q100 totals 64.7% of the original size, which is sufficient to meet the size target without lowering the quality setting. The process uses effort6 and smartSubsample; files larger than the originals are retained unchanged.

Visual inspection compared images side by side at their original dimensions: vlog-portrait (skin tone/hair), scooter (red/metal/high detail), harbour (skin tone/brightness), and reference (color blocks/gradients). The q100 decoded RGB mean absolute errors were 0.427, 1.883, 0.522, and 0.157 /255 respectively; PSNR was 49.61, 38.02, 48.50, and 53.90 dB respectively. This supports the measured distortion and does not claim that lossy re-encoding is identical to the original. Side-by-side inspection found no difference affecting the preview in skin tone, overall color tone, or detail; q100 was set as the encoder's highest quality for this run.

All 6567 images: original 1,241,799,712 bytes → 821,033,478 bytes. 3863 were re-encoded and 2704 retained their original files. Pixel width and height are unchanged for every image; per-file source/output hashes and dimensions are in preview-compression.json. The before/signal/creator images and the 398 restored official examples all retain their original bytes.

The complete public directory including official examples is 910,857,186 bytes; dist also contains approximately 0.44 MB of code, with the final build number in VALIDATION.md as the authoritative figure. There has been no public deployment, asset hosting has not changed, and the original project was not modified.
