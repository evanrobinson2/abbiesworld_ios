#!/usr/bin/env python3
"""Extract reproducible Creature Lab tiles from generated asset boards."""

from __future__ import annotations

import argparse
from collections import deque
from hashlib import sha256
import json
from pathlib import Path
import shutil

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "AssetSources" / "CreatureLab"
CATALOG = (
    ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Assets.xcassets"
)

BOARD_SPECS = {
    "creatures": (
        "creature-lab-creatures-board.png",
        ("abbie", "dragon", "robot", "bunny", "cat", "dinosaur", "alien", "monster"),
        "creature",
    ),
    "outfits": (
        "creature-lab-outfits-board.png",
        (
            "lightning-racer",
            "astronaut",
            "ninja",
            "wizard",
            "knight",
            "firefighter",
            "superhero",
            "pirate",
        ),
        "outfit",
    ),
    "buddies": (
        "creature-lab-buddies-board.png",
        ("bat", "cheetah", "puppy", "owl", "unicorn", "peacock", "frog", "fox"),
        "buddy",
    ),
}


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def isolate_subject(cell: Image.Image, output_size: int = 512) -> Image.Image:
    rgb = cell.convert("RGB")
    corners = [
        rgb.getpixel((0, 0)),
        rgb.getpixel((rgb.width - 1, 0)),
        rgb.getpixel((0, rgb.height - 1)),
        rgb.getpixel((rgb.width - 1, rgb.height - 1)),
    ]
    background = tuple(sum(pixel[channel] for pixel in corners) // 4 for channel in range(3))
    flat_background = Image.new("RGB", rgb.size, background)
    difference = ImageChops.difference(rgb, flat_background).convert("L")
    alpha = difference.point(lambda value: max(0, min(255, (value - 5) * 10)))
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.7))
    border = max(2, min(alpha.size) // 80)
    bordered_alpha = Image.new("L", alpha.size, 0)
    bordered_alpha.paste(
        alpha.crop((border, border, alpha.width - border, alpha.height - border)),
        (border, border),
    )
    alpha = bordered_alpha
    alpha = keep_primary_component(alpha)

    foreground = rgb.convert("RGBA")
    foreground.putalpha(alpha)
    bounds = alpha.point(lambda value: 255 if value > 18 else 0).getbbox()
    if not bounds:
        raise RuntimeError("No foreground subject found in generated board cell")

    subject = foreground.crop(bounds)
    max_dimension = int(output_size * 0.90)
    subject.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (output_size, output_size), (0, 0, 0, 0))
    output.alpha_composite(
        subject,
        ((output_size - subject.width) // 2, (output_size - subject.height) // 2),
    )
    return output


def keep_primary_component(alpha: Image.Image) -> Image.Image:
    """Remove neighboring sprites that cross an asset-board cell boundary."""
    scale = 4
    width = max(1, alpha.width // scale)
    height = max(1, alpha.height // scale)
    mask = (
        alpha.resize((width, height), Image.Resampling.BILINEAR)
        .point(lambda value: 255 if value > 24 else 0)
        .filter(ImageFilter.MaxFilter(3))
    )
    pixels = mask.load()
    visited = set()
    components = []
    center = (width / 2, height / 2)

    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in visited:
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            component = []
            while queue:
                point = queue.popleft()
                component.append(point)
                px, py = point
                for neighbor in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    nx, ny = neighbor
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and pixels[nx, ny] != 0
                        and neighbor not in visited
                    ):
                        visited.add(neighbor)
                        queue.append(neighbor)
            mean_x = sum(point[0] for point in component) / len(component)
            mean_y = sum(point[1] for point in component) / len(component)
            distance = abs(mean_x - center[0]) + abs(mean_y - center[1])
            score = len(component) / (1 + distance / max(width, height))
            components.append((score, component))

    if not components:
        return alpha
    selected = max(components, key=lambda item: item[0])[1]
    component_mask = Image.new("L", (width, height), 0)
    component_pixels = component_mask.load()
    for x, y in selected:
        component_pixels[x, y] = 255
    component_mask = component_mask.filter(ImageFilter.MaxFilter(3))
    component_mask = component_mask.resize(alpha.size, Image.Resampling.BILINEAR)
    return ImageChops.multiply(alpha, component_mask)


def write_imageset(name: str, image: Image.Image) -> Path:
    imageset = CATALOG / f"{name}.imageset"
    imageset.mkdir(parents=True, exist_ok=True)
    image_path = imageset / f"{name}.png"
    image.save(image_path, "PNG", optimize=True)
    contents = {
        "images": [
            {
                "filename": image_path.name,
                "idiom": "universal",
                "scale": "1x",
            }
        ],
        "info": {"author": "xcode", "version": 1},
        "properties": {"preserves-vector-representation": False},
    }
    (imageset / "Contents.json").write_text(
        json.dumps(contents, indent=2) + "\n", encoding="utf-8"
    )
    return image_path


def extract_board(source: Path, ids: tuple[str, ...], category: str) -> list[dict]:
    board = Image.open(source).convert("RGB")
    records = []
    for index, item_id in enumerate(ids):
        column = index % 4
        row = index // 4
        left = round(column * board.width / 4)
        right = round((column + 1) * board.width / 4)
        top = round(row * board.height / 2)
        bottom = round((row + 1) * board.height / 2)
        tile = isolate_subject(board.crop((left, top, right, bottom)))
        asset_name = f"creature_builder_{category}_{item_id.replace('-', '_')}"
        output = write_imageset(asset_name, tile)
        records.append(
            {
                "id": item_id,
                "assetName": asset_name,
                "sha256": file_hash(output),
            }
        )
    return records


def import_background(source: Path) -> dict:
    name = "creature_builder_workshop_background"
    image = Image.open(source).convert("RGB")
    output = write_imageset(name, image)
    return {"assetName": name, "sha256": file_hash(output)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--creatures-board", type=Path, required=True)
    parser.add_argument("--outfits-board", type=Path, required=True)
    parser.add_argument("--buddies-board", type=Path, required=True)
    parser.add_argument("--background", type=Path, required=True)
    args = parser.parse_args()

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    supplied = {
        "creatures": args.creatures_board,
        "outfits": args.outfits_board,
        "buddies": args.buddies_board,
    }
    manifest = {
        "schemaVersion": 1,
        "generator": "Cursor GenerateImage",
        "pipeline": Path(__file__).name,
        "boards": {},
    }

    for board_key, source in supplied.items():
        filename, ids, category = BOARD_SPECS[board_key]
        retained_source = SOURCE_DIR / filename
        shutil.copy2(source, retained_source)
        manifest["boards"][board_key] = {
            "source": str(retained_source.relative_to(ROOT)),
            "sourceSHA256": file_hash(retained_source),
            "grid": {"columns": 4, "rows": 2},
            "assets": extract_board(retained_source, ids, category),
        }

    retained_background = SOURCE_DIR / "creature-lab-workshop-background.png"
    shutil.copy2(args.background, retained_background)
    manifest["background"] = {
        "source": str(retained_background.relative_to(ROOT)),
        "sourceSHA256": file_hash(retained_background),
        **import_background(retained_background),
    }
    (SOURCE_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        "creature_builder.assets_extracted "
        f"tiles={sum(len(board['assets']) for board in manifest['boards'].values())} "
        f"background=1 manifest={SOURCE_DIR / 'manifest.json'}"
    )


if __name__ == "__main__":
    main()
