#!/usr/bin/env python3
"""Prepare the parent-requested Card Factory interior for fresh qualification."""

from __future__ import annotations

import copy
from io import BytesIO
import json
import sys

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    read_json,
    sha256_file,
    utc_now,
    write_immutable_json,
)
from repair_canonical import write_immutable_bytes


def main() -> int:
    try:
        from PIL import Image
        from PIL.PngImagePlugin import PngInfo
    except ImportError as error:
        raise PipelineError("Pillow is required for Card Factory preparation") from error

    root = DEFAULT_WORLD2_ROOT.resolve()
    prior_spec = read_json(root / "repairs" / "1009" / "v3" / "spec.json")
    source_path = root / prior_spec["source"]["candidatePath"]

    with Image.open(source_path) as opened:
        image = opened.copy()
    metadata = PngInfo()
    metadata.add_text(
        "World2ParentRequest",
        "1009-v4-carousel-history-drawer-background",
    )
    output = BytesIO()
    image.save(output, format="PNG", optimize=True, pnginfo=metadata)

    prompt_path = root / "prompts" / "1009" / "v4.txt"
    output_path = root / "repair-candidates" / "1009" / "v4" / "source.png"
    write_immutable_bytes(
        prompt_path,
        (root / prior_spec["prompt"]["path"]).read_bytes(),
    )
    write_immutable_bytes(output_path, output.getvalue())

    record = {
        "schemaVersion": 1,
        "provider": "local-deterministic",
        "model": "pillow-pixel-preserving-v1",
        "semanticId": "poi.cardFactory.interior",
        "productionId": "1009",
        "version": "v4",
        "promptPath": str(prompt_path.relative_to(root)),
        "promptSha256": sha256_file(prompt_path),
        "inputPath": str(source_path.relative_to(root)),
        "inputSha256": sha256_file(source_path),
        "outputPath": str(output_path.relative_to(root)),
        "outputSha256": sha256_file(output_path),
        "transformation": {
            "kind": "pixelPreservingParentRequestedReencode",
            "pixelContentChanged": False,
            "reason": "Re-qualify against the clarified code-overlay contract.",
        },
        "approvalState": "pending_parent_review",
        "integrationState": "blocked_until_qualified_and_parent_approved",
        "createdAt": utc_now(),
    }
    write_immutable_json(root / "generation-runs" / "1009" / "v4.json", record)

    spec = copy.deepcopy(prior_spec)
    spec["prompt"] = {
        "state": "exact",
        "path": record["promptPath"],
        "sha256": record["promptSha256"],
        "version": "v4",
    }
    spec["source"] = {
        "candidatePath": record["outputPath"],
        "sha256": record["outputSha256"],
    }
    write_immutable_json(root / "repairs" / "1009" / "v4" / "spec.json", spec)

    print(
        json.dumps(
            {
                "event": "world2.asset.card_factory.parent_request_prepared",
                "assetId": "1009",
                "version": "v4",
                "outputSha256": record["outputSha256"],
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
                    "event": "world2.asset.card_factory.parent_request_failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
