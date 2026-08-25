# Tutorial character cutouts

These PNG files are reserved for the future prologue tutorial. They are intentionally not referenced by the current game runtime.

- Format: PNG with a real alpha channel
- Maximum edge: 576 px (sized for mobile tutorial portraits without excessive source-art upscaling)
- Source artwork remains unchanged in `images/monsters/`
- Runtime integration should use `manifest.json` rather than guessing filenames
- These files are data-only and are not wired into the current tutorial or game UI

The cutouts retain the main character, worn equipment, held weapons, and held books. Detached scenery, ambient effects, familiars, floating books/pages, and background magic circles were removed where applicable so the assets can be placed over tutorial UI.

## Pixel fidelity and rebuilding

The alpha channel is used only as a segmentation mask. Every final RGB pixel is recomposed from the corresponding source artwork; no generated or redrawn character pixels are used. Run the batch below from the repository root to rebuild all 11 files and refresh their checksums and validation statistics.

```bash
python3 scripts/build-tutorial-character-cutouts.py
python3 scripts/build-tutorial-character-cutouts.py --verify-only
```

The script requires Pillow. Visual QA was performed over checkerboard, dark blue, white, and magenta backgrounds. The manifest records source/output SHA-256 hashes, dimensions, alpha statistics, and decode results for each character.
