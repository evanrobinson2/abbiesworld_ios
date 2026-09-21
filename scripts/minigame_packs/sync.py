#!/usr/bin/env python3
"""Copy a minigame pack's JSON + carved rasters into the prototype and iOS bundle."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def copy_json(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(src.read_bytes())


def write_imageset(png: Path, imageset: Path, catalog_name: str) -> None:
    imageset.mkdir(parents=True, exist_ok=True)
    target = imageset / f"{catalog_name}.png"
    shutil.copy2(png, target)
    (imageset / "Contents.json").write_text(
        json.dumps(
            {
                "images": [
                    {"filename": f"{catalog_name}.png", "idiom": "universal", "scale": "1x"},
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


def catalog_name(asset_id: str) -> str:
    return "world2_peg_battle_" + asset_id.replace("/", "_").replace("-", "_")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", default="peg-battle")
    args = parser.parse_args()

    pack_dir = ROOT / "AssetSources" / "World2" / "minigames" / args.pack
    web = ROOT / "prototypes" / "peggle" / "data" / args.pack
    ios = ROOT / "abbies.world.ios" / "abbies.world.ios" / "Resources" / "World2" / "minigames" / args.pack
    public_assets = ROOT / "prototypes" / "peggle" / "public" / "assets" / args.pack
    xcassets = ROOT / "abbies.world.ios" / "abbies.world.ios" / "Assets.xcassets"

    def _ignore(directory: str, names: list[str]) -> set[str]:
        dropped = set()
        if Path(directory).name == "assets" and "raw" in names:
            dropped.add("raw")
        return dropped

    for dest in (web, ios):
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(pack_dir, dest, ignore=_ignore)

    public_assets.mkdir(parents=True, exist_ok=True)
    carved = pack_dir / "assets" / "carved"
    if carved.exists():
        for png in carved.glob("*.png"):
            shutil.copy2(png, public_assets / png.name)
            name = "world2_peg_battle_" + png.stem.replace("-", "_")
            write_imageset(png, xcassets / f"{name}.imageset", name)

    print(json.dumps({"event": "minigame.sync.ok", "pack": args.pack}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
