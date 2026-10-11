#!/usr/bin/env python3
"""Knock chroma from Plink gang in-game portraits.

Convention (reuse for Raze / Morrow / Nib / Vix UI portraits):
  1. GenerateImage with solid flat background exactly hex #00FF66 neon green
     (RGB 0,255,102) — no gradients, shadows, or vignette on the BG.
  2. Run this script to chroma-key that green → true alpha PNG.
  3. Do NOT cream/light-flood knockouts (they chew orange/cream fur).

Safe key is predetermined: not in gang palette (orange/cream/teal/coral/magenta/black).
Avoid magenta (Morrow) and teal accents as keys. Models often drift from exact
#00FF66 toward lime; this script samples corner green and keys that + the target.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CHROMA_TARGET = (0x00, 0xFF, 0x66)  # #00FF66
DEFAULT_SOFT = 28


def corner_mean(rgb: np.ndarray, n: int = 32) -> np.ndarray:
    h, w = rgb.shape[:2]
    patches = [rgb[0:n, 0:n], rgb[0:n, w - n : w], rgb[h - n : h, 0:n], rgb[h - n : h, w - n : w]]
    return np.mean([p.reshape(-1, 3).mean(0) for p in patches], axis=0)


def chroma_key(
    im: Image.Image,
    target: tuple[int, int, int] = CHROMA_TARGET,
    tol: float | None = None,
    soft: float = DEFAULT_SOFT,
) -> Image.Image:
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    rgb = arr[..., :3]
    target_v = np.array(target, dtype=np.float32)
    actual = corner_mean(rgb)
    key = 0.35 * target_v + 0.65 * actual
    dist = np.linalg.norm(rgb - key, axis=2)
    h, w = rgb.shape[:2]
    n = 32
    corner_dist = np.concatenate(
        [
            dist[0:n, 0:n].ravel(),
            dist[0:n, w - n : w].ravel(),
            dist[h - n : h, 0:n].ravel(),
            dist[h - n : h, w - n : w].ravel(),
        ]
    )
    auto_tol = float(np.percentile(corner_dist, 99.5)) + 8
    tol_v = max(tol or 0, auto_tol, 70.0)

    alpha = arr[..., 3].copy()
    hard = dist <= tol_v
    soft_band = (dist > tol_v) & (dist <= tol_v + soft)
    alpha[hard] = 0
    fade = (dist[soft_band] - tol_v) / max(1e-6, soft)
    alpha[soft_band] = np.minimum(alpha[soft_band], fade * 255)

    g, r, b = rgb[..., 1], rgb[..., 0], rgb[..., 2]
    greenish = (g > r + 50) & (g > b + 30) & (g > 160) & (r < 80)
    near = dist <= (tol_v + soft + 40)
    alpha[greenish & near] = 0

    arr[..., 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def square_pad(im: Image.Image, side: int = 512, margin: int = 12) -> Image.Image:
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 16)
    if len(xs) == 0:
        return Image.new("RGBA", (side, side), (0, 0, 0, 0))
    pad = 4
    bb = (
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(im.width, int(xs.max()) + 1 + pad),
        min(im.height, int(ys.max()) + 1 + pad),
    )
    fig = im.crop(bb)
    avail = side - 2 * margin
    scale = min(avail / max(1, fig.size[0]), avail / max(1, fig.size[1]))
    nw, nh = max(1, int(fig.size[0] * scale)), max(1, int(fig.size[1] * scale))
    fig2 = fig.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(fig2, ((side - nw) // 2, (side - nh) // 2), fig2)
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("-o", "--output", type=Path, required=True)
    ap.add_argument("--tol", type=float, default=None, help="override auto tolerance")
    ap.add_argument("--soft", type=float, default=DEFAULT_SOFT)
    ap.add_argument("--side", type=int, default=512)
    args = ap.parse_args()
    keyed = chroma_key(Image.open(args.input), tol=args.tol, soft=args.soft)
    out = square_pad(keyed, side=args.side)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    out.save(args.output)
    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
