#!/usr/bin/env python3
"""Prepare the parent-supplied self-replicating POI Factory interior."""

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
    "image-40333484-8e56-458b-8ba3-83046995a3ba.jpg"
)
ASSET_ID = "2011"
VERSION = "v5"
SEMANTIC_ID = "poi.selfReplicatingFactory.interior"


def normalized_png() -> tuple[bytes, dict[str, object]]:
    try:
        from PIL import Image, ImageOps
        from PIL.PngImagePlugin import PngInfo
    except ImportError as error:
        raise PipelineError("Pillow is required for media normalization") from error
    image = Image.open(SOURCE).convert("RGB")
    runtime_size = (1024, 768)
    normalized = ImageOps.fit(
        image,
        runtime_size,
        method=Image.Resampling.LANCZOS,
        centering=(0.52, 0.5),
    )
    output = BytesIO()
    metadata = PngInfo()
    metadata.add_text("world2.pipeline.version", f"{ASSET_ID}-{VERSION}")
    normalized.save(output, format="PNG", optimize=True, pnginfo=metadata)
    return output.getvalue(), {
        "kind": "parentSelectedFullBleed4x3Crop",
        "sourceDimensions": list(image.size),
        "runtimeDimensions": list(runtime_size),
        "focalCenter": [0.52, 0.5],
        "parentDirection": "crop",
    }


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied POI Factory interior is missing: {SOURCE}")

    output, transformation = normalized_png()
    raw_path = root / "user-supplied" / ASSET_ID / VERSION / SOURCE.name
    candidate_path = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected interior for the self-replicating POI Factory.
Create the parent-selected full-bleed iPad 4:3 crop of this warm, whimsical machine
room. Preserve the central circular glass fabrication viewport, brass and pastel
pipes, gauges, windows, work surfaces, and broad open tiled floor. The outermost
left and right machinery may be cropped; do not require the complete chamber
silhouette. This is background artwork behind code-rendered controls.
This is background artwork behind code-rendered fabrication and exit controls.
Do not add characters, authored UI controls, readable branding, logos, watermarks,
frightening machinery, or clutter that blocks the open floor.

--ar 4:3
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
            "expectedAspectRatio": 4 / 3,
            "formats": ["PNG"],
            "minimumHeight": 768,
            "minimumWidth": 1024,
        },
        "intendedScreen": "Self-replicating POI Factory interior behind code-rendered controls",
        "maximumRepairAttempts": 4,
        "mustNotShow": [
            "Characters, authored UI controls, readable branding, logos, watermarks, frightening machinery, or a blocked lower play area"
        ],
        "mustShow": [
            "A welcoming machine room with a dominant circular glass fabrication viewport",
            "Pastel industrial pipes, brass fittings, gauges, windows, work surfaces, and an open tiled floor",
        ],
        "references": ["2010", "1009", "2003"],
        "safeZones": [
            "Keep the central glass viewport readable even when outer machinery is cropped",
            "Keep a broad lower tiled-floor region visibly open",
        ],
        "transformation": {
            "kind": "optimize",
            "maxDimension": 2048,
            "outputFormat": "PNG",
            "preserveAlpha": False,
        },
        "useSizes": [
            {"height": 768, "name": "fullScreen4x3", "width": 1024},
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
            "sourceUrl": "cursor-attachment://poi-factory/2011-v5-parent-selected-crop",
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
                "event": "world2.asset.poi_factory_interior.prepared",
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
                    "event": "world2.asset.poi_factory_interior.prepare_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
