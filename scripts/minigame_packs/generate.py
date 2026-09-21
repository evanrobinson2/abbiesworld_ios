#!/usr/bin/env python3
"""Generate + carve a minigame pack's raster set from constrained prompts.

Authoring-time only. The battle runtime never calls this.

    python3 scripts/minigame_packs/generate.py --pack peg-battle
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS = ROOT / "AssetSources" / "World2" / "minigames"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from carve import carve_file  # noqa: E402


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def file_id(asset_id: str) -> str:
    return asset_id.replace("/", "-")


def decode_image(response) -> bytes:
    data = response.data[0]
    encoded = getattr(data, "b64_json", None)
    if encoded:
        return base64.b64decode(encoded)
    url = getattr(data, "url", None)
    if not url:
        raise RuntimeError("image API returned neither b64_json nor url")
    import urllib.request

    with urllib.request.urlopen(url) as reply:  # noqa: S310 — OpenAI image URL
        return reply.read()


def generate_image(client, *, model: str, prompt: str, size: str, quality: str, reference: Path | None):
    kwargs = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "n": 1,
    }
    # gpt-image-1 generate accepts quality; edit is pickier, so quality is best-effort.
    generate_kwargs = {**kwargs, "quality": quality}
    if reference is not None:
        try:
            with reference.open("rb") as handle:
                return client.images.edit(image=handle, **kwargs)
        except Exception as error:  # noqa: BLE001
            print(
                json.dumps(
                    {
                        "event": "minigame.generate.edit_failed_fallback",
                        "message": str(error),
                    }
                ),
                flush=True,
            )
    return client.images.generate(**generate_kwargs)


def write_manifest(pack_dir: Path, spec: dict, records: list[dict]) -> None:
    families: dict[str, dict] = {}
    for asset, record in zip(spec["assets"], records, strict=True):
        family = asset["family"]
        slot = asset.get("state") or asset["id"].split("/")[-1]
        families.setdefault(
            family,
            {
                "character": asset.get("character"),
                "family": family,
                "slots": {},
            },
        )
        families[family]["slots"][slot] = {
            "id": asset["id"],
            "assetType": asset["assetType"],
            "state": slot,
            "family": family,
            "src": record.get("carvedRel") or record.get("rawRel"),
            "raw": record.get("rawRel"),
            "carved": bool(asset.get("carve")),
            "promptPath": asset["promptPath"],
            "generationSource": record.get("generationSource"),
            "missing": not record.get("ok"),
        }
    manifest = {
        "schemaVersion": 1,
        "pack": spec["pack"],
        "updatedAt": utc_now(),
        "families": families,
        "records": records,
    }
    dest = pack_dir / "assets" / "manifest.json"
    dest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", default="peg-battle")
    parser.add_argument("--only", action="append", dest="only")
    args = parser.parse_args()

    pack_dir = PACKS / args.pack
    spec = load_json(pack_dir / "assets" / "generation.json")
    raw_dir = pack_dir / "assets" / "raw"
    carved_dir = pack_dir / "assets" / "carved"
    raw_dir.mkdir(parents=True, exist_ok=True)
    carved_dir.mkdir(parents=True, exist_ok=True)

    if not os.environ.get("OPENAI_API_KEY"):
        print(json.dumps({"event": "minigame.generate.skipped", "reason": "OPENAI_API_KEY missing"}))
        write_manifest(
            pack_dir,
            spec,
            [
                {
                    "id": asset["id"],
                    "ok": False,
                    "reason": "OPENAI_API_KEY missing",
                }
                for asset in spec["assets"]
            ],
        )
        return 2

    from openai import OpenAI

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=600, max_retries=2)
    produced: dict[str, Path] = {}
    records: list[dict] = []

    for asset in spec["assets"]:
        if args.only and asset["id"] not in args.only:
            continue
        prompt = (pack_dir / asset["promptPath"]).read_text(encoding="utf-8")
        size = asset.get("size") or spec["size"]
        fid = file_id(asset["id"])
        raw_path = raw_dir / f"{fid}.png"
        reference = None
        ref_id = asset.get("referenceAsset")
        if ref_id and ref_id in produced:
            reference = produced[ref_id]
        print(
            json.dumps(
                {
                    "event": "minigame.generate.start",
                    "id": asset["id"],
                    "reference": ref_id,
                }
            ),
            flush=True,
        )
        try:
            response = generate_image(
                client,
                model=spec["model"],
                prompt=prompt,
                size=size,
                quality=spec.get("quality", "high"),
                reference=reference,
            )
            raw_path.write_bytes(decode_image(response))
            produced[asset["id"]] = raw_path
            record = {
                "id": asset["id"],
                "ok": True,
                "rawRel": f"assets/raw/{fid}.png",
                "generationSource": spec["model"],
                "createdAt": utc_now(),
            }
            if asset.get("carve"):
                carved_path = carved_dir / f"{fid}.png"
                report = carve_file(raw_path, carved_path, size=1024)
                record["carvedRel"] = f"assets/carved/{fid}.png"
                record["carve"] = report
            else:
                # Opaque backgrounds still copy into carved for a single lookup path.
                carved_path = carved_dir / f"{fid}.png"
                carved_path.write_bytes(raw_path.read_bytes())
                record["carvedRel"] = f"assets/carved/{fid}.png"
            print(json.dumps({"event": "minigame.generate.ok", "id": asset["id"]}), flush=True)
        except Exception as error:  # noqa: BLE001 — pack generation must continue
            record = {
                "id": asset["id"],
                "ok": False,
                "reason": f"{type(error).__name__}: {error}",
                "createdAt": utc_now(),
            }
            print(
                json.dumps(
                    {
                        "event": "minigame.generate.failed",
                        "id": asset["id"],
                        "message": str(error),
                    }
                ),
                flush=True,
            )
        records.append(record)

    if not args.only:
        write_manifest(pack_dir, spec, records)
    else:
        # Merge into existing manifest if present.
        existing = pack_dir / "assets" / "manifest.json"
        if existing.exists():
            previous = load_json(existing)
            by_id = {row["id"]: row for row in previous.get("records", [])}
            for row in records:
                by_id[row["id"]] = row
            merged = [by_id.get(asset["id"], {"id": asset["id"], "ok": False}) for asset in spec["assets"]]
            write_manifest(pack_dir, spec, merged)
        else:
            write_manifest(pack_dir, spec, records)
    return 0 if all(row.get("ok") for row in records) else 1


if __name__ == "__main__":
    raise SystemExit(main())
