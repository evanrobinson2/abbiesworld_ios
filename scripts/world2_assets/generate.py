#!/usr/bin/env python3
"""Generate immutable, reference-locked World 2 representative candidates."""

from __future__ import annotations

import argparse
import base64
from contextlib import ExitStack
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    read_json,
    resolve_inside,
    safe_name,
    sha256_bytes,
    sha256_file,
    write_immutable_json,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def candidate_by_id(manifest: dict[str, Any], semantic_id: str) -> dict[str, Any]:
    matches = [
        value
        for value in manifest.get("representativeCandidates", [])
        if value.get("semanticId") == semantic_id
    ]
    if len(matches) != 1:
        raise PipelineError(
            f"Expected exactly one representative candidate for {semantic_id}"
        )
    return matches[0]


def validate_candidate(world2_root: Path, candidate: dict[str, Any]) -> None:
    if candidate.get("state") != "ready_for_generation":
        raise PipelineError(
            f"{candidate.get('semanticId')} is not approved for representative generation"
        )
    if candidate.get("productionId") is not None:
        raise PipelineError("Supplemental P0 candidates must not invent production IDs")
    prompt_path = resolve_inside(world2_root, str(candidate.get("promptPath", "")))
    if not prompt_path.is_file():
        raise PipelineError(f"Prompt is missing: {prompt_path}")
    if sha256_file(prompt_path) != candidate.get("promptSha256"):
        raise PipelineError(f"Prompt hash mismatch: {prompt_path}")
    references = candidate.get("references")
    if not isinstance(references, list) or not references:
        raise PipelineError("Representative generation requires canonical references")
    for reference in references:
        path = resolve_inside(world2_root, str(reference.get("path", "")))
        if not path.is_file() or sha256_file(path) != reference.get("sha256"):
            raise PipelineError(
                f"Reference is missing or hash-mismatched: {reference.get('assetId')}"
            )


def decode_image_response(response: Any) -> bytes:
    encoded = response.data[0].b64_json
    if not encoded:
        raise PipelineError("OpenAI returned no base64 PNG data")
    try:
        return base64.b64decode(encoded, validate=True)
    except ValueError as error:
        raise PipelineError("OpenAI returned invalid base64 image data") from error


def image_dimensions(data: bytes) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as error:
        raise PipelineError("Pillow is required to inspect generated images") from error
    with tempfile.NamedTemporaryFile(suffix=".png") as temporary:
        temporary.write(data)
        temporary.flush()
        with Image.open(temporary.name) as image:
            image.verify()
        with Image.open(temporary.name) as image:
            return image.size


def generate_one(
    *,
    client: Any,
    world2_root: Path,
    manifest: dict[str, Any],
    candidate: dict[str, Any],
) -> dict[str, Any]:
    validate_candidate(world2_root, candidate)
    semantic_id = str(candidate["semanticId"])
    version = str(candidate["version"])
    prompt_path = resolve_inside(world2_root, candidate["promptPath"])
    prompt = prompt_path.read_text(encoding="utf-8")
    destination = (
        world2_root
        / "generated-candidates"
        / safe_name(semantic_id)
        / version
        / "source.png"
    )
    record_path = (
        world2_root
        / "generation-runs"
        / safe_name(semantic_id)
        / f"{version}.json"
    )
    if destination.exists() or record_path.exists():
        if not destination.is_file() or not record_path.is_file():
            raise PipelineError(
                f"Partial immutable generation exists for {semantic_id} {version}"
            )
        record = read_json(record_path)
        if (
            sha256_file(destination) != record.get("outputSha256")
            or record.get("promptSha256") != candidate["promptSha256"]
            or record.get("model") != manifest["model"]
        ):
            raise PipelineError(
                f"Existing generation does not match immutable provenance: {semantic_id}"
            )
        print(
            json.dumps(
                {
                    "event": "world2.asset.generation.resumed",
                    "semanticId": semantic_id,
                    "outputSha256": record["outputSha256"],
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            flush=True,
        )
        return record

    references = candidate["references"]
    with ExitStack() as stack:
        images = [
            stack.enter_context(
                resolve_inside(world2_root, reference["path"]).open("rb")
            )
            for reference in references
        ]
        response = client.images.edit(
            model=manifest["model"],
            image=images,
            prompt=prompt,
            size=candidate["size"],
            quality=manifest["quality"],
            output_format=manifest["outputFormat"],
            n=1,
        )
    output = decode_image_response(response)
    width, height = image_dimensions(output)
    output_hash = sha256_bytes(output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix=".world2-generation-",
        suffix=".png",
        dir=destination.parent,
        delete=False,
    ) as temporary:
        temporary.write(output)
        temporary_path = Path(temporary.name)
    try:
        temporary_path.replace(destination)
    finally:
        temporary_path.unlink(missing_ok=True)

    record = {
        "schemaVersion": 1,
        "provider": manifest["provider"],
        "model": manifest["model"],
        "quality": manifest["quality"],
        "outputFormat": manifest["outputFormat"],
        "semanticId": semantic_id,
        "productionId": None,
        "version": version,
        "exactPrompt": prompt,
        "promptPath": candidate["promptPath"],
        "promptSha256": candidate["promptSha256"],
        "references": references,
        "requestedSize": candidate["size"],
        "outputPath": str(destination.relative_to(world2_root)),
        "outputSha256": output_hash,
        "width": width,
        "height": height,
        "approvalState": "pending_parent_class_review",
        "integrationState": candidate["integrationState"],
        "createdAt": utc_now(),
    }
    write_immutable_json(record_path, record)
    print(
        json.dumps(
            {
                "event": "world2.asset.generation.completed",
                "semanticId": semantic_id,
                "outputSha256": output_hash,
                "width": width,
                "height": height,
            },
            separators=(",", ":"),
            sort_keys=True,
        ),
        flush=True,
    )
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    parser.add_argument(
        "--asset",
        action="append",
        dest="assets",
        help="Representative semantic ID; repeat to generate several",
    )
    args = parser.parse_args()
    world2_root = args.world2_root.resolve()
    manifest = read_json(world2_root / "generation-manifest.json")
    if not os.environ.get("OPENAI_API_KEY"):
        raise PipelineError("OPENAI_API_KEY is required in the environment")
    selected = args.assets or [
        value["semanticId"]
        for value in manifest.get("representativeCandidates", [])
        if value.get("state") == "ready_for_generation"
    ]
    if len(selected) != len(set(selected)):
        raise PipelineError("Duplicate --asset values are not allowed")
    try:
        from openai import OpenAI
    except ImportError as error:
        raise PipelineError("The OpenAI Python package is required") from error
    client = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        timeout=600,
        max_retries=2,
    )
    for semantic_id in selected:
        generate_one(
            client=client,
            world2_root=world2_root,
            manifest=manifest,
            candidate=candidate_by_id(manifest, semantic_id),
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(
            json.dumps(
                {
                    "event": "world2.asset.generation.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
