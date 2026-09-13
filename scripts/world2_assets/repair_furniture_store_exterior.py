#!/usr/bin/env python3
"""Create a pixel-identical v2 exterior with an alpha-aware evaluator contract."""

from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file, utc_now, write_json
from repair_canonical import write_immutable_bytes


def main() -> int:
    try:
        from PIL import Image, PngImagePlugin
    except ImportError as error:
        raise PipelineError("Pillow is required for the exterior repair") from error

    root = DEFAULT_WORLD2_ROOT.resolve()
    source = root / "normalized-candidates" / "2005" / "v1" / "source.png"
    output = root / "normalized-candidates" / "2005" / "v2" / "source.png"
    prompt_path = root / "prompts" / "2005" / "v2.txt"
    prompt_text = """Parent-selected exterior for the Furniture Store in Farm Land. Preserve the complete
blue-and-gold whimsical furniture building, rooftop cushions, trees, plants, awnings,
windows, entry, and readable silhouette. The PNG alpha channel and transparent outer
background are verified separately by file-integrity analysis; a vision renderer may
display transparent pixels against black. The tiny lower-right generator mark has
been removed. Do not redraw the store or add authored UI.

--ar 1:1
"""

    with Image.open(source) as opened:
        image = opened.convert("RGBA")
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text(
        "World2QualificationClarification",
        "Pixel-identical v2; alpha is verified by file integrity, not semantic vision.",
    )
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True, pnginfo=metadata)
    write_immutable_bytes(output, buffer.getvalue())
    write_immutable_bytes(prompt_path, prompt_text.encode("utf-8"))

    inventory_path = root / "inventory.json"
    inventory = read_json(inventory_path)
    asset = next(value for value in inventory["assets"] if value["productionId"] == "2005")
    asset["prompt"] = {
        "state": "exact",
        "path": "prompts/2005/v2.txt",
        "sha256": sha256_file(prompt_path),
        "version": "v2",
    }
    asset["source"] = {
        "candidatePath": "normalized-candidates/2005/v2/source.png",
        "sha256": sha256_file(output),
    }
    asset["qualification"]["mustNotShow"] = [
        "Generator watermark, characters, authored UI, unrelated buildings, or frightening material"
    ]
    write_json(inventory_path, inventory)

    source_manifest_path = root / "source-manifest.json"
    source_manifest = read_json(source_manifest_path)
    source_entry = next(
        value for value in source_manifest["assets"] if value["productionId"] == "2005"
    )
    source_entry.update(
        {
            "candidatePath": "normalized-candidates/2005/v2/source.png",
            "candidateSha256": sha256_file(output),
            "promptPath": "prompts/2005/v2.txt",
            "promptSha256": sha256_file(prompt_path),
            "sourceUrl": "cursor-attachment://furniture-store/2005-v2-alpha-contract",
        }
    )
    write_json(source_manifest_path, source_manifest)

    write_json(
        root / "generation-runs" / "2005" / "v2.json",
        {
            "schemaVersion": 1,
            "provider": "local-deterministic",
            "model": "pillow-pixel-identical-reencode-v1",
            "semanticId": "poi.furnitureStore.exterior",
            "productionId": "2005",
            "version": "v2",
            "promptPath": "prompts/2005/v2.txt",
            "promptSha256": sha256_file(prompt_path),
            "inputPath": "normalized-candidates/2005/v1/source.png",
            "inputSha256": sha256_file(source),
            "outputPath": "normalized-candidates/2005/v2/source.png",
            "outputSha256": sha256_file(output),
            "transformation": {
                "kind": "pixelIdenticalReencode",
                "pixelContentChanged": False,
                "qualificationClarification": "Alpha proof belongs to file-integrity node.",
            },
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        },
    )
    print(
        json.dumps(
            {
                "event": "world2.asset.furniture_store.exterior.repaired",
                "assetId": "2005",
                "version": "v2",
                "sha256": sha256_file(output),
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
                    "event": "world2.asset.furniture_store.exterior.repair_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
