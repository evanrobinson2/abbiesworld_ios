#!/usr/bin/env python3
"""Smart extraction with validation pipeline.

Extracts parts from generated sheets with:
1. Background removal (gray -> transparent)
2. Content cropping (remove empty space)
3. Validation checks (no text, proper coverage, etc.)
4. Content bounds recording for proper assembly
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

GRAY_BACKGROUND = np.array([200, 200, 200])  # #C8C8C8
TOLERANCE = 40
MIN_CONTENT_RATIO = 0.05
MAX_CONTENT_RATIO = 0.90


def load_rig_spec() -> dict:
    spec_path = TEMPLATES_DIR / "rig-spec.json"
    return json.loads(spec_path.read_text(encoding="utf-8"))


def remove_gray_background(img: Image.Image) -> tuple[Image.Image, float]:
    """Remove gray background, return RGBA image and coverage ratio."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    
    # Distance from gray background
    distance = np.linalg.norm(rgb - GRAY_BACKGROUND, axis=2)
    
    # Pixels close to gray are background
    is_background = distance < TOLERANCE
    
    # Create alpha: 255 for content, 0 for background
    alpha = np.where(is_background, 0, 255).astype(np.uint8)
    
    # Fill holes in the content mask
    content_mask = ~is_background
    content_mask = ndimage.binary_fill_holes(content_mask)
    alpha = np.where(content_mask, 255, 0).astype(np.uint8)
    
    # Slight feather for antialiasing
    alpha_img = Image.fromarray(alpha, mode="L")
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.5))
    
    # Create RGBA
    result = img.convert("RGBA")
    result.putalpha(alpha_img)
    
    # Calculate coverage
    coverage = np.sum(content_mask) / content_mask.size
    
    return result, coverage


def get_content_bounds(img: Image.Image) -> tuple[int, int, int, int] | None:
    """Get bounding box of non-transparent content."""
    if img.mode != "RGBA":
        return None
    
    alpha = np.asarray(img.split()[3])
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    
    if not rows.any() or not cols.any():
        return None
    
    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]
    
    return (int(x_min), int(y_min), int(x_max + 1), int(y_max + 1))


def check_for_text_artifacts(img: Image.Image) -> bool:
    """Heuristic check for text-like artifacts (thin high-contrast lines)."""
    if img.mode != "RGBA":
        return False
    
    gray = np.asarray(img.convert("L")).astype(np.float32)
    alpha = np.asarray(img.split()[3])
    
    # Check for thin horizontal lines (common in text)
    masked_gray = np.where(alpha > 10, gray, 128)
    
    # Edge detection
    edges_h = np.abs(np.diff(masked_gray, axis=0))
    edges_v = np.abs(np.diff(masked_gray, axis=1))
    
    # Text tends to have many small isolated edge regions
    high_edges = (edges_h > 50).sum() + (edges_v > 50).sum()
    total_pixels = masked_gray.size
    
    edge_ratio = high_edges / total_pixels
    
    # If more than 5% of pixels are high-contrast edges, suspicious
    return edge_ratio > 0.05


def extract_and_validate_part(
    sheet: Image.Image,
    cell: dict,
    part_id: str,
) -> tuple[Image.Image | None, dict]:
    """Extract a part and run validation checks."""
    
    x, y, w, h = cell["x"], cell["y"], cell["width"], cell["height"]
    cell_img = sheet.crop((x, y, x + w, y + h))
    
    # Remove gray background
    rgba_img, coverage = remove_gray_background(cell_img)
    
    # Get content bounds
    bounds = get_content_bounds(rgba_img)
    
    validation = {
        "coverage": round(coverage, 4),
        "hasBounds": bounds is not None,
        "issues": [],
    }
    
    # Validation checks
    if coverage < MIN_CONTENT_RATIO:
        validation["issues"].append("TOO_LITTLE_CONTENT")
    elif coverage > MAX_CONTENT_RATIO:
        validation["issues"].append("TOO_MUCH_CONTENT")
    
    if bounds is None:
        validation["issues"].append("NO_CONTENT")
        return None, validation
    
    # Check for text artifacts
    if check_for_text_artifacts(rgba_img):
        validation["issues"].append("POSSIBLE_TEXT_ARTIFACTS")
    
    # Record bounds for assembly
    validation["contentBounds"] = {
        "x": bounds[0],
        "y": bounds[1],
        "width": bounds[2] - bounds[0],
        "height": bounds[3] - bounds[1],
    }
    
    # Calculate center of content within cell (for positioning)
    content_center_x = (bounds[0] + bounds[2]) / 2
    content_center_y = (bounds[1] + bounds[3]) / 2
    validation["contentCenter"] = {
        "x": round(content_center_x, 1),
        "y": round(content_center_y, 1),
        "normalizedX": round(content_center_x / w, 4),
        "normalizedY": round(content_center_y / h, 4),
    }
    
    return rgba_img, validation


def main():
    parser = argparse.ArgumentParser(description="Smart part extraction with validation")
    parser.add_argument("--character-id", required=True, help="Character ID")
    parser.add_argument("--output-full-cells", action="store_true", 
                       help="Save full cells (not cropped)")
    args = parser.parse_args()
    
    rig_spec = load_rig_spec()
    character_dir = CHARACTERS_DIR / args.character_id
    
    # Find the generated sheet
    sheet_path = character_dir / "generated-exploded.png"
    if not sheet_path.exists():
        print(f"Error: Sheet not found at {sheet_path}", file=sys.stderr)
        sys.exit(1)
    
    sheet = Image.open(sheet_path)
    print(f"Processing {args.character_id}...")
    print(f"  Sheet size: {sheet.size}")
    
    parts_dir = character_dir / "parts"
    parts_dir.mkdir(exist_ok=True)
    
    cells = rig_spec["explodedSheet"]["cells"]
    results = {
        "characterId": args.character_id,
        "sheetSize": list(sheet.size),
        "parts": {},
        "summary": {
            "total": len(cells),
            "success": 0,
            "warnings": 0,
            "failures": 0,
        }
    }
    
    for part_id, cell in cells.items():
        print(f"  Extracting {part_id}...")
        
        part_img, validation = extract_and_validate_part(sheet, cell, part_id)
        
        if part_img is None:
            print(f"    FAILED: {validation['issues']}")
            results["summary"]["failures"] += 1
            results["parts"][part_id] = {"success": False, **validation}
            continue
        
        # Save the part
        part_path = parts_dir / f"{part_id}.png"
        part_img.save(part_path)
        
        if validation["issues"]:
            print(f"    WARNING: {validation['issues']}, coverage={validation['coverage']:.1%}")
            results["summary"]["warnings"] += 1
        else:
            print(f"    OK: coverage={validation['coverage']:.1%}")
            results["summary"]["success"] += 1
        
        results["parts"][part_id] = {
            "success": True,
            "path": str(part_path.relative_to(character_dir)),
            **validation
        }
    
    # Save extraction report
    report_path = character_dir / "smart-extraction.json"
    report_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nReport: {report_path}")
    print(f"Summary: {results['summary']}")


if __name__ == "__main__":
    main()
