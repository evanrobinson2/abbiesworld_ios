#!/usr/bin/env python3
"""Ensure Abbie's Home (scene.home) has treehouses and is the active scene.

Uses household HTTP directly (Studio MCP may be down). Additive — keeps players
and unrelated scenes/places.

Usage:
  export ABBIES_WORLD_TOKEN=...   # or ~/.abbies_world_token
  python3 scripts/seed_abbie_home_world.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ORIGIN = os.environ.get("ABBIES_WORLD_ORIGIN", "http://abbies.world:8000")
HOME = "scene.home"


def token() -> str:
    # Prefer the Studio-copied file token; shell env often goes stale.
    path = Path.home() / ".abbies_world_token"
    if path.exists():
        text = path.read_text().strip()
        if text:
            return text
    env = os.environ.get("ABBIES_WORLD_TOKEN", "").strip()
    if env:
        return env
    raise SystemExit("ABBIES_WORLD_TOKEN missing (and no ~/.abbies_world_token)")


def req(method: str, path: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        ORIGIN + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as resp:
        return resp.status, json.loads(resp.read().decode())


def main() -> int:
    status, doc = req("GET", "/api/v1/worlds/current")
    if status != 200:
        print("GET failed", status, doc)
        return 1
    players = doc.get("players") or {}
    if "player.abbie" not in players:
        print("REFUSING: player.abbie missing")
        return 2

    rev = doc["revision"]
    places = {p["id"]: p for p in (doc.get("places") or []) if isinstance(p, dict)}
    places["poi.abbieTreehouse"] = {
        "id": "poi.abbieTreehouse",
        "name": "Abbie's Treehouse",
        "behavior": "playerHome",
        "exteriorAsset": "poi.abbieTreehouse.exterior",
        "interiorAsset": "poi.abbieTreehouse.interior",
        "musicTrackID": "music.abbieTreehouse.light",
    }
    places["poi.aniTreehouse"] = {
        "id": "poi.aniTreehouse",
        "name": "Ani's Treehouse",
        "behavior": "playerHome",
        "exteriorAsset": "poi.aniTreehouse.exterior",
        "interiorAsset": "poi.aniTreehouse.interior",
        "musicTrackID": "music.aniTreehouse.light",
    }
    places["poi.cardFactory"] = {
        "id": "poi.cardFactory",
        "name": "Card Factory",
        "behavior": "cardFactory",
        "exteriorAsset": "poi.cardFactory.exterior",
        "interiorAsset": "poi.cardFactory.interior",
    }

    scenes = doc.setdefault("scenes", {})
    home = dict(scenes.get(HOME) or {"id": HOME})
    home.update(
        {
            "id": HOME,
            "name": "Abbie's World",
            "summary": "Three welcoming places — Abbie's treehouse, Ani's treehouse, and the Card Factory",
            "backgroundAsset": "map.home",
            "isDeveloperPlaceholder": False,
            "isMutableByPlayer": True,
            "showsOpenHardpointsToPlayers": True,
        }
    )
    existing = {pi.get("id"): pi for pi in (home.get("poiInstances") or []) if isinstance(pi, dict)}

    def ensure(iid: str, archetype: str, x: float, y: float, scale: float = 1.0, z: int = 1) -> None:
        existing[iid] = {
            "id": iid,
            "archetypeID": archetype,
            "sceneID": HOME,
            "isAuthored": True,
            "createdAt": existing.get(iid, {}).get("createdAt", "2026-09-27T14:00:00Z"),
            "transform": {
                "position": {"x": x, "y": y},
                "rotationDegrees": 0,
                "scale": scale,
            },
            "zIndex": z,
        }

    ensure("instance.home.abbieTreehouse", "poi.abbieTreehouse", 0.326, 0.311, 1.0, 2)
    ensure("instance.home.aniTreehouse", "poi.aniTreehouse", 0.722, 0.443, 1.0, 2)
    ensure("instance.home.cardFactory", "poi.cardFactory", 0.440, 0.685, 1.05, 3)
    home["poiInstances"] = list(existing.values())
    scenes[HOME] = home
    doc["scenes"] = scenes
    doc["places"] = list(places.values())
    doc["activeSceneID"] = HOME
    doc["expectedRevision"] = rev
    doc.pop("revision", None)
    doc.pop("id", None)
    doc.pop("name", None)

    status, saved = req("PUT", "/api/v1/worlds/current", doc)
    print("PUT", status, "revision", saved.get("revision"), "active", saved.get("activeSceneID"))
    arch = {pi["archetypeID"] for pi in saved["scenes"][HOME]["poiInstances"]}
    assert "poi.abbieTreehouse" in arch and "poi.aniTreehouse" in arch
    assert saved["activeSceneID"] == HOME
    print("SEED OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
