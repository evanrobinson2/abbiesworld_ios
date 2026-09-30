#!/usr/bin/env python3
"""Synthesize a clay A-pose kid, a bicep mask, and a knit fabric swatch."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
INPUTS = ROOT / "inputs"
SIZE = 1024


def _capsule(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    radius: float,
    fill: tuple[int, int, int],
) -> None:
    x0, y0 = start
    x1, y1 = end
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length, dx / length
    pts = [
        (x0 + nx * radius, y0 + ny * radius),
        (x1 + nx * radius, y1 + ny * radius),
        (x1 - nx * radius, y1 - ny * radius),
        (x0 - nx * radius, y0 - ny * radius),
    ]
    draw.polygon(pts, fill=fill)
    draw.ellipse((x0 - radius, y0 - radius, x0 + radius, y0 + radius), fill=fill)
    draw.ellipse((x1 - radius, y1 - radius, x1 + radius, y1 + radius), fill=fill)


def _point_on(start: tuple[float, float], end: tuple[float, float], t: float) -> tuple[float, float]:
    return (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)


def layout() -> dict:
    """Front-view A-pose. Character-left arm is on the image RIGHT."""
    return {
        "size": SIZE,
        "character_left_is_image_right": True,
        "torso": {"center": [512, 560], "width": 210, "height": 290},
        "head": {"center": [512, 292], "radius": 92},
        "neck": {"start": [512, 372], "end": [512, 410], "radius": 28},
        "hips": {"center": [512, 710], "width": 168, "height": 70},
        "char_left_arm": {
            "shoulder": [628, 438],
            "elbow": [792, 508],
            "wrist": [908, 618],
            "radius": 36,
        },
        "char_right_arm": {
            "shoulder": [396, 438],
            "elbow": [232, 508],
            "wrist": [116, 618],
            "radius": 36,
        },
        "char_left_leg": {
            "hip": [568, 740],
            "knee": [592, 868],
            "ankle": [604, 980],
            "radius": 38,
        },
        "char_right_leg": {
            "hip": [456, 740],
            "knee": [432, 868],
            "ankle": [420, 980],
            "radius": 38,
        },
        "bicep": {
            "label": "character-left upper arm / bicep (image-right)",
            "start_t": 0.08,
            "end_t": 0.62,
            "radius": 40,
        },
    }


def draw_humanoid(spec: dict) -> Image.Image:
    clay = (214, 132, 96)
    clay_dark = (186, 104, 74)
    clay_light = (232, 162, 126)
    blush = (224, 118, 118)
    bg = (246, 236, 214)

    img = Image.new("RGB", (SIZE, SIZE), bg)
    draw = ImageDraw.Draw(img)

    def limb(key: str) -> None:
        part = spec[key]
        if "shoulder" in part:
            _capsule(draw, tuple(part["shoulder"]), tuple(part["elbow"]), part["radius"], clay)
            _capsule(draw, tuple(part["elbow"]), tuple(part["wrist"]), part["radius"] - 4, clay)
        else:
            _capsule(draw, tuple(part["hip"]), tuple(part["knee"]), part["radius"], clay)
            _capsule(draw, tuple(part["knee"]), tuple(part["ankle"]), part["radius"] - 2, clay)

    limb("char_right_leg")
    limb("char_left_leg")
    limb("char_right_arm")
    limb("char_left_arm")

    tx, ty = spec["torso"]["center"]
    tw, th = spec["torso"]["width"] / 2, spec["torso"]["height"] / 2
    draw.rounded_rectangle(
        (tx - tw, ty - th, tx + tw, ty + th),
        radius=70,
        fill=clay,
    )
    hx, hy = spec["hips"]["center"]
    hw, hh = spec["hips"]["width"] / 2, spec["hips"]["height"] / 2
    draw.ellipse((hx - hw, hy - hh, hx + hw, hy + hh), fill=clay)

    _capsule(draw, tuple(spec["neck"]["start"]), tuple(spec["neck"]["end"]), spec["neck"]["radius"], clay)

    cx, cy = spec["head"]["center"]
    r = spec["head"]["radius"]
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=clay_light)
    draw.ellipse((cx - 28, cy + 8, cx - 8, cy + 22), fill=clay_dark)
    draw.ellipse((cx + 8, cy + 8, cx + 28, cy + 22), fill=clay_dark)
    draw.ellipse((cx - 34, cy + 28, cx - 14, cy + 42), fill=blush)
    draw.ellipse((cx + 14, cy + 28, cx + 34, cy + 42), fill=blush)
    draw.arc((cx - 22, cy + 18, cx + 22, cy + 52), start=20, end=160, fill=clay_dark, width=4)

    # Soft clay look without changing silhouette much.
    return img.filter(ImageFilter.SMOOTH_MORE)


def bicep_disk(spec: dict) -> tuple[tuple[float, float], tuple[float, float], float]:
    arm = spec["char_left_arm"]
    start = _point_on(tuple(arm["shoulder"]), tuple(arm["elbow"]), spec["bicep"]["start_t"])
    end = _point_on(tuple(arm["shoulder"]), tuple(arm["elbow"]), spec["bicep"]["end_t"])
    return start, end, spec["bicep"]["radius"]


def draw_openai_mask(spec: dict) -> Image.Image:
    """OpenAI images.edit: alpha=0 is EDIT, alpha=255 is KEEP."""
    mask = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    hole = Image.new("L", (SIZE, SIZE), 0)
    draw = ImageDraw.Draw(hole)
    start, end, radius = bicep_disk(spec)
    _capsule(draw, start, end, radius, 255)
    # White in `hole` becomes transparent (edit).
    alpha = Image.eval(hole, lambda p: 0 if p > 0 else 255)
    mask.putalpha(alpha)
    return mask


def draw_white_bicep_visualization(spec: dict) -> Image.Image:
    """User-hypothesis visual: white = intended fill, black = keep."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    start, end, radius = bicep_disk(spec)
    _capsule(draw, start, end, radius, (255, 255, 255, 255))
    return img


