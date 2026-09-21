#!/usr/bin/env python3
"""Flood-fill carve for minigame-pack rasters. No scipy required.

Only background-coloured pixels connected to the image border become
transparent, so pale highlights inside the subject survive.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

TOLERANCE = 55.0
FEATHER_PX = 1.2
PAD_PX = 18


def _border_median(rgb: np.ndarray) -> np.ndarray:
    top, bottom = rgb[0, :, :], rgb[-1, :, :]
    left, right = rgb[:, 0, :], rgb[:, -1, :]
    frame = np.concatenate([top, bottom, left, right], axis=0)
    return np.median(frame, axis=0)


def _flood_background(is_bg: np.ndarray) -> np.ndarray:
    height, width = is_bg.shape
    outside = np.zeros_like(is_bg, dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if is_bg[0, x]:
            queue.append((0, x))
        if is_bg[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if is_bg[y, 0]:
            queue.append((y, 0))
        if is_bg[y, width - 1]:
            queue.append((y, width - 1))
    while queue:
        y, x = queue.popleft()
        if y < 0 or y >= height or x < 0 or x >= width:
            continue
        if outside[y, x] or not is_bg[y, x]:
            continue
        outside[y, x] = True
        queue.append((y - 1, x))
        queue.append((y + 1, x))
        queue.append((y, x - 1))
        queue.append((y, x + 1))
    return outside


CHROMA = np.array([0.0, 204.0, 102.0], dtype=np.float32)  # #00CC66


def _largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best = None
    best_size = 0
    for y in range(height):
        xs = np.flatnonzero(mask[y] & ~seen[y])
        for x in xs:
            if seen[y, x]:
                continue
            queue = deque([(y, x)])
            seen[y, x] = True
            cells = [(y, x)]
            while queue:
                cy, cx = queue.popleft()
                for ny, nx in (
                    (cy - 1, cx),
                    (cy + 1, cx),
                    (cy, cx - 1),
                    (cy, cx + 1),
                ):
                    if ny < 0 or ny >= height or nx < 0 or nx >= width:
                        continue
                    if seen[ny, nx] or not mask[ny, nx]:
                        continue
                    seen[ny, nx] = True
                    queue.append((ny, nx))
                    cells.append((ny, nx))
            if len(cells) > best_size:
                best_size = len(cells)
                best = cells
    keep = np.zeros_like(mask, dtype=bool)
    if best:
        yy, xx = zip(*best)
        keep[yy, xx] = True
    return keep


def _defringe_green(rgba: np.ndarray, rounds: int = 14) -> np.ndarray:
    """Eat green/olive pixels that touch already-transparent background."""
    out = rgba.copy()
    for _ in range(rounds):
        alpha = out[:, :, 3]
        r = out[:, :, 0].astype(np.int16)
        g = out[:, :, 1].astype(np.int16)
        b = out[:, :, 2].astype(np.int16)
        greenish = (g > r + 4) & (g > b + 8) & (g >= 30)
        transparent = alpha < 8
        near = np.zeros_like(transparent)
        near[1:, :] |= transparent[:-1, :]
        near[:-1, :] |= transparent[1:, :]
        near[:, 1:] |= transparent[:, :-1]
        near[:, :-1] |= transparent[:, 1:]
        kill = greenish & near & (alpha > 0)
        if not kill.any():
            break
        out[kill, 3] = 0
        out[kill, :3] = 0
    return out


def carve_bytes(source: Image.Image, size: int | None = 1024) -> tuple[Image.Image, dict]:
    rgb_image = source.convert("RGB")
    rgb = np.asarray(rgb_image).astype(np.float32)
    background = _border_median(rgb)
    distance = np.linalg.norm(rgb - background, axis=2)
    chroma_distance = np.linalg.norm(rgb - CHROMA, axis=2)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lime = (g > r + 18) & (g > b + 40) & (g > 70) & (r < 150)
    olive = (g > r + 4) & (g > b + 8) & (g >= 40) & (r < 120) & (b < 110)
    is_bg = (distance <= TOLERANCE) | (chroma_distance <= 48.0) | lime | olive
    outside = _flood_background(is_bg) | lime | olive
    subject = _largest_component(~outside)
    # Eat the generator's olive sticker fringe so carved cards don't keep a halo.
    subject_image = Image.fromarray((subject.astype(np.uint8) * 255), mode="L")
    subject_image = subject_image.filter(ImageFilter.MinFilter(5))
    subject = np.asarray(subject_image) > 127
    alpha = np.where(subject, 255, 0).astype(np.uint8)
    alpha_image = Image.fromarray(alpha, mode="L")
    if FEATHER_PX > 0:
        alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(FEATHER_PX))
    carved = rgb_image.convert("RGBA")
    rgba = np.asarray(carved).copy()
    alpha_arr = np.asarray(alpha_image)
    rgba[:, :, 3] = alpha_arr
    rgba[alpha_arr == 0, :3] = 0
    rgba = _defringe_green(rgba)
    carved = Image.fromarray(rgba, mode="RGBA")
    bbox = carved.split()[-1].point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox is None:
        raise ValueError("carve removed everything")
    left, top, right, bottom = bbox
    left, top = max(0, left - PAD_PX), max(0, top - PAD_PX)
    right = min(carved.width, right + PAD_PX)
    bottom = min(carved.height, bottom + PAD_PX)
    carved = carved.crop((left, top, right, bottom))
    if size:
        carved.thumbnail((size, size), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ox = (size - carved.width) // 2
        oy = (size - carved.height) // 2
        canvas.paste(carved, (ox, oy), carved)
        carved = canvas
    coverage = float(subject.mean())
    report = {
        "coverage": round(coverage, 4),
        "background": [round(float(c), 1) for c in background],
        "bbox": [left, top, right, bottom],
        "width": carved.width,
        "height": carved.height,
    }
    return carved, report


def carve_file(src: Path, dest: Path, size: int | None = 1024) -> dict:
    with Image.open(src) as image:
        carved, report = carve_bytes(image, size=size)
    dest.parent.mkdir(parents=True, exist_ok=True)
    carved.save(dest, "PNG")
    report["src"] = str(src)
    report["dest"] = str(dest)
    return report


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--in", dest="src", required=True, type=Path)
    parser.add_argument("--out", dest="dest", required=True, type=Path)
    parser.add_argument("--size", type=int, default=1024)
    args = parser.parse_args()
    print(json.dumps(carve_file(args.src, args.dest, size=args.size), indent=2))
