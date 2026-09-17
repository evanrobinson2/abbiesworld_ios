#!/usr/bin/env python3
"""Index every image already in the repo so the viewer covers all of it.

The generated ingredient art is catalogued by hand in catalog/ingredients.json,
because someone authored it. Everything else — 1000-odd files across
Assets.xcassets, AssetSources, experiments and docs — is classified from its
path and filename instead. That is a heuristic, and it is meant to be: the
alternative is hand-labelling a thousand files, and a coarse-but-honest bucket
plus working search beats a perfect taxonomy nobody maintains.

Anything that matches no rule lands in "unclassified", which is the signal to
add a rule rather than a thing to ignore.

    python3 tools/carve-assets/index_repo_assets.py

Writes prototypes/asset-viewer/data/repo-assets.json plus a small WebP
thumbnail per asset, and prints a per-kind report.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

from PIL import Image

REPO = pathlib.Path(__file__).resolve().parents[2]
VIEWER = REPO / "prototypes/asset-viewer"
THUMBS = VIEWER / "public/assets/repo"

THUMB_PX = 144
THUMB_QUALITY = 72

SUFFIXES = {".png", ".jpg", ".jpeg"}

# Directories the generated kit owns; catalogued elsewhere, skipped here.
SKIP = (
    "AssetSources/IngredientKit",
    "prototypes/asset-viewer/public",
    "node_modules",
    ".git/",
)

# Rules are tried in order: (name pattern, path fragment, kind, family, note).
# A pattern of None matches anything.
RULES: list[tuple[str | None, str | None, str, str, str]] = [
    # The existing game's own decorator inputs. Hardware and templates are
    # workshop items; the rest read as materials.
    (r"^furniture_ingredient_.*(hardware|fitting|knob|hinge|nail|template|clip|cord|tool)",
     None, "craftingItem", "furnitureFitting", "Existing furniture-shop hardware and notions."),
    (r"^furniture_ingredient_", None, "rawMaterial", "furnitureIngredient",
     "Existing furniture-shop raw material art."),

    (r"^cozy_room_", None, "decoration", "cozyRoomKit",
     "Shipped Cozy Room decoration set."),
    (None, "AssetSources/CozyRoomKit", "decoration", "cozyRoomSource",
     "Cozy Room pipeline working files."),

    (r"^creature_builder_", None, "characterArt", "creatureBuilder",
     "Creature Builder parts: creatures, outfits and buddies."),
    (None, "AssetSources/CreatureLab", "characterArt", "creatureLabSource",
     "Creature Lab pipeline working files."),
    (r"^world2_actor", None, "characterArt", "actor", "World 2 actors."),

    (r"^world2_atelier_action", None, "interfaceArt", "atelierControl",
     "Imagination Atelier control icons."),
    (r"^world2_atelier", None, "interfaceArt", "atelierArt",
     "Imagination Atelier interface art."),
    (r"^(AppIcon|AccentColor|broken)", None, "interfaceArt", "appChrome",
     "App icon, accent colour and placeholder art."),
    (None, "mascot/", "interfaceArt", "mascot", "Mascot art."),

    (r"^world2_(scene|poi|interior|map|cs)", None, "sceneArt", "world2Scene",
     "World 2 maps, scene backdrops and POI art."),
    (r"^world2_", None, "sceneArt", "world2Misc",
     "Other World 2 art: quests, deeds, hardpoints."),
    (None, "AssetSources/World2", "sceneArt", "world2Source",
     "World 2 pipeline working files: candidates, approvals, derivatives."),

    # Media packs are organised by subfolder, so the specific folders have to be
    # tried before the catch-all for the pack root.
    (None, "/costumes/", "characterArt", "mediaPackCostume", "Media pack costumes."),
    (None, "/places/", "sceneArt", "mediaPackPlace", "Media pack places."),
    (None, "/styles/", "interfaceArt", "mediaPackStyle", "Media pack style swatches."),
    (None, "/adventurers/", "characterArt", "mediaPackCharacter", "Media pack characters."),
    (None, "MediaPacks/", "sceneArt", "mediaPackPlace", "Media pack backgrounds."),
    (None, "Resources/World2Actors", "characterArt", "actor", "World 2 actors."),

    (r"^decorator_machine", None, "sceneArt", "decoratorMachine",
     "The Decorator Machine itself."),
    (r"under.?construction", None, "interfaceArt", "appChrome",
     "Placeholder art."),

    (None, "experiments/", "reference", "experiment",
     "Concept sheets from design experiments."),
    (None, "docs/", "reference", "designDoc",
     "Concept art attached to design docs."),
]


def classify(path: pathlib.Path, stem: str) -> tuple[str, str, str]:
    relative = path.as_posix()
    for pattern, fragment, kind, family, note in RULES:
        if pattern and not re.search(pattern, stem):
            continue
        if fragment and fragment not in relative:
            continue
        if pattern is None and fragment is None:
            return kind, family, note
        return kind, family, note
    return "reference", "unclassified", "No classification rule matched; add one."


def logical_name(path: pathlib.Path) -> tuple[str, str]:
    """An imageset is one logical asset, so name it after the set, not the file."""
    for parent in path.parents:
        if parent.suffix == ".imageset":
            return parent.stem, "imageset"
    return path.stem, "file"


def pretty(stem: str) -> str:
    text = re.sub(r"[_-]+", " ", stem).strip()
    return text[:1].upper() + text[1:]


def main() -> int:
    THUMBS.mkdir(parents=True, exist_ok=True)
    for stale in THUMBS.glob("*.webp"):
        stale.unlink()

    # Collect candidates, keeping the largest file per logical asset so an
    # imageset with several variants is indexed once.
    best: dict[str, pathlib.Path] = {}
    for path in REPO.rglob("*"):
        if path.suffix.lower() not in SUFFIXES or not path.is_file():
            continue
        relative = path.relative_to(REPO)
        if any(skip in relative.as_posix() for skip in SKIP):
            continue
        stem, _ = logical_name(relative)
        key = f"{relative.parent.as_posix()}::{stem}"
        if key not in best or path.stat().st_size > best[key].stat().st_size:
            best[key] = path

    assets, failures = [], []
    for key, path in sorted(best.items()):
        relative = path.relative_to(REPO)
        stem, container = logical_name(relative)
        kind, family, note = classify(relative, stem)
        digest = hashlib.sha1(relative.as_posix().encode()).hexdigest()[:8]
        thumb = f"{stem[:60]}-{digest}.webp"
        try:
            with Image.open(path) as image:
                width, height = image.size
                thumbnail = image.convert("RGBA")
                thumbnail.thumbnail((THUMB_PX, THUMB_PX), Image.LANCZOS)
                thumbnail.save(THUMBS / thumb, "WEBP", quality=THUMB_QUALITY, method=4)
        except Exception as error:  # noqa: BLE001 - report and keep going
            failures.append({"path": relative.as_posix(), "error": str(error)})
            continue

        assets.append(
            {
                "id": f"repo:{digest}",
                "name": pretty(stem),
                "kind": kind,
                "family": family,
                "familyNote": note,
                "source": "bundled",
                "container": container,
                "path": relative.as_posix(),
                "preview": f"repo/{thumb}",
                "bytes": path.stat().st_size,
                "dimensions": [width, height],
                "tags": [],
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "thumbnailPx": THUMB_PX,
        "assets": assets,
        "failures": failures,
    }
    (VIEWER / "data/repo-assets.json").write_text(json.dumps(payload, indent=2) + "\n")

    by_kind: dict[str, dict[str, int]] = {}
    for asset in assets:
        by_kind.setdefault(asset["kind"], {}).setdefault(asset["family"], 0)
        by_kind[asset["kind"]][asset["family"]] += 1
    print(f"{'kind':14s} {'count':>6s}  families")
    for kind in sorted(by_kind):
        families = by_kind[kind]
        listing = ", ".join(f"{name} {count}" for name, count in sorted(families.items()))
        print(f"{kind:14s} {sum(families.values()):6d}  {listing}")

    total_thumb = sum(p.stat().st_size for p in THUMBS.glob("*.webp"))
    print(f"\nindexed {len(assets)} assets, {len(failures)} unreadable")
    print(f"thumbnails: {total_thumb / 1024 / 1024:.1f}MB")
    unclassified = [a["path"] for a in assets if a["family"] == "unclassified"]
    if unclassified:
        print(f"unclassified ({len(unclassified)}), add a rule for these:")
        for path in unclassified[:12]:
            print(f"  {path}")
    for failure in failures:
        print(f"  UNREADABLE {failure['path']}: {failure['error']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
