#!/usr/bin/env python3
"""Create one immutable Image 2 v2 repair for failed canonical World 2 art."""

from __future__ import annotations

import argparse
import base64
from contextlib import ExitStack
import copy
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    asset_spec,
    load_inventory,
    read_json,
    resolve_inside,
    safe_name,
    sha256_bytes,
    sha256_file,
    utc_now,
    write_immutable_json,
)


REPAIRS: dict[str, dict[str, Any]] = {
    "1001A": {
        "size": "1536x1024",
        "ratio": 4 / 3,
        "revision": (
            "Make the lower-left body unmistakably Earth with simplified blue oceans, "
            "organic blocky continents, soft cloud bands, and a glowing atmosphere. "
            "Use chunkier toy-like forms, clean expressive outlines, and distinct "
            "cel-shaded value steps while preserving the open upper-center title area."
        ),
    },
    "1001B": {
        "size": "1024x1024",
        "ratio": 1,
        "revision": (
            "Preserve the exact readable spelling “Abbie’s World” and the selected pink "
            "identity. Make the badge wider and more compact inside generous extraction "
            "padding so it remains readable in a 600 by 240 title placement. Use one "
            "uniform plain neutral background, never a fake transparency checkerboard."
        ),
    },
    "1002": {
        "size": "1536x1024",
        "ratio": 4 / 3,
        "revision": (
            "Preserve exactly three clean empty dirt pads and their connecting paths. "
            "Remove every creature-like figure, face, doorway, window, chimney, and "
            "constructed element from the landscape. Keep HUD-safe open space and a "
            "compact readable pocket-world composition."
        ),
    },
    "1004": {
        "size": "1024x1024",
        "ratio": 1,
        "revision": (
            "Preserve the pink treehouse, unicorn balloon, entrance, and signature "
            "architecture. Simplify small ornaments and deliberately leave at least "
            "three broad visibly vacant exterior mounting areas for later banners, "
            "lanterns, flower boxes, pets, or collectible decorations."
        ),
    },
    "1005": {
        "size": "1536x1024",
        "ratio": 4 / 3,
        "revision": (
            "Preserve the pink wooden treehouse identity but remove excess permanent "
            "furnishings and perimeter decoration. Leave large open wall sections, "
            "generous empty floor and corners, clear shelves, and several obvious empty "
            "hooks, ledges, or sockets for future customization."
        ),
    },
    "1006": {
        "size": "1024x1024",
        "ratio": 1,
        "revision": (
            "Preserve the purple treehouse, crescent balloon, spiral slide, entrance, "
            "and signature architecture. Add one clearly readable simple bridge, reduce "
            "fine ornament, and deliberately leave at least three broad visibly vacant "
            "exterior mounting areas for later decorations."
        ),
    },
    "1007": {
        "size": "1536x1024",
        "ratio": 4 / 3,
        "revision": (
            "Preserve the purple celestial treehouse identity but reduce permanent "
            "wraparound seating and occupied walls. Keep one built-in bench, a broad "
            "open central play area, large empty wall and corner regions, clear shelves, "
            "and obvious empty hooks, ledges, or sockets for future customization."
        ),
    },
    "1008": {
        "size": "1024x1024",
        "ratio": 1,
        "revision": (
            "Preserve the castle-workshop silhouette, blossom guardians, AA crest, "
            "entrance, and palette. Add one unmistakable oversized blank fantasy-card "
            "emblem and a broad visible card press or card-feed architectural feature. "
            "Simplify fine decoration so the Card Factory identity reads at map scale."
        ),
    },
    "1009": {
        "size": "1536x1024",
        "ratio": 4 / 3,
        "revision": (
            "Preserve the castle workshop, AA crest, blossom accents, and palette while "
            "substantially simplifying shelves and machinery. Create three large, "
            "clearly separated empty ingredient stations for creature, function or "
            "costume, and context, plus one prominent empty illuminated card-reveal "
            "pedestal. Keep broad open overlay-safe counters and floor space."
        ),
    },
}


