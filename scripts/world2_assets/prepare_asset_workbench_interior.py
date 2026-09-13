#!/usr/bin/env python3
"""Prepare the parent-supplied Asset Workbench interior."""

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
    "image-bb3c31b5-e226-40e2-8007-effa59e8e787.jpg"
)
ASSET_ID = "2013"
VERSION = "v1"
SEMANTIC_ID = "poi.assetWorkbench.interior"


def normalized_png() -> tuple[bytes, dict[str, object]]:
    try:
        from PIL import Image, ImageOps
        from PIL.PngImagePlugin import PngInfo
    except ImportError as error:
        raise PipelineError("Pillow is required for media normalization") from error

    with Image.open(SOURCE) as opened:
        image = opened.convert("RGB")
    runtime_size = (1280, 720)
    normalized = ImageOps.fit(
        image,
        runtime_size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    metadata = PngInfo()
    metadata.add_text("world2.pipeline.version", f"{ASSET_ID}-{VERSION}")
    output = BytesIO()
    normalized.save(output, format="PNG", optimize=True, pnginfo=metadata)
    return output.getvalue(), {
        "kind": "parentSelectedFullBleed16x9Crop",
        "sourceDimensions": list(image.size),
        "runtimeDimensions": list(runtime_size),
        "focalCenter": [0.5, 0.5],
        "horizontalCropFraction": 0.0018,
    }


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied Asset Workbench interior is missing: {SOURCE}")

    output, transformation = normalized_png()
    raw_path = root / "user-supplied" / ASSET_ID / VERSION / SOURCE.name
    candidate_path = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected interior for the Asset Workbench POI.
Preserve this warm, welcoming storybook invention room as a full-bleed 16:9 iPad
background: a dominant central copper fabrication machine with a bright circular
viewport, large teal and purple overhead pipes, brass fittings and gauges, a
lower conveyor carrying miniature cottage models, shelves of jars, hand tools,
rolled plans, flowers, stools, work surfaces, and glowing lanterns. Preserve the
central machine as the visual anchor while retaining useful workshop context at
both sides. This is atmospheric background artwork behind code-rendered headers,
three idea-card carousels, generation progress, and the six-candidate choice tray.
Do not add characters, authored UI controls, readable text, logos, watermarks,
frightening machinery, or harsh industrial hazards.

--ar 16:9
"""
    write_immutable_bytes(raw_path, SOURCE.read_bytes())
    write_immutable_bytes(candidate_path, output)
    write_immutable_bytes(prompt_path, prompt_text.encode("utf-8"))

    qualification = {
        "alphaContract": "forbidden",
        "audience": "smart six-year-old using an iPad",
        "expectedEmbellishmentAreas": [],
        "fileContract": {
            "aspectRatioTolerance": 0.03,
            "expectedAspectRatio": 16 / 9,
            "formats": ["PNG"],
            "minimumHeight": 720,
            "minimumWidth": 1280,
        },
        "intendedScreen": "Asset Workbench full-screen interior behind code-rendered recipe, generation, and selection interfaces",
        "maximumRepairAttempts": 3,
        "mustNotShow": [
            "Characters, authored UI controls, readable text, logos, watermarks, frightening machinery, harsh industrial hazards, or large empty white regions"
        ],
        "mustShow": [
            "A welcoming storybook invention room with a dominant central copper machine and bright circular fabrication viewport",
            "Teal and purple pipes, brass fittings, gauges, a miniature-cottage conveyor, jars, tools, rolled plans, flowers, work surfaces, and warm lanterns",
        ],
        "references": ["2012", "2011", "1009", "2003"],
        "safeZones": [
            "Keep the central circular machine recognizable behind translucent code-rendered panels",
            "Retain useful workshop detail across the full width without requiring any illustrated control to be tapped",
            "Keep all critical authored text absent so code-rendered carousel labels and actions remain authoritative",
        ],
        "transformation": {
            "kind": "optimize",
            "maxDimension": 2048,
            "outputFormat": "PNG",
            "preserveAlpha": False,
        },
        "useSizes": [
            {"height": 720, "name": "fullScreen16x9", "width": 1280},
        ],
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
            "sourceUrl": "cursor-attachment://asset-workbench/2013-v1-interior",
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
            "transformation": transformation,
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        },
    )

    print(
        json.dumps(
            {
                "event": "world2.asset.asset_workbench_interior.prepared",
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
                    "event": "world2.asset.asset_workbench_interior.prepare_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
