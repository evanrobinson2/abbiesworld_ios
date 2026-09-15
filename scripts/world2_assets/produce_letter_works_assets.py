#!/usr/bin/env python3
"""Produce canonical Work Land and Letter Works candidates with provenance."""

from __future__ import annotations

import argparse
import base64
import copy
from contextlib import ExitStack
from pathlib import Path
import sys
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    read_json,
    sha256_file,
    utc_now,
    write_json,
    write_immutable_json,
)
from generate import decode_image_response
from prepare_requested_media import remove_clean_background_and_center
from repair_canonical import crop_to_ratio, write_immutable_bytes


def prompt_metadata(root: Path, asset_id: str) -> dict[str, Any]:
    path = root / "prompts" / asset_id / "v1.txt"
    if not path.is_file():
        raise PipelineError(f"Missing exact prompt: {path}")
    return {
        "state": "exact",
        "path": str(path.relative_to(root)),
        "sha256": sha256_file(path),
        "version": "v1",
    }


def generation_record(
    *,
    root: Path,
    asset_id: str,
    semantic_id: str,
    prompt: dict[str, Any],
    output_path: Path,
    provider: str,
    model: str,
    references: list[dict[str, str]],
    requested_size: str,
    transformation: dict[str, Any],
) -> None:
    record_path = root / "generation-runs" / asset_id / "v1.json"
    record = {
        "schemaVersion": 1,
        "provider": provider,
        "model": model,
        "quality": "high" if provider == "OpenAI" else "deterministic",
        "outputFormat": "png",
        "semanticId": semantic_id,
        "productionId": asset_id,
        "version": "v1",
        "exactPrompt": (root / prompt["path"]).read_text(encoding="utf-8"),
        "promptPath": prompt["path"],
        "promptSha256": prompt["sha256"],
        "references": references,
        "requestedSize": requested_size,
        "outputPath": str(output_path.relative_to(root)),
        "outputSha256": sha256_file(output_path),
        "transformation": transformation,
        "approvalState": "pending_parent_review",
        "integrationState": "blocked_until_qualified_and_parent_approved",
        "createdAt": utc_now(),
    }
    if record_path.exists():
        existing = read_json(record_path)
        comparable = copy.deepcopy(record)
        comparable["createdAt"] = existing.get("createdAt")
        if existing != comparable:
            raise PipelineError(f"Immutable generation record differs: {record_path}")
        return
    write_immutable_json(record_path, record)


def generate_reference_locked(
    *,
    client: Any,
    root: Path,
    model: str,
    asset_id: str,
    semantic_id: str,
    reference_paths: list[Path],
    size: str,
    ratio: float,
) -> tuple[Path, dict[str, Any], list[dict[str, str]]]:
    prompt = prompt_metadata(root, asset_id)
    destination = root / "normalized-candidates" / asset_id / "v1" / "source.png"
    references = [
        {
            "path": str(path.relative_to(root)),
            "sha256": sha256_file(path),
        }
        for path in reference_paths
    ]
    if destination.exists():
        transformation = read_json(
            root / "generation-runs" / asset_id / "v1.json"
        )["transformation"]
        return destination, transformation, references

    with ExitStack() as stack:
        images = [stack.enter_context(path.open("rb")) for path in reference_paths]
        response = client.images.edit(
            model=model,
            image=images,
            prompt=(root / prompt["path"]).read_text(encoding="utf-8"),
            size=size,
            quality="high",
            output_format="png",
            n=1,
        )
    generated = decode_image_response(response)
    normalized, transformation = crop_to_ratio(generated, ratio)
    write_immutable_bytes(destination, normalized)
    generation_record(
        root=root,
        asset_id=asset_id,
        semantic_id=semantic_id,
        prompt=prompt,
        output_path=destination,
        provider="OpenAI",
        model=model,
        references=references,
        requested_size=size,
        transformation=transformation,
    )
    return destination, transformation, references


