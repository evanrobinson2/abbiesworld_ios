#!/usr/bin/env python3
"""Carve a flat-background generated image into a trimmed RGBA sprite.

This is the offline twin of DevAssetCarvingService in the iOS app. That service
decides transparency purely by colour distance from the background, which is
fine for an opaque object but eats holes out of anything pale or translucent —
a glass bottle against a light grey card loses its glass. So the background
here is found by flooding inward from the border instead: only background-
coloured pixels *connected to the edge* are removed, and a pale highlight in
the middle of the subject survives.

    python3 carve.py --in RAW_DIR --out CARVED_DIR [--size 512]

Prints a per-file report so a carve can be reviewed as text.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

# How close to the background colour a pixel must be to count as background.
# Generous, because these cards are generated with a deliberately flat plate.
TOLERANCE = 26.0
# Width of the soft edge, in pixels, so sprites do not look laser-cut.
FEATHER_PX = 1.2
# Transparent margin kept around the trimmed subject.
PAD_PX = 12


def border_median(rgb: np.ndarray) -> np.ndarray:
    """The background colour, taken from a one-pixel frame around the image."""
    top, bottom = rgb[0, :, :], rgb[-1, :, :]
    left, right = rgb[:, 0, :], rgb[:, -1, :]
    frame = np.concatenate([top, bottom, left, right], axis=0)
    return np.median(frame, axis=0)


def carve(path: pathlib.Path, size: int | None) -> tuple[Image.Image, dict]:
    source = Image.open(path).convert("RGB")
    rgb = np.asarray(source).astype(np.float32)
    height, width, _ = rgb.shape

    background = border_median(rgb)
    distance = np.linalg.norm(rgb - background, axis=2)
    background_like = distance <= TOLERANCE

    # Keep only the background-coloured region that touches the border, so an
    # enclosed pale area (glass, a highlight, a white cloud) stays opaque.
    labels, count = ndimage.label(background_like)
    edge_labels = set()
    if count:
        for strip in (labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]):
            edge_labels.update(np.unique(strip).tolist())
    edge_labels.discard(0)
    outside = np.isin(labels, list(edge_labels)) if edge_labels else np.zeros_like(background_like)

    # Fill any pinholes left inside the subject before building the mask.
    subject = ndimage.binary_fill_holes(~outside)

    alpha = np.where(subject, 255, 0).astype(np.uint8)
    alpha_image = Image.fromarray(alpha, mode="L")
    if FEATHER_PX > 0:
        alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(FEATHER_PX))

    carved = source.convert("RGBA")
    carved.putalpha(alpha_image)

    bbox = alpha_image.point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox is None:
        raise ValueError("carve removed everything; background tolerance is too high")

    left, top, right, bottom = bbox
    left, top = max(0, left - PAD_PX), max(0, top - PAD_PX)
    right, bottom = min(width, right + PAD_PX), min(height, bottom + PAD_PX)
    carved = carved.crop((left, top, right, bottom))

    if size:
        carved.thumbnail((size, size), Image.LANCZOS)
        square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        square.paste(
            carved,
            ((size - carved.width) // 2, (size - carved.height) // 2),
            carved,
        )
        carved = square

    opaque = int((np.asarray(carved)[:, :, 3] > 8).sum())
    report = {
        "source": path.name,
        "sourceSize": [width, height],
        "background": [int(v) for v in background],
        "trimmedTo": [right - left, bottom - top],
        "output": list(carved.size),
        "coveragePct": round(100 * opaque / (carved.size[0] * carved.size[1]), 1),
    }
    return carved, report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="source", required=True)
    parser.add_argument("--out", dest="destination", required=True)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--manifest", default=None)
    args = parser.parse_args()

    source_dir = pathlib.Path(args.source)
    out_dir = pathlib.Path(args.destination)
    out_dir.mkdir(parents=True, exist_ok=True)

    reports, failures = [], []
    for path in sorted(source_dir.glob("*.png")):
        try:
            carved, report = carve(path, args.size)
        except Exception as error:  # noqa: BLE001 - report and keep going
            failures.append({"source": path.name, "error": str(error)})
            print(f"  FAIL {path.name}: {error}")
            continue
        carved.save(out_dir / path.name, optimize=True)
        reports.append(report)
        print(
            f"  ok   {path.name:34s} bg=rgb{tuple(report['background'])} "
            f"trim={report['trimmedTo'][0]}x{report['trimmedTo'][1]} "
            f"cover={report['coveragePct']}%"
        )

    print(f"\ncarved {len(reports)} file(s), {len(failures)} failure(s)")
    if args.manifest:
        pathlib.Path(args.manifest).write_text(
            json.dumps({"carved": reports, "failures": failures}, indent=2) + "\n"
        )
    # A carve that eats the subject, or leaves the whole plate, is a failure.
    for report in reports:
        if not 5 <= report["coveragePct"] <= 95:
            print(f"  SUSPECT {report['source']}: coverage {report['coveragePct']}%")
            failures.append({"source": report["source"], "error": "implausible coverage"})
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
