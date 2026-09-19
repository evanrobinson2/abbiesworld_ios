#!/usr/bin/env python3
"""Extract body parts from an assembled (full figure) generated image.

Uses the part bounds from rig-spec to crop individual pieces from
the assembled character image.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

# Background color to remove (template background)
TEMPLATE_BG = np.array([200, 200, 200])  
TOLERANCE = 35


def load_rig_spec() -> dict:
    spec_path = TEMPLATES_DIR / "rig-spec.json"
    return json.loads(spec_path.read_text(encoding="utf-8"))


def remove_background(img: Image.Image) -> Image.Image:
    """Remove gray background from image."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    distance = np.linalg.norm(rgb - TEMPLATE_BG, axis=2)
    
    is_bg = distance < TOLERANCE
    # Fill holes
    content_mask = ndimage.binary_fill_holes(~is_bg)
    
    alpha = np.where(content_mask, 255, 0).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(0.5))
    
    result = img.convert("RGBA")
    result.putalpha(alpha_img)
    return result


def extract_part_from_assembled(
    img: Image.Image,
    part_id: str,
    part_spec: dict,
    margin: int = 20,
) -> Image.Image | None:
    """Extract a single part based on its bounds in the rig spec."""
    
    bounds_px = part_spec.get("bounds", {}).get("pixels")
    if not bounds_px:
        return None
    
    x = bounds_px["x"] - margin
    y = bounds_px["y"] - margin
    w = bounds_px["width"] + margin * 2
    h = bounds_px["height"] + margin * 2
    
    # Clamp to image bounds
    x = max(0, x)
    y = max(0, y)
    x2 = min(img.width, x + w)
    y2 = min(img.height, y + h)
    
    cropped = img.crop((x, y, x2, y2))
    
    # Remove background
    return remove_background(cropped)


def main():
    parser = argparse.ArgumentParser(description="Extract parts from assembled image")
    parser.add_argument("--character-id", required=True)
    args = parser.parse_args()
    
    rig_spec = load_rig_spec()
    character_dir = CHARACTERS_DIR / args.character_id
    
    # Find assembled image
    for name in ["generated-assembled.png", "assembled.png"]:
        img_path = character_dir / name
        if img_path.exists():
            break
    else:
        print(f"Error: No assembled image found in {character_dir}", file=sys.stderr)
        sys.exit(1)
    
    img = Image.open(img_path)
    print(f"Processing {args.character_id}...")
    print(f"  Image size: {img.size}")
    
    parts_dir = character_dir / "parts"
    parts_dir.mkdir(exist_ok=True)
    
    results = {"parts": {}, "summary": {"total": 0, "success": 0}}
    
    for part_id, part_spec in rig_spec["parts"].items():
        results["summary"]["total"] += 1
        print(f"  Extracting {part_id}...")
        
        part_img = extract_part_from_assembled(img, part_id, part_spec)
        
        if part_img is None:
            print(f"    SKIPPED: No bounds defined")
            continue
        
        # Check if we got any content
        alpha = np.asarray(part_img.split()[3])
        content_pixels = (alpha > 10).sum()
        
        if content_pixels < 100:
            print(f"    WARNING: Very little content ({content_pixels} px)")
        else:
            print(f"    OK: {content_pixels} content pixels")
            results["summary"]["success"] += 1
        
        part_path = parts_dir / f"{part_id}.png"
        part_img.save(part_path)
        results["parts"][part_id] = {
            "success": True,
            "contentPixels": int(content_pixels),
            "size": list(part_img.size),
        }
    
    report_path = character_dir / "extraction-report.json"
    report_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nReport: {report_path}")
    print(f"Summary: {results['summary']}")


if __name__ == "__main__":
    main()
