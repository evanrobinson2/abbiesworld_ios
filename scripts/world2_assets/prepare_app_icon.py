#!/usr/bin/env python3
"""Register an immutable generated iPad app-icon candidate for qualification."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    read_json,
    sha256_file,
    utc_now,
    write_json,
    write_immutable_json,
)
from repair_canonical import write_immutable_bytes


ASSET_ID = "2004"
SEMANTIC_ID = "ui.appIcon"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    args = parser.parse_args()
    root = args.world2_root.resolve()
    if not args.candidate.is_file():
        raise PipelineError(f"App-icon candidate is missing: {args.candidate}")
    if not args.reference.is_file():
        raise PipelineError(f"App-icon reference is missing: {args.reference}")

    prompt = root / "prompts" / ASSET_ID / "v1.txt"
    reference = root / "generated-candidates" / ASSET_ID / "reference-v1.png"
    destination = root / "generated-candidates" / ASSET_ID / "v1" / "source.png"
    write_immutable_bytes(reference, args.reference.read_bytes())
    write_immutable_bytes(destination, args.candidate.read_bytes())
    prompt_hash = sha256_file(prompt)
    candidate_hash = sha256_file(destination)

    generation_record = {
        "schemaVersion": 1,
        "provider": "Cursor GenerateImage",
        "model": "cursor-native-image",
        "quality": "high",
        "outputFormat": "png",
        "semanticId": SEMANTIC_ID,
        "productionId": ASSET_ID,
        "version": "v1",
        "exactPrompt": prompt.read_text(encoding="utf-8"),
        "promptPath": str(prompt.relative_to(root)),
        "promptSha256": prompt_hash,
        "references": [
            {
                "path": str(reference.relative_to(root)),
                "sha256": sha256_file(reference),
                "role": "first clay composition",
            }
        ],
        "requestedSize": "1024x1024",
        "outputPath": str(destination.relative_to(root)),
        "outputSha256": candidate_hash,
        "approvalState": "pending_parent_review",
        "integrationState": "blocked_until_qualified_and_parent_approved",
        "createdAt": utc_now(),
    }
    record_path = root / "generation-runs" / ASSET_ID / "v1.json"
    if not record_path.exists():
        write_immutable_json(record_path, generation_record)

    inventory_path = root / "inventory.json"
    inventory = read_json(inventory_path)
    entry = {
        "productionId": ASSET_ID,
        "prompt": {
            "path": str(prompt.relative_to(root)),
            "sha256": prompt_hash,
            "state": "exact",
            "version": "v1",
        },
        "qualification": {
            "alphaContract": "forbidden",
            "audience": "smart six-year-old using an iPad",
            "expectedEmbellishmentAreas": [],
            "fileContract": {
                "aspectRatioTolerance": 0.01,
                "expectedAspectRatio": 1.0,
                "formats": ["PNG"],
                "minimumHeight": 1024,
                "minimumWidth": 1024,
            },
            "intendedScreen": "iPad Home Screen app icon",
            "maximumRepairAttempts": 2,
            "mustNotShow": [
                "People, animals, creatures, faces, text, letters, numbers, logos, authored rounded-square masks, borders, UI, or transparency",
            ],
            "mustShow": [
                "One centered compact floating clay world",
                "A pink treehouse, a purple treehouse, a central whimsical factory, and a large golden sparkle",
                "A strong readable silhouette on a full-bleed midnight-blue background",
            ],
            "references": ["1002", "1004", "1006"],
            "safeZones": [
                "Keep essential buildings and the golden sparkle inside the central Apple icon-mask-safe region",
            ],
            "transformation": {
                "kind": "optimize",
                "maxDimension": 1024,
                "outputFormat": "PNG",
                "preserveAlpha": False,
            },
            "useSizes": [
                {"height": 180, "name": "iPadLargeIcon", "width": 180},
                {"height": 60, "name": "iPadSmallIcon", "width": 60},
            ],
        },
        "semanticId": SEMANTIC_ID,
        "source": {
            "candidatePath": str(destination.relative_to(root)),
            "sha256": candidate_hash,
        },
        "status": "canonical",
    }
    matches = [
        value
        for value in inventory["assets"]
        if value.get("productionId") == ASSET_ID
    ]
    if matches and matches[0] != entry:
        raise PipelineError(f"Inventory entry differs for {ASSET_ID}")
    if not matches:
        inventory["assets"].append(entry)
        write_json(inventory_path, inventory)

    source_path = root / "source-manifest.json"
    source_manifest = read_json(source_path)
    source_entry = {
        "candidatePath": entry["source"]["candidatePath"],
        "candidateSha256": candidate_hash,
        "productionId": ASSET_ID,
        "promptPath": entry["prompt"]["path"],
        "promptSha256": prompt_hash,
        "sourceState": "imported_exact_hash",
        "sourceUrl": "cursor-native://generate-image/abbies-world-ipad-icon-clay-v2",
    }
    source_matches = [
        value
        for value in source_manifest["assets"]
        if value.get("productionId") == ASSET_ID
    ]
    if source_matches and source_matches[0] != source_entry:
        raise PipelineError(f"Source manifest entry differs for {ASSET_ID}")
    if not source_matches:
        source_manifest["assets"].append(source_entry)
        write_json(source_path, source_manifest)

    print(f"{ASSET_ID} {SEMANTIC_ID} {candidate_hash}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
