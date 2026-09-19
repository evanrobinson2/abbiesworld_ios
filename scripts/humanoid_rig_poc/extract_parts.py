#!/usr/bin/env python3
"""Extract body parts from a generated character sheet.

Uses the known cell positions from the rig spec - no AI segmentation needed.

    python3 scripts/humanoid_rig_poc/extract_parts.py \
        --character-id my-character-001

Outputs:
    AssetSources/HumanoidRigPOC/characters/{character-id}/parts/
        head.png
        torso.png
        ...
    AssetSources/HumanoidRigPOC/characters/{character-id}/extraction.json
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

TOLERANCE = 30.0
FEATHER_PX = 1.0
MIN_COVERAGE_PCT = 5.0
MAX_COVERAGE_PCT = 85.0


def load_rig_spec() -> dict:
    spec_path = TEMPLATES_DIR / "rig-spec.json"
    return json.loads(spec_path.read_text(encoding="utf-8"))


def digest_bytes(data: bytes) -> str:
    return sha256(data).hexdigest()


def cell_median_background(rgb: np.ndarray) -> np.ndarray:
    """Get the background color from the cell border pixels."""
    top = rgb[0:5, :, :]
    bottom = rgb[-5:, :, :]
    left = rgb[:, 0:5, :]
    right = rgb[:, -5:, :]
    
    frame = np.concatenate([
        top.reshape(-1, 3),
        bottom.reshape(-1, 3),
        left.reshape(-1, 3),
        right.reshape(-1, 3)
    ], axis=0)
    
    return np.median(frame, axis=0)


def extract_part_from_cell(
    sheet: Image.Image,
    cell: dict,
    part_id: str,
) -> tuple[Image.Image | None, dict]:
    """Extract a single part from its cell in the sheet."""
    
    x, y, w, h = cell["x"], cell["y"], cell["width"], cell["height"]
    cell_img = sheet.crop((x, y, x + w, y + h))
    
    rgb = np.asarray(cell_img.convert("RGB")).astype(np.float32)
    height, width, _ = rgb.shape
    
    background = cell_median_background(rgb)
    distance = np.linalg.norm(rgb - background, axis=2)
    background_like = distance <= TOLERANCE
    
    labels, count = ndimage.label(background_like)
    edge_labels = set()
    if count:
        for strip in (labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]):
            edge_labels.update(np.unique(strip).tolist())
    edge_labels.discard(0)
    
    outside = np.isin(labels, list(edge_labels)) if edge_labels else np.zeros_like(background_like)
    subject = ndimage.binary_fill_holes(~outside)
    
    alpha = np.where(subject, 255, 0).astype(np.uint8)
    alpha_image = Image.fromarray(alpha, mode="L")
    
    if FEATHER_PX > 0:
        alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(FEATHER_PX))
    
    carved = cell_img.convert("RGBA")
    carved.putalpha(alpha_image)
    
    opaque_pixels = int((np.asarray(carved)[:, :, 3] > 8).sum())
    total_pixels = width * height
    coverage_pct = 100 * opaque_pixels / total_pixels
    
    failures = []
    
    if coverage_pct < MIN_COVERAGE_PCT:
        failures.append("PART_TOO_SMALL")
    if coverage_pct > MAX_COVERAGE_PCT:
        failures.append("CELL_OVERFLOW")
    
    labels_subject, num_components = ndimage.label(subject)
    if num_components > 1:
        component_sizes = ndimage.sum(subject, labels_subject, range(1, num_components + 1))
        if len(component_sizes) > 1:
            sorted_sizes = sorted(component_sizes, reverse=True)
            if sorted_sizes[1] > sorted_sizes[0] * 0.1:
                failures.append("DISCONNECTED_COMPONENT")
    
    bbox = alpha_image.point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox is None:
        return None, {
            "partID": part_id,
            "success": False,
            "failures": ["MISSING_PART"],
            "coveragePct": 0,
        }
    
    left, top, right, bottom = bbox
    padding = 8
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(width, right + padding)
    bottom = min(height, bottom + padding)
    
    trimmed = carved.crop((left, top, right, bottom))
    
    report = {
        "partID": part_id,
        "success": len(failures) == 0,
        "failures": failures,
        "cellBounds": cell,
        "detectedBackground": [int(v) for v in background],
        "trimmedBounds": {"left": left, "top": top, "right": right, "bottom": bottom},
        "outputSize": [trimmed.width, trimmed.height],
        "coveragePct": round(coverage_pct, 1),
        "numComponents": num_components,
    }
    
    return trimmed, report


def extract_all_parts(character_dir: Path) -> dict:
    """Extract all parts from a character's generated sheet."""
    
    rig_spec = load_rig_spec()
    cells = rig_spec["explodedSheet"]["cells"]
    
    exploded_path = character_dir / "generated-exploded.png"
    if not exploded_path.exists():
        return {
            "success": False,
            "error": f"Generated sheet not found: {exploded_path}",
            "parts": {}
        }
    
    sheet = Image.open(exploded_path)
    
    parts_dir = character_dir / "parts"
    parts_dir.mkdir(exist_ok=True)
    
    results = {
        "success": True,
        "sourceSHA256": digest_bytes(exploded_path.read_bytes()),
        "rigFamily": rig_spec["rigFamily"],
        "parts": {}
    }
    
    failures_total = 0
    
    for part_id, cell in cells.items():
        print(f"  Extracting {part_id}...")
        
        part_img, report = extract_part_from_cell(sheet, cell, part_id)
        
        if part_img is not None:
            part_path = parts_dir / f"{part_id}.png"
            part_img.save(part_path, optimize=True)
            report["outputFile"] = part_path.name
            report["outputSHA256"] = digest_bytes(part_path.read_bytes())
            print(f"    {part_id}: {report['outputSize'][0]}x{report['outputSize'][1]}, "
                  f"coverage={report['coveragePct']}%")
        else:
            print(f"    {part_id}: FAILED - {report['failures']}")
        
        results["parts"][part_id] = report
        
        if not report["success"]:
            failures_total += 1
            results["success"] = False
    
    print(f"\nExtracted {len(cells) - failures_total}/{len(cells)} parts successfully")
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Extract parts from generated sheet")
    parser.add_argument("--character-id", required=True, help="Character identifier")
    args = parser.parse_args()
    
    character_dir = CHARACTERS_DIR / args.character_id
    if not character_dir.exists():
        print(f"Error: Character directory not found: {character_dir}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Extracting parts for {args.character_id}...")
    results = extract_all_parts(character_dir)
    
    extraction_path = character_dir / "extraction.json"
    extraction_path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print(f"  Report: {extraction_path}")
    
    if not results["success"]:
        print("\nExtraction completed with failures!")
        sys.exit(1)
    else:
        print("\nExtraction complete!")


if __name__ == "__main__":
    main()
