#!/usr/bin/env python3
"""Extract reproducible Creature Lab tiles from generated asset boards."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "AssetSources" / "CreatureLab"
CATALOG = (
    ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Assets.xcassets"
)

BOARD_SPECS = {
    "creatures": (
        "creature-lab-creatures-2d-board.png",
        ("abbie", "dragon", "robot", "bunny", "cat", "dinosaur", "alien", "monster"),
        "creature",
    ),
    "outfits": (
        "creature-lab-outfits-2d-board.png",
        (
            "lightning-racer",
            "astronaut",
            "ninja",
            "wizard",
            "knight",
            "firefighter",
            "superhero",
            "pirate",
        ),
        "outfit",
    ),
    "buddies": (
        "creature-lab-buddies-2d-board.png",
        ("bat", "cheetah", "puppy", "owl", "unicorn", "peacock", "frog", "fox"),
        "buddy",
    ),
}


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def write_imageset(name: str, image: Image.Image) -> Path:
    imageset = CATALOG / f"{name}.imageset"
    imageset.mkdir(parents=True, exist_ok=True)
    image_path = imageset / f"{name}.png"
    image.save(image_path, "PNG", optimize=True)
    contents = {
        "images": [
            {
                "filename": image_path.name,
                "idiom": "universal",
                "scale": "1x",
            }
        ],
        "info": {"author": "xcode", "version": 1},
        "properties": {"preserves-vector-representation": False},
    }
    (imageset / "Contents.json").write_text(
        json.dumps(contents, indent=2) + "\n", encoding="utf-8"
    )
    return image_path


def extract_board(source: Path, ids: tuple[str, ...], category: str) -> list[dict]:
    board = Image.open(source).convert("RGB")
    records = []
    for index, item_id in enumerate(ids):
        column = index % 3
        row = index // 3
        left = round(column * board.width / 3)
        right = round((column + 1) * board.width / 3)
        top = round(row * board.height / 3)
        bottom = round((row + 1) * board.height / 3)
        inset = max(2, round(min(right - left, bottom - top) * 0.012))
        tile = board.crop(
            (left + inset, top + inset, right - inset, bottom - inset)
        ).resize((512, 512), Image.Resampling.LANCZOS)
        asset_name = f"creature_builder_{category}_{item_id.replace('-', '_')}"
        output = write_imageset(asset_name, tile)
        records.append(
            {
                "id": item_id,
                "assetName": asset_name,
                "sha256": file_hash(output),
            }
        )
    return records


def import_background(source: Path) -> dict:
    name = "creature_builder_workshop_background"
    image = Image.open(source).convert("RGB")
    output = write_imageset(name, image)
    return {"assetName": name, "sha256": file_hash(output)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--creatures-board", type=Path, required=True)
    parser.add_argument("--outfits-board", type=Path, required=True)
    parser.add_argument("--buddies-board", type=Path, required=True)
    parser.add_argument("--background", type=Path, required=True)
    args = parser.parse_args()

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    supplied = {
        "creatures": args.creatures_board,
        "outfits": args.outfits_board,
        "buddies": args.buddies_board,
    }
    manifest = {
        "schemaVersion": 1,
        "generator": "Cursor GenerateImage",
        "pipeline": Path(__file__).name,
        "boards": {},
    }

    for board_key, source in supplied.items():
        filename, ids, category = BOARD_SPECS[board_key]
        retained_source = SOURCE_DIR / filename
        if source.resolve() != retained_source.resolve():
            shutil.copy2(source, retained_source)
        manifest["boards"][board_key] = {
            "source": str(retained_source.relative_to(ROOT)),
            "sourceSHA256": file_hash(retained_source),
            "grid": {"columns": 3, "rows": 3, "usedTiles": 8},
            "assets": extract_board(retained_source, ids, category),
        }

    retained_background = SOURCE_DIR / "creature-lab-workshop-background.png"
    if args.background.resolve() != retained_background.resolve():
        shutil.copy2(args.background, retained_background)
    manifest["background"] = {
        "source": str(retained_background.relative_to(ROOT)),
        "sourceSHA256": file_hash(retained_background),
        **import_background(retained_background),
    }
    (SOURCE_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        "creature_builder.assets_extracted "
        f"tiles={sum(len(board['assets']) for board in manifest['boards'].values())} "
        f"background=1 manifest={SOURCE_DIR / 'manifest.json'}"
    )


if __name__ == "__main__":
    main()
