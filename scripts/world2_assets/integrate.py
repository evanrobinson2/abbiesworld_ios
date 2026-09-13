#!/usr/bin/env python3
"""Integrate only live-qualified, exact-hash, parent-approved World 2 assets."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

from common import (
    DEFAULT_ASSET_CATALOG,
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    StructuredLogger,
    asset_spec,
    latest_parent_decision,
    load_inventory,
    read_json,
    safe_name,
    sha256_file,
    utc_now,
    write_json,
)


def qualification_for(
    world2_root: Path,
    asset_id: str,
    derivative_hash: str,
    source_hash: str,
) -> dict[str, Any]:
    path = (
        world2_root
        / "qualification"
        / safe_name(asset_id)
        / derivative_hash
        / "qualification.json"
    )
    qualification = read_json(path)
    expected = {
        "assetId": asset_id,
        "subjectKind": "runtime_derivative",
        "sha256": derivative_hash,
        "sourceSha256": source_hash,
        "automatedDecision": "qualified",
    }
    mismatches = [
        key for key, value in expected.items() if qualification.get(key) != value
    ]
    if mismatches:
        raise PipelineError(
            f"Qualification evidence does not match exact derivative ({', '.join(mismatches)}): {path}"
        )
    evaluator = qualification.get("evaluator", {})
    if (
        evaluator.get("mode") != "live"
        or evaluator.get("provider") != "openai"
        or not evaluator.get("model")
    ):
        raise PipelineError(
            f"Production integration requires live OpenAI evaluation: {path}"
        )
    approval = latest_parent_decision(world2_root, asset_id, derivative_hash)
    if not approval or approval.get("parentDecision") != "approved":
        raise PipelineError(
            f"Exact derivative lacks current parent approval: {asset_id} {derivative_hash}"
        )
    if (
        approval.get("sha256") != derivative_hash
        or approval.get("assetId") != asset_id
        or approval.get("confirmedByParent") is not True
    ):
        raise PipelineError(
            f"Parent approval evidence does not match exact derivative: {asset_id}"
        )
    return qualification


def metadata_candidates(world2_root: Path, asset_id: str | None) -> list[Path]:
    base = world2_root / "derivatives"
    if asset_id:
        return sorted((base / safe_name(asset_id)).glob("*/transformation.json"))
    return sorted(base.glob("*/*/transformation.json"))


def catalog_name(asset_id: str, semantic_id: str) -> str:
    return safe_name(f"world2_{asset_id}_{semantic_id.replace('.', '_')}")


def build_imageset(
    staging_root: Path,
    name: str,
    source: Path,
    derivative_hash: str,
) -> tuple[Path, str]:
    imageset = staging_root / f"{name}.imageset"
    imageset.mkdir(parents=True)
    filename = f"{name}-{derivative_hash[:12]}.png"
    shutil.copyfile(source, imageset / filename)
    if sha256_file(imageset / filename) != derivative_hash:
        raise PipelineError("Copied app asset bytes do not match approved derivative hash")
    write_json(
        imageset / "Contents.json",
        {
            "images": [
                {
                    "filename": filename,
                    "idiom": "universal",
                    "scale": "1x",
                },
                {"idiom": "universal", "scale": "2x"},
                {"idiom": "universal", "scale": "3x"},
            ],
            "info": {"author": "world2-assets-pipeline", "version": 1},
            "properties": {"preserves-vector-representation": False},
        },
    )
    return imageset, filename


def replace_directory(source: Path, destination: Path) -> None:
    backup = destination.with_name(f".{destination.name}.backup.{os.getpid()}")
    if backup.exists():
        shutil.rmtree(backup)
    if destination.exists():
        os.replace(destination, backup)
    try:
        os.replace(source, destination)
    except Exception:
        if backup.exists() and not destination.exists():
            os.replace(backup, destination)
        raise
    if backup.exists():
        shutil.rmtree(backup)


def integrate(args: argparse.Namespace) -> int:
    logger = StructuredLogger()
    world2_root = args.world2_root.resolve()
    catalog = args.asset_catalog.resolve()
    if not catalog.is_dir() or catalog.suffix != ".xcassets":
        raise PipelineError(f"Xcode asset catalog is missing or invalid: {catalog}")
    inventory = load_inventory(world2_root)
    if args.asset_id:
        asset_spec(inventory, args.asset_id)
    candidates = metadata_candidates(world2_root, args.asset_id)
    if not candidates:
        raise PipelineError("No runtime derivative metadata found to integrate")

    selected: list[dict[str, Any]] = []
    failures: list[str] = []
    for metadata_path in candidates:
        metadata = read_json(metadata_path)
        asset_id = str(metadata.get("assetId", ""))
        try:
            spec = asset_spec(inventory, asset_id)
            if spec.get("status") != "canonical" or not spec.get("productionId"):
                raise PipelineError(
                    "Supplemental candidates cannot integrate until a production ID "
                    "is assigned in the approved inventory"
                )
            runtime_path = (
                world2_root / str(metadata.get("runtimePath", ""))
            ).resolve()
            if world2_root.resolve() not in runtime_path.parents:
                raise PipelineError("Derivative runtimePath escapes World 2 root")
            derivative_hash = str(metadata.get("derivativeSha256", ""))
            source_hash = str(metadata.get("sourceSha256", ""))
            if (
                not runtime_path.is_file()
                or len(derivative_hash) != 64
                or sha256_file(runtime_path) != derivative_hash
            ):
                raise PipelineError(
                    f"Runtime derivative is missing or hash-mismatched: {metadata_path}"
                )
            qualification = qualification_for(
                world2_root, asset_id, derivative_hash, source_hash
            )
            selected.append(
                {
                    "assetId": asset_id,
                    "semanticId": spec["semanticId"],
                    "version": metadata["version"],
                    "sourceSha256": source_hash,
                    "derivativeSha256": derivative_hash,
                    "runtimePath": runtime_path,
                    "promptSha256": qualification["promptSha256"],
                    "evaluator": qualification["evaluator"],
                }
            )
        except PipelineError as error:
            failures.append(f"{metadata_path}: {error}")
            logger.emit(
                "world2.asset.integration.skipped",
                metadataPath=str(metadata_path),
                reason=str(error),
            )
    if not selected:
        detail = f" ({'; '.join(failures)})" if failures else ""
        raise PipelineError(f"No eligible approved derivatives found{detail}")
    selected_ids = [item["assetId"] for item in selected]
    ambiguous = sorted(
        asset_id for asset_id in set(selected_ids) if selected_ids.count(asset_id) > 1
    )
    if ambiguous:
        raise PipelineError(
            "Multiple approved derivatives are eligible for the same asset; append a "
            f"parent rejection for superseded hashes before integration: {ambiguous}"
        )

    existing_entries: dict[str, dict[str, Any]] = {}
    runtime_manifest_path = (
        catalog / "world2_runtime_manifest.dataset" / "world2_runtime_manifest.json"
    )
    if runtime_manifest_path.exists():
        existing = read_json(runtime_manifest_path)
        existing_entries = {
            entry["assetId"]: entry for entry in existing.get("assets", [])
        }
        if len(existing_entries) != len(existing.get("assets", [])):
            raise PipelineError("Existing runtime manifest contains duplicate asset IDs")
        for existing_entry in existing_entries.values():
            existing_id = str(existing_entry.get("assetId", ""))
            if existing_id in selected_ids:
                continue
            existing_hash = str(existing_entry.get("derivativeSha256", ""))
            existing_source_hash = str(existing_entry.get("sourceSha256", ""))
            existing_name = str(existing_entry.get("assetCatalogName", ""))
            existing_filename = str(existing_entry.get("filename", ""))
            existing_image = (
                catalog / f"{existing_name}.imageset" / existing_filename
            )
            if (
                not existing_image.is_file()
                or sha256_file(existing_image) != existing_hash
            ):
                raise PipelineError(
                    f"Existing integrated asset is missing or changed: {existing_id}"
                )
            qualification_for(
                world2_root, existing_id, existing_hash, existing_source_hash
            )

    with tempfile.TemporaryDirectory(prefix="world2-integrate-", dir=catalog) as temp:
        staging_root = Path(temp)
        for item in selected:
            name = catalog_name(item["assetId"], item["semanticId"])
            imageset, filename = build_imageset(
                staging_root,
                name,
                item["runtimePath"],
                item["derivativeSha256"],
            )
            replace_directory(imageset, catalog / imageset.name)
            existing_entries[item["assetId"]] = {
                "assetId": item["assetId"],
                "semanticId": item["semanticId"],
                "assetCatalogName": name,
                "filename": filename,
                "version": item["version"],
                "sourceSha256": item["sourceSha256"],
                "derivativeSha256": item["derivativeSha256"],
                "promptSha256": item["promptSha256"],
                "evaluator": item["evaluator"],
            }
            logger.emit(
                "world2.asset.integration.copied",
                assetId=item["assetId"],
                derivativeSha256=item["derivativeSha256"],
                assetCatalogName=name,
            )

    manifest = {
        "schemaVersion": 1,
        "generatedAt": utc_now(),
        "assets": sorted(existing_entries.values(), key=lambda item: item["assetId"]),
    }
    manifest_dataset = catalog / "world2_runtime_manifest.dataset"
    manifest_dataset.mkdir(parents=True, exist_ok=True)
    write_json(runtime_manifest_path, manifest)
    write_json(
        manifest_dataset / "Contents.json",
        {
            "data": [
                {
                    "filename": "world2_runtime_manifest.json",
                    "idiom": "universal",
                }
            ],
            "info": {"author": "world2-assets-pipeline", "version": 1},
        },
    )
    write_json(world2_root / "integrated-manifest.json", manifest)
    logger.emit(
        "world2.asset.integration.completed",
        integratedCount=len(selected),
        manifestAssetCount=len(manifest["assets"]),
        manifestPath=str(runtime_manifest_path),
    )
    return 0


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    value.add_argument("--asset-catalog", type=Path, default=DEFAULT_ASSET_CATALOG)
    value.add_argument("--asset-id", help="integrate one exact production ID")
    return value


def main() -> int:
    try:
        return integrate(parser().parse_args())
    except PipelineError as error:
        StructuredLogger().emit(
            "world2.asset.integration.failed",
            errorType=type(error).__name__,
            message=str(error),
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