def qualification(
    *,
    intended_screen: str,
    must_show: list[str],
    must_not_show: list[str],
    references: list[str],
    safe_zones: list[str],
    alpha: str,
    expected_ratio: float,
    minimum_width: int,
    minimum_height: int,
    use_size: dict[str, Any],
) -> dict[str, Any]:
    return {
        "alphaContract": alpha,
        "audience": "smart six-year-old using an iPad",
        "expectedEmbellishmentAreas": [],
        "fileContract": {
            "aspectRatioTolerance": 0.03,
            "expectedAspectRatio": expected_ratio,
            "formats": ["PNG"],
            "minimumHeight": minimum_height,
            "minimumWidth": minimum_width,
        },
        "intendedScreen": intended_screen,
        "maximumRepairAttempts": 2,
        "mustNotShow": must_not_show,
        "mustShow": must_show,
        "references": references,
        "safeZones": safe_zones,
        "transformation": {
            "kind": "optimize",
            "maxDimension": 2048,
            "outputFormat": "PNG",
            "preserveAlpha": True,
        },
        "useSizes": [use_size],
    }


def canonical_entry(
    *,
    asset_id: str,
    semantic_id: str,
    source: Path,
    root: Path,
    qualification_spec: dict[str, Any],
) -> dict[str, Any]:
    return {
        "productionId": asset_id,
        "prompt": prompt_metadata(root, asset_id),
        "qualification": qualification_spec,
        "semanticId": semantic_id,
        "source": {
            "candidatePath": str(source.relative_to(root)),
            "sha256": sha256_file(source),
        },
        "status": "canonical",
    }


def update_inventory(root: Path, entries: list[dict[str, Any]]) -> None:
    path = root / "inventory.json"
    inventory = read_json(path)
    by_id = {
        entry.get("productionId"): entry
        for entry in inventory["assets"]
        if entry.get("productionId")
    }
    for entry in entries:
        existing = by_id.get(entry["productionId"])
        if existing is not None and existing != entry:
            raise PipelineError(
                f"Inventory entry differs for {entry['productionId']}"
            )
        if existing is None:
            inventory["assets"].append(entry)
    write_json(path, inventory)