def crop_to_ratio(data: bytes, ratio: float) -> tuple[bytes, dict[str, Any]]:
    try:
        from PIL import Image
    except ImportError as error:
        raise PipelineError("Pillow is required for canonical repair crops") from error
    with tempfile.NamedTemporaryFile(suffix=".png") as input_file:
        input_file.write(data)
        input_file.flush()
        with Image.open(input_file.name) as opened:
            image = opened.convert("RGBA")
            width, height = image.size
            if width / height > ratio:
                output_height = height
                output_width = int(height * ratio)
            else:
                output_width = width
                output_height = int(width / ratio)
            left = (width - output_width) // 2
            top = (height - output_height) // 2
            box = (left, top, left + output_width, top + output_height)
            cropped = image.crop(box)
            with tempfile.NamedTemporaryFile(suffix=".png") as output_file:
                cropped.save(output_file.name, format="PNG", optimize=True)
                output = Path(output_file.name).read_bytes()
    return output, {
        "kind": "centerCrop",
        "inputDimensions": [width, height],
        "cropBox": list(box),
        "outputDimensions": [output_width, output_height],
        "targetAspectRatio": ratio,
    }


def write_immutable_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != data:
            raise PipelineError(f"Immutable repair bytes differ: {path}")
        return
    with path.open("xb") as handle:
        handle.write(data)


def repair_prompt(base_prompt: str, revision: str) -> tuple[str, str]:
    without_flag, count = re.subn(
        r"\s+--ar\s+\d+:\d+\s*$",
        "",
        base_prompt.strip(),
    )
    if count != 1:
        raise PipelineError("Canonical prompt requires one trailing --ar flag")
    ratio_match = re.search(r"--ar\s+(\d+:\d+)\s*$", base_prompt.strip())
    assert ratio_match
    exact = (
        without_flag
        + "\n\nREPAIR V2 — constrained revision from multimodal qualification:\n"
        + revision
        + f"\n\n--ar {ratio_match.group(1)}\n"
    )
    transport = re.sub(r"\s+--ar\s+\d+:\d+\s*$", "", exact.strip())
    return exact, transport


