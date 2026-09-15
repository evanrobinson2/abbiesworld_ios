#!/usr/bin/env python3
"""Fail CI when an integrated World 2 asset loses exact qualification or approval."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from common import (
    DEFAULT_ASSET_CATALOG,
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    StructuredLogger,
    asset_spec,
    load_inventory,
    read_json,
    sha256_file,
)
from integrate import qualification_for


def derivative_metadata(
    world2_root: Path, asset_id: str, derivative_hash: str
) -> dict[str, Any]:
    matches: list[dict[str, Any]] = []
    for path in (world2_root / "derivatives" / asset_id).glob(
        "*/transformation.json"
    ):
        value = read_json(path)
        if value.get("derivativeSha256") == derivative_hash:
            value["_metadataPath"] = str(path)
            matches.append(value)
    if len(matches) != 1:
        raise PipelineError(
            f"Expected exactly one derivative metadata record for {asset_id} "
            f"{derivative_hash}, found {len(matches)}"
        )
    return matches[0]


def verify(args: argparse.Namespace) -> int:
    logger = StructuredLogger()
    world2_root = args.world2_root.resolve()
    catalog = args.asset_catalog.resolve()
    inventory = load_inventory(world2_root)
    runtime_manifest_path = (
        catalog / "world2_runtime_manifest.dataset" / "world2_runtime_manifest.json"
    )
    manifest = read_json(runtime_manifest_path)
    mirror = read_json(world2_root / "integrated-manifest.json")
    if manifest != mirror:
        raise PipelineError(
            "App runtime manifest differs from AssetSources evidence mirror"
        )
    if manifest.get("schemaVersion") != 1 or not isinstance(
        manifest.get("assets"), list
    ):
        raise PipelineError("Runtime manifest must use schemaVersion 1 and contain assets")
    if not manifest["assets"]:
        raise PipelineError("Runtime manifest cannot be empty")
    asset_ids = [entry.get("assetId") for entry in manifest["assets"]]
    catalog_names = [entry.get("assetCatalogName") for entry in manifest["assets"]]
    if len(asset_ids) != len(set(asset_ids)) or len(catalog_names) != len(
        set(catalog_names)
    ):
        raise PipelineError("Runtime manifest contains duplicate asset IDs or names")

    expected_imagesets: set[str] = set()
    for entry in manifest["assets"]:
        asset_id = str(entry.get("assetId", ""))
        spec = asset_spec(inventory, asset_id)
        if entry.get("semanticId") != spec.get("semanticId"):
            raise PipelineError(f"Semantic ID mismatch for integrated asset {asset_id}")
        derivative_hash = str(entry.get("derivativeSha256", ""))
        source_hash = str(entry.get("sourceSha256", ""))
        name = str(entry.get("assetCatalogName", ""))
        filename = str(entry.get("filename", ""))
        imageset = catalog / f"{name}.imageset"
        image_path = imageset / filename
        expected_imagesets.add(imageset.name)
        if not image_path.is_file():
            raise PipelineError(f"Integrated image is missing: {image_path}")
        actual_hash = sha256_file(image_path)
        if actual_hash != derivative_hash:
            raise PipelineError(
                f"Integrated bytes changed for {asset_id}; expected "
                f"{derivative_hash}, found {actual_hash}"
            )
        contents = read_json(imageset / "Contents.json")
        filenames = [
            image.get("filename")
            for image in contents.get("images", [])
            if image.get("filename")
        ]
        if filenames != [filename]:
            raise PipelineError(f"Imageset metadata is not exact for {asset_id}")
        qualification = qualification_for(
            world2_root, asset_id, derivative_hash, source_hash
        )
        if entry.get("promptSha256") != qualification.get("promptSha256"):
            raise PipelineError(f"Prompt hash mismatch for integrated asset {asset_id}")
        if entry.get("evaluator") != qualification.get("evaluator"):
            raise PipelineError(f"Evaluator provenance mismatch for {asset_id}")
        metadata = derivative_metadata(world2_root, asset_id, derivative_hash)
        runtime_source = (
            world2_root / str(metadata.get("runtimePath", ""))
        ).resolve()
        if not runtime_source.is_file() or sha256_file(runtime_source) != derivative_hash:
            raise PipelineError(
                f"Approved derivative source is missing or changed for {asset_id}"
            )
        logger.emit(
            "world2.asset.integrated.verified",
            assetId=asset_id,
            derivativeSha256=derivative_hash,
            assetCatalogName=name,
        )

    actual_imagesets = {
        path.name for path in catalog.glob("world2_*.imageset") if path.is_dir()
    }
    unexpected = sorted(actual_imagesets - expected_imagesets)
    missing = sorted(expected_imagesets - actual_imagesets)
    if unexpected or missing:
        raise PipelineError(
            f"World 2 catalog/manifest mismatch; unexpected={unexpected}, missing={missing}"
        )
    logger.emit(
        "world2.asset.integration.verified",
        verifiedCount=len(manifest["assets"]),
        manifestPath=str(runtime_manifest_path),
    )
    return 0


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    value.add_argument("--asset-catalog", type=Path, default=DEFAULT_ASSET_CATALOG)
    return value


def main() -> int:
    try:
        return verify(parser().parse_args())
    except PipelineError as error:
        StructuredLogger().emit(
            "world2.asset.integration_verification.failed",
            errorType=type(error).__name__,
            message=str(error),
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
