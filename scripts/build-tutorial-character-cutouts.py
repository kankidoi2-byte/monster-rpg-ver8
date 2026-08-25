#!/usr/bin/env python3
"""Recompose tutorial cutouts from the exact pixels of their source artwork.

The existing PNG alpha channels are segmentation masks only. RGB is always
rebuilt from the source image declared in the manifest, so running this script
cannot replace or redraw the character artwork.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "images/tutorial/characters/manifest.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def target_size(source: Image.Image, max_edge: int) -> tuple[int, int]:
    width, height = source.size
    scale = max_edge / max(width, height)
    return max(1, round(width * scale)), max(1, round(height * scale))


def fit_mask(mask: Image.Image, size: tuple[int, int]) -> Image.Image:
    if mask.size == size:
        return mask

    # Some segmentation outputs are tightly cropped on one axis. Restore that
    # transparent margin instead of stretching the character silhouette.
    if mask.width <= size[0] and mask.height <= size[1]:
        canvas = Image.new("L", size, 0)
        offset = ((size[0] - mask.width) // 2, (size[1] - mask.height) // 2)
        canvas.paste(mask, offset)
        return canvas

    return mask.resize(size, Image.Resampling.LANCZOS)


def normalize_alpha(mask: Image.Image) -> Image.Image:
    # Preserve soft hair/effect edges while eliminating near-transparent noise
    # and near-opaque matte introduced by background removal.
    return mask.point(lambda value: 0 if value <= 3 else (255 if value >= 248 else value))


def alpha_stats(image: Image.Image) -> dict[str, int]:
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    return {
        "transparentPixels": histogram[0],
        "opaquePixels": histogram[255],
        "partialAlphaPixels": sum(histogram[1:255]),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    max_edge = int(manifest["maxEdgePx"])
    seen: set[str] = set()

    for character in manifest["characters"]:
        source_path = ROOT / character["source"]
        cutout_path = ROOT / character["cutout"]
        if cutout_path.name in seen:
            raise RuntimeError(f"Duplicate cutout filename: {cutout_path.name}")
        seen.add(cutout_path.name)
        if not source_path.is_file() or not cutout_path.is_file():
            raise FileNotFoundError(character["id"])

        source = Image.open(source_path).convert("RGB")
        opened_cutout = Image.open(cutout_path)
        opened_cutout.load()
        if opened_cutout.mode != "RGBA":
            raise RuntimeError(f"Cutout is not RGBA: {character['id']} ({opened_cutout.mode})")
        current = opened_cutout
        size = target_size(source, max_edge)
        resized_source = source.resize(size, Image.Resampling.LANCZOS)

        if not args.verify_only:
            alpha = normalize_alpha(fit_mask(current.getchannel("A"), size))
            rebuilt = Image.merge("RGBA", (*resized_source.split(), alpha))
            temporary_path = cutout_path.with_suffix(".png.tmp")
            with temporary_path.open("wb") as handle:
                rebuilt.save(handle, "PNG", optimize=False)
                handle.flush()
                os.fsync(handle.fileno())
            # Decode the completed temporary file before replacing the asset.
            verified = Image.open(temporary_path)
            verified.load()
            temporary_path.replace(cutout_path)
            current = Image.open(cutout_path).convert("RGBA")

        current.load()  # Decode the full PNG so CRC/truncation errors fail here.
        if current.mode != "RGBA" or current.getchannel("A").getextrema() != (0, 255):
            raise RuntimeError(f"Invalid alpha channel: {character['id']}")
        if current.size != size:
            raise RuntimeError(f"Unexpected dimensions: {character['id']} {current.size} != {size}")
        if ImageChops.difference(current.convert("RGB"), resized_source).getbbox() is not None:
            raise RuntimeError(f"Cutout RGB differs from source artwork: {character['id']}")

        source_hash = sha256(source_path)
        cutout_hash = sha256(cutout_path)
        if args.verify_only:
            if character.get("sourceSha256") != source_hash:
                raise RuntimeError(f"Source checksum mismatch: {character['id']}")
            if character.get("cutoutSha256") != cutout_hash:
                raise RuntimeError(f"Cutout checksum mismatch: {character['id']}")
        character["sourceSha256"] = source_hash
        character["cutoutSha256"] = cutout_hash
        character["width"] = current.width
        character["height"] = current.height
        character["validation"] = {
            "decoded": True,
            "rgba": True,
            "sourcePixelsRecomposed": True,
            **alpha_stats(current),
        }

    if len(manifest["characters"]) != 11:
        raise RuntimeError(f"Expected 11 characters, found {len(manifest['characters'])}")

    if not args.verify_only:
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Validated {len(manifest['characters'])} tutorial cutouts")


if __name__ == "__main__":
    main()
