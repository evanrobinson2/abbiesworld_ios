#!/usr/bin/env python3
"""Clean and install generated Creature Lab overland artwork.

Requires Pillow and opencv-python. The script keeps only the primary connected
sprite, normalizes transparent padding, writes Xcode image sets, and emits a
text-readable provenance manifest.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "AssetSources" / "CreatureLab" / "Overland"
CATALOG_DIR = (
    ROOT / "abbies.world.ios" / "abbies.world.ios" / "Assets.xcassets"
)

SPRITES = {
    "math_store": "creature_builder_overland_math_store",
    "book_store": "creature_builder_overland_book_store",
    "creature_lab": "creature_builder_overland_creature_lab",
}
BOARD_ASSET = "creature_builder_overland_board"


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def clean_sprite(source: Path, target: Path) -> dict[str, object]:
    rgba = np.array(Image.open(source).convert("RGBA"))
    alpha = rgba[:, :, 3]
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > 3).astype(np.uint8),
        connectivity=8,
    )
    if count < 2:
        raise ValueError(f"No opaque sprite found in {source}")

    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    core = (labels == largest).astype(np.uint8)
    keep = cv2.dilate(core, np.ones((5, 5), np.uint8), iterations=1).astype(bool)
    rgba[~keep, 3] = 0

    cleaned = Image.fromarray(rgba)
    source_bbox = cleaned.getchannel("A").getbbox()
    if source_bbox is None:
        raise ValueError(f"Sprite became empty after cleanup: {source}")

    crop = cleaned.crop(source_bbox)
    scale = min(920 / crop.width, 920 / crop.height)
    crop = crop.resize(
        (round(crop.width * scale), round(crop.height * scale)),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(
        crop,
        ((canvas.width - crop.width) // 2, (canvas.height - crop.height) // 2),
    )
    canvas.save(target, optimize=True)

    kept_pixels = int(stats[largest, cv2.CC_STAT_AREA])
    removed_pixels = int(
        sum(
            stats[index, cv2.CC_STAT_AREA]
            for index in range(1, count)
            if index != largest
        )
    )
    return {
        "sha256": file_hash(target),
        "pixelSize": [canvas.width, canvas.height],
        "contentBoundingBox": list(canvas.getchannel("A").getbbox() or ()),
        "keptPixels": kept_pixels,
        "removedFragmentPixels": removed_pixels,
    }


def write_image_set(asset_name: str, image_path: Path) -> None:
    image_set = CATALOG_DIR / f"{asset_name}.imageset"
    image_set.mkdir(parents=True, exist_ok=True)
    destination = image_set / f"{asset_name}.png"
    destination.write_bytes(image_path.read_bytes())
    (image_set / "Contents.json").write_text(
        json.dumps(
            {
                "images": [
                    {
                        "filename": destination.name,
                        "idiom": "universal",
                        "scale": "1x",
                    },
                    {"idiom": "universal", "scale": "2x"},
                    {"idiom": "universal", "scale": "3x"},
                ],
                "info": {"author": "xcode", "version": 1},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--math-store", type=Path, required=True)
    parser.add_argument("--book-store", type=Path, required=True)
    parser.add_argument("--creature-lab", type=Path, required=True)
    parser.add_argument("--board", type=Path, required=True)
    parser.add_argument("--model", default="gpt-image-2.5-flare")
    args = parser.parse_args()

    inputs = {
        "math_store": args.math_store,
        "book_store": args.book_store,
        "creature_lab": args.creature_lab,
    }
    for path in [*inputs.values(), args.board]:
        if not path.is_file():
            raise SystemExit(f"Missing generated asset: {path}")

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    records: dict[str, dict[str, object]] = {}
    for key, source in inputs.items():
        retained = SOURCE_DIR / f"{key}.png"
        record = clean_sprite(source, retained)
        record["sourceSHA256"] = file_hash(source)
        record["assetName"] = SPRITES[key]
        records[key] = record
        write_image_set(SPRITES[key], retained)

    board = Image.open(args.board).convert("RGB")
    retained_board = SOURCE_DIR / "hero_board.png"
    board.save(retained_board, optimize=True)
    write_image_set(BOARD_ASSET, retained_board)
    records["hero_board"] = {
        "sourceSHA256": file_hash(args.board),
        "sha256": file_hash(retained_board),
        "pixelSize": [board.width, board.height],
        "assetName": BOARD_ASSET,
    }

    manifest = {
        "schemaVersion": 1,
        "provider": "OpenAI",
        "model": args.model,
        "quality": "high",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "coordinateSpace": {
            "math_store": [0.22, 0.48],
            "book_store": [0.76, 0.27],
            "creature_lab": [0.55, 0.77],
        },
        "assets": records,
    }
    manifest_path = SOURCE_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        "creature_builder.overland_assets_integrated "
        f"sprites={len(inputs)} board=1 manifest={manifest_path}"
    )


if __name__ == "__main__":
    main()