def draw_overlay(humanoid: Image.Image, spec: dict) -> Image.Image:
    overlay = humanoid.convert("RGBA")
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    start, end, radius = bicep_disk(spec)
    _capsule(draw, start, end, radius, (255, 40, 40, 110))
    return Image.alpha_composite(overlay, layer)


def draw_fabric(size: int = SIZE) -> Image.Image:
    """Orange knitted-wool / sweater swatch."""
    base = (232, 108, 36)
    rib = (196, 78, 22)
    highlight = (248, 156, 72)
    img = Image.new("RGB", (size, size), base)
    px = img.load()
    for y in range(size):
        for x in range(size):
            column = (x // 14) % 2
            stitch = (x + y * (1 if column == 0 else -1)) % 18
            wave = math.sin((x * 0.35) + (y * 0.18))
            if stitch < 4:
                color = highlight
            elif stitch > 14:
                color = rib
            else:
                color = base
            shade = int(10 * wave)
            px[x, y] = (
                max(0, min(255, color[0] + shade - 8 * column)),
                max(0, min(255, color[1] + shade - 6 * column)),
                max(0, min(255, color[2] + shade)),
            )
    return img.filter(ImageFilter.SMOOTH)


def main() -> None:
    INPUTS.mkdir(parents=True, exist_ok=True)
    spec = layout()
    humanoid = draw_humanoid(spec)
    openai_mask = draw_openai_mask(spec)
    white_mask = draw_white_bicep_visualization(spec)
    fabric = draw_fabric()
    overlay = draw_overlay(humanoid, spec)

    humanoid.save(INPUTS / "humanoid.png")
    openai_mask.save(INPUTS / "mask_bicep.png")
    white_mask.save(INPUTS / "mask_bicep_white_hypothesis.png")
    fabric.save(INPUTS / "fabric.png")
    humanoid.save(INPUTS / "character.png")
    overlay.save(INPUTS / "bicep_region_overlay.png")

    start, end, radius = bicep_disk(spec)
    spec["bicep"]["start_xy"] = [round(start[0], 1), round(start[1], 1)]
    spec["bicep"]["end_xy"] = [round(end[0], 1), round(end[1], 1)]
    spec["bicep"]["radius_px"] = radius
    spec["mask_convention_used_for_api"] = {
        "api": "OpenAI images.edit",
        "edit_region": "fully transparent (alpha=0)",
        "keep_region": "opaque (alpha=255)",
        "note": (
            "This is the opposite of a white=edit / black=keep bitmap. "
            "mask_bicep.png follows OpenAI. "
            "mask_bicep_white_hypothesis.png is the white-bicep visual only."
        ),
    }
    (INPUTS / "layout.json").write_text(json.dumps(spec, indent=2) + "\n")
    print(f"Wrote inputs to {INPUTS}")


if __name__ == "__main__":
    main()
