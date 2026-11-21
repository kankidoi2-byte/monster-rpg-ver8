# Tutorial character cutouts

The prologue uses four transparent dialogue portraits. Each entry in `manifest.json` with a `runtimeImage` pairs the smaller delivered PNG with its reviewed `cutout` PNG. Both keep the same dimensions, alpha channel, and RGB values wherever alpha is nonzero. The maximum edge is 576 px. The prologue browser check compares the two rendered images pixel for pixel.

The cutouts retain the main character, worn equipment, held weapons, and held books. Detached scenery, ambient effects, familiars, floating books/pages, and background magic circles were removed where applicable so the assets can be placed over tutorial UI.

## Verifying changes

`cutoutSha256` identifies the reviewed PNG and `runtimeSha256` identifies its delivery copy. When replacing a dialogue portrait, update both images and their hashes. Run `npm run check:prologue-comprehensive` for the asset checks and `npm run check:prologue-part2` for the Chromium pixel comparison.
