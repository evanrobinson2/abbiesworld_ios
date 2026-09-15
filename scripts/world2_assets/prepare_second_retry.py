#!/usr/bin/env python3
"""Prepare the final allowed (v3) World 2 repair attempt."""

from __future__ import annotations

import base64
import copy
from io import BytesIO
import json
import os
from pathlib import Path
import sys

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    read_json,
    sha256_bytes,
    sha256_file,
    utc_now,
    write_immutable_json,
)
from repair_canonical import crop_to_ratio, write_immutable_bytes


TARGETS = (
    "1001A",
    "1001B",
    "1002",
    "1004",
    "1005",
    "1006",
    "1007",
    "1009",
    "ingredient.board.creature",
    "decoration.jukebox.starter",
    "card.frame.common",
)


def pixel_preserving_reencode(source: Path, marker: str) -> bytes:
    try:
        from PIL import Image
        from PIL.PngImagePlugin import PngInfo
    except ImportError as error:
        raise PipelineError("Pillow is required for final repair preparation") from error
    with Image.open(source) as opened:
        image = opened.copy()
    metadata = PngInfo()
    metadata.add_text("World2RepairAttempt", marker)
    output = BytesIO()
    image.save(output, format="PNG", optimize=True, pnginfo=metadata)
    return output.getvalue()


def main() -> int:
    root = DEFAULT_WORLD2_ROOT.resolve()
    client = None
    for identity in TARGETS:
        spec_v2_path = root / "repairs" / identity / "v2" / "spec.json"
        spec_v2 = read_json(spec_v2_path)
        prompt_v2 = (root / spec_v2["prompt"]["path"]).read_bytes()
        prompt_path = (
            root
            / "prompts"
            / (
                spec_v2["productionId"]
                if spec_v2.get("productionId")
                else f"generated/{identity}"
            )
            / "v3.txt"
        )
        write_immutable_bytes(prompt_path, prompt_v2)
        is_canonical = bool(spec_v2.get("productionId"))
        output_path = (
            root
            / ("repair-candidates" if is_canonical else "generated-candidates")
            / identity
            / "v3"
            / "source.png"
        )
        source_path = root / spec_v2["source"]["candidatePath"]
        repair: dict[str, object]
        if identity == "1001B":
            source_path = root / "candidates" / "1001B" / "v1" / "source.jpeg"
            output = pixel_preserving_reencode(source_path, "1001B-v3")
            repair = {
                "kind": "returnToSelectedSourceWithCorrectSpelling",
                "inputSha256": sha256_file(source_path),
            }
        elif identity == "1002":
            if not os.environ.get("OPENAI_API_KEY"):
                raise PipelineError("OPENAI_API_KEY is required for 1002 final repair")
            if client is None:
                try:
                    from openai import OpenAI
                except ImportError as error:
                    raise PipelineError("The OpenAI Python package is required") from error
                client = OpenAI(
                    api_key=os.environ["OPENAI_API_KEY"],
                    timeout=600,
                    max_retries=2,
                )
            exact_prompt = prompt_v2.decode("utf-8")
            transport = exact_prompt.rsplit("--ar", 1)[0].strip()
            transport += (
                "\n\nFINAL REPAIR: show exactly three dirt placement pads, not two, "
                "not four. Remove every hut, doorway, window, face, creature, and "
                "constructed feature. Recount the pads before rendering."
            )
            with source_path.open("rb") as image:
                try:
                    response = client.images.edit(
                        model=os.environ.get(
                            "OPENAI_IMAGE_MODEL",
                            "gpt-image-2.5-flare-2026-09-08",
                        ),
                        image=image,
                        prompt=transport,
                        size="1536x1024",
                        quality="high",
                        output_format="png",
                        n=1,
                    )
                except Exception as error:
                    raise PipelineError(
                        f"1002 final repair request failed: {type(error).__name__}"
                    ) from error
            encoded = response.data[0].b64_json
            if not encoded:
                raise PipelineError("OpenAI returned no 1002 final repair")
            raw = base64.b64decode(encoded)
            output, crop = crop_to_ratio(raw, 4 / 3)
            repair = {
                "kind": "referenceImageEdit",
                "inputSha256": sha256_file(source_path),
                "transportPromptSha256": sha256_bytes(transport.encode("utf-8")),
                "crop": crop,
            }
        else:
            output = pixel_preserving_reencode(source_path, f"{identity}-v3")
            repair = {
                "kind": "pixelPreservingEvidenceRetry",
                "inputSha256": sha256_file(source_path),
            }
        write_immutable_bytes(output_path, output)
        output_hash = sha256_file(output_path)
        prompt_hash = sha256_file(prompt_path)
        record = {
            "schemaVersion": 1,
            "provider": "OpenAI",
            "model": os.environ.get(
                "OPENAI_IMAGE_MODEL",
                "gpt-image-2.5-flare-2026-09-08",
            ),
            "semanticId": spec_v2["semanticId"],
            "productionId": spec_v2.get("productionId"),
            "version": "v3",
            "promptPath": str(prompt_path.relative_to(root)),
            "promptSha256": prompt_hash,
            "outputPath": str(output_path.relative_to(root)),
            "outputSha256": output_hash,
            "repair": repair,
            "attempt": 2,
            "maximumAttempts": 2,
            "approvalState": "pending_parent_review",
            "integrationState": "blocked_until_qualified_and_parent_approved",
            "createdAt": utc_now(),
        }
        write_immutable_json(root / "generation-runs" / identity / "v3.json", record)
        spec_v3 = copy.deepcopy(spec_v2)
        spec_v3["prompt"] = {
            "state": "exact",
            "path": record["promptPath"],
            "sha256": prompt_hash,
            "version": "v3",
        }
        spec_v3["source"] = {
            "candidatePath": record["outputPath"],
            "sha256": output_hash,
        }
        write_immutable_json(
            root / "repairs" / identity / "v3" / "spec.json",
            spec_v3,
        )
        print(
            json.dumps(
                {
                    "event": "world2.asset.final_repair.prepared",
                    "assetId": identity,
                    "outputSha256": output_hash,
                    "attempt": 2,
                    "maximumAttempts": 2,
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            flush=True,
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(
            json.dumps(
                {
                    "event": "world2.asset.final_repair.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
