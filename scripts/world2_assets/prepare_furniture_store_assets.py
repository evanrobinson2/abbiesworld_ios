#!/usr/bin/env python3
"""Prepare the parent-supplied Furniture Store exterior and interior."""

from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import sys

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    read_json,
    sha256_file,
    utc_now,
    write_json,
)
from prepare_requested_media import remove_clean_background_and_center
from repair_canonical import write_immutable_bytes


EXTERIOR_SOURCE = Path(
    "/Users/evanrobinson/.cursor/projects/"
    "Users-evanrobinson-abbies-world-ios/assets/"
    "image-1c123f61-b156-48c4-8271-a5e1ee05abdc.jpg"
)
INTERIOR_SOURCE = Path(
    "/Users/evanrobinson/.cursor/projects/"
    "Users-evanrobinson-abbies-world-ios/assets/"
    "image-57cc7845-1c38-404c-bb5b-f9bc277874c8.jpg"
)


def normalize_exterior(source: Path) -> tuple[bytes, dict[str, object]]:
    try:
        from PIL import Image, ImageDraw
    except ImportError as error:
        raise PipelineError("Pillow is required for Furniture Store preparation") from error

    with Image.open(source) as opened:
        image = opened.convert("RGB")
    # Remove only the tiny lower-right generator mark before matte extraction.
    draw = ImageDraw.Draw(image)
    draw.rectangle(
        (int(image.width * 0.945), int(image.height * 0.955), image.width, image.height),
        fill=(255, 255, 255),
    )
    cleaned = BytesIO()
    image.save(cleaned, format="PNG", optimize=True)
    output, transformation = remove_clean_background_and_center(cleaned.getvalue())
    transformation["watermarkCleanup"] = {
        "kind": "eraseLowerRightGeneratorMarkToBackground",
        "normalizedBounds": [0.945, 0.955, 1.0, 1.0],
    }
    return output, transformation


