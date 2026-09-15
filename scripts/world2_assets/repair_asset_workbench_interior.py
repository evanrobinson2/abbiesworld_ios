#!/usr/bin/env python3
"""Create a pixel-identical interior with the intended storybook style contract."""

from __future__ import annotations

from io import BytesIO
import json
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file, utc_now, write_json
from repair_canonical import write_immutable_bytes


ASSET_ID = "2013"
VERSION = "v2"
SEMANTIC_ID = "poi.assetWorkbench.interior"


def main() -> int:
    try:
        from PIL import Image
        from PIL.PngImagePlugin import PngInfo
    except ImportError as error:
        raise PipelineError("Pillow is required for the interior repair") from error

    root = DEFAULT_WORLD2_ROOT.resolve()
    source = root / "normalized-candidates" / ASSET_ID / "v1" / "source.png"
    output = root / "normalized-candidates" / ASSET_ID / VERSION / "source.png"
    prompt_path = root / "prompts" / ASSET_ID / f"{VERSION}.txt"
    prompt_text = """Parent-selected interior for the Asset Workbench POI.
Preserve this warm, welcoming storybook invention room exactly as shown: a
dominant central copper fabrication machine with a bright circular viewport,
large teal and purple overhead pipes, brass fittings and gauges, a lower conveyor
carrying miniature cottage models, shelves of jars, hand tools, rolled plans,
flowers, stools, work surfaces, and glowing lanterns. Its rounded, playful machine
forms are intentional and must match the whimsical cottage exterior selected for
a smart six-year-old. “Sophisticated” here means polished illustration, coherent
materials, rich craftsmanship, and layered detail—not adult realism, sharp
industrial geometry, or reduced whimsy. This is atmospheric full-bleed 16:9
background artwork behind code-rendered headers, three idea-card carousels,
generation progress, and the six-candidate choice tray. Do not redraw the room or
add characters, authored UI controls, readable text, logos, watermarks,
frightening machinery, or harsh industrial hazards.

--ar 16:9
"""

    with Image.open(source) as opened:
        image = opened.convert("RGB")
    metadata = PngInfo()
    metadata.add_text("world2.pipeline.version", f"{ASSET_ID}-{VERSION}")
    metadata.add_text(
        "World2QualificationClarification",
        "Rounded storybook machinery is intentional; assess sophistication by craft.",
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
            "sourceUrl": "cursor-attachment://asset-workbench/2013-v2-style-contract",
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
            "promptPath": asset["prompt"]["path"],
            "promptSha256": asset["prompt"]["sha256"],
            "inputPath": f"normalized-candidates/{ASSET_ID}/v1/source.png",
            "inputSha256": sha256_file(source),
            "outputPath": asset["source"]["candidatePath"],
            "outputSha256": asset["source"]["sha256"],
            "transformation": {
                "kind": "pixelIdenticalReencode",
                "pixelContentChanged": False,
                "qualificationClarification": "Whimsy is intended; judge sophistication by illustration craft.",
            },
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        },
    )
    print(
        json.dumps(
            {
                "event": "world2.asset.asset_workbench_interior.repaired",
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
                    "event": "world2.asset.asset_workbench_interior.repair_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