def generate_one(
    client: Any,
    root: Path,
    inventory: dict[str, Any],
    asset_id: str,
    model: str,
) -> None:
    repair = REPAIRS[asset_id]
    base = asset_spec(inventory, asset_id)
    base_prompt_path = resolve_inside(root, base["prompt"]["path"])
    exact_prompt, transport_prompt = repair_prompt(
        base_prompt_path.read_text(encoding="utf-8"),
        repair["revision"],
    )
    prompt_path = root / "prompts" / asset_id / "v2.txt"
    write_immutable_bytes(prompt_path, exact_prompt.encode("utf-8"))
    prompt_hash = sha256_bytes(exact_prompt.encode("utf-8"))
    raw_path = root / "generation-raw" / asset_id / "v2" / "api-output.png"
    candidate_path = root / "repair-candidates" / asset_id / "v2" / "source.png"
    record_path = root / "generation-runs" / asset_id / "v2.json"
    spec_path = root / "repairs" / asset_id / "v2" / "spec.json"
    if record_path.exists():
        record = read_json(record_path)
        if (
            not candidate_path.is_file()
            or sha256_file(candidate_path) != record.get("outputSha256")
            or record.get("promptSha256") != prompt_hash
        ):
            raise PipelineError(f"Existing repair provenance mismatch for {asset_id}")
        print(
            json.dumps(
                {
                    "event": "world2.asset.repair.resumed",
                    "assetId": asset_id,
                    "outputSha256": record["outputSha256"],
                },
                separators=(",", ":"),
            ),
            flush=True,
        )
        return

    reference_ids = [asset_id, *base["qualification"]["references"]]
    source_manifest = read_json(root / "source-manifest.json")
    sources = {
        value["productionId"]: value
        for value in source_manifest.get("assets", [])
    }
    reference_records = []
    with ExitStack() as stack:
        images = []
        for reference_id in reference_ids:
            source = sources[reference_id]
            reference_path = resolve_inside(root, source["candidatePath"])
            if sha256_file(reference_path) != source["candidateSha256"]:
                raise PipelineError(f"Reference hash mismatch: {reference_id}")
            images.append(stack.enter_context(reference_path.open("rb")))
            reference_records.append(
                {
                    "assetId": reference_id,
                    "path": source["candidatePath"],
                    "sha256": source["candidateSha256"],
                }
            )
        try:
            response = client.images.edit(
                model=model,
                image=images,
                prompt=transport_prompt,
                size=repair["size"],
                quality="high",
                output_format="png",
                n=1,
            )
        except Exception as error:
            raise PipelineError(
                f"Image repair request failed for {asset_id}: {type(error).__name__}"
            ) from error
    encoded = response.data[0].b64_json
    if not encoded:
        raise PipelineError(f"OpenAI returned no repair image for {asset_id}")
    raw = base64.b64decode(encoded)
    cropped, transformation = crop_to_ratio(raw, repair["ratio"])
    write_immutable_bytes(raw_path, raw)
    write_immutable_bytes(candidate_path, cropped)
    output_hash = sha256_file(candidate_path)

    generation_record = {
        "schemaVersion": 1,
        "provider": "OpenAI",
        "model": model,
        "quality": "high",
        "outputFormat": "png",
        "semanticId": base["semanticId"],
        "productionId": asset_id,
        "version": "v2",
        "exactPrompt": exact_prompt,
        "transportPromptSha256": sha256_bytes(transport_prompt.encode("utf-8")),
        "promptPath": str(prompt_path.relative_to(root)),
        "promptSha256": prompt_hash,
        "references": reference_records,
        "requestedSize": repair["size"],
        "rawOutputPath": str(raw_path.relative_to(root)),
        "rawOutputSha256": sha256_file(raw_path),
        "transformation": transformation,
        "outputPath": str(candidate_path.relative_to(root)),
        "outputSha256": output_hash,
        "approvalState": "pending_parent_review",
        "integrationState": "blocked_until_qualified_and_parent_approved",
        "createdAt": utc_now(),
    }
    write_immutable_json(record_path, generation_record)

    spec = copy.deepcopy(base)
    spec["status"] = "canonical_repair"
    spec["prompt"] = {
        "state": "exact",
        "path": str(prompt_path.relative_to(root)),
        "sha256": prompt_hash,
        "version": "v2",
    }
    spec["source"] = {
        "candidatePath": str(candidate_path.relative_to(root)),
        "sha256": output_hash,
    }
    spec["qualification"]["fileContract"]["expectedAspectRatio"] = repair["ratio"]
    write_immutable_json(spec_path, spec)
    print(
        json.dumps(
            {
                "event": "world2.asset.repair.generated",
                "assetId": asset_id,
                "outputSha256": output_hash,
                "attempt": 1,
                "maximumAttempts": 2,
            },
            separators=(",", ":"),
            sort_keys=True,
        ),
        flush=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    parser.add_argument("--asset", action="append", choices=tuple(REPAIRS))
    parser.add_argument(
        "--model",
        default=os.environ.get(
            "OPENAI_IMAGE_MODEL",
            "gpt-image-2.5-flare-2026-09-08",
        ),
    )
    args = parser.parse_args()
    if not os.environ.get("OPENAI_API_KEY"):
        raise PipelineError("OPENAI_API_KEY is required")
    try:
        from openai import OpenAI
    except ImportError as error:
        raise PipelineError("The OpenAI Python package is required") from error
    root = args.world2_root.resolve()
    inventory = load_inventory(root)
    client = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        timeout=600,
        max_retries=2,
    )
    for asset_id in args.asset or list(REPAIRS):
        generate_one(client, root, inventory, asset_id, args.model)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(
            json.dumps(
                {
                    "event": "world2.asset.repair.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
