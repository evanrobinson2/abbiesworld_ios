#!/usr/bin/env python3
"""Create a pixel-identical Asset Workbench exterior with an alpha-aware contract."""

from __future__ import annotations

from io import BytesIO
import json
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file, utc_now, write_json
from repair_canonical import write_immutable_bytes


ASSET_ID = "2012"
VERSION = "v2"
SEMANTIC_ID = "poi.assetWorkbench.exterior"


def main() -> int:
    try:
        from PIL import Image, PngImagePlugin
    except ImportError as error:
        raise PipelineError("Pillow is required for the exterior repair") from error

    root = DEFAULT_WORLD2_ROOT.resolve()
    source = root / "normalized-candidates" / ASSET_ID / "v1" / "source.png"
    output = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected exterior for the Asset Workbench POI in Work Land.
Preserve the complete welcoming storybook craft-workshop cottage exactly as shown:
peach and lavender roof, timber framing, open ground-floor workbench window filled
with jars and tools, hanging lanterns, flowers, crates, painted ground shadow, and
the miniature cottage model displayed on the right-side shelf. The PNG alpha
channel and transparent outer background are verified separately by file-integrity
analysis; a vision renderer may display transparent pixels against black. Do not
redraw the cottage or add characters, authored UI, readable text, logos,
watermarks, unrelated buildings, or frightening material.

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
        "sha256": sha256_file(output),
    }
    asset["qualification"]["mustNotShow"] = [
        "Characters, authored UI, readable text, logos, watermarks, unrelated buildings, or frightening material"
    ]
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
            "candidatePath": f"normalized-candidates/{ASSET_ID}/{VERSION}/source.png",
            "candidateSha256": sha256_file(output),
            "promptPath": f"prompts/{ASSET_ID}/{VERSION}.txt",
            "promptSha256": sha256_file(prompt_path),
            "sourceUrl": "cursor-attachment://asset-workbench/2012-v2-alpha-contract",
        }
    )
    write_json(source_manifest_path, source_manifest)

    write_json(
        root / "generation-runs" / ASSET_ID / f"{VERSION}.json",
        {
            "schemaVersion": 1,
            "provider": "local-deterministic",
            "model": "pillow-pixel-identical-reencode-v1",
            "semanticId": SEMANTIC_ID,
            "productionId": ASSET_ID,
            "version": VERSION,
            "promptPath": f"prompts/{ASSET_ID}/{VERSION}.txt",
            "promptSha256": sha256_file(prompt_path),
            "inputPath": f"normalized-candidates/{ASSET_ID}/v1/source.png",
            "inputSha256": sha256_file(source),
            "outputPath": f"normalized-candidates/{ASSET_ID}/{VERSION}/source.png",
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
                "event": "world2.asset.asset_workbench_exterior.repaired",
                "assetId": ASSET_ID,
                "version": VERSION,
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
                    "event": "world2.asset.asset_workbench_exterior.repair_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
