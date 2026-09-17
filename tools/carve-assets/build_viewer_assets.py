#!/usr/bin/env python3
"""Build the asset viewer's catalogue and its web previews.

Two sources feed one manifest:

  * Essences come from DecoratorModels.swift, so the game's own catalogue stays
    authoritative — nothing here can invent an essence the app does not have.
  * Every other ingredient family comes from catalog/ingredients.json, which
    also carries the prompt that produced each piece.

Both are joined with the carve report, then written out with web-sized WebP
previews. Full-resolution PNGs stay in AssetSources.

    python3 tools/carve-assets/build_viewer_assets.py

Prints a report so the result can be reviewed as text, and exits non-zero if
the catalogue and the art on disk disagree.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
from datetime import datetime, timezone

from PIL import Image

REPO = pathlib.Path(__file__).resolve().parents[2]
SWIFT = REPO / "abbies.world.ios/abbies.world.ios/Models/DecoratorModels.swift"
CATALOG = pathlib.Path(__file__).resolve().parent / "catalog/ingredients.json"
KIT = REPO / "AssetSources/IngredientKit"
VIEWER = REPO / "prototypes/asset-viewer"

PREVIEW_PX = 384
PREVIEW_QUALITY = 90


def read_swift_essences() -> list[dict]:
    """The essence list as the game defines it."""
    source = SWIFT.read_text()
    essences = []
    for block in re.findall(r"DecoratorEssence\((.*?)\n\s*\)", source, re.S):
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


def compose_prompt(template: str, subject: str, extras: dict) -> str:
    """Fill a family's prompt template. Unknown slots are left alone so a typo
    in the catalogue shows up in the output rather than silently vanishing."""
    filled = template.replace("{subject}", subject)
    for key, value in extras.items():
        filled = filled.replace("{" + key + "}", value)
    return filled


def main() -> int:
    for path in (SWIFT, CATALOG):
        if not path.exists():
            print(f"cannot find {path}")
            return 1

    catalog = json.loads(CATALOG.read_text())
    families = [
        {key: family[key] for key in ("id", "label", "question", "blurb")}
        for family in catalog["families"]
    ]
    templates = {family["id"]: family for family in catalog["families"]}

    report_path = KIT / "carve-report.json"
    carve_by_file = {}
    if report_path.exists():
        carve_by_file = {
            entry["source"]: entry for entry in json.loads(report_path.read_text())["carved"]
        }

    assets: list[dict] = []

    # Essences: identity from Swift, prompt subject from the catalogue.
    essence_family = templates["essence"]
    subjects = catalog["essenceSubjects"]
    for essence in read_swift_essences():
        subject = subjects.get(essence["id"])
        assets.append(
            {
                "id": essence["id"],
                "name": essence["name"],
                "family": "essence",
                "category": essence["category"],
                "emoji": essence["emoji"],
                "tags": [],
                "file": f"{essence['imageName']}.png",
                "preview": f"{essence['imageName']}.webp",
                "prompt": None
                if subject is None
                else compose_prompt(essence_family["promptTemplate"], subject, {}),
            }
        )

    # Everything else: identity and prompt both from the catalogue.
    for item in catalog["ingredients"]:
        family = templates[item["family"]]
        extras = dict(family.get("defaults", {}))
        for key, value in item.items():
            if key not in {"id", "name", "family", "category", "emoji", "tags", "subject"}:
                extras[key] = value
        assets.append(
            {
                "id": item["id"],
                "name": item["name"],
                "family": item["family"],
                "category": item["category"],
                "emoji": item.get("emoji", ""),
                "tags": item.get("tags", []),
                "file": f"{item['id']}.png",
                "preview": f"{item['id']}.webp",
                "prompt": compose_prompt(family["promptTemplate"], item["subject"], extras),
            }
        )

    # Join with what is actually on disk.
    for asset in assets:
        carved = KIT / "carved" / asset["file"]
        asset["hasArt"] = carved.exists()
        report = carve_by_file.get(asset["file"])
        asset["carve"] = (
            None
            if report is None
            else {
                "background": report["background"],
                "trimmedTo": report["trimmedTo"],
                "output": report["output"],
                "coveragePct": report["coveragePct"],
            }
        )

    # "Catalogue order" in the viewer should match the order the families are
    # introduced, so the grid reads form, material, essence, enchantment, trim
    # rather than leading with whichever family was built first.
    family_rank = {family["id"]: index for index, family in enumerate(families)}
    assets.sort(key=lambda asset: family_rank.get(asset["family"], len(family_rank)))

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "families": families,
        "assets": assets,
    }
    manifest_path = VIEWER / "data/assets.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    written = 0
    for stage in ("carved", "raw"):
        source_dir = KIT / stage
        out_dir = VIEWER / "public/assets" / stage
        out_dir.mkdir(parents=True, exist_ok=True)
        for path in sorted(source_dir.glob("*.png")):
            image = Image.open(path).convert("RGBA")
            image.thumbnail((PREVIEW_PX, PREVIEW_PX), Image.LANCZOS)
            image.save(out_dir / f"{path.stem}.webp", "WEBP", quality=PREVIEW_QUALITY, method=4)
            written += 1

    # Report, then complain about anything that does not line up.
    by_family: dict[str, list[dict]] = {}
    for asset in assets:
        by_family.setdefault(asset["family"], []).append(asset)

    print(f"{'family':14s} {'assets':>7s} {'with art':>9s}  categories")
    for family in families:
        group = by_family.get(family["id"], [])
        categories = sorted({entry["category"] for entry in group})
        print(
            f"{family['label']:14s} {len(group):7d} "
            f"{sum(1 for e in group if e['hasArt']):9d}  {', '.join(categories)}"
        )
    print(f"\ntotal assets    : {len(assets)}")
    print(f"previews written: {written}")

    problems = []
    missing = [entry["id"] for entry in assets if not entry["hasArt"]]
    if missing:
        problems.append(f"catalogued but no carved art: {', '.join(missing)}")
    no_prompt = [entry["id"] for entry in assets if not entry["prompt"]]
    if no_prompt:
        problems.append(f"no prompt recorded: {', '.join(no_prompt)}")
    catalogued = {entry["file"] for entry in assets}
    orphans = sorted(p.name for p in (KIT / "carved").glob("*.png") if p.name not in catalogued)
    if orphans:
        problems.append(f"carved art with no catalogue entry: {', '.join(orphans)}")

    for problem in problems:
        print(f"  PROBLEM {problem}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
