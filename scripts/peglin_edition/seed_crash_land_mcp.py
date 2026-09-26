#!/usr/bin/env python3
"""Seed Peglin Edition lands into household /worlds/current via Studio MCP habits.

Requires ABBIES_WORLD_TOKEN (Auth0 bearer). Additive only — does NOT wipe players
or unrelated scenes.

Usage:
  export ABBIES_WORLD_TOKEN=...
  python3 scripts/peglin_edition/seed_crash_land_mcp.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request

MCP = "https://studio-mock-iota.vercel.app/api/mcp"

LANDS = [
    {
        "sceneId": "scene.peglin.crashLand",
        "name": "Crash World",
        "summary": "Crash-landed on a floating isle — wreck and a broken path north",
        "backgroundAsset": "map.peglin.crashLand",
        "musicTrackID": "plink_abbies_world",
        "places": [
            {
                "placeId": "poi.peglin.wreck",
                "name": "The Wreck",
                "behavior": "rooms",
                "exteriorAsset": "token.peglin.wreck",
                "interiorAsset": "poi.peglin.wreck.interior",
                "x": 0.36,
                "y": 0.70,
                "scale": 1.20,
            },
            {
                "placeId": "poi.peglin.brokenPath",
                "name": "Broken Path",
                "behavior": "travel:scene.peglin.bramble",
                "exteriorAsset": "token.peglin.path",
                "x": 0.52,
                "y": 0.18,
                "scale": 0.95,
            },
        ],
    },
    {
        "sceneId": "scene.peglin.bramble",
        "name": "Bramble",
        "summary": "Clover bowl clearing — rabbit-fawn spirit and burrow pockets",
        "backgroundAsset": "map.peglin.bramble",
        "musicTrackID": "plink_cheerful_khorovod",
        "places": [
            {
                "placeId": "poi.peglin.bramble.guardian",
                "name": "Bramble Spirit",
                "behavior": "plink",
                "exteriorAsset": "map.peglin.bramble",
                "x": 0.50,
                "y": 0.52,
                "scale": 1.05,
            },
            {
                "placeId": "poi.peglin.path.toFoxLand",
                "name": "Path to Fox Land",
                "behavior": "travel:scene.peglin.foxLand",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.18,
                "scale": 0.85,
            },
            {
                "placeId": "poi.peglin.path.toCrashLand",
                "name": "Back to Crash World",
                "behavior": "travel:scene.peglin.crashLand",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.82,
                "scale": 0.85,
            },
        ],
    },
    {
        "sceneId": "scene.peglin.foxLand",
        "name": "Fox Land",
        "summary": "Kitsune grove — pink trees, lanterns, glowing mushrooms",
        "backgroundAsset": "map.peglin.foxLand",
        "musicTrackID": "plink_electronic_folk_dance",
        "places": [
            {
                "placeId": "poi.peglin.foxLand.guardian",
                "name": "Fox Spirit",
                "behavior": "plink",
                "exteriorAsset": "map.peglin.foxLand",
                "x": 0.50,
                "y": 0.52,
                "scale": 1.05,
            },
            {
                "placeId": "poi.peglin.path.toStagLand",
                "name": "Path to Stag Land",
                "behavior": "travel:scene.peglin.stagLand",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.18,
                "scale": 0.85,
            },
            {
                "placeId": "poi.peglin.path.backBramble",
                "name": "Back to Bramble",
                "behavior": "travel:scene.peglin.bramble",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.82,
                "scale": 0.85,
            },
        ],
    },
    {
        "sceneId": "scene.peglin.stagLand",
        "name": "Stag Land",
        "summary": "Crystal-antler stag on a ley-line floating isle",
        "backgroundAsset": "map.peglin.stagLand",
        "musicTrackID": "plink_abbies_world",
        "places": [
            {
                "placeId": "poi.peglin.stagLand.guardian",
                "name": "Stag Spirit",
                "behavior": "plink",
                "exteriorAsset": "map.peglin.stagLand",
                "x": 0.50,
                "y": 0.52,
                "scale": 1.05,
            },
            {
                "placeId": "poi.peglin.path.toForgottenRealm",
                "name": "Path to Forgotten Realm",
                "behavior": "travel:scene.peglin.forgottenRealm",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.18,
                "scale": 0.85,
            },
            {
                "placeId": "poi.peglin.path.backFoxLand",
                "name": "Back to Fox Land",
                "behavior": "travel:scene.peglin.foxLand",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.82,
                "scale": 0.85,
            },
        ],
    },
    {
        "sceneId": "scene.peglin.forgottenRealm",
        "name": "Forgotten Realm",
        "summary": "Ruined sanctuary — quiet pedestal, path’s end",
        "backgroundAsset": "map.peglin.forgottenRealm",
        "musicTrackID": "plink_abbies_world",
        "places": [
            {
                "placeId": "poi.peglin.forgottenRealm.orb",
                "name": "Forgotten Orb",
                "behavior": "rooms",
                "exteriorAsset": "map.peglin.forgottenRealm",
                "x": 0.50,
                "y": 0.52,
                "scale": 1.05,
            },
            {
                "placeId": "poi.peglin.path.backStagLand",
                "name": "Back to Stag Land",
                "behavior": "travel:scene.peglin.stagLand",
                "exteriorAsset": "poi.peglin.brokenPath.exterior",
                "x": 0.50,
                "y": 0.82,
                "scale": 0.85,
            },
        ],
    },
]


def call(token: str, name: str, arguments: dict) -> dict:
    arguments = {**arguments, "accessToken": token}
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
    ).encode()
    req = urllib.request.Request(
        MCP,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode())
    if payload.get("error"):
        raise RuntimeError(payload["error"])
    content = payload["result"]["content"][0]["text"]
    return json.loads(content)


def main() -> int:
    token = os.environ.get("ABBIES_WORLD_TOKEN", "").strip()
    if not token:
        print("Set ABBIES_WORLD_TOKEN", file=sys.stderr)
        return 2

    for land in LANDS:
        scene_args = {k: v for k, v in land.items() if k != "places"}
        places = land["places"]
        print(f"scene_upsert {scene_args['sceneId']}…")
        print(call(token, "scene_upsert", scene_args))
        for place in places:
            print(f"  place_upsert {place['placeId']}…")
            print(
                call(
                    token,
                    "place_upsert",
                    {"sceneId": scene_args["sceneId"], **place},
                )
            )

    print("world_lint…")
    print(call(token, "world_lint", {}))
    print("Done. Progression: Crash → Bramble → Fox → Stag → Forgotten Realm.")
    print("Point activeSceneID to scene.peglin.crashLand when ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