def update_source_manifest(
    root: Path,
    entries: list[dict[str, Any]],
    source_urls: dict[str, str],
) -> None:
    path = root / "source-manifest.json"
    manifest = read_json(path)
    by_id = {
        entry.get("productionId"): entry
        for entry in manifest["assets"]
        if entry.get("productionId")
    }
    for entry in entries:
        asset_id = entry["productionId"]
        source_entry = {
            "candidatePath": entry["source"]["candidatePath"],
            "candidateSha256": entry["source"]["sha256"],
            "productionId": asset_id,
            "promptPath": entry["prompt"]["path"],
            "promptSha256": entry["prompt"]["sha256"],
            "sourceState": "imported_exact_hash",
            "sourceUrl": source_urls[asset_id],
        }
        existing = by_id.get(asset_id)
        if existing is not None and existing != source_entry:
            raise PipelineError(f"Source manifest entry differs for {asset_id}")
        if existing is None:
            manifest["assets"].append(source_entry)
    write_json(path, manifest)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exterior", type=Path, required=True)
    parser.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    args = parser.parse_args()
    root = args.world2_root.resolve()
    if not args.exterior.is_file():
        raise PipelineError(f"Selected exterior is missing: {args.exterior}")

    raw_exterior = root / "user-supplied" / "2002" / "v1" / "source.png"
    write_immutable_bytes(raw_exterior, args.exterior.read_bytes())
    normalized_exterior = (
        root / "normalized-candidates" / "2002" / "v1" / "source.png"
    )
    exterior_bytes, exterior_transformation = remove_clean_background_and_center(
        raw_exterior.read_bytes()
    )
    write_immutable_bytes(normalized_exterior, exterior_bytes)
    exterior_prompt = prompt_metadata(root, "2002")
    generation_record(
        root=root,
        asset_id="2002",
        semantic_id="poi.letterWorks.exterior",
        prompt=exterior_prompt,
        output_path=normalized_exterior,
        provider="local-deterministic",
        model="pillow-clean-matte-v1",
        references=[
            {
                "path": str(raw_exterior.relative_to(root)),
                "sha256": sha256_file(raw_exterior),
            }
        ],
        requested_size="1024x1024",
        transformation=exterior_transformation,
    )

    try:
        from openai import OpenAI
    except ImportError as error:
        raise PipelineError("The openai package is required") from error
    generation_manifest = read_json(root / "generation-manifest.json")
    model = str(generation_manifest["model"])
    client = OpenAI()

    home_map = root / "candidates" / "1002" / "v1" / "source.jpeg"
    factory_interior = root / "candidates" / "1009" / "v1" / "source.jpeg"
    work_map, _, _ = generate_reference_locked(
        client=client,
        root=root,
        model=model,
        asset_id="2001",
        semantic_id="map.workLand",
        reference_paths=[home_map, raw_exterior],
        size="1536x1024",
        ratio=4 / 3,
    )
    letter_interior, _, _ = generate_reference_locked(
        client=client,
        root=root,
        model=model,
        asset_id="2003",
        semantic_id="poi.letterWorks.interior",
        reference_paths=[raw_exterior, factory_interior],
        size="1536x1024",
        ratio=16 / 9,
    )

    entries = [
        canonical_entry(
            asset_id="2001",
            semantic_id="map.workLand",
            source=work_map,
            root=root,
            qualification_spec=qualification(
                intended_screen="Work Land overland map",
                must_show=[
                    "A compact whimsical concrete-jungle biome",
                    "Exactly one clean empty Letter Works placement pad",
                ],
                must_not_show=[
                    "Characters, readable text, UI, frightening imagery, or a building occupying the reserved pad",
                ],
                references=["1002", "2002"],
                safe_zones=[
                    "Keep the single central POI pad and upper HUD region readable",
                ],
                alpha="allowed",
                expected_ratio=4 / 3,
                minimum_width=1024,
                minimum_height=768,
                use_size={"height": 768, "name": "fullScreen4x3", "width": 1024},
            ),
        ),
        canonical_entry(
            asset_id="2002",
            semantic_id="poi.letterWorks.exterior",
            source=normalized_exterior,
            root=root,
            qualification_spec=qualification(
                intended_screen="Work Land Letter Works POI",
                must_show=[
                    "The complete parent-selected canonical building with a clear entrance",
                    "A centered readable tappable silhouette",
                ],
                must_not_show=[
                    "Opaque outer background, characters, readable text, UI, branding, or frightening imagery",
                ],
                references=["2001"],
                safe_zones=["Keep the building silhouette and entrance readable"],
                alpha="required",
                expected_ratio=1,
                minimum_width=1024,
                minimum_height=1024,
                use_size={"height": 260, "name": "mapPOI", "width": 320},
            ),
        ),
        canonical_entry(
            asset_id="2003",
            semantic_id="poi.letterWorks.interior",
            source=letter_interior,
            root=root,
            qualification_spec=qualification(
                intended_screen="Save the Vowels falling-target playfield",
                must_show=[
                    "An enclosed Letter Works sorting room with visible walls and ceiling",
                    "Large overhead hoppers or receptacles that visibly explain falling letters",
                    "A broad open central play area and readable collection machinery",
                ],
                must_not_show=[
                    "Characters, readable text, authored UI, frightening machinery, or a cluttered central playfield",
                ],
                references=["2002", "1009"],
                safe_zones=[
                    "Keep the central falling-letter field, top timer, and bottom collection tank readable",
                ],
                alpha="allowed",
                expected_ratio=16 / 9,
                minimum_width=1280,
                minimum_height=720,
                use_size={"height": 720, "name": "fullScreen16x9", "width": 1280},
            ),
        ),
    ]
    update_inventory(root, entries)
    update_source_manifest(
        root,
        entries,
        {
            "2001": "openai://generation-runs/2001/v1",
            "2002": (
                "https://cdn.midjourney.com/"
                "ec3b8000-7479-4fef-830b-183151ba9fe2/0_2.png"
            ),
            "2003": "openai://generation-runs/2003/v1",
        },
    )
    for entry in entries:
        print(
            f"{entry['productionId']} {entry['semanticId']} "
            f"{entry['source']['sha256']}"
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
