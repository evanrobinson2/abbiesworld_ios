#!/usr/bin/env python3
"""Prepare the parent-supplied starter bed for Ani's furniture pack."""

from __future__ import annotations

import json
from pathlib import Path
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file, utc_now, write_json
from prepare_requested_media import remove_clean_background_and_center
from repair_canonical import write_immutable_bytes


SOURCE = Path(
    "/Users/evanrobinson/.cursor/projects/"
    "Users-evanrobinson-abbies-world-ios/assets/"
    "image-6108e72a-ff91-4fb1-8440-ee42f672f52d.png"
)
ASSET_ID = "2009"
VERSION = "v2"
SEMANTIC_ID = "furniture.aniStarterBed"


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied Ani starter bed is missing: {SOURCE}")

    output, transformation = remove_clean_background_and_center(
        SOURCE.read_bytes(),
        remove_enclosed_background=True,
        enclosed_component_min_area=1000,
        max_subject_dimension=900,
    )
    raw_path = root / "user-supplied" / ASSET_ID / VERSION / SOURCE.name
    candidate_path = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected centerpiece for Ani's five-item treehouse starter pack.
Preserve one ornate purple moonlit canopy bed in three-quarter view, including
the sculpted violet frame and posts, visible chandelier and chain, glowing
flowering vines, lavender drapes, rainbow quilt, unicorn pillows, and soft floor
shadow. Preserve the chandelier chain exactly as supplied. Remove only the pale
outer background and center the furniture on transparent padding. Do not add
characters, authored UI, text, logos, watermarks, or other furniture.

--ar 1:1
"""
    write_immutable_bytes(raw_path, SOURCE.read_bytes())
    write_immutable_bytes(candidate_path, output)
    write_immutable_bytes(prompt_path, prompt_text.encode("utf-8"))

    qualification = {
        "alphaContract": "required",
        "audience": "smart six-year-old using an iPad",
        "expectedEmbellishmentAreas": [],
        "fileContract": {
            "aspectRatioTolerance": 0.03,
            "expectedAspectRatio": 1.0,
            "formats": ["PNG"],
            "minimumHeight": 1024,
            "minimumWidth": 1024,
        },
        "intendedScreen": "Ani's starter-pack centerpiece and freely placeable treehouse decoration",
        "maximumRepairAttempts": 2,
        "mustNotShow": [
            "Opaque outer background, characters, authored UI, readable text, logos, watermarks, unrelated furniture, or frightening material"
        ],
        "mustShow": [
            "One ornate purple canopy bed with a rainbow quilt",
            "A sculpted violet frame, canopy posts, chandelier, flowering vines, drapes, and unicorn pillows",
        ],
        "references": ["1007", "2006"],
        "safeZones": [
            "Keep the bed, frame, posts, visible chandelier, quilt, and floor shadow inside the canvas"
        ],
        "transformation": {
            "kind": "optimize",
            "maxDimension": 2048,
            "outputFormat": "PNG",
            "preserveAlpha": True,
        },
        "useSizes": [
            {"height": 240, "name": "inventoryTile", "width": 240},
            {"height": 320, "name": "treehousePlacement", "width": 360},
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
            "sourceUrl": "cursor-attachment://furniture/2009-v2-ani-starter-bed",
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
                "event": "world2.asset.ani_starter_bed.prepared",
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
                    "event": "world2.asset.ani_starter_bed.prepare_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
