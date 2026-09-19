#!/usr/bin/env python3
"""Generate the canonical humanoid construction template.

The PNG and overlay are generated programmatically from rig-schema.json so
the visual guide and rig metadata cannot silently diverge.

    python3 scripts/humanoid_rig_poc/generate_template.py

Outputs:
    AssetSources/HumanoidRigPOC/templates/construction-template.png
    AssetSources/HumanoidRigPOC/templates/construction-template-overlay.png
    AssetSources/HumanoidRigPOC/templates/exploded-sheet.png
    AssetSources/HumanoidRigPOC/templates/exploded-sheet-overlay.png
    AssetSources/HumanoidRigPOC/templates/rig-spec.json
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "AssetSources" / "HumanoidRigPOC" / "rig-schema.json"
OUTPUT_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"

PART_COLORS = {
    "head": (255, 200, 150, 255),
    "hair_back": (180, 120, 200, 255),
    "hair_front": (200, 140, 220, 255),
    "torso": (150, 200, 255, 255),
    "pelvis": (180, 180, 220, 255),
    "upper_arm_left": (0, 200, 200, 255),
    "forearm_left": (0, 220, 150, 255),
    "hand_left": (100, 255, 180, 255),
    "upper_arm_right": (220, 100, 180, 255),
    "forearm_right": (255, 150, 100, 255),
    "hand_right": (255, 200, 150, 255),
    "thigh_left": (100, 150, 255, 255),
    "shin_left": (80, 180, 255, 255),
    "foot_left": (120, 200, 255, 255),
    "thigh_right": (255, 150, 100, 255),
    "shin_right": (255, 180, 120, 255),
    "foot_right": (255, 200, 150, 255),
}

SOCKET_COLOR = (255, 50, 50, 255)
PIVOT_COLOR = (50, 255, 50, 255)
BONE_COLOR = (255, 255, 0, 200)


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def draw_capsule(draw: ImageDraw.ImageDraw, bounds: dict, color: tuple, vertical: bool = True):
    """Draw a capsule (pill) shape within the given bounds."""
    x, y, w, h = bounds["x"], bounds["y"], bounds["width"], bounds["height"]
    if vertical:
        radius = min(w // 2, h // 4)
    else:
        radius = min(h // 2, w // 4)
    
    draw.rounded_rectangle(
        [x, y, x + w, y + h],
        radius=radius,
        fill=color,
        outline=(80, 80, 80, 255),
        width=3
    )


def draw_ellipse_part(draw: ImageDraw.ImageDraw, bounds: dict, color: tuple):
    """Draw an ellipse within bounds."""
    x, y, w, h = bounds["x"], bounds["y"], bounds["width"], bounds["height"]
    draw.ellipse([x, y, x + w, y + h], fill=color, outline=(80, 80, 80, 255), width=3)


def draw_trapezoid(draw: ImageDraw.ImageDraw, bounds: dict, color: tuple, taper: float = 0.7):
    """Draw a tapered trapezoid (narrower at top)."""
    x, y, w, h = bounds["x"], bounds["y"], bounds["width"], bounds["height"]
    top_inset = w * (1 - taper) / 2
    points = [
        (x + top_inset, y),
        (x + w - top_inset, y),
        (x + w, y + h),
        (x, y + h),
    ]
    draw.polygon(points, fill=color, outline=(80, 80, 80, 255), width=3)


def draw_wedge(draw: ImageDraw.ImageDraw, bounds: dict, color: tuple, direction: str = "right"):
    """Draw a foot wedge shape."""
    x, y, w, h = bounds["x"], bounds["y"], bounds["width"], bounds["height"]
    if direction == "right":
        points = [
            (x, y + h * 0.3),
            (x + w * 0.3, y),
            (x + w, y + h * 0.2),
            (x + w, y + h),
            (x, y + h),
        ]
    else:
        points = [
            (x + w, y + h * 0.3),
            (x + w * 0.7, y),
            (x, y + h * 0.2),
            (x, y + h),
            (x + w, y + h),
        ]
    draw.polygon(points, fill=color, outline=(80, 80, 80, 255), width=3)


def draw_mitten(draw: ImageDraw.ImageDraw, bounds: dict, color: tuple):
    """Draw a simplified mitten/hand shape."""
    x, y, w, h = bounds["x"], bounds["y"], bounds["width"], bounds["height"]
    draw.rounded_rectangle(
        [x, y, x + w, y + h],
        radius=min(w, h) // 3,
        fill=color,
        outline=(80, 80, 80, 255),
        width=3
    )


def draw_assembled_template(schema: dict) -> Image.Image:
    """Draw the assembled neutral pose template."""
    canvas = schema["canvas"]
    img = Image.new("RGBA", (canvas["width"], canvas["height"]), (200, 200, 200, 255))
    draw = ImageDraw.Draw(img)
    
    parts = schema["parts"]
    part_order = schema["partOrder"]
    
    for part_id in part_order:
        part = parts[part_id]
        bounds = part["bounds"]["pixels"]
        color = PART_COLORS.get(part_id, (180, 180, 180, 255))
        
        if part_id == "head":
            draw_ellipse_part(draw, bounds, color)
        elif part_id in ("hair_back", "hair_front"):
            draw_ellipse_part(draw, bounds, color)
        elif part_id == "torso":
            draw_trapezoid(draw, bounds, color, taper=0.75)
        elif part_id == "pelvis":
            draw.rounded_rectangle(
                [bounds["x"], bounds["y"], bounds["x"] + bounds["width"], bounds["y"] + bounds["height"]],
                radius=20,
                fill=color,
                outline=(80, 80, 80, 255),
                width=3
            )
        elif "arm" in part_id or "thigh" in part_id or "shin" in part_id:
            draw_capsule(draw, bounds, color, vertical=True)
        elif "hand" in part_id:
            draw_mitten(draw, bounds, color)
        elif "foot" in part_id:
            direction = "left" if "left" in part_id else "right"
            draw_wedge(draw, bounds, color, direction)
    
    return img


def draw_overlay(schema: dict, base: Image.Image) -> Image.Image:
    """Draw the overlay with bones, pivots, and sockets."""
    img = base.copy()
    draw = ImageDraw.Draw(img)
    
    parts = schema["parts"]
    skeleton = schema["skeleton"]
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
        small_font = font
    
    for part_id, part in parts.items():
        pivot = part["pivot"]["pixels"]
        
        draw.ellipse(
            [pivot[0] - 8, pivot[1] - 8, pivot[0] + 8, pivot[1] + 8],
            fill=PIVOT_COLOR,
            outline=(0, 0, 0, 255),
            width=2
        )
        
        if part.get("proximalSocket"):
            socket = part["proximalSocket"]["pixels"]
            draw.ellipse(
                [socket[0] - 6, socket[1] - 6, socket[0] + 6, socket[1] + 6],
                fill=SOCKET_COLOR,
                outline=(0, 0, 0, 255),
                width=2
            )
        
        if part.get("distalSocket"):
            socket = part["distalSocket"]["pixels"]
            draw.ellipse(
                [socket[0] - 6, socket[1] - 6, socket[0] + 6, socket[1] + 6],
                fill=SOCKET_COLOR,
                outline=(0, 0, 0, 255),
                width=2
            )
        
        bounds = part["bounds"]["pixels"]
        label_x = bounds["x"] + bounds["width"] // 2
        label_y = bounds["y"] + bounds["height"] // 2
        
        short_name = part_id.replace("_left", "_L").replace("_right", "_R")
        draw.text((label_x, label_y), short_name, fill=(0, 0, 0, 255), font=small_font, anchor="mm")
    
    for part_id, part in parts.items():
        pivot = part["pivot"]["pixels"]
        if part.get("distalSocket"):
            distal = part["distalSocket"]["pixels"]
            draw.line([pivot[0], pivot[1], distal[0], distal[1]], fill=BONE_COLOR, width=4)
    
    return img


def draw_exploded_sheet(schema: dict) -> Image.Image:
    """Draw the exploded sheet with each part in its own cell."""
    canvas_w, canvas_h = 2048, 2048
    img = Image.new("RGBA", (canvas_w, canvas_h), (220, 220, 220, 255))
    draw = ImageDraw.Draw(img)
    
    cell_layout = {
        "preview": {"row": 0, "col": 0, "colspan": 4, "rowspan": 2},
        "head": {"row": 2, "col": 0},
        "torso": {"row": 2, "col": 1},
        "pelvis": {"row": 2, "col": 2},
        "hair_back": {"row": 2, "col": 3},
        "upper_arm_left": {"row": 3, "col": 0},
        "forearm_left": {"row": 3, "col": 1},
        "hand_left": {"row": 3, "col": 2},
        "hair_front": {"row": 3, "col": 3},
        "upper_arm_right": {"row": 4, "col": 0},
        "forearm_right": {"row": 4, "col": 1},
        "hand_right": {"row": 4, "col": 2},
        "thigh_left": {"row": 5, "col": 0},
        "shin_left": {"row": 5, "col": 1},
        "foot_left": {"row": 5, "col": 2},
        "thigh_right": {"row": 6, "col": 0},
        "shin_right": {"row": 6, "col": 1},
        "foot_right": {"row": 6, "col": 2},
    }
    
    cell_w = canvas_w // 4
    cell_h = canvas_h // 7
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except OSError:
        font = ImageFont.load_default()
    
    for row in range(7):
        for col in range(4):
            x = col * cell_w
            y = row * cell_h
            draw.rectangle([x, y, x + cell_w - 2, y + cell_h - 2], outline=(150, 150, 150, 255), width=2)
    
    preview_x = 0
    preview_y = 0
    preview_w = cell_w * 4
    preview_h = cell_h * 2
    draw.rectangle([preview_x, preview_y, preview_w - 2, preview_h - 2], outline=(100, 100, 100, 255), width=3)
    draw.text((preview_w // 2, preview_h // 2), "MASTER PREVIEW", fill=(100, 100, 100, 255), font=font, anchor="mm")
    
    parts = schema["parts"]
    for part_id, layout in cell_layout.items():
        if part_id == "preview":
            continue
        
        col = layout["col"]
        row = layout["row"]
        x = col * cell_w + 10
        y = row * cell_h + 10
        w = cell_w - 20
        h = cell_h - 40
        
        color = PART_COLORS.get(part_id, (180, 180, 180, 255))
        
        cell_bounds = {"x": x, "y": y + 25, "width": w, "height": h - 25}
        
        if part_id == "head":
            draw_ellipse_part(draw, cell_bounds, color)
        elif part_id in ("hair_back", "hair_front"):
            draw_ellipse_part(draw, cell_bounds, color)
        elif part_id == "torso":
            draw_trapezoid(draw, cell_bounds, color, taper=0.75)
        elif part_id == "pelvis":
            draw.rounded_rectangle(
                [cell_bounds["x"], cell_bounds["y"], 
                 cell_bounds["x"] + cell_bounds["width"], 
                 cell_bounds["y"] + cell_bounds["height"]],
                radius=15,
                fill=color,
                outline=(80, 80, 80, 255),
                width=2
            )
        elif "arm" in part_id or "thigh" in part_id or "shin" in part_id:
            draw_capsule(draw, cell_bounds, color, vertical=True)
        elif "hand" in part_id:
            draw_mitten(draw, cell_bounds, color)
        elif "foot" in part_id:
            direction = "left" if "left" in part_id else "right"
            draw_wedge(draw, cell_bounds, color, direction)
        
        label = part_id.upper().replace("_", " ")
        draw.text((x + w // 2, y + 12), label, fill=(60, 60, 60, 255), font=font, anchor="mm")
    
    return img


def generate_rig_spec(schema: dict) -> dict:
    """Generate the runtime rig specification with cell coordinates for extraction."""
    cell_w = 2048 // 4
    cell_h = 2048 // 7
    
    cell_layout = {
        "head": {"row": 2, "col": 0},
        "torso": {"row": 2, "col": 1},
        "pelvis": {"row": 2, "col": 2},
        "hair_back": {"row": 2, "col": 3},
        "upper_arm_left": {"row": 3, "col": 0},
        "forearm_left": {"row": 3, "col": 1},
        "hand_left": {"row": 3, "col": 2},
        "hair_front": {"row": 3, "col": 3},
        "upper_arm_right": {"row": 4, "col": 0},
        "forearm_right": {"row": 4, "col": 1},
        "hand_right": {"row": 4, "col": 2},
        "thigh_left": {"row": 5, "col": 0},
        "shin_left": {"row": 5, "col": 1},
        "foot_left": {"row": 5, "col": 2},
        "thigh_right": {"row": 6, "col": 0},
        "shin_right": {"row": 6, "col": 1},
        "foot_right": {"row": 6, "col": 2},
    }
    
    extraction_cells = {}
    for part_id, layout in cell_layout.items():
        x = layout["col"] * cell_w
        y = layout["row"] * cell_h
        extraction_cells[part_id] = {
            "x": x,
            "y": y,
            "width": cell_w,
            "height": cell_h
        }
    
    return {
        "schemaVersion": schema["schemaVersion"],
        "rigFamily": schema["rigFamily"],
        "canvas": schema["canvas"],
        "skeleton": schema["skeleton"],
        "parts": schema["parts"],
        "partOrder": schema["partOrder"],
        "explodedSheet": {
            "canvas": {"width": 2048, "height": 2048},
            "previewRegion": {"x": 0, "y": 0, "width": 2048, "height": 2048 // 7 * 2},
            "cells": extraction_cells
        },
        "jointTests": schema["jointTests"],
        "failureCodes": schema["failureCodes"]
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Loading rig schema...")
    schema = load_schema()
    
    print("Generating assembled construction template...")
    assembled = draw_assembled_template(schema)
    assembled_path = OUTPUT_DIR / "construction-template.png"
    assembled.save(assembled_path)
    print(f"  Saved: {assembled_path}")
    
    print("Generating assembled overlay...")
    overlay = draw_overlay(schema, assembled)
    overlay_path = OUTPUT_DIR / "construction-template-overlay.png"
    overlay.save(overlay_path)
    print(f"  Saved: {overlay_path}")
    
    print("Generating exploded sheet...")
    exploded = draw_exploded_sheet(schema)
    exploded_path = OUTPUT_DIR / "exploded-sheet.png"
    exploded.save(exploded_path)
    print(f"  Saved: {exploded_path}")
    
    print("Generating exploded sheet overlay...")
    exploded_overlay = draw_overlay(schema, exploded)
    exploded_overlay_path = OUTPUT_DIR / "exploded-sheet-overlay.png"
    exploded_overlay.save(exploded_overlay_path)
    print(f"  Saved: {exploded_overlay_path}")
    
    print("Generating rig spec...")
    rig_spec = generate_rig_spec(schema)
    spec_path = OUTPUT_DIR / "rig-spec.json"
    spec_path.write_text(json.dumps(rig_spec, indent=2) + "\n", encoding="utf-8")
    print(f"  Saved: {spec_path}")
    
    print("\nTemplate generation complete!")


if __name__ == "__main__":
    main()
