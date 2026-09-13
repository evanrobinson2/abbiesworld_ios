#!/usr/bin/env python3
"""Emit a compact JSON status report for every World 2 asset gate."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import (
    DEFAULT_WORLD2_ROOT,
    latest_parent_decision,
    load_inventory,
    read_json,
    safe_name,
)


def optional_json(path: Path) -> dict | None:
    return read_json(path) if path.is_file() else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    args = parser.parse_args()
    root = args.world2_root.resolve()
    inventory = load_inventory(root)
    assets = []
    for spec in inventory["assets"]:
        if spec["status"] == "reserved":
            assets.append(
                {
                    "assetId": spec["productionId"],
                    "semanticId": spec["semanticId"],
                    "status": "reserved",
                }
            )
            continue
        identity = spec.get("productionId") or spec["semanticId"]
        versions = [spec]
        versions.extend(
            read_json(path)
            for path in sorted(
                (root / "repairs" / safe_name(identity)).glob("v*/spec.json")
            )
        )
        current_spec = sorted(
            versions,
            key=lambda value: int(
                str(value.get("prompt", {}).get("version", "v0")).removeprefix("v")
            ),
        )[-1]
        candidate_version = current_spec.get("prompt", {}).get("version", "v1")
        source_hash = current_spec.get("source", {}).get("sha256")
        source = optional_json(
            root
            / "qualification"
            / safe_name(identity)
            / str(source_hash)
            / "source-qualification.json"
        )
        transformation_path = (
            root
            / "derivatives"
            / safe_name(identity)
            / safe_name(candidate_version)
            / "transformation.json"
        )
        derivative = None
        runtime = None
        approval = None
        if transformation_path.is_file():
            derivative = read_json(transformation_path)
            derivative_hash = derivative.get("derivativeSha256")
            runtime = optional_json(
                root
                / "qualification"
                / safe_name(identity)
                / str(derivative_hash)
                / "qualification.json"
            )
            approval = latest_parent_decision(root, identity, str(derivative_hash))
        assets.append(
            {
                "assetId": identity,
                "candidateVersion": candidate_version,
                "productionId": spec.get("productionId"),
                "semanticId": spec["semanticId"],
                "status": spec["status"],
                "sourceDecision": (
                    source.get("automatedDecision") if source else "not_completed"
                ),
                "runtimeDecision": (
                    runtime.get("automatedDecision") if runtime else "not_completed"
                ),
                "parentDecision": (
                    approval.get("parentDecision") if approval else "pending"
                ),
                "integrationEligible": bool(
                    spec["status"] == "canonical"
                    and runtime
                    and runtime.get("automatedDecision") == "qualified"
                    and approval
                    and approval.get("parentDecision") == "approved"
                ),
            }
        )
    print(
        json.dumps(
            {"schemaVersion": 1, "assets": assets},
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
