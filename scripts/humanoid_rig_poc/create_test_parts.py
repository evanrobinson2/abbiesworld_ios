#!/usr/bin/env python3
"""Create test parts from the construction template for preview demonstration.

This creates placeholder parts by extracting them from the template itself,
allowing the web preview to demonstrate animation without requiring OpenAI.

    python3 scripts/humanoid_rig_poc/create_test_parts.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

TOLERANCE = 30.0
FEATHER_PX = 1.0


def load_rig_spec() -> dict:
    spec_path = TEMPLATES_DIR / "rig-spec.json"
    return json.loads(spec_path.read_text(encoding="utf-8"))


def extract_from_assembled(template: Image.Image, bounds: dict) -> Image.Image:
    """Extract a part from the assembled template using its bounds."""
    x = bounds["x"]
    y = bounds["y"]
    w = bounds["width"]
    h = bounds["height"]
    
    padding = 20
    x = max(0, x - padding)
    y = max(0, y - padding)
    w = w + padding * 2
    h = h + padding * 2
    
    cropped = template.crop((x, y, x + w, y + h))
    
    rgb = np.asarray(cropped.convert("RGB")).astype(np.float32)
    height, width, _ = rgb.shape
    
    bg_color = np.array([200, 200, 200])
    distance = np.linalg.norm(rgb - bg_color, axis=2)
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
    
    result = cropped.convert("RGBA")
    result.putalpha(alpha_image)
    
    bbox = alpha_image.point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox:
        left, top, right, bottom = bbox
        pad = 4
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(width, right + pad)
        bottom = min(height, bottom + pad)
        result = result.crop((left, top, right, bottom))
    
    return result


def main():
    rig_spec = load_rig_spec()
    parts_spec = rig_spec["parts"]
    
    template_path = TEMPLATES_DIR / "construction-template.png"
    template = Image.open(template_path)
    
    test_dir = CHARACTERS_DIR / "test-001"
    parts_dir = test_dir / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)
    
    print("Creating test parts from template...")
    
    for part_id, spec in parts_spec.items():
        bounds = spec["bounds"]["pixels"]
        
        part_img = extract_from_assembled(template, bounds)
        part_path = parts_dir / f"{part_id}.png"
        part_img.save(part_path, optimize=True)
        print(f"  {part_id}: {part_img.width}x{part_img.height}")
    
    generation = {
        "schemaVersion": 1,
        "characterID": "test-001",
        "description": "Test character extracted from template for preview demonstration",
        "source": "template-extraction",
        "methods": {
            "template": {
                "success": True,
                "note": "Parts extracted directly from construction template"
            }
        }
    }
    
    gen_path = test_dir / "generation.json"
    gen_path.write_text(json.dumps(generation, indent=2) + "\n", encoding="utf-8")
    
    print(f"\nTest character created at: {test_dir}")


if __name__ == "__main__":
    main()
