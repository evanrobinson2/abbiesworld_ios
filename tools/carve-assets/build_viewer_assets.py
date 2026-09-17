#!/usr/bin/env python3
"""Rebuild the Essence Kit viewer's manifest and web previews.

Reads the essence list straight out of DecoratorModels.swift so the viewer can
never drift from the game's own catalogue, joins it with the carve report, and
writes web-sized WebP previews. Full-resolution PNGs stay in AssetSources; only
these previews are served by the viewer.

    python3 tools/carve-assets/build_viewer_assets.py

Run after carve.py. Prints a report so the result can be reviewed as text.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

from PIL import Image

REPO = pathlib.Path(__file__).resolve().parents[2]
SWIFT = REPO / "abbies.world.ios/abbies.world.ios/Models/DecoratorModels.swift"
KIT = REPO / "AssetSources/EssenceKit"
VIEWER = REPO / "prototypes/essence-viewer"

PREVIEW_PX = 384
PREVIEW_QUALITY = 90


def read_essences() -> list[dict]:
    source = SWIFT.read_text()
    blocks = re.findall(r"DecoratorEssence\((.*?)\n\s*\)", source, re.S)
    essences = []
    for block in blocks:
        def field(key: str) -> str | None:
            match = re.search(key + r':\s*"([^"]*)"', block)
            return match.group(1) if match else None

        category = re.search(r"category:\s*\.(\w+)", block)
        essences.append(
            {
                "id": field("id"),
                "name": field("name"),
                "category": category.group(1) if category else "other",
                "imageName": field("imageName"),
                "emoji": field("emoji"),
            }
        )
    return essences


def main() -> int:
    if not SWIFT.exists():
        print(f"cannot find {SWIFT}")
        return 1

    essences = read_essences()
    report_path = KIT / "carve-report.json"
    by_source = {}
    if report_path.exists():
        by_source = {entry["source"]: entry for entry in json.loads(report_path.read_text())["carved"]}

    manifest = []
    for essence in essences:
        filename = f"{essence['imageName']}.png"
        carved = KIT / "carved" / filename
        report = by_source.get(filename)
        manifest.append(
            {
                **essence,
                "file": filename,
                "preview": f"{essence['imageName']}.webp",
                "hasArt": carved.exists(),
                "carve": None
                if report is None
                else {
                    "background": report["background"],
                    "trimmedTo": report["trimmedTo"],
                    "output": report["output"],
                    "coveragePct": report["coveragePct"],
                },
            }
        )

    manifest_path = VIEWER / "data/essences.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    written = 0
    for stage in ("carved", "raw"):
        source_dir, out_dir = KIT / stage, VIEWER / "public/essences" / stage
        out_dir.mkdir(parents=True, exist_ok=True)
        for path in sorted(source_dir.glob("*.png")):
            image = Image.open(path).convert("RGBA")
            image.thumbnail((PREVIEW_PX, PREVIEW_PX), Image.LANCZOS)
            image.save(out_dir / f"{path.stem}.webp", "WEBP", quality=PREVIEW_QUALITY, method=4)
            written += 1

    with_art = sum(1 for entry in manifest if entry["hasArt"])
    missing = [entry["id"] for entry in manifest if not entry["hasArt"]]
    print(f"essences in catalogue : {len(manifest)}")
    print(f"with carved art       : {with_art}")
    print(f"previews written      : {written}")
    if missing:
        print(f"missing art           : {', '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
