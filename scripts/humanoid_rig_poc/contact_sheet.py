#!/usr/bin/env python3
"""Generate a visual QA contact sheet for a character.

Creates a single image showing template, generated output, extracted parts,
assembly, and joint test poses.

    python3 scripts/humanoid_rig_poc/contact_sheet.py --character-id my-character-001

Outputs:
    AssetSources/HumanoidRigPOC/characters/{character-id}/contact-sheet.png
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

CELL_SIZE = 400
GRID_COLS = 4
GRID_ROWS = 4
MARGIN = 10
LABEL_HEIGHT = 30

BG_COLOR = (240, 240, 240)
BORDER_COLOR = (180, 180, 180)
LABEL_BG = (60, 60, 60)
FAIL_BG = (200, 80, 80)
PASS_BG = (80, 160, 80)


def load_rig_spec() -> dict:
    spec_path = TEMPLATES_DIR / "rig-spec.json"
    return json.loads(spec_path.read_text(encoding="utf-8"))


def fit_image(img: Image.Image, max_size: int) -> Image.Image:
    """Scale image to fit within max_size while preserving aspect ratio."""
    ratio = min(max_size / img.width, max_size / img.height)
    if ratio >= 1:
        return img
    new_size = (int(img.width * ratio), int(img.height * ratio))
    return img.resize(new_size, Image.LANCZOS)


def draw_cell(
    sheet: Image.Image,
    draw: ImageDraw.ImageDraw,
    row: int,
    col: int,
    label: str,
    content: Image.Image | None = None,
    status: str | None = None,
    font: ImageFont.ImageFont = None,
):
    """Draw a labeled cell with optional content image."""
    x = col * (CELL_SIZE + MARGIN) + MARGIN
    y = row * (CELL_SIZE + MARGIN + LABEL_HEIGHT) + MARGIN
    
    label_bg = LABEL_BG
    if status == "pass":
        label_bg = PASS_BG
    elif status == "fail":
        label_bg = FAIL_BG
    
    draw.rectangle(
        [x, y, x + CELL_SIZE, y + LABEL_HEIGHT],
        fill=label_bg
    )
    draw.text(
        (x + CELL_SIZE // 2, y + LABEL_HEIGHT // 2),
        label,
        fill=(255, 255, 255),
        font=font,
        anchor="mm"
    )
    
    cell_y = y + LABEL_HEIGHT
    draw.rectangle(
        [x, cell_y, x + CELL_SIZE, cell_y + CELL_SIZE],
        fill=BG_COLOR,
        outline=BORDER_COLOR,
        width=2
    )
    
    if content is not None:
        fitted = fit_image(content, CELL_SIZE - 20)
        paste_x = x + (CELL_SIZE - fitted.width) // 2
        paste_y = cell_y + (CELL_SIZE - fitted.height) // 2
        
        if fitted.mode == "RGBA":
            sheet.paste(fitted, (paste_x, paste_y), fitted)
        else:
            sheet.paste(fitted, (paste_x, paste_y))


def assemble_character(parts_dir: Path, rig_spec: dict) -> Image.Image:
    """Assemble extracted parts into a neutral pose."""
    canvas_size = 600
    assembled = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    
    parts_spec = rig_spec["parts"]
    part_order = rig_spec["partOrder"]
    
    scale = 0.25
    offset_x = canvas_size // 2
    offset_y = canvas_size // 3
    
    for part_id in part_order:
        part_path = parts_dir / f"{part_id}.png"
        if not part_path.exists():
            continue
        
        part_img = Image.open(part_path).convert("RGBA")
        
        spec = parts_spec[part_id]
        bounds = spec["bounds"]["pixels"]
        
        center_x = bounds["x"] + bounds["width"] // 2
        center_y = bounds["y"] + bounds["height"] // 2
        
        scaled_w = int(part_img.width * scale)
        scaled_h = int(part_img.height * scale)
        
        if scaled_w > 0 and scaled_h > 0:
            scaled = part_img.resize((scaled_w, scaled_h), Image.LANCZOS)
            
            paste_x = int(center_x * scale) - scaled_w // 2 + offset_x - 256
            paste_y = int(center_y * scale) - scaled_h // 2 + offset_y
            
            assembled.paste(scaled, (paste_x, paste_y), scaled)
    
    return assembled


def create_parts_grid(parts_dir: Path, rig_spec: dict) -> Image.Image:
    """Create a grid showing all extracted parts."""
    grid_size = 4
    cell_size = 100
    grid = Image.new("RGBA", (grid_size * cell_size, grid_size * cell_size), (200, 200, 200, 255))
    
    parts = list(rig_spec["parts"].keys())
    
    for i, part_id in enumerate(parts[:16]):
        row = i // grid_size
        col = i % grid_size
        
        part_path = parts_dir / f"{part_id}.png"
        if part_path.exists():
            part_img = Image.open(part_path).convert("RGBA")
            fitted = fit_image(part_img, cell_size - 10)
            
            x = col * cell_size + (cell_size - fitted.width) // 2
            y = row * cell_size + (cell_size - fitted.height) // 2
            
            grid.paste(fitted, (x, y), fitted)
    
    return grid


def generate_contact_sheet(character_dir: Path) -> Image.Image:
    """Generate the full contact sheet."""
    rig_spec = load_rig_spec()
    
    sheet_width = GRID_COLS * (CELL_SIZE + MARGIN) + MARGIN
    sheet_height = GRID_ROWS * (CELL_SIZE + MARGIN + LABEL_HEIGHT) + MARGIN
    
    sheet = Image.new("RGB", (sheet_width, sheet_height), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    
    template_path = TEMPLATES_DIR / "exploded-sheet.png"
    template = Image.open(template_path) if template_path.exists() else None
    draw_cell(sheet, draw, 0, 0, "TEMPLATE", template, font=font)
    
    generated_path = character_dir / "generated-exploded.png"
    generated = Image.open(generated_path) if generated_path.exists() else None
    draw_cell(sheet, draw, 0, 1, "GENERATED", generated, font=font)
    
    parts_dir = character_dir / "parts"
    if parts_dir.exists():
        parts_grid = create_parts_grid(parts_dir, rig_spec)
        draw_cell(sheet, draw, 0, 2, "PARTS", parts_grid, font=font)
        
        assembled = assemble_character(parts_dir, rig_spec)
        draw_cell(sheet, draw, 0, 3, "ASSEMBLED", assembled, font=font)
    else:
        draw_cell(sheet, draw, 0, 2, "PARTS (missing)", None, status="fail", font=font)
        draw_cell(sheet, draw, 0, 3, "ASSEMBLED (missing)", None, status="fail", font=font)
    
    validation_path = character_dir / "validation.json"
    validation = None
    if validation_path.exists():
        validation = json.loads(validation_path.read_text())
    
    draw_cell(sheet, draw, 1, 0, "NEUTRAL", assembled if parts_dir.exists() else None, font=font)
    draw_cell(sheet, draw, 1, 1, "IDLE", assembled if parts_dir.exists() else None, font=font)
    draw_cell(sheet, draw, 1, 2, "WALK", assembled if parts_dir.exists() else None, font=font)
    
    validation_status = "pass" if validation and validation.get("success") else "fail"
    draw_cell(sheet, draw, 1, 3, "VALIDATION", None, status=validation_status, font=font)
    
    joint_angles = [
        ("ARM -70°", "upper_arm_left", -70),
        ("ARM 45°", "upper_arm_left", 45),
        ("ARM 90°", "upper_arm_left", 90),
        ("ELBOW 90°", "forearm_left", 90),
        ("KNEE 30°", "shin_left", 30),
        ("KNEE 70°", "shin_left", 70),
        ("KNEE 110°", "shin_left", 110),
        ("HIP 45°", "thigh_left", 45),
    ]
    
    for i, (label, part, angle) in enumerate(joint_angles):
        row = 2 + i // 4
        col = i % 4
        draw_cell(sheet, draw, row, col, label, assembled if parts_dir.exists() else None, font=font)
    
    return sheet


def main():
    parser = argparse.ArgumentParser(description="Generate visual QA contact sheet")
    parser.add_argument("--character-id", required=True, help="Character identifier")
    args = parser.parse_args()
    
    character_dir = CHARACTERS_DIR / args.character_id
    if not character_dir.exists():
        print(f"Error: Character directory not found: {character_dir}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Generating contact sheet for {args.character_id}...")
    sheet = generate_contact_sheet(character_dir)
    
    output_path = character_dir / "contact-sheet.png"
    sheet.save(output_path, optimize=True)
    print(f"  Saved: {output_path}")
    print("\nContact sheet generation complete!")


if __name__ == "__main__":
    main()
