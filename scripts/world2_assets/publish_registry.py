#!/usr/bin/env python3
"""Publish World 2's reviewed bundled assets to Game Asset API v1.

The admin credential is read only from ASSET_REGISTRY_ADMIN_API_KEY. This tool
never writes that credential to disk or accepts it as a command-line argument.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from common import PipelineError, canonical_json_bytes, read_json, sha256_file, write_json


REPO_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = REPO_ROOT / "abbies.world.ios" / "abbies.world.ios"
ASSET_CATALOG = APP_ROOT / "Assets.xcassets"
WORLD2_ROOT = REPO_ROOT / "AssetSources" / "World2"
COZY_ROOT = REPO_ROOT / "AssetSources" / "CozyRoomKit"
DEFAULT_GAME_KEY = "abbies-world-2"
KEY_PATTERN = re.compile(r"^[a-z0-9._/-]+$")

QUALIFIED_KEYS = {
    "title.background": "backgrounds/title",
    "map.home": "maps/home",
    "map.workLand": "maps/work-land",
    "map.farm": "maps/farm-land",
    "poi.abbieTreehouse.exterior": "pois/abbie-treehouse/exterior",
    "poi.abbieTreehouse.interior": "pois/abbie-treehouse/interior",
    "poi.aniTreehouse.exterior": "pois/ani-treehouse/exterior",
    "poi.aniTreehouse.interior": "pois/ani-treehouse/interior",
    "poi.cardFactory.exterior": "pois/card-factory/exterior",
    "poi.cardFactory.interior": "pois/card-factory/interior",
    "poi.letterWorks.exterior": "pois/letter-works/exterior",
    "poi.letterWorks.interior": "pois/letter-works/interior",
    "poi.furnitureStore.exterior": "pois/furniture-store/exterior",
    "poi.furnitureStore.interior": "pois/furniture-store/interior",
    "poi.selfReplicatingFactory.exterior": "pois/poi-factory/exterior",
    "poi.selfReplicatingFactory.interior": "pois/poi-factory/interior",
    "poi.assetWorkbench.exterior": "pois/asset-workbench/exterior",
    "poi.assetWorkbench.interior": "pois/asset-workbench/interior",
    "ui.appIcon": "ui/app-icon",
    "furniture.abbieStarterBed": "furniture/beds/abbie-starter",
    "furniture.aniStarterBed": "furniture/beds/ani-starter",
}


class RegistryClient:
    def __init__(self, server_url: str, admin_key: str, actor_id: str) -> None:
        parsed = urllib.parse.urlsplit(server_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise PipelineError(f"Invalid ABBIES_SERVER_URL: {server_url!r}")
        if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise PipelineError(
                "Registry admin writes require HTTPS, except for a loopback test server."
            )
        self.server_url = server_url.rstrip("/")
        self.admin_key = admin_key
        self.actor_id = actor_id

    def verify_schema(self) -> None:
        status, _ = self._request("GET", "/api/v1/asset-schema")
        if status == 404:
            raise PipelineError(
                "Game Asset API v1 is not deployed: /api/v1/asset-schema returned 404."
            )
        if not 200 <= status < 300:
            raise PipelineError(f"Asset schema readiness check returned HTTP {status}.")

    def register_game(self, game_key: str) -> None:
        status, _ = self._request(
            "PUT",
            f"/api/v1/games/{urllib.parse.quote(game_key, safe='')}",
            {
                "name": "Abbie's World 2",
                "metadata": {
                    "team": "world-2",
                    "minimumClientVersion": "1.0",
                    "assetPolicy": "parent-approved-qualified-bundle-first",
                },
            },
        )
        if not 200 <= status < 300:
            raise PipelineError(f"Game registration returned HTTP {status}.")

    def current_revision(self, game_key: str, asset_key: str) -> int:
        path = self._asset_path(game_key, asset_key)
        status, payload = self._request("GET", path)
        if status == 404:
            return 0
        if not 200 <= status < 300:
            raise PipelineError(f"Reading {asset_key} returned HTTP {status}.")
        revision = payload.get("revision") if isinstance(payload, dict) else None
        if not isinstance(revision, int) or revision < 1:
            raise PipelineError(f"Registry returned an invalid revision for {asset_key}.")
        return revision

    def upsert(self, game_key: str, record: dict[str, Any]) -> int:
        asset_key = record["key"]
        expected_revision = self.current_revision(game_key, asset_key)
        payload = {
            "source": record["source"],
            "metadata": record["metadata"],
            "expectedRevision": expected_revision,
        }
        status, response = self._request(
            "PUT",
            self._asset_path(game_key, asset_key),
            payload,
        )
        if status == 409:
            raise PipelineError(
                f"Revision conflict while publishing {asset_key}; re-run from fresh state."
            )
        if not 200 <= status < 300:
            raise PipelineError(f"Publishing {asset_key} returned HTTP {status}.")
        revision = response.get("revision") if isinstance(response, dict) else None
        if not isinstance(revision, int) or revision < 1:
            raise PipelineError(f"Registry returned no revision for {asset_key}.")
        return revision

    def _asset_path(self, game_key: str, asset_key: str) -> str:
        encoded_game = urllib.parse.quote(game_key, safe="")
        encoded_key = urllib.parse.quote(asset_key, safe="/")
        return f"/api/v1/games/{encoded_game}/assets/{encoded_key}"

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> tuple[int, Any]:
        body = canonical_json_bytes(payload) if payload is not None else None
        request = urllib.request.Request(
            f"{self.server_url}{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {self.admin_key}",
                "X-Actor-ID": self.actor_id,
                "Accept": "application/json",
                **({"Content-Type": "application/json"} if body is not None else {}),
            },
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=15,
                context=ssl.create_default_context(),
            ) as response:
                response_body = response.read()
                return response.status, _decode_json(response_body)
        except urllib.error.HTTPError as error:
            return error.code, _decode_json(error.read())
        except urllib.error.URLError as error:
            raise PipelineError(f"Registry request failed: {error.reason}") from error


def _decode_json(data: bytes) -> Any:
    if not data:
        return {}
    try:
        return json.loads(data)
    except json.JSONDecodeError as error:
        raise PipelineError("Registry returned invalid JSON.") from error


def _validate_key(key: str) -> None:
    if not KEY_PATTERN.fullmatch(key) or key.startswith("/") or key.endswith("/"):
        raise PipelineError(f"Invalid registry asset key: {key!r}")


def _bundled_record(key: str, bundle_name: str, metadata: dict[str, Any]) -> dict[str, Any]:
    _validate_key(key)
    return {
        "key": key,
        "source": {"type": "bundled", "bundleName": bundle_name},
        "metadata": metadata,
    }


def build_records(repo_root: Path = REPO_ROOT) -> list[dict[str, Any]]:
    app_root = repo_root / "abbies.world.ios" / "abbies.world.ios"
    world2_root = repo_root / "AssetSources" / "World2"
    cozy_root = repo_root / "AssetSources" / "CozyRoomKit"
    records: list[dict[str, Any]] = []

    integrated = read_json(world2_root / "integrated-manifest.json")
    for asset in integrated["assets"]:
        semantic_id = asset["semanticId"]
        try:
            key = QUALIFIED_KEYS[semantic_id]
        except KeyError as error:
            raise PipelineError(
                f"No stable registry key declared for qualified asset {semantic_id}."
            ) from error
        records.append(
            _bundled_record(
                key,
                asset["assetCatalogName"],
                {
                    "role": "qualified-world-2-image",
                    "semanticId": semantic_id,
                    "productionId": asset["assetId"],
                    "pipelineVersion": asset["version"],
                    "sha256": asset["derivativeSha256"],
                    "qualification": {
                        "gate": "automated-pass-and-parent-approved",
                        "provider": asset["evaluator"]["provider"],
                        "model": asset["evaluator"]["model"],
                        "mode": asset["evaluator"]["mode"],
                        "promptSha256": asset["promptSha256"],
                    },
                },
            )
        )

    cozy_manifest = read_json(cozy_root / "manifest.json")
    if cozy_manifest.get("assetCount") != len(cozy_manifest.get("assets", [])):
        raise PipelineError("Cozy Room Kit manifest assetCount does not match its assets.")
    for asset in cozy_manifest["assets"]:
        records.append(
            _bundled_record(
                f"furniture/props/{asset['id']}",
                asset["assetCatalogName"],
                {
                    "role": asset["role"],
                    "label": asset["label"],
                    "description": asset["description"],
                    "category": asset["category"],
                    "tags": asset["tags"],
                    "pixelSize": asset["pixelSize"],
                    "sha256": asset["pngSha256"],
                    "sourceSha256": asset["sourceSha256"],
                    "alpha": asset["alpha"],
                },
            )
        )

    music_root = app_root / "Resources" / "Music" / "World2"
    for path in sorted(music_root.glob("*.m4a")):
        key_stem = path.stem.replace("_", "-")
        records.append(
            _bundled_record(
                f"music/{key_stem}",
                path.stem,
                {
                    "role": "music",
                    "resourceExtension": "m4a",
                    "bundleSubdirectory": "Resources/Music/World2",
                    "sha256": sha256_file(path),
                },
            )
        )

    world2_resources = app_root / "Resources" / "World2"
    intro = world2_resources / "world2_intro.mp4"
    records.append(
        _bundled_record(
            "video/intro",
            intro.stem,
            {
                "role": "intro-video",
                "resourceExtension": intro.suffix.lstrip("."),
                "bundleSubdirectory": "Resources/World2",
                "sha256": sha256_file(intro),
            },
        )
    )
    minigame_config = world2_resources / "save_the_vowels.json"
    records.append(
        _bundled_record(
            "minigames/save-the-vowels/config",
            minigame_config.stem,
            {
                "role": "minigame-configuration",
                "resourceExtension": minigame_config.suffix.lstrip("."),
                "bundleSubdirectory": "Resources/World2",
                "sha256": sha256_file(minigame_config),
            },
        )
    )

    keys = [record["key"] for record in records]
    if len(keys) != len(set(keys)):
        raise PipelineError("Registry publication plan contains duplicate asset keys.")
    return sorted(records, key=lambda record: record["key"])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--server-url", default=os.environ.get("ABBIES_SERVER_URL"))
    parser.add_argument("--game-key", default=DEFAULT_GAME_KEY)
    parser.add_argument("--actor-id", default="world2-asset-pipeline")
    parser.add_argument("--asset-key", action="append", default=[])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--plan-out", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    records = build_records()
    if args.asset_key:
        selected = set(args.asset_key)
        records = [record for record in records if record["key"] in selected]
        missing = selected - {record["key"] for record in records}
        if missing:
            raise PipelineError(
                "Unknown requested registry keys: " + ", ".join(sorted(missing))
            )
    if not records:
        raise PipelineError("No assets selected for registry publication.")

    plan = {
        "schemaVersion": 1,
        "gameKey": args.game_key,
        "assetCount": len(records),
        "assets": records,
    }
    if args.plan_out:
        write_json(args.plan_out, plan)
    if args.dry_run:
        print(
            json.dumps(
                {
                    "status": "dry-run",
                    "gameKey": args.game_key,
                    "assetCount": len(records),
                },
                sort_keys=True,
            )
        )
        return 0

    if not args.server_url:
        raise PipelineError("Set ABBIES_SERVER_URL or pass --server-url.")
    admin_key = os.environ.get("ASSET_REGISTRY_ADMIN_API_KEY")
    if not admin_key:
        raise PipelineError(
            "ASSET_REGISTRY_ADMIN_API_KEY is required for registry writes."
        )

    client = RegistryClient(args.server_url, admin_key, args.actor_id)
    client.verify_schema()
    client.register_game(args.game_key)
    published = {
        record["key"]: client.upsert(args.game_key, record)
        for record in records
    }
    print(
        json.dumps(
            {
                "status": "published",
                "gameKey": args.game_key,
                "assetCount": len(published),
                "revisions": published,
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
