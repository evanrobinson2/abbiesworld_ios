#!/usr/bin/env python3
"""Shared fail-closed helpers for the World 2 asset pipeline."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WORLD2_ROOT = REPO_ROOT / "AssetSources" / "World2"
DEFAULT_ASSET_CATALOG = (
    REPO_ROOT / "abbies.world.ios" / "abbies.world.ios" / "Assets.xcassets"
)


class PipelineError(RuntimeError):
    """An actionable, fail-closed pipeline error."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        + "\n"
    ).encode("utf-8")


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise PipelineError(f"Required JSON file is missing: {path}") from error
    except json.JSONDecodeError as error:
        raise PipelineError(f"Invalid JSON in {path}: {error}") from error


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_bytes(canonical_json_bytes(value))
    os.replace(temporary, path)


def write_immutable_json(path: Path, value: Any) -> bool:
    """Write once. Existing identical evidence is resumed; differences are refused."""
    encoded = canonical_json_bytes(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != encoded:
            raise PipelineError(
                f"Immutable evidence already exists with different bytes: {path}"
            )
        return False
    try:
        with path.open("xb") as handle:
            handle.write(encoded)
    except FileExistsError:
        if path.read_bytes() != encoded:
            raise PipelineError(
                f"Immutable evidence was concurrently changed: {path}"
            )
        return False
    return True


def copy_immutable(source: Path, destination: Path) -> bool:
    source_hash = sha256_file(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if sha256_file(destination) != source_hash:
            raise PipelineError(
                f"Immutable file already exists with different bytes: {destination}"
            )
        return False
    try:
        with destination.open("xb") as output:
            with source.open("rb") as input_file:
                for chunk in iter(lambda: input_file.read(1024 * 1024), b""):
                    output.write(chunk)
    except FileExistsError:
        if sha256_file(destination) != source_hash:
            raise PipelineError(
                f"Immutable file was concurrently changed: {destination}"
            )
        return False
    return True


def safe_name(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9_.-]+", "_", value).strip("._")
    if not normalized:
        raise PipelineError(f"Value cannot form a safe path name: {value!r}")
    return normalized


def resolve_inside(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    resolved_root = root.resolve()
    if candidate != resolved_root and resolved_root not in candidate.parents:
        raise PipelineError(f"Path escapes World 2 root: {relative}")
    return candidate


def load_inventory(world2_root: Path) -> dict[str, Any]:
    inventory = read_json(world2_root / "inventory.json")
    if inventory.get("schemaVersion") != 1 or not isinstance(
        inventory.get("assets"), list
    ):
        raise PipelineError("inventory.json must use schemaVersion 1 and contain assets")
    ids = [
        entry.get("productionId")
        for entry in inventory["assets"]
        if entry.get("productionId") is not None
    ]
    if any(not isinstance(asset_id, str) or not asset_id for asset_id in ids):
        raise PipelineError("Assigned production IDs must be non-empty strings")
    if len(ids) != len(set(ids)):
        raise PipelineError("inventory.json contains duplicate productionId values")
    semantic_ids = [entry.get("semanticId") for entry in inventory["assets"]]
    if any(not isinstance(asset_id, str) or not asset_id for asset_id in semantic_ids):
        raise PipelineError("Every inventory asset requires a non-empty semanticId")
    if len(semantic_ids) != len(set(semantic_ids)):
        raise PipelineError("inventory.json contains duplicate semanticId values")
    return inventory


def asset_spec(inventory: dict[str, Any], asset_id: str) -> dict[str, Any]:
    matches = [
        entry
        for entry in inventory["assets"]
        if entry.get("productionId") == asset_id or entry.get("semanticId") == asset_id
    ]
    if len(matches) == 1:
        return matches[0]
    raise PipelineError(f"Unknown or ambiguous World 2 asset identity: {asset_id}")


def latest_parent_decision(
    world2_root: Path, asset_id: str, derivative_hash: str
) -> dict[str, Any] | None:
    directory = (
        world2_root
        / "approvals"
        / safe_name(asset_id)
        / derivative_hash
    )
    if not directory.exists():
        return None
    decisions = [read_json(path) for path in sorted(directory.glob("*.json"))]
    if not decisions:
        return None
    decisions.sort(key=lambda item: (item.get("recordedAt", ""), item.get("eventId", "")))
    return decisions[-1]


class StructuredLogger:
    def emit(self, event: str, **fields: Any) -> None:
        record = {"timestamp": utc_now(), "event": event, **fields}
        print(
            json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=False),
            file=sys.stdout,
            flush=True,
        )
