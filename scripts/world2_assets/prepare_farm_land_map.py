#!/usr/bin/env python3
"""Prepare the parent-supplied Farm Land map as canonical asset 2007."""

from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file, utc_now, write_json
from repair_canonical import write_immutable_bytes


SOURCE = Path(
    "/Users/evanrobinson/.cursor/projects/"
    "Users-evanrobinson-abbies-world-ios/assets/"
    "image-52e3effb-2502-4b8e-b394-f34fdb40ecb3.jpg"
)
ASSET_ID = "2007"
VERSION = "v2"
SEMANTIC_ID = "map.farm"


def main() -> int:
    try:
        from PIL import Image, ImageOps
    except ImportError as error:
        raise PipelineError("Pillow is required for Farm Land map preparation") from error

    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied Farm Land map is missing: {SOURCE}")

    with Image.open(SOURCE) as opened:
        image = opened.convert("RGB")
    source_dimensions = list(image.size)
    runtime = ImageOps.fit(
        image,
        (1280, 960),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.48),
    )
    output = BytesIO()
    runtime.save(output, format="PNG", optimize=True)

    raw_path = root / "user-supplied" / ASSET_ID / VERSION / SOURCE.name
    candidate_path = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected Farm Land overland map for Abbie's World 2.
Preserve the inviting hand-drawn green woodland, pale winding cobblestone paths,
central path crossroads, rounded trees, shrubs, rocks, and small warm flowers.
The central path network will visually anchor the code-rendered Furniture Store
POI. This is an environmental map background, not a standalone
building. Do not add characters, buildings, authored UI, text, logos, watermarks,
or frightening material.

--ar 4:3
"""

    write_immutable_bytes(raw_path, SOURCE.read_bytes())
    write_immutable_bytes(candidate_path, output.getvalue())
    write_immutable_bytes(prompt_path, prompt_text.encode("utf-8"))

    qualification = {
        "alphaContract": "forbidden",
        "audience": "smart six-year-old using an iPad",
        "expectedEmbellishmentAreas": [],
        "fileContract": {
            "aspectRatioTolerance": 0.03,
            "expectedAspectRatio": 4 / 3,
            "formats": ["PNG"],
            "minimumHeight": 960,
            "minimumWidth": 1280,
        },
        "intendedScreen": "Full-screen Farm Land overland map behind code-rendered POIs and navigation",
        "maximumRepairAttempts": 2,
        "mustNotShow": [
            "Characters, buildings, authored UI, readable text, logos, watermarks, or frightening material"
        ],
        "mustShow": [
            "A welcoming green woodland map with winding pale cobblestone paths",
            "A visible central path crossroads surrounded by trees, shrubs, rocks, and flowers",
        ],
        "references": ["1002", "2005"],
        "safeZones": [
            "Keep the central path network visible as the visual anchor behind the Furniture Store POI",
            "Keep the path network readable behind edge navigation and the top map title",
        ],
        "transformation": {
            "kind": "optimize",
            "maxDimension": 2048,
            "outputFormat": "PNG",
            "preserveAlpha": False,
        },
        "useSizes": [{"height": 768, "name": "fullScreen4x3", "width": 1024}],
    }
    entry = {
        "productionId": ASSET_ID,
        "semanticId": SEMANTIC_ID,
        "status": "canonical",
        "prompt": {
            "state": "exact",
            "path": str(prompt_path.relative_to(root)),
            "sha256": sha256_file(prompt_path),
            "version": VERSION,
        },
        "source": {
            "candidatePath": str(candidate_path.relative_to(root)),
            "sha256": sha256_file(candidate_path),
        },
        "qualification": qualification,
    }

    inventory_path = root / "inventory.json"
    inventory = read_json(inventory_path)
    inventory["assets"] = [
        value
        for value in inventory["assets"]
        if value.get("productionId") != ASSET_ID
    ] + [entry]
    write_json(inventory_path, inventory)

    source_manifest_path = root / "source-manifest.json"
    source_manifest = read_json(source_manifest_path)
    source_manifest["assets"] = [
        value
        for value in source_manifest["assets"]
        if value.get("productionId") != ASSET_ID
    ]
    source_manifest["assets"].append(
        {
            "candidatePath": entry["source"]["candidatePath"],
            "candidateSha256": entry["source"]["sha256"],
            "productionId": ASSET_ID,
            "promptPath": entry["prompt"]["path"],
            "promptSha256": entry["prompt"]["sha256"],
            "sourceState": "imported_exact_hash",
            "sourceUrl": "cursor-attachment://farm-land/2007-v2-map",
        }
    )
    write_json(source_manifest_path, source_manifest)

    write_json(
        root / "generation-runs" / ASSET_ID / f"{VERSION}.json",
        {
            "schemaVersion": 1,
            "provider": "local-deterministic",
            "model": "pillow-parent-supplied-normalization-v1",
            "semanticId": SEMANTIC_ID,
            "productionId": ASSET_ID,
            "version": VERSION,
            "promptPath": entry["prompt"]["path"],
            "promptSha256": entry["prompt"]["sha256"],
            "inputPath": str(raw_path.relative_to(root)),
            "inputSha256": sha256_file(raw_path),
            "outputPath": entry["source"]["candidatePath"],
            "outputSha256": entry["source"]["sha256"],
            "transformation": {
                "kind": "centerCropAndResize4x3",
                "sourceDimensions": source_dimensions,
                "runtimeDimensions": [1280, 960],
                "centering": [0.5, 0.48],
                "pixelContentChanged": True,
            },
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        },
    )

    print(
        json.dumps(
            {
                "event": "world2.asset.farm_land_map.prepared",
                "assetId": ASSET_ID,
                "version": VERSION,
                "sha256": entry["source"]["sha256"],
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
                    "event": "world2.asset.farm_land_map.prepare_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
