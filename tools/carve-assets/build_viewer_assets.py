#!/usr/bin/env python3
"""Build the asset viewer's catalogue: generated art plus everything in the repo.

Three sources feed one manifest:

  * Essences come from DecoratorModels.swift, so the game's own catalogue stays
    authoritative — nothing here can invent an essence the app does not have.
  * Every other generated family comes from catalog/ingredients.json, which also
    carries the prompt that produced each piece.
  * Everything already in the repo comes from repo-assets.json, written by
    index_repo_assets.py.

Generated art gets web-sized WebP previews of both its raw and carved stages;
full-resolution PNGs stay in AssetSources. Indexed art keeps a thumbnail only.

    python3 tools/carve-assets/index_repo_assets.py   # first
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

# Fields that configure a prompt template rather than describe the asset.
DESCRIPTIVE_FIELDS = {"id", "name", "family", "category", "emoji", "tags", "subject",
                      "recipe", "readback", "prompt"}


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
        filled = filled.replace("{" + key + "}", str(value))
    return filled


def pretty(identifier: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", identifier)
    text = re.sub(r"[_-]+", " ", text)
    return text[:1].upper() + text[1:]


def build_generated(catalog: dict) -> list[dict]:
    templates = {family["id"]: family for family in catalog["families"]}
    assets: list[dict] = []

    essence_family = templates["essence"]
    subjects = catalog["essenceSubjects"]
    for essence in read_swift_essences():
        subject = subjects.get(essence["id"])
        assets.append(
            {
                "id": essence["id"],
                "name": essence["name"],
                "kind": essence_family["kind"],
                "family": "essence",
                "category": essence["category"],
                "emoji": essence["emoji"],
                "tags": [],
                "source": "generated",
                "file": f"{essence['imageName']}.png",
                "preview": f"carved/{essence['imageName']}.webp",
                "rawPreview": f"raw/{essence['imageName']}.webp",
                "prompt": None
                if subject is None
                else compose_prompt(essence_family["promptTemplate"], subject, {}),
            }
        )

    for item in catalog["ingredients"]:
        family = templates[item["family"]]
        # Decorations carry a prompt composed by recipe.js and stored verbatim;
        # everything else fills its family's template.
        if "prompt" in item:
            prompt = item["prompt"]
        else:
            extras = dict(family.get("defaults") or {})
            extras.update({k: v for k, v in item.items() if k not in DESCRIPTIVE_FIELDS})
            prompt = compose_prompt(family["promptTemplate"], item["subject"], extras)

        assets.append(
            {
                "id": item["id"],
                "name": item["name"],
                "kind": family["kind"],
                "family": item["family"],
                "category": item["category"],
                "emoji": item.get("emoji", ""),
                "tags": item.get("tags", []),
                "source": "generated",
                "file": f"{item['id']}.png",
                "preview": f"carved/{item['id']}.webp",
                "rawPreview": f"raw/{item['id']}.webp",
                "prompt": prompt,
                **({"recipe": item["recipe"]} if "recipe" in item else {}),
                **({"readback": item["readback"]} if "readback" in item else {}),
            }
        )
    return assets


def main() -> int:
    for path in (SWIFT, CATALOG):
        if not path.exists():
            print(f"cannot find {path}")
            return 1

    catalog = json.loads(CATALOG.read_text())
    kinds = catalog["kinds"]
    families = [
        {
            "id": family["id"],
            "kind": family["kind"],
            "recipeSlot": family["recipeSlot"],
            "label": family["label"],
            "question": family.get("question"),
            "blurb": family.get("blurb"),
            "source": "generated",
        }
        for family in catalog["families"]
    ]

    generated = build_generated(catalog)

    carve_path = KIT / "carve-report.json"
    carve_by_file = {}
    if carve_path.exists():
        carve_by_file = {
            entry["source"]: entry for entry in json.loads(carve_path.read_text())["carved"]
        }
    for asset in generated:
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

    # Everything already in the repo, indexed rather than authored.
    indexed_path = VIEWER / "data/repo-assets.json"
    indexed: list[dict] = []
    if indexed_path.exists():
        payload = json.loads(indexed_path.read_text())
        seen_families = {}
        for asset in payload["assets"]:
            seen_families.setdefault(asset["family"], (asset["kind"], asset["familyNote"]))
            indexed.append(
                {
                    "id": asset["id"],
                    "name": asset["name"],
                    "kind": asset["kind"],
                    "family": asset["family"],
                    "category": asset["container"],
                    "emoji": "",
                    "tags": asset["tags"],
                    "source": "bundled",
                    "path": asset["path"],
                    "preview": asset["preview"],
                    "rawPreview": None,
                    "bytes": asset["bytes"],
                    "dimensions": asset["dimensions"],
                    "prompt": None,
                    "hasArt": True,
                    "carve": None,
                }
            )
        for family_id, (kind, note) in sorted(seen_families.items()):
            families.append(
                {
                    "id": family_id,
                    "kind": kind,
                    "recipeSlot": False,
                    "label": pretty(family_id),
                    "question": None,
                    "blurb": note,
                    "source": "bundled",
                }
            )
    else:
        print("  NOTE data/repo-assets.json missing; run index_repo_assets.py for the full index")

    # Browsing order should follow the order kinds and families are introduced.
    kind_rank = {kind["id"]: index for index, kind in enumerate(kinds)}
    family_rank = {family["id"]: index for index, family in enumerate(families)}
    assets = generated + indexed
    assets.sort(
        key=lambda asset: (
            kind_rank.get(asset["kind"], len(kind_rank)),
            family_rank.get(asset["family"], len(family_rank)),
        )
    )

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "kinds": kinds,
        "families": families,
        "assets": assets,
    }
    (VIEWER / "data/assets.json").write_text(json.dumps(manifest, indent=2) + "\n")

    written = 0
    for stage in ("carved", "raw"):
        source_dir = KIT / stage
        out_dir = VIEWER / "public/assets" / stage
        out_dir.mkdir(parents=True, exist_ok=True)
        for existing in out_dir.glob("*.webp"):
            existing.unlink()
        for path in sorted(source_dir.glob("*.png")):
            image = Image.open(path).convert("RGBA")
            image.thumbnail((PREVIEW_PX, PREVIEW_PX), Image.LANCZOS)
            image.save(out_dir / f"{path.stem}.webp", "WEBP", quality=PREVIEW_QUALITY, method=4)
            written += 1

    # Report, then complain about anything that does not line up.
    print(f"{'kind':14s} {'total':>6s} {'made':>6s} {'bundled':>8s}  families")
    for kind in kinds:
        group = [a for a in assets if a["kind"] == kind["id"]]
        made = sum(1 for a in group if a["source"] == "generated")
        names = sorted({a["family"] for a in group})
        print(
            f"{kind['label']:14s} {len(group):6d} {made:6d} {len(group) - made:8d}  {', '.join(names)}"
        )
    print(f"\ntotal assets      : {len(assets)}  ({len(generated)} generated, {len(indexed)} bundled)")
    print(f"generated previews: {written}")

    problems = []
    missing = [a["id"] for a in generated if not a["hasArt"]]
    if missing:
        problems.append(f"catalogued but no carved art: {', '.join(missing)}")
    no_prompt = [a["id"] for a in generated if not a["prompt"]]
    if no_prompt:
        problems.append(f"no prompt recorded: {', '.join(no_prompt)}")
    catalogued = {a["file"] for a in generated}
    orphans = sorted(p.name for p in (KIT / "carved").glob("*.png") if p.name not in catalogued)
    if orphans:
        problems.append(f"carved art with no catalogue entry: {', '.join(orphans)}")

    for problem in problems:
        print(f"  PROBLEM {problem}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