def normalize_interior(source: Path) -> tuple[bytes, dict[str, object]]:
    try:
        from PIL import Image, ImageOps
    except ImportError as error:
        raise PipelineError("Pillow is required for Furniture Store preparation") from error

    with Image.open(source) as opened:
        image = opened.convert("RGB")
    original_size = image.size
    normalized = ImageOps.fit(
        image,
        (1280, 720),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    output = BytesIO()
    normalized.save(output, format="PNG", optimize=True)
    return output.getvalue(), {
        "kind": "centerCropAndResize16x9",
        "sourceDimensions": list(original_size),
        "runtimeDimensions": [1280, 720],
        "pixelContentChanged": True,
    }


def prompt(text: str, ratio: str) -> str:
    return f"{text.strip()}\n\n--ar {ratio}\n"


def entry(
    *,
    asset_id: str,
    semantic_id: str,
    candidate_path: str,
    prompt_path: str,
    alpha: str,
    aspect_ratio: float,
    minimum_width: int,
    minimum_height: int,
    intended_screen: str,
    must_show: list[str],
    must_not_show: list[str],
    safe_zones: list[str],
    references: list[str],
    use_size: dict[str, object],
) -> dict[str, object]:
    return {
        "productionId": asset_id,
        "semanticId": semantic_id,
        "status": "canonical",
        "prompt": {
            "state": "exact",
            "path": prompt_path,
            "sha256": sha256_file(DEFAULT_WORLD2_ROOT / prompt_path),
            "version": "v1",
        },
        "source": {
            "candidatePath": candidate_path,
            "sha256": sha256_file(DEFAULT_WORLD2_ROOT / candidate_path),
        },
        "qualification": {
            "alphaContract": alpha,
            "audience": "smart six-year-old using an iPad",
            "expectedEmbellishmentAreas": [],
            "fileContract": {
                "aspectRatioTolerance": 0.03,
                "expectedAspectRatio": aspect_ratio,
                "formats": ["PNG"],
                "minimumHeight": minimum_height,
                "minimumWidth": minimum_width,
            },
            "intendedScreen": intended_screen,
            "maximumRepairAttempts": 2,
            "mustNotShow": must_not_show,
            "mustShow": must_show,
            "references": references,
            "safeZones": safe_zones,
            "transformation": {
                "kind": "optimize",
                "maxDimension": 2048,
                "outputFormat": "PNG",
                "preserveAlpha": alpha != "forbidden",
            },
            "useSizes": [use_size],
        },
    }


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    if not EXTERIOR_SOURCE.is_file() or not INTERIOR_SOURCE.is_file():
        raise PipelineError("Both parent-supplied Furniture Store images are required")

    exterior_bytes, exterior_transform = normalize_exterior(EXTERIOR_SOURCE)
    interior_bytes, interior_transform = normalize_interior(INTERIOR_SOURCE)

    inputs = {
        "2005": (EXTERIOR_SOURCE, exterior_bytes, exterior_transform),
        "2006": (INTERIOR_SOURCE, interior_bytes, interior_transform),
    }
    prompt_values = {
        "2005": prompt(
            """
Parent-selected exterior for the Furniture Store in Farm Land. Preserve the complete
blue-and-gold whimsical furniture building, rooftop cushions, trees, plants, awnings,
windows, entry, and readable silhouette. Remove the white outer background and tiny
lower-right generator mark only. Do not redraw the store or add authored UI.
""",
            "1:1",
        ),
        "2006": prompt(
            """
Parent-selected interior for the Furniture Store shopping minigame. Preserve the
warm pink-and-teal indoor furniture avenue, glass ceiling, shell lights, moon light,
balconies, cushions, displays, and broad central path. Use it as an environmental
background behind code-rendered budget, catalog, cart, and checkout controls.
Do not add authored UI, characters, branding, or frightening material.
""",
            "16:9",
        ),
    }

    for asset_id, (source, output, transformation) in inputs.items():
        raw_path = root / "user-supplied" / asset_id / "v1" / source.name
        output_path = root / "normalized-candidates" / asset_id / "v1" / "source.png"
        prompt_path = root / "prompts" / asset_id / "v1.txt"
        write_immutable_bytes(raw_path, source.read_bytes())
        write_immutable_bytes(output_path, output)
        write_immutable_bytes(prompt_path, prompt_values[asset_id].encode("utf-8"))
        record = {
            "schemaVersion": 1,
            "provider": "local-deterministic",
            "model": "pillow-parent-supplied-normalization-v1",
            "semanticId": (
                "poi.furnitureStore.exterior"
                if asset_id == "2005"
                else "poi.furnitureStore.interior"
            ),
            "productionId": asset_id,
            "version": "v1",
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
        write_json(root / "generation-runs" / asset_id / "v1.json", record)

    new_entries = [
        entry(
            asset_id="2005",
            semantic_id="poi.furnitureStore.exterior",
            candidate_path="normalized-candidates/2005/v1/source.png",
            prompt_path="prompts/2005/v1.txt",
            alpha="required",
            aspect_ratio=1.0,
            minimum_width=1024,
            minimum_height=1024,
            intended_screen="Farm Land Furniture Store tappable POI",
            must_show=[
                "One complete blue-and-gold whimsical furniture store",
                "A centered readable building silhouette with rooftop furniture",
            ],
            must_not_show=[
                "Opaque outer background, generator watermark, characters, authored UI, unrelated buildings, or frightening material"
            ],
            safe_zones=["Keep the complete store silhouette and entrance readable at map scale"],
            references=["1002", "2006"],
            use_size={"height": 300, "name": "mapPOI", "width": 320},
        ),
        entry(
            asset_id="2006",
            semantic_id="poi.furnitureStore.interior",
            candidate_path="normalized-candidates/2006/v1/source.png",
            prompt_path="prompts/2006/v1.txt",
            alpha="forbidden",
            aspect_ratio=16 / 9,
            minimum_width=1280,
            minimum_height=720,
            intended_screen="Furniture Store budget shopping minigame background behind code-rendered controls",
            must_show=[
                "A welcoming indoor furniture avenue with visible displays",
                "A broad central path and readable upper architecture",
            ],
            must_not_show=[
                "Characters, authored UI controls, readable branding, frightening material, or blocked central play space"
            ],
            safe_zones=[
                "Preserve the central path and side displays as readable space behind code-rendered budget, catalog, cart, and checkout controls"
            ],
            references=["2005"],
            use_size={"height": 720, "name": "fullScreen16x9", "width": 1280},
        ),
    ]

    inventory_path = root / "inventory.json"
    inventory = read_json(inventory_path)
    inventory["assets"] = [
        value
        for value in inventory["assets"]
        if value.get("productionId") not in {"2005", "2006"}
    ] + new_entries
    write_json(inventory_path, inventory)

    source_manifest_path = root / "source-manifest.json"
    source_manifest = read_json(source_manifest_path)
    source_manifest["assets"] = [
        value
        for value in source_manifest["assets"]
        if value.get("productionId") not in {"2005", "2006"}
    ]
    for value in new_entries:
        source_manifest["assets"].append(
            {
                "candidatePath": value["source"]["candidatePath"],
                "candidateSha256": value["source"]["sha256"],
                "productionId": value["productionId"],
                "promptPath": value["prompt"]["path"],
                "promptSha256": value["prompt"]["sha256"],
                "sourceState": "imported_exact_hash",
                "sourceUrl": f"cursor-attachment://furniture-store/{value['productionId']}",
            }
        )
    write_json(source_manifest_path, source_manifest)

    print(
        json.dumps(
            {
                "event": "world2.asset.furniture_store.prepared",
                "assets": [
                    {
                        "assetId": value["productionId"],
                        "sourceSha256": value["source"]["sha256"],
                    }
                    for value in new_entries
                ],
            },
            separators=(",", ":"),
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(
            json.dumps(
                {
                    "event": "world2.asset.furniture_store.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
