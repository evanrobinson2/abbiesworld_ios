#!/usr/bin/env python3
"""Add map-scale edge padding to the parent-selected Asset Workbench exterior."""

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
VERSION = "v4"
SEMANTIC_ID = "poi.assetWorkbench.exterior"


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied Asset Workbench exterior is missing: {SOURCE}")

    output, transformation = remove_clean_background_and_center(
        SOURCE.read_bytes(),
        max_subject_dimension=760,
    )
    raw_path = root / "user-supplied" / ASSET_ID / VERSION / SOURCE.name
    candidate_path = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected exterior for the Asset Workbench POI in Work Land.
Preserve the complete welcoming storybook craft-workshop cottage exactly as shown:
peach and lavender roof, timber framing, open ground-floor workbench window filled
with jars and tools, hanging lanterns, flowers, crates, painted ground shadow, and
the miniature cottage model displayed on the right-side shelf. Keep ample
transparent padding around every protruding feature for map-scale placement. The
PNG alpha channel and transparent outer background are verified separately by
file-integrity analysis; a vision renderer may display transparent pixels against
black. Do not redraw the cottage or add characters, authored UI, readable text,
logos, watermarks, unrelated buildings, or frightening material.

--ar 1:1
"""
    write_immutable_bytes(raw_path, SOURCE.read_bytes())
    write_immutable_bytes(candidate_path, output)
    write_immutable_bytes(prompt_path, prompt_text.encode("utf-8"))

    inventory_path = root / "inventory.json"
    inventory = read_json(inventory_path)
    asset = next(
        value for value in inventory["assets"] if value.get("productionId") == ASSET_ID
    )
    asset["prompt"] = {
        "state": "exact",
        "path": f"prompts/{ASSET_ID}/{VERSION}.txt",
        "sha256": sha256_file(prompt_path),
        "version": VERSION,
    }
    asset["source"] = {
        "candidatePath": f"normalized-candidates/{ASSET_ID}/{VERSION}/source.png",
        "sha256": sha256_file(candidate_path),
    }
    write_json(inventory_path, inventory)

    source_manifest_path = root / "source-manifest.json"
    source_manifest = read_json(source_manifest_path)
    source_entry = next(
        value
        for value in source_manifest["assets"]
        if value.get("productionId") == ASSET_ID
    )
    source_entry.update(
        {
            "candidatePath": asset["source"]["candidatePath"],
            "candidateSha256": asset["source"]["sha256"],
            "promptPath": asset["prompt"]["path"],
            "promptSha256": asset["prompt"]["sha256"],
            "sourceUrl": "cursor-attachment://asset-workbench/2012-v4-map-padding",
        }
    )
    write_json(source_manifest_path, source_manifest)

    write_json(
        root / "generation-runs" / ASSET_ID / f"{VERSION}.json",
        {
            "schemaVersion": 1,
            "provider": "local-deterministic",
            "model": "pillow-parent-supplied-map-padding-v1",
            "semanticId": SEMANTIC_ID,
            "productionId": ASSET_ID,
            "version": VERSION,
            "promptPath": asset["prompt"]["path"],
            "promptSha256": asset["prompt"]["sha256"],
            "inputPath": str(raw_path.relative_to(root)),
            "inputSha256": sha256_file(raw_path),
            "outputPath": asset["source"]["candidatePath"],
            "outputSha256": asset["source"]["sha256"],
            "transformation": transformation,
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        },
    )
    print(
        json.dumps(
            {
                "event": "world2.asset.asset_workbench_exterior.padding_repaired",
                "assetId": ASSET_ID,
                "version": VERSION,
                "sha256": asset["source"]["sha256"],
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
                    "event": "world2.asset.asset_workbench_exterior.padding_repair_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
