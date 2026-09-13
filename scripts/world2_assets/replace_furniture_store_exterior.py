#!/usr/bin/env python3
"""Prepare the replacement parent-supplied Furniture Store exterior as v9."""

from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file, utc_now, write_json
from prepare_requested_media import remove_clean_background_and_center
from repair_canonical import write_immutable_bytes


SOURCE = Path(
    "/Users/evanrobinson/.cursor/projects/"
    "Users-evanrobinson-abbies-world-ios/assets/"
    "image-7783482a-2da0-4151-97a8-525b043a5d10.jpg"
)


def main() -> int:
    try:
        from PIL import Image, ImageDraw
    except ImportError as error:
        raise PipelineError("Pillow is required for Furniture Store preparation") from error

    root = DEFAULT_WORLD2_ROOT.resolve()
    if not SOURCE.is_file():
        raise PipelineError(f"Parent-supplied exterior is missing: {SOURCE}")

    with Image.open(SOURCE) as opened:
        image = opened.convert("RGB")
    draw = ImageDraw.Draw(image)
    draw.rectangle(
        (int(image.width * 0.945), int(image.height * 0.955), image.width, image.height),
        fill=(255, 255, 255),
    )
    draw.rectangle(
        (
            int(image.width * 0.875),
            int(image.height * 0.775),
            int(image.width * 0.925),
            int(image.height * 0.835),
        ),
        fill=(255, 255, 255),
    )
    cleaned = BytesIO()
    image.save(cleaned, format="PNG", optimize=True)
    runtime_bytes, transformation = remove_clean_background_and_center(
        cleaned.getvalue(),
        max_subject_dimension=884,
    )
    transformation["watermarkCleanup"] = {
        "kind": "eraseIsolatedGeneratorMarksToBackground",
        "normalizedBounds": [
            [0.875, 0.775, 0.925, 0.835],
            [0.945, 0.955, 1.0, 1.0],
        ],
    }

    raw_path = root / "user-supplied" / "2005" / "v9" / SOURCE.name
    candidate_path = root / "normalized-candidates" / "2005" / "v9" / "source.png"
    prompt_path = root / "prompts" / "2005" / "v9.txt"
    prompt_text = """Parent-selected replacement exterior for the Furniture Store in Farm Land.
Preserve the complete pink-and-blue whimsical glass-fronted store, rainbow entrance,
rainbow arch, giant blue treetop canopy, rooftop cushions, flower lamp, plants,
steps, windows, and readable three-quarter silhouette. Remove the pale outer
background and tiny lower-right generator mark only. Leave a transparent outer
margin suitable for the map glow effect. The PNG alpha channel is
verified separately by file-integrity analysis; a vision renderer may display
transparent pixels against black. Do not redraw the store or add authored UI.

--ar 1:1
"""
    write_immutable_bytes(raw_path, SOURCE.read_bytes())
    write_immutable_bytes(candidate_path, runtime_bytes)
    write_immutable_bytes(prompt_path, prompt_text.encode("utf-8"))

    inventory_path = root / "inventory.json"
    inventory = read_json(inventory_path)
    asset = next(value for value in inventory["assets"] if value["productionId"] == "2005")
    asset["prompt"] = {
        "state": "exact",
        "path": "prompts/2005/v9.txt",
        "sha256": sha256_file(prompt_path),
        "version": "v9",
    }
    asset["source"] = {
        "candidatePath": "normalized-candidates/2005/v9/source.png",
        "sha256": sha256_file(candidate_path),
    }
    asset["qualification"]["mustShow"] = [
        "One complete pink-and-blue whimsical glass-fronted furniture store",
        "A visible rainbow entrance, blue treetop canopy, and rooftop cushions",
    ]
    asset["qualification"]["mustNotShow"] = [
        "Generator watermark, characters, authored UI, unrelated buildings, or frightening material"
    ]
    asset["qualification"]["safeZones"] = [
        "Keep the complete store within the canvas without clipping; keep the rainbow entrance visible"
    ]
    write_json(inventory_path, inventory)

    source_manifest_path = root / "source-manifest.json"
    source_manifest = read_json(source_manifest_path)
    source_entry = next(
        value for value in source_manifest["assets"] if value["productionId"] == "2005"
    )
    source_entry.update(
        {
            "candidatePath": "normalized-candidates/2005/v9/source.png",
            "candidateSha256": sha256_file(candidate_path),
            "promptPath": "prompts/2005/v9.txt",
            "promptSha256": sha256_file(prompt_path),
            "sourceUrl": "cursor-attachment://furniture-store/2005-v9-pink-rainbow",
        }
    )
    write_json(source_manifest_path, source_manifest)

    write_json(
        root / "generation-runs" / "2005" / "v9.json",
        {
            "schemaVersion": 1,
            "provider": "local-deterministic",
            "model": "pillow-parent-supplied-normalization-v1",
            "semanticId": "poi.furnitureStore.exterior",
            "productionId": "2005",
            "version": "v9",
            "promptPath": "prompts/2005/v9.txt",
            "promptSha256": sha256_file(prompt_path),
            "inputPath": str(raw_path.relative_to(root)),
            "inputSha256": sha256_file(raw_path),
            "outputPath": str(candidate_path.relative_to(root)),
            "outputSha256": sha256_file(candidate_path),
            "transformation": transformation,
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        },
    )

    print(
        json.dumps(
            {
                "event": "world2.asset.furniture_store.exterior.replaced",
                "assetId": "2005",
                "version": "v9",
                "sha256": sha256_file(candidate_path),
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
                    "event": "world2.asset.furniture_store.exterior.replace_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
