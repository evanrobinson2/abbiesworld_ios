#!/usr/bin/env python3
"""Fail if Marble Voyage plate images are not ~4:3 landscape,
or if Plink voyage UI crops fight/event plates with scaledToFill.

Title menu may bleed via MarbleVoyageBleedPlate only.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow required: pip install pillow", file=sys.stderr)
    sys.exit(2)

TARGET = 4.0 / 3.0
TOL = 0.03
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "abbies.world.ios" / "abbies.world.ios" / "Assets.xcassets"
PLINK = ROOT / "abbies.world.ios" / "abbies.world.ios" / "Views" / "World2" / "Plink"

PLATES = [
    "world2_title_marbleVoyage",
    "world2_title_coralCliffs",
    "world2_title_pinkGrove",
    "world2_title_skyMeadow",
    "world2_map_peglin_crashLand",
    "world2_map_peglin_foxLand",
    "world2_map_peglin_bramble",
    "world2_map_peglin_stagLand",
]

# Surfaces that must never crop voyage fight/event plates.
NO_FILL_SWIFT = [
    PLINK / "MarbleVoyageHostView.swift",
    PLINK / "PlinkBattleHostView.swift",
]
LAYOUT_SWIFT = (
    ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Models"
    / "World2"
    / "PeglinEdition"
    / "MarbleVoyagePlateLayout.swift"
)


def check_no_fill(failures: list[str]) -> None:
    fill_re = re.compile(r"scaledToFill\s*\(")
    for path in NO_FILL_SWIFT:
        if not path.is_file():
            failures.append(f"missing source: {path}")
            continue
        text = path.read_text(encoding="utf-8")
        for i, line in enumerate(text.splitlines(), 1):
            stripped = line.lstrip()
            if stripped.startswith("//"):
                continue
            if fill_re.search(line):
                failures.append(
                    f"{path.name}:{i}: scaledToFill is forbidden on voyage fight/event plates"
                )

    # Title bleed is allowed only inside MarbleVoyageBleedPlate.
    if not LAYOUT_SWIFT.is_file():
        failures.append(f"missing source: {LAYOUT_SWIFT}")
        return
    text = LAYOUT_SWIFT.read_text(encoding="utf-8")
    if "struct MarbleVoyageBleedPlate" not in text:
        for i, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith("//"):
                continue
            if fill_re.search(line):
                failures.append(
                    f"{LAYOUT_SWIFT.name}:{i}: scaledToFill requires MarbleVoyageBleedPlate"
                )
        return
    bleed_at = text.index("struct MarbleVoyageBleedPlate")
    for i, line in enumerate(text[:bleed_at].splitlines(), 1):
        if line.lstrip().startswith("//"):
            continue
        if fill_re.search(line):
            failures.append(
                f"{LAYOUT_SWIFT.name}:{i}: scaledToFill only allowed in MarbleVoyageBleedPlate"
            )


def main(extra: list[str]) -> int:
    names = PLATES + extra
    failures: list[str] = []
    for name in names:
        folder = ASSETS / f"{name}.imageset"
        if not folder.is_dir():
            path = Path(name)
            if path.is_file():
                imgs = [path]
            else:
                failures.append(f"{name}: imageset missing")
                continue
        else:
            imgs = [
                p
                for p in folder.iterdir()
                if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
            ]
            if not imgs:
                failures.append(f"{name}: no image file")
                continue
        for img_path in imgs:
            with Image.open(img_path) as im:
                w, h = im.size
            if h <= 0:
                failures.append(f"{img_path}: bad size")
                continue
            ratio = w / h
            if abs(ratio - TARGET) > TOL:
                failures.append(
                    f"{img_path.name}: {w}x{h} ratio={ratio:.4f} "
                    f"(need ~4:3={TARGET:.4f} ±{TOL})"
                )

    check_no_fill(failures)

    if failures:
        print("VOYAGE PLATE CHECK FAILED:")
        for line in failures:
            print(" ", line)
        print(
            "\nGenerate at 2048x1536 (4:3 landscape). "
            "UI must Fit fight/event plates; title may Bleed via MarbleVoyageBleedPlate."
        )
        return 1
    print(
        f"OK — {len(names)} plate(s) match 4:3 ±{TOL}; "
        "fight/event Fit; title Bleed allowed"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
