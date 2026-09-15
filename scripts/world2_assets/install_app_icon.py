#!/usr/bin/env python3
"""Install one exact approved World 2 derivative as the iOS app icon."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

from common import DEFAULT_WORLD2_ROOT, PipelineError, read_json, sha256_file
from repair_canonical import write_immutable_bytes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset-id", default="2004")
    parser.add_argument("--version", default="v9")
    parser.add_argument("--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT)
    args = parser.parse_args()
    root = args.world2_root.resolve()
    metadata_path = root / "derivatives" / args.asset_id / args.version / "transformation.json"
    metadata = read_json(metadata_path)
    source = root / "derivatives" / args.asset_id / args.version / "runtime.png"
    derivative_hash = sha256_file(source)
    if metadata.get("derivativeSha256") != derivative_hash:
        raise PipelineError("App-icon derivative does not match transformation evidence")

    approval_root = root / "approvals" / args.asset_id / derivative_hash
    approvals = [
        read_json(path)
        for path in approval_root.glob("parent-*.json")
        if path.is_file()
    ]
    approvals.sort(key=lambda value: value.get("recordedAt", ""))
    if not approvals or approvals[-1].get("parentDecision") != "approved":
        raise PipelineError("Exact app-icon derivative lacks current parent approval")

    destination = (
        root.parents[1]
        / "abbies.world.ios"
        / "abbies.world.ios"
        / "Assets.xcassets"
        / "AppIcon.appiconset"
        / "AppIcon.png"
    )
    if destination.exists() and sha256_file(destination) != derivative_hash:
        previous_hash = sha256_file(destination)
        backup = root / "retired-app-icons" / f"{previous_hash}.png"
        write_immutable_bytes(backup, destination.read_bytes())
        temporary = destination.with_name(f".{destination.name}.approved.tmp")
        temporary.write_bytes(source.read_bytes())
        temporary.replace(destination)
    else:
        write_immutable_bytes(destination, source.read_bytes())
    if sha256_file(destination) != derivative_hash:
        raise PipelineError("Installed AppIcon.png hash differs from approved derivative")
    print(
        f"APP_ICON_INSTALLED asset={args.asset_id} version={args.version} "
        f"sha256={derivative_hash} path={destination}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
