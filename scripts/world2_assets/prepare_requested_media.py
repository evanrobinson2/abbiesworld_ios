#!/usr/bin/env python3
"""Normalize the parent-supplied Ani art and transparent Home World POIs."""

from __future__ import annotations

from collections import deque
import copy
from io import BytesIO
import json
from pathlib import Path
import re
import statistics
import sys
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    asset_spec,
    load_inventory,
    read_json,
    sha256_file,
    utc_now,
    write_immutable_json,
)
from repair_canonical import write_immutable_bytes


ANI_INTERIOR_INPUT = Path(
    "user-supplied/1007/v5/"
    "ani_int-c9caa8e8-2392-4069-a92b-be306a426a39.jpg"
)


def prompt_with_normalization(base: str, note: str) -> str:
    body, count = re.subn(r"\s+--ar\s+\d+:\d+\s*$", "", base.strip())
    ratio = re.search(r"--ar\s+(\d+:\d+)\s*$", base.strip())
    if count != 1 or ratio is None:
        raise PipelineError("Expected exactly one trailing Midjourney aspect flag")
    return (
        body
        + "\n\nRUNTIME NORMALIZATION — parent-requested deterministic treatment:\n"
        + note
        + f"\n\n--ar {ratio.group(1)}\n"
    )


def remove_clean_background_and_center(
    data: bytes,
    *,
    remove_enclosed_background: bool = False,
    enclosed_component_min_area: int = 12,
    enclosed_component_min_y: int = 0,
    max_subject_dimension: int = 980,
) -> tuple[bytes, dict[str, Any]]:
    try:
        from PIL import Image
    except ImportError as error:
        raise PipelineError("Pillow is required for media normalization") from error

    image = Image.open(BytesIO(data)).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    border_samples = []
    step = max(1, min(width, height) // 128)
    for x in range(0, width, step):
        border_samples.extend((pixels[x, 0][:3], pixels[x, height - 1][:3]))
    for y in range(0, height, step):
        border_samples.extend((pixels[0, y][:3], pixels[width - 1, y][:3]))
    background = tuple(
        int(statistics.median(sample[channel] for sample in border_samples))
        for channel in range(3)
    )

    def distance(x: int, y: int) -> float:
        color = pixels[x, y][:3]
        return sum((color[index] - background[index]) ** 2 for index in range(3)) ** 0.5

    def is_background(x: int, y: int) -> bool:
        color = pixels[x, y][:3]
        return distance(x, y) <= 34 and min(color) >= 205

    seeds = [
        *((x, 0) for x in range(width)),
        *((x, height - 1) for x in range(width)),
        *((0, y) for y in range(height)),
        *((width - 1, y) for y in range(height)),
    ]
    queue = deque(point for point in seeds if is_background(*point))
    background_pixels = set(queue)
    while queue:
        x, y = queue.popleft()
        for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            nx, ny = point
            if (
                0 <= nx < width
                and 0 <= ny < height
                and point not in background_pixels
                and is_background(nx, ny)
            ):
                background_pixels.add(point)
                queue.append(point)

    enclosed_removed = 0
    if remove_enclosed_background:
        remaining = {
            (x, y)
            for y in range(height)
            for x in range(width)
            if (x, y) not in background_pixels and is_background(x, y)
        }
        while remaining:
            start = remaining.pop()
            component = {start}
            component_queue = deque([start])
            while component_queue:
                x, y = component_queue.popleft()
                for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if point in remaining:
                        remaining.remove(point)
                        component.add(point)
                        component_queue.append(point)
            if (
                len(component) >= enclosed_component_min_area
                and min(point[1] for point in component) >= enclosed_component_min_y
            ):
                background_pixels.update(component)
                enclosed_removed += len(component)

    for x, y in background_pixels:
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)

    boundary = set()
    for x, y in background_pixels:
        for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            nx, ny = point
            if (
                0 <= nx < width
                and 0 <= ny < height
                and point not in background_pixels
            ):
                boundary.add(point)
    for x, y in boundary:
        red, green, blue, _ = pixels[x, y]
        alpha = max(32, min(255, int((distance(x, y) - 18) / 38 * 255)))
        pixels[x, y] = (red, green, blue, alpha)

    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise PipelineError("Background removal produced an empty subject")
    left, top, right, bottom = bounds
    padding = max(8, int(max(right - left, bottom - top) * 0.025))
    bounds = (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )
    subject = image.crop(bounds)
    subject.thumbnail(
        (max_subject_dimension, max_subject_dimension),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    origin = ((1024 - subject.width) // 2, (1024 - subject.height) // 2)
    canvas.alpha_composite(subject, origin)
    output = BytesIO()
    canvas.save(output, format="PNG", optimize=True)
    return output.getvalue(), {
        "kind": "cleanBackgroundToAlphaAndCenter",
        "maxSubjectDimension": max_subject_dimension,
        "backgroundRGB": list(background),
        "removedPixelCount": len(background_pixels),
        "enclosedBackgroundPixelCount": enclosed_removed,
        "sourceDimensions": [width, height],
        "subjectBounds": list(bounds),
        "runtimeDimensions": [1024, 1024],
        "subjectOrigin": list(origin),
    }


def crop_interior(data: bytes) -> tuple[bytes, dict[str, Any]]:
    try:
        from PIL import Image
    except ImportError as error:
        raise PipelineError("Pillow is required for media normalization") from error
    image = Image.open(BytesIO(data)).convert("RGB")
    if image.size != (1024, 771):
        raise PipelineError(f"Unexpected Ani interior dimensions: {image.size}")
    box = (0, 1, 1024, 769)
    normalized = image.crop(box)
    output = BytesIO()
    normalized.save(output, format="PNG", optimize=True)
    return output.getvalue(), {
        "kind": "reviewedExact4x3Crop",
        "sourceDimensions": [1024, 771],
        "cropBox": list(box),
        "runtimeDimensions": [1024, 768],
    }


def write_candidate(
    root: Path,
    base: dict[str, Any],
    asset_id: str,
    version: str,
    source_path: Path,
    output: bytes,
    transformation: dict[str, Any],
    prompt_note: str,
    alpha_required: bool,
) -> None:
    raw_path = root / "user-supplied" / asset_id / version / source_path.name
    write_immutable_bytes(raw_path, source_path.read_bytes())
    base_prompt_path = root / base["prompt"]["path"]
    exact_prompt = prompt_with_normalization(
        base_prompt_path.read_text(encoding="utf-8"),
        prompt_note,
    )
    prompt_path = root / "prompts" / asset_id / f"{version}.txt"
    output_path = root / "normalized-candidates" / asset_id / version / "source.png"
    write_immutable_bytes(prompt_path, exact_prompt.encode("utf-8"))
    write_immutable_bytes(output_path, output)
    record = {
        "schemaVersion": 1,
        "provider": "local-deterministic",
        "model": "pillow-clean-matte-v1",
        "semanticId": base["semanticId"],
        "productionId": asset_id,
        "version": version,
        "exactPrompt": exact_prompt,
        "promptPath": str(prompt_path.relative_to(root)),
        "promptSha256": sha256_file(prompt_path),
        "inputPath": str(raw_path.relative_to(root)),
        "inputSha256": sha256_file(raw_path),
        "outputPath": str(output_path.relative_to(root)),
        "outputSha256": sha256_file(output_path),
        "transformation": transformation,
        "approvalState": "pending_parent_review",
        "integrationState": "blocked_until_qualified_and_parent_approved",
        "createdAt": utc_now(),
    }
    write_immutable_json(root / "generation-runs" / asset_id / f"{version}.json", record)
    spec = copy.deepcopy(base)
    spec["status"] = "canonical_repair"
    spec["prompt"] = {
        "state": "exact",
        "path": record["promptPath"],
        "sha256": record["promptSha256"],
        "version": version,
    }
    spec["source"] = {
        "candidatePath": record["outputPath"],
        "sha256": record["outputSha256"],
    }
    spec["qualification"]["fileContract"]["expectedAspectRatio"] = (
        1 if alpha_required else 4 / 3
    )
    spec["qualification"]["alphaContract"] = (
        "required" if alpha_required else "allowed"
    )
    spec["qualification"]["transformation"]["metadataMarker"] = (
        f"{asset_id}-{version}-parent-requested"
    )
    write_immutable_json(root / "repairs" / asset_id / version / "spec.json", spec)
    print(
        json.dumps(
            {
                "event": "world2.asset.parent_requested_media.prepared",
                "assetId": asset_id,
                "version": version,
                "outputSha256": record["outputSha256"],
            },
            separators=(",", ":"),
            sort_keys=True,
        )
    )


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    inventory = load_inventory(root)

    ani_exterior = root / "candidates" / "1006" / "v1" / "source.jpeg"
    base_1006 = asset_spec(inventory, "1006")
    output, transformation = remove_clean_background_and_center(
        ani_exterior.read_bytes(),
        remove_enclosed_background=True,
    )
    write_candidate(
        root,
        base_1006,
        "1006",
        "v5",
        ani_exterior,
        output,
        transformation,
        "Preserve the supplied Ani treehouse pixels while replacing only the clean "
        "background with true transparency. Center the complete silhouette with "
        "generous edge padding; preserve the moon tether, hanging ornaments, foliage, "
        "slide, stairs, path, and soft antialiased edges.",
        True,
    )

    base_1007 = asset_spec(inventory, "1007")
    interior_input = root / ANI_INTERIOR_INPUT
    interior_bytes = interior_input.read_bytes()
    output, transformation = crop_interior(interior_bytes)
    write_candidate(
        root,
        base_1007,
        "1007",
        "v5",
        interior_input,
        output,
        transformation,
        "Use the supplied Ani interior as an opaque full-screen background. Crop only "
        "three edge pixels to produce exact 1024 by 768 artwork; do not redraw or alter "
        "the room.",
        False,
    )

    base_1008 = read_json(root / "repairs" / "1008" / "v2" / "spec.json")
    factory = root / base_1008["source"]["candidatePath"]
    output, transformation = remove_clean_background_and_center(factory.read_bytes())
    write_candidate(
        root,
        base_1008,
        "1008",
        "v3",
        factory,
        output,
        transformation,
        "Preserve the qualified Card Factory pixels while replacing only the clean "
        "background with true transparency. Center and maximize the complete silhouette "
        "with safe padding; preserve flags, topiary guardians, card motifs, entrance, "
        "path, and soft antialiased edges.",
        True,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(
            json.dumps(
                {
                    "event": "world2.asset.parent_requested_media.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
