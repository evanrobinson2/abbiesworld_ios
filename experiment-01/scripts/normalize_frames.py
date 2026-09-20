#!/usr/bin/env python3
"""Normalize walk cycle frames for animation.

This script:
1. Removes the gray background (makes transparent)
2. Finds the character bounding box
3. Identifies foot/ground contact point
4. Normalizes scale to consistent height
5. Aligns ground plane
6. Centers horizontally
7. Outputs to transparent PNGs on common canvas
"""

from pathlib import Path
from PIL import Image
import json

INPUT_DIR = Path(__file__).parent.parent / "generated"
OUTPUT_DIR = Path(__file__).parent.parent / "normalized"
OUTPUT_DIR.mkdir(exist_ok=True)

TARGET_HEIGHT = 400
CANVAS_WIDTH = 300
CANVAS_HEIGHT = 500
GROUND_Y = 450

BACKGROUND_COLOR = (240, 240, 240)
TOLERANCE = 30


def is_background(pixel, bg_color=BACKGROUND_COLOR, tolerance=TOLERANCE):
    """Check if a pixel is close to the background color."""
    if len(pixel) == 4:
        r, g, b, a = pixel
        if a < 128:
            return True
    else:
        r, g, b = pixel[:3]
    
    return (abs(r - bg_color[0]) < tolerance and 
            abs(g - bg_color[1]) < tolerance and 
            abs(b - bg_color[2]) < tolerance)


def remove_background(img):
    """Remove background and return RGBA image with transparency."""
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            if is_background(pixels[x, y]):
                pixels[x, y] = (0, 0, 0, 0)
    
    return img


def find_bounding_box(img):
    """Find the bounding box of non-transparent content."""
    bbox = img.getbbox()
    if bbox is None:
        return (0, 0, img.width, img.height)
    return bbox


def find_foot_y(img, bbox):
    """Find the Y coordinate of the lowest non-transparent pixel (feet)."""
    pixels = img.load()
    left, top, right, bottom = bbox
    
    for y in range(bottom - 1, top - 1, -1):
        for x in range(left, right):
            if pixels[x, y][3] > 128:
                return y
    return bottom


def find_center_x(img, bbox):
    """Find the horizontal center of the character."""
    left, top, right, bottom = bbox
    return (left + right) // 2


def normalize_frame(input_path, output_path, stats):
    """Normalize a single frame."""
    img = Image.open(input_path)
    
    img_transparent = remove_background(img)
    
    bbox = find_bounding_box(img_transparent)
    if bbox is None:
        print(f"Warning: No content found in {input_path}")
        return None
    
    left, top, right, bottom = bbox
    char_width = right - left
    char_height = bottom - top
    
    foot_y = find_foot_y(img_transparent, bbox)
    center_x = find_center_x(img_transparent, bbox)
    
    head_y = top
    actual_height = foot_y - head_y
    
    if actual_height <= 0:
        actual_height = char_height
    
    scale = TARGET_HEIGHT / actual_height
    
    new_width = int(img.width * scale)
    new_height = int(img.height * scale)
    img_scaled = img_transparent.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    scaled_bbox = find_bounding_box(img_scaled)
    scaled_foot_y = find_foot_y(img_scaled, scaled_bbox)
    scaled_center_x = find_center_x(img_scaled, scaled_bbox)
    
    canvas = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 0))
    
    paste_x = (CANVAS_WIDTH // 2) - scaled_center_x
    paste_y = GROUND_Y - scaled_foot_y
    
    canvas.paste(img_scaled, (paste_x, paste_y), img_scaled)
    
    canvas.save(output_path, "PNG")
    
    frame_stats = {
        "original_size": [img.width, img.height],
        "bounding_box": list(bbox),
        "character_height": char_height,
        "foot_y_original": foot_y,
        "center_x_original": center_x,
        "scale_factor": scale,
        "paste_offset": [paste_x, paste_y],
        "normalization_required": {
            "scale_change": abs(1.0 - scale),
            "horizontal_shift": abs(paste_x),
            "vertical_shift": abs(paste_y)
        }
    }
    
    return frame_stats


def main():
    frames = sorted(INPUT_DIR.glob("walk-*.png"))
    
    if not frames:
        print(f"No frames found in {INPUT_DIR}")
        return
    
    print(f"Found {len(frames)} frames to normalize")
    
    all_stats = {
        "config": {
            "target_height": TARGET_HEIGHT,
            "canvas_size": [CANVAS_WIDTH, CANVAS_HEIGHT],
            "ground_y": GROUND_Y
        },
        "frames": {}
    }
    
    for frame_path in frames:
        frame_name = frame_path.stem
        output_path = OUTPUT_DIR / f"{frame_name}-normalized.png"
        
        print(f"Processing {frame_name}...")
        stats = normalize_frame(frame_path, output_path, all_stats)
        
        if stats:
            all_stats["frames"][frame_name] = stats
            print(f"  Scale: {stats['scale_factor']:.3f}, Shift: ({stats['paste_offset'][0]}, {stats['paste_offset'][1]})")
    
    stats_path = OUTPUT_DIR / "normalization_stats.json"
    with open(stats_path, "w") as f:
        json.dump(all_stats, f, indent=2)
    
    print(f"\nNormalization complete! Stats saved to {stats_path}")
    
    scale_factors = [s["scale_factor"] for s in all_stats["frames"].values()]
    print(f"\nScale factor range: {min(scale_factors):.3f} - {max(scale_factors):.3f}")
    print(f"Scale variance: {max(scale_factors) - min(scale_factors):.3f}")


if __name__ == "__main__":
    main()
