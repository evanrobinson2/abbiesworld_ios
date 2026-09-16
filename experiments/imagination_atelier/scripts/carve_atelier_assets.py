#!/usr/bin/env python3
"""
Carve + categorize Imagination Atelier asset sheets.

Reads ../sheet_manifest.json, extracts named tiles, writes transparent PNGs
under ../output/, optionally installs canonical tiles into Assets.xcassets,
and emits catalog.json for textual inspection.

Usage:
  python3 carve_atelier_assets.py
  python3 carve_atelier_assets.py --install
  python3 carve_atelier_assets.py --sheet P1.1_categoryButtons_vA
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image

try:
    from scipy import ndimage
except ImportError:  # pragma: no cover
    ndimage = None

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / "sheets"
OUTPUT = ROOT / "output"
MANIFEST_PATH = ROOT / "sheet_manifest.json"
DEFAULT_XCASSETS = (
    ROOT.parents[1]
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Assets.xcassets"
)


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text())


def sample_bg(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    patches = [
        rgb[2:18, 2:18],
        rgb[2:18, w - 18 : w - 2],
        rgb[h - 18 : h - 2, 2:18],
        rgb[h - 18 : h - 2, w - 18 : w - 2],
        rgb[2:14, w // 2 - 8 : w // 2 + 8],
    ]
    return np.mean(np.concatenate([p.reshape(-1, 3) for p in patches], axis=0), axis=0)


def soft_key_rgba(rgb: np.ndarray, hard: float = 20.0, soft: float = 40.0) -> np.ndarray:
    bg = sample_bg(rgb)
    dist = np.sqrt(((rgb.astype(np.float32) - bg) ** 2).sum(axis=-1))
    alpha = np.zeros(dist.shape, dtype=np.uint8)
    mid = (dist >= hard) & (dist < soft)
    solid = dist >= soft
    alpha[solid] = 255
    alpha[mid] = ((dist[mid] - hard) / (soft - hard) * 255).astype(np.uint8)
    rgba = np.dstack([rgb, alpha])
    return rgba


def flood_clear_border(alpha: np.ndarray, stop: int = 80) -> np.ndarray:
    """Clear low-alpha regions connected to the image border (scipy)."""
    if ndimage is None:
        return alpha
    low = alpha <= stop
    # seeds: border pixels that are low-alpha
    structure = np.ones((3, 3), dtype=bool)
    border = np.zeros_like(low, dtype=bool)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True
    seeds = border & low
    # reconstruct: grow seeds through low-alpha mask
    reachable = ndimage.binary_propagation(seeds, mask=low, structure=structure)
    out = alpha.copy()
    out[reachable] = 0
    return out


def keep_largest_component(rgba: np.ndarray, alpha_min: int = 40) -> np.ndarray:
    alpha = rgba[..., 3]
    mask = alpha >= alpha_min
    if not mask.any():
        return rgba
    if ndimage is None:
        return rgba
    labeled, n = ndimage.label(mask)
    if n == 0:
        return rgba
    sizes = ndimage.sum(mask, labeled, index=list(range(1, n + 1)))
    sizes = np.asarray(sizes)
    main_id = int(np.argmax(sizes)) + 1
    keep_ids = {main_id}
    main = labeled == main_id
    ys, xs = np.where(main)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    for i, size in enumerate(sizes, start=1):
        if i in keep_ids or size > 1800 or size < 8:
            continue
        cy, cx = ndimage.center_of_mass(labeled == i)
        if x0 - 28 <= cx <= x1 + 28 and y0 - 40 <= cy <= y1 + 24:
            keep_ids.add(i)
    keep = np.isin(labeled, list(keep_ids))
    out = rgba.copy()
    wipe = (~keep) & (alpha >= alpha_min)
    out[wipe, 3] = 0
    return out


def trim_pad(rgba: np.ndarray, pad: int = 10) -> Image.Image:
    alpha = rgba[..., 3]
    ys, xs = np.where(alpha >= 24)
    if len(xs) == 0:
        return Image.fromarray(rgba)
    x0, x1 = max(0, int(xs.min()) - 2), min(rgba.shape[1], int(xs.max()) + 3)
    y0, y1 = max(0, int(ys.min()) - 2), min(rgba.shape[0], int(ys.max()) + 3)
    cropped = rgba[y0:y1, x0:x1]
    h, w, _ = cropped.shape
    canvas = np.zeros((h + pad * 2, w + pad * 2, 4), dtype=np.uint8)
    canvas[pad : pad + h, pad : pad + w] = cropped
    return Image.fromarray(canvas)


def isolate_tile(cell: Image.Image, hard: float = 18.0, soft: float = 36.0) -> Image.Image:
    """Chroma-key cream/grey sheet background and trim. Fast path — no flood fill."""
    rgb = np.asarray(cell.convert("RGB"))
    rgba = soft_key_rgba(rgb, hard=hard, soft=soft)
    return trim_pad(rgba)


def carve_uniform_grid(
    sheet: Image.Image,
    rows: int,
    cols: int,
    names: list[str],
    inset: tuple[float, float] = (0.04, 0.04),
    hard: float = 18.0,
    soft: float = 36.0,
) -> list[tuple[str, Image.Image, tuple[int, int, int, int]]]:
    w, h = sheet.size
    cell_w, cell_h = w / cols, h / rows
    ix, iy = inset
    out = []
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        left = int(c * cell_w + cell_w * ix)
        top = int(r * cell_h + cell_h * iy)
        right = int((c + 1) * cell_w - cell_w * ix)
        bottom = int((r + 1) * cell_h - cell_h * iy)
        carved = isolate_tile(sheet.crop((left, top, right, bottom)), hard=hard, soft=soft)
        out.append((name, carved, (left, top, right, bottom)))
    return out


def carve_row_layout(
    sheet: Image.Image,
    row_items: list[list[str]],
    inset: tuple[float, float] = (0.03, 0.04),
    hard: float = 18.0,
    soft: float = 36.0,
) -> list[tuple[str, Image.Image, tuple[int, int, int, int]]]:
    """Each row may have a different column count (creature sheets)."""
    w, h = sheet.size
    rows = len(row_items)
    row_h = h / rows
    ix, iy = inset
    out = []
    for r, names in enumerate(row_items):
        cols = len(names)
        cell_w = w / cols
        for c, name in enumerate(names):
            left = int(c * cell_w + cell_w * ix)
            top = int(r * row_h + row_h * iy)
            right = int((c + 1) * cell_w - cell_w * ix)
            bottom = int((r + 1) * row_h - row_h * iy)
            carved = isolate_tile(
                sheet.crop((left, top, right, bottom)), hard=hard, soft=soft
            )
            out.append((name, carved, (left, top, right, bottom)))
    return out


def carve_auto(
    sheet: Image.Image,
    names: list[str],
    min_area: int = 2500,
    hard: float = 32.0,
    row_tol: float = 0.14,
) -> list[tuple[str, Image.Image, tuple[int, int, int, int]]]:
    if ndimage is None:
        raise RuntimeError("scipy is required for auto mode")
    rgb = np.asarray(sheet.convert("RGB"))
    rgba = soft_key_rgba(rgb, hard=hard, soft=hard + 18)
    mask = rgba[..., 3] >= 50
    # break thin bridges between creatures
    mask = ndimage.binary_opening(mask, iterations=1)
    labeled, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        area = int((labeled == i).sum())
        if area < min_area:
            continue
        ys, xs = np.where(labeled == i)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, area))
    centers = [((b[1] + b[3]) / 2, (b[0] + b[2]) / 2, b) for b in boxes]
    centers.sort(key=lambda t: t[0])
    rows: list[list] = []
    for cy, cx, b in centers:
        if not rows:
            rows.append([(cy, cx, b)])
            continue
        row_cy = sum(r[0] for r in rows[-1]) / len(rows[-1])
        if abs(cy - row_cy) <= sheet.height * row_tol:
            rows[-1].append((cy, cx, b))
        else:
            rows.append([(cy, cx, b)])
    ordered = []
    for row in rows:
        row.sort(key=lambda t: t[1])
        ordered.extend(row)
    if len(ordered) != len(names):
        # keep largest N then re-sort
        ordered = sorted(ordered, key=lambda t: t[2][4], reverse=True)[: len(names)]
        ordered.sort(key=lambda t: (t[0], t[1]))
        rows2: list[list] = []
        for cy, cx, b in ordered:
            if not rows2:
                rows2.append([(cy, cx, b)])
                continue
            row_cy = sum(r[0] for r in rows2[-1]) / len(rows2[-1])
            if abs(cy - row_cy) <= sheet.height * row_tol:
                rows2[-1].append((cy, cx, b))
            else:
                rows2.append([(cy, cx, b)])
        ordered = []
        for row in rows2:
            row.sort(key=lambda t: t[1])
            ordered.extend(row)
    if len(ordered) != len(names):
        raise RuntimeError(
            f"auto-detect found {len(ordered)} blobs, need {len(names)} names"
        )
    out = []
    pad = 10
    for name, (_, _, b) in zip(names, ordered):
        x0, y0, x1, y1, _ = b
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(sheet.width, x1 + pad), min(sheet.height, y1 + pad)
        carved = isolate_tile(sheet.crop((x0, y0, x1, y1)))
        out.append((name, carved, (x0, y0, x1, y1)))
    return out


def write_imageset(xcassets: Path, asset_name: str, png: Path) -> None:
    imageset = xcassets / f"{asset_name}.imageset"
    imageset.mkdir(parents=True, exist_ok=True)
    dest = imageset / f"{asset_name}.png"
    shutil.copy2(png, dest)
    (imageset / "Contents.json").write_text(
        json.dumps(
            {
                "images": [
                    {"filename": dest.name, "idiom": "universal", "scale": "1x"},
                    {"idiom": "universal", "scale": "2x"},
                    {"idiom": "universal", "scale": "3x"},
                ],
                "info": {"author": "xcode", "version": 1},
            },
            indent=2,
        )
        + "\n"
    )


def build_preview(images: Iterable[Image.Image], tile: int = 160) -> Image.Image:
    imgs = list(images)
    if not imgs:
        return Image.new("RGBA", (tile, tile), (40, 40, 44, 255))
    cols = min(6, len(imgs))
    rows = (len(imgs) + cols - 1) // cols
    gap = 8
    sheet = Image.new(
        "RGBA",
        (cols * tile + (cols - 1) * gap, rows * tile + (rows - 1) * gap),
        (36, 36, 40, 255),
    )
    for i, img in enumerate(imgs):
        r, c = divmod(i, cols)
        cell = Image.new("RGBA", (tile, tile), (230, 230, 230, 255))
        for yy in range(0, tile, 10):
            for xx in range(0, tile, 10):
                if ((xx // 10) + (yy // 10)) % 2 == 0:
                    # fast checker via paste of a small block
                    block = Image.new("RGBA", (min(10, tile - xx), min(10, tile - yy)), (210, 210, 210, 255))
                    cell.paste(block, (xx, yy))
        fitted = img.copy()
        fitted.thumbnail((tile - 12, tile - 12), Image.Resampling.LANCZOS)
        ox = (tile - fitted.width) // 2
        oy = (tile - fitted.height) // 2
        cell.paste(fitted, (ox, oy), fitted)
        sheet.paste(cell, (c * (tile + gap), r * (tile + gap)), cell)
    return sheet


def process_sheet(entry: dict, install: bool, xcassets: Path) -> list[dict]:
    print(f"  loading {entry['file']}", flush=True)
    sheet_path = SHEETS / entry["file"]
    if not sheet_path.exists():
        raise FileNotFoundError(sheet_path)
    sheet = Image.open(sheet_path).convert("RGBA")
    mode = entry["mode"]
    if mode == "grid":
        carved = carve_uniform_grid(
            sheet,
            rows=entry["rows"],
            cols=entry["cols"],
            names=entry["items"],
            inset=tuple(entry.get("inset", [0.04, 0.04])),
            hard=entry.get("hard", 18.0),
            soft=entry.get("soft", 36.0),
        )
    elif mode == "rows":
        carved = carve_row_layout(
            sheet,
            row_items=entry["rows_items"],
            inset=tuple(entry.get("inset", [0.03, 0.04])),
            hard=entry.get("hard", 18.0),
            soft=entry.get("soft", 36.0),
        )
    elif mode == "auto":
        carved = carve_auto(
            sheet,
            names=entry["items"],
            min_area=entry.get("min_area", 2500),
            hard=entry.get("hard", 32.0),
        )
    else:
        raise ValueError(f"unknown mode {mode}")

    sheet_out = OUTPUT / entry["id"]
    if sheet_out.exists():
        shutil.rmtree(sheet_out)
    sheet_out.mkdir(parents=True, exist_ok=True)
    records = []
    for name, image, bbox in carved:
        png_path = sheet_out / f"{name}.png"
        image.save(png_path)
        asset_name = entry.get("asset_prefix", "world2_atelier") + "_" + name
        record = {
            "id": f"{entry['id']}/{name}",
            "name": name,
            "prompt": entry["prompt"],
            "category": entry["category"],
            "sheet": entry["id"],
            "canonical": bool(entry.get("canonical")),
            "png": str(png_path.relative_to(ROOT)),
            "size": list(image.size),
            "bbox": list(bbox),
            "assetCatalogName": asset_name if entry.get("canonical") else None,
            "dragable": entry["category"].startswith("ingredient.")
            or entry["category"].startswith("ui."),
        }
        records.append(record)
        if install and entry.get("canonical"):
            write_imageset(xcassets, asset_name, png_path)
    build_preview(img for _, img, _ in carved).save(sheet_out / "_preview.png")
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true")
    parser.add_argument("--sheet", action="append")
    parser.add_argument("--xcassets", type=Path, default=DEFAULT_XCASSETS)
    args = parser.parse_args()

    manifest = load_manifest()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    selected = manifest["sheets"]
    if args.sheet:
        wanted = set(args.sheet)
        selected = [s for s in selected if s["id"] in wanted]
        missing = wanted - {s["id"] for s in selected}
        if missing:
            raise SystemExit(f"unknown sheet ids: {sorted(missing)}")

    all_records: list[dict] = []
    for entry in selected:
        print(f"carving {entry['id']} ({entry['prompt']} / {entry['category']}) …", flush=True)
        records = process_sheet(entry, install=args.install, xcassets=args.xcassets)
        all_records.extend(records)
        print(f"  → {len(records)} tiles", flush=True)

    catalog = {
        "generatedBy": "carve_atelier_assets.py",
        "promptFamily": "Imagination Atelier",
        "tileCount": len(all_records),
        "categories": sorted({r["category"] for r in all_records}),
        "missingPrompts": manifest.get("missingPrompts", []),
        "tiles": all_records,
    }
    (OUTPUT / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n")
    by_cat: dict[str, list[str]] = {}
    for r in all_records:
        by_cat.setdefault(r["category"], []).append(r["id"])
    (OUTPUT / "categories.json").write_text(json.dumps(by_cat, indent=2) + "\n")
    print(f"done: {len(all_records)} tiles → {OUTPUT}", flush=True)


if __name__ == "__main__":
    main()
