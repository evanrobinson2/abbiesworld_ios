#!/usr/bin/env python3
"""Import exact selected World 2 sources and prompts without weakening provenance."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    StructuredLogger,
    asset_spec,
    copy_immutable,
    load_inventory,
    read_json,
    sha256_bytes,
    sha256_file,
    write_json,
)


CANONICAL_IDS = (
    "1001A",
    "1001B",
    "1002",
    "1004",
    "1005",
    "1006",
    "1007",
    "1008",
    "1009",
)

SOURCE_URLS = {
    "1001A": "https://cdn.midjourney.com/35ee68dc-7235-4c1c-8f02-6cc4cdbba31c/0_2.jpeg",
    "1001B": "https://cdn.midjourney.com/ba0c159a-1795-4f8d-b4ec-aebe7bec4141/0_1.jpeg",
    "1002": "https://cdn.midjourney.com/8a291696-3315-462a-b5e9-12b763d458ba/0_1.jpeg",
    "1004": "https://cdn.midjourney.com/ba256ad8-3d8e-48b6-b5e3-96c9463c93a6/0_3.jpeg",
    "1005": "https://cdn.midjourney.com/8fadc992-8fb9-4bd8-8a7b-efcbc60257eb/0_2.jpeg",
    "1006": "https://cdn.midjourney.com/eb8a09b4-e18a-4723-9a90-2adb4362e2d7/0_2.jpeg",
    "1007": "https://www.midjourney.com/jobs/0a3e2665-f965-430d-9562-b5c89e27a4af?index=1",
    "1008": "https://cdn.midjourney.com/df43ada5-22e3-4575-8a74-4a50e3d71c79/0_1.jpeg",
    "1009": "https://cdn.midjourney.com/cf83c845-4799-4c62-ae2d-c5146b165a75/0_0.jpeg",
}


def parse_prompt_document(path: Path) -> dict[str, str]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise PipelineError(f"Prompt document is missing: {path}") from error
    headings = list(
        re.finditer(
            r"^##\s+(1001A|1001B|1002|1004|1005|1006|1007|1008|1009)\b.*$",
            text,
            re.MULTILINE,
        )
    )
    sections: dict[str, str] = {}
    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        section = text[match.end() : end]
        prompt_marker = re.search(r"^Prompt:\s*$", section, re.MULTILINE)
        if not prompt_marker:
            raise PipelineError(f"Prompt marker is missing for {match.group(1)}")
        prompt = section[prompt_marker.end() :].strip()
        if not prompt:
            raise PipelineError(f"Prompt text is empty for {match.group(1)}")
        sections[match.group(1)] = prompt + "\n"
    missing = sorted(set(CANONICAL_IDS) - set(sections))
    unexpected = sorted(set(sections) - set(CANONICAL_IDS))
    if missing or unexpected:
        raise PipelineError(
            f"Prompt document identity mismatch; missing={missing}, unexpected={unexpected}"
        )
    return sections


def source_file(source_dir: Path, asset_id: str) -> Path:
    matches = [
        path
        for suffix in (".png", ".jpg", ".jpeg", ".webp")
        for path in source_dir.glob(f"{asset_id}{suffix}")
    ]
    if len(matches) != 1:
        raise PipelineError(
            f"Expected exactly one source image for {asset_id} in {source_dir}; "
            f"found {[path.name for path in matches]}"
        )
    return matches[0]


def update_entry(
    entry: dict[str, Any],
    *,
    prompt_path: str,
    prompt_hash: str,
    candidate_path: str,
    candidate_hash: str,
    source_url: str,
) -> None:
    entry.update(
        {
            "promptPath": prompt_path,
            "promptSha256": prompt_hash,
            "candidatePath": candidate_path,
            "candidateSha256": candidate_hash,
            "sourceUrl": source_url,
            "sourceState": "imported_exact_hash",
        }
    )


def run(args: argparse.Namespace) -> int:
    logger = StructuredLogger()
    world2_root = args.world2_root.resolve()
    source_dir = args.source_dir.resolve()
    prompts = parse_prompt_document(args.prompt_document.resolve())
    inventory = load_inventory(world2_root)
    source_manifest = read_json(world2_root / "source-manifest.json")
    source_entries = {
        entry["productionId"]: entry for entry in source_manifest["assets"]
    }
    missing_foundation_ids = set(CANONICAL_IDS) - set(source_entries)
    if missing_foundation_ids:
        raise PipelineError(
            "source-manifest is missing foundation canonical IDs: "
            + ", ".join(sorted(missing_foundation_ids))
        )

    for asset_id in CANONICAL_IDS:
        spec = asset_spec(inventory, asset_id)
        if spec.get("status") != "canonical":
            raise PipelineError(f"{asset_id} is not declared canonical")
        prompt_text = prompts[asset_id]
        prompt_hash = sha256_bytes(prompt_text.encode("utf-8"))
        prompt_relative = f"prompts/{asset_id}/v1.txt"
        prompt_destination = world2_root / prompt_relative
        prompt_destination.parent.mkdir(parents=True, exist_ok=True)
        if prompt_destination.exists():
            existing_hash = sha256_file(prompt_destination)
            if existing_hash != prompt_hash:
                raise PipelineError(
                    f"Refusing to overwrite different exact prompt for {asset_id}"
                )
        else:
            prompt_destination.write_text(prompt_text, encoding="utf-8")

        source = source_file(source_dir, asset_id)
        candidate_relative = (
            f"candidates/{asset_id}/v1/source{source.suffix.lower()}"
        )
        candidate = world2_root / candidate_relative
        copy_immutable(source, candidate)
        candidate_hash = sha256_file(candidate)

        spec["prompt"] = {
            "state": "exact",
            "path": prompt_relative,
            "sha256": prompt_hash,
            "version": "v1",
        }
        spec["source"] = {
            "candidatePath": candidate_relative,
            "sha256": candidate_hash,
        }
        update_entry(
            source_entries[asset_id],
            prompt_path=prompt_relative,
            prompt_hash=prompt_hash,
            candidate_path=candidate_relative,
            candidate_hash=candidate_hash,
            source_url=SOURCE_URLS[asset_id],
        )
        logger.emit(
            "world2.asset.canonical_imported",
            assetId=asset_id,
            candidateSha256=candidate_hash,
            promptSha256=prompt_hash,
            candidatePath=candidate_relative,
        )

    write_json(world2_root / "inventory.json", inventory)
    write_json(world2_root / "source-manifest.json", source_manifest)
    logger.emit(
        "world2.asset.canonical_import.completed",
        importedCount=len(CANONICAL_IDS),
    )
    return 0


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    value.add_argument("--source-dir", type=Path, required=True)
    value.add_argument("--prompt-document", type=Path, required=True)
    return value


def main() -> int:
    try:
        return run(parser().parse_args())
    except PipelineError as error:
        StructuredLogger().emit(
            "world2.asset.canonical_import.failed",
            errorType=type(error).__name__,
            message=str(error),
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
