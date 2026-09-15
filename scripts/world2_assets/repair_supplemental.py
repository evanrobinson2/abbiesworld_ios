#!/usr/bin/env python3
"""Create one v2 repair for failed representative P0 asset classes."""

from __future__ import annotations

import argparse
import base64
import copy
import json
import os
from pathlib import Path
import re
import sys
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    asset_spec,
    load_inventory,
    read_json,
    safe_name,
    sha256_bytes,
    sha256_file,
    utc_now,
    write_immutable_json,
)


TARGETS = (
    "ingredient.board.creature",
    "decoration.jukebox.starter",
    "card.frame.common",
)


def write_immutable_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != data:
            raise PipelineError(f"Immutable supplemental repair differs: {path}")
        return
    with path.open("xb") as handle:
        handle.write(data)


def revised_prompt(base: str, note: str) -> tuple[str, str]:
    without_flag, count = re.subn(r"\s+--ar\s+\d+:\d+\s*$", "", base.strip())
    if count != 1:
        raise PipelineError("Supplemental prompt requires one trailing --ar flag")
    ratio = re.search(r"--ar\s+(\d+:\d+)\s*$", base.strip())
    assert ratio
    exact = (
        without_flag
        + "\n\nREPAIR V2 — constrained revision from multimodal qualification:\n"
        + note
        + f"\n\n--ar {ratio.group(1)}\n"
    )
    transport = re.sub(r"\s+--ar\s+\d+:\d+\s*$", "", exact.strip())
    return exact, transport


def remove_checkerboard(data: bytes, include_center: bool) -> tuple[bytes, dict[str, Any]]:
    try:
        from PIL import Image
    except ImportError as error:
        raise PipelineError("Pillow is required for alpha cleanup") from error
    from io import BytesIO

    image = Image.open(BytesIO(data)).convert("RGBA")
    width, height = image.size
    pixels = image.load()

    def removable(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return max(red, green, blue) - min(red, green, blue) <= 12 and min(
            red, green, blue
        ) >= 170

    seeds = [
        *((x, 0) for x in range(width)),
        *((x, height - 1) for x in range(width)),
        *((0, y) for y in range(height)),
        *((width - 1, y) for y in range(height)),
    ]
    if include_center:
        seeds.append((width // 2, height // 2))
    pending = [point for point in seeds if removable(*point)]
    visited: set[tuple[int, int]] = set(pending)
    while pending:
        x, y = pending.pop()
        for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            nx, ny = neighbor
            if (
                0 <= nx < width
                and 0 <= ny < height
                and neighbor not in visited
                and removable(nx, ny)
            ):
                visited.add(neighbor)
                pending.append(neighbor)
    for x, y in visited:
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue(), {
        "kind": "connectedNeutralCheckerboardToAlpha",
        "inputSha256": sha256_bytes(data),
        "removedPixelCount": len(visited),
        "centerRegionIncluded": include_center,
        "outputDimensions": [width, height],
    }


def finish_record(
    root: Path,
    base: dict[str, Any],
    semantic_id: str,
    exact_prompt: str,
    output: bytes,
    generation: dict[str, Any],
) -> None:
    prompt_path = root / "prompts" / "generated" / semantic_id / "v2.txt"
    candidate_path = root / "generated-candidates" / semantic_id / "v2" / "source.png"
    record_path = root / "generation-runs" / semantic_id / "v2.json"
    spec_path = root / "repairs" / semantic_id / "v2" / "spec.json"
    write_immutable_bytes(prompt_path, exact_prompt.encode("utf-8"))
    write_immutable_bytes(candidate_path, output)
    prompt_hash = sha256_file(prompt_path)
    output_hash = sha256_file(candidate_path)
    record = {
        "schemaVersion": 1,
        "provider": "OpenAI",
        "model": generation["model"],
        "quality": "high",
        "outputFormat": "png",
        "semanticId": semantic_id,
        "productionId": None,
        "version": "v2",
        "exactPrompt": exact_prompt,
        "promptPath": str(prompt_path.relative_to(root)),
        "promptSha256": prompt_hash,
        "references": generation.get("references", []),
        "outputPath": str(candidate_path.relative_to(root)),
        "outputSha256": output_hash,
        "repair": generation["repair"],
        "approvalState": "pending_parent_class_review",
        "integrationState": "blocked_until_qualified_parent_approved_and_id_assigned",
        "createdAt": utc_now(),
    }
    write_immutable_json(record_path, record)
    spec = copy.deepcopy(base)
    spec["status"] = "supplemental_repair"
    spec["prompt"] = {
        "state": "exact",
        "path": record["promptPath"],
        "sha256": prompt_hash,
        "version": "v2",
    }
    spec["source"] = {
        "candidatePath": record["outputPath"],
        "sha256": output_hash,
    }
    write_immutable_json(spec_path, spec)
    print(
        json.dumps(
            {
                "event": "world2.asset.supplemental_repair.completed",
                "assetId": semantic_id,
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
    parser.add_argument("--asset", action="append", choices=TARGETS)
    args = parser.parse_args()
    root = args.world2_root.resolve()
    inventory = load_inventory(root)
    selected = args.asset or list(TARGETS)
    client = None
    for semantic_id in selected:
        base = asset_spec(inventory, semantic_id)
        prior = read_json(root / "generation-runs" / semantic_id / "v1.json")
        source_path = root / prior["outputPath"]
        base_prompt = (root / base["prompt"]["path"]).read_text(encoding="utf-8")
        if semantic_id == "ingredient.board.creature":
            if not os.environ.get("OPENAI_API_KEY"):
                raise PipelineError("OPENAI_API_KEY is required for ingredient repair")
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
            exact, transport = revised_prompt(
                base_prompt,
                "Preserve the exact subjects, grid, palette, gutters, and extraction "
                "padding. Replace oversized heads, huge eyes, and compressed bodies "
                "with natural compact storybook proportions and moderate expressive "
                "eyes. Keep every creature friendly, sophisticated, and clearly not chibi.",
            )
            with source_path.open("rb") as image:
                try:
                    response = client.images.edit(
                        model=prior["model"],
                        image=image,
                        prompt=transport,
                        size="1024x1024",
                        quality="high",
                        output_format="png",
                        n=1,
                    )
                except Exception as error:
                    raise PipelineError(
                        "Ingredient-board repair request failed: "
                        f"{type(error).__name__}"
                    ) from error
            encoded = response.data[0].b64_json
            if not encoded:
                raise PipelineError("OpenAI returned no ingredient repair")
            output = base64.b64decode(encoded)
            repair = {
                "kind": "referenceImageEdit",
                "inputSha256": sha256_file(source_path),
                "transportPromptSha256": sha256_bytes(transport.encode("utf-8")),
            }
        else:
            exact, _ = revised_prompt(
                base_prompt,
                "Preserve the approved visible design exactly. Replace the baked gray "
                "and white checkerboard with true transparent alpha, including the "
                "enclosed image window where present. Do not redesign, add, or remove "
                "foreground artwork.",
            )
            output, repair = remove_checkerboard(
                source_path.read_bytes(),
                include_center=semantic_id == "card.frame.common",
            )
        finish_record(
            root,
            base,
            semantic_id,
            exact,
            output,
            {
                "model": prior["model"],
                "references": prior.get("references", []),
                "repair": repair,
            },
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(
            json.dumps(
                {
                    "event": "world2.asset.supplemental_repair.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
