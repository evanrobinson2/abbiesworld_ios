#!/usr/bin/env python3
"""Prepare the parent-supplied Asset Workbench exterior."""

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
    "image-aa8a2b5a-ffa8-48e3-a99d-b11513297334.png"
)
ASSET_ID = "2012"
VERSION = "v1"
SEMANTIC_ID = "poi.assetWorkbench.exterior"


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied Asset Workbench exterior is missing: {SOURCE}")

    output, transformation = remove_clean_background_and_center(
        SOURCE.read_bytes(),
        max_subject_dimension=940,
    )
    raw_path = root / "user-supplied" / ASSET_ID / VERSION / SOURCE.name
    candidate_path = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected exterior for the Asset Workbench POI in Work Land.
Preserve one complete welcoming storybook craft-workshop cottage in three-quarter
view, including the peach and lavender roof, timber framing, open ground-floor
workbench window filled with jars and tools, hanging lanterns, flowers, crates,
and the miniature cottage model displayed on the right-side shelf. Preserve the
soft painted ground shadow and plants as part of the POI silhouette. Remove only
the white outer background and center the complete building on transparent
padding. Do not add characters, authored UI, readable text, logos, watermarks,
unrelated buildings, or frightening material.

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
        "intendedScreen": "Work Land Asset Workbench tappable POI exterior",
        "maximumRepairAttempts": 2,
        "mustNotShow": [
            "Opaque outer background, characters, authored UI, readable text, logos, watermarks, unrelated buildings, or frightening material"
        ],
        "mustShow": [
            "One complete welcoming storybook craft-workshop cottage with a readable open workbench window",
            "Peach and lavender roof, timber framing, lanterns, jars, tools, flowers, crates, and a miniature cottage model on the right-side shelf",
        ],
        "references": ["2001", "2002", "2005", "2010"],
        "safeZones": [
            "Keep the complete building, roof, chimney, open shop window, hanging lanterns, ground shadow, and miniature cottage shelf readable at map scale"
        ],
        "transformation": {
            "kind": "optimize",
            "maxDimension": 2048,
            "outputFormat": "PNG",
            "preserveAlpha": True,
        },
        "useSizes": [
            {"height": 220, "name": "poiInspectionTile", "width": 260},
            {"height": 280, "name": "workLandPOI", "width": 320},
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
            "sourceUrl": "cursor-attachment://asset-workbench/2012-v1-exterior",
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
                "event": "world2.asset.asset_workbench_exterior.prepared",
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
                    "event": "world2.asset.asset_workbench_exterior.prepare_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
