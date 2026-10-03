#!/usr/bin/env python3
"""Formal face-crop review for Marble Voyage tile portraits.

The tile does not show the whole plate. It shows a normalized crop, then a
center square fill — the same path as PeglinBattlePortraitFrame / HeadDAG.

This script:
  1. Prepares that exact tile crop.
  2. Sends the crop AND the full plate to a vision model in one request.
  3. Asks whether the face (eyes, nose, mouth) is fully in frame and centered.
  4. If not, retries once with the model's suggested box.
  5. Writes artifacts/voyage-portrait-review/<stamp>/report.json

Pass means the model said the face is in frame and centered. A top-of-plate
crop that is mostly quills, ears, or wings must fail.

Usage:
  python3 scripts/review_voyage_portraits.py
  python3 scripts/review_voyage_portraits.py --apply

--apply rewrites portraitFaceBBox in PlinkAttackerKind.swift from boxes that
passed. Nil stays nil only when the default top-center box itself passed.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = (
    ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Assets.xcassets"
)
KIND_SWIFT = (
    ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Models"
    / "World2"
    / "PeglinEdition"
    / "PlinkAttackerKind.swift"
)

# HeadDAG NormalizedRect.topCenterHead — used when portraitFaceBBox is nil.
TOP_CENTER_HEAD = (0.22, 0.02, 0.56, 0.44)
TILE = 256


def load_dotenv_file(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


def ensure_openai_env() -> None:
    load_dotenv_file(ROOT / "CreatureCreator" / "server" / ".env.local")
    load_dotenv_file(ROOT / ".env")


def data_url_image(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.convert("RGB").save(buf, format="JPEG", quality=85, optimize=True)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def resolve_model() -> str:
    return (
        os.environ.get("VOYAGE_PORTRAIT_EVAL_MODEL", "").strip()
        or os.environ.get("VOYAGE_OPENING_EVAL_MODEL", "").strip()
        or os.environ.get("WORLD2_ASSET_EVAL_MODEL", "").strip()
        or "gpt-5.6"
    )


def parse_face_bboxes(text: str) -> dict[str, tuple[float, float, float, float] | None]:
    """Map attacker raw value → explicit bbox, or None when the switch falls through."""
    match = re.search(
        r"var portraitFaceBBox: NormalizedRect\? \{(?P<body>.*?)\n    \}",
        text,
        re.S,
    )
    if not match:
        raise SystemExit("portraitFaceBBox switch not found")
    body = match.group("body")
    found: dict[str, tuple[float, float, float, float]] = {}
    for case in re.finditer(
        r"case\s+(?P<names>[^:]+):\s*(?P<rest>.*?)(?=\n        case |\n        default:)",
        body,
        re.S,
    ):
        rect = re.search(
            r"NormalizedRect\(\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*w:\s*([0-9.]+),\s*h:\s*([0-9.]+)\)",
            case.group("rest"),
        )
        names = re.findall(r"\.([A-Za-z0-9_]+)", case.group("names"))
        if not rect:
            continue
        box = tuple(float(rect.group(i)) for i in range(1, 5))
        for name in names:
            found[name] = box  # type: ignore[assignment]
    return found


def idle_plates() -> list[tuple[str, Path]]:
    plates: list[tuple[str, Path]] = []
    for folder in sorted(ASSETS.glob("world2_plink_gang_*_idle.imageset")):
        raw = folder.name.removeprefix("world2_plink_gang_").removesuffix("_idle.imageset")
        images = [
            p
            for p in folder.iterdir()
            if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
        ]
        if not images:
            continue
        plates.append((raw, images[0]))
    return plates


def clamp_box(box: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    x, y, w, h = box
    x = min(max(x, 0.0), 0.95)
    y = min(max(y, 0.0), 0.95)
    w = min(max(w, 0.08), 1.0 - x)
    h = min(max(h, 0.08), 1.0 - y)
    return (x, y, w, h)


def render_tile(im: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    """Match HeadDAG crop, then SwiftUI scaledToFill into a square."""
    x, y, w, h = clamp_box(box)
    width, height = im.size
    crop = im.crop(
        (
            int(x * width),
            int(y * height),
            int((x + w) * width),
            int((y + h) * height),
        )
    )
    cw, ch = crop.size
    if cw < 1 or ch < 1:
        return im.resize((TILE, TILE))
    scale = TILE / min(cw, ch)
    resized = crop.resize(
        (max(TILE, int(cw * scale)), max(TILE, int(ch * scale))),
        Image.Resampling.LANCZOS,
    )
    left = max(0, (resized.width - TILE) // 2)
    top = max(0, (resized.height - TILE) // 2)
    return resized.crop((left, top, left + TILE, top + TILE))


def review_pair(
    client: Any,
    model: str,
    kind: str,
    full: Image.Image,
    tile: Image.Image,
    box: tuple[float, float, float, float],
) -> dict[str, Any]:
    instruction = {
        "task": "voyage_portrait_face_review",
        "kind": kind,
        "imageSize": {"width": full.size[0], "height": full.size[1]},
        "currentBBox": {"x": box[0], "y": box[1], "w": box[2], "h": box[3]},
        "rules": [
            "Image A is the FULL character plate. Image B is the TILE the game actually shows (crop, then center square fill).",
            "First locate the face on Image A: both eyes, nose, and mouth. Ignore quills, ears, wings, and weapons.",
            "Then judge Image B alone: is that same face fully inside the tile, and are the eyes near the center?",
            "Fail if the tile is mostly quills, ears, wings, torso, or empty background, or if the face is cut off or stuck on an edge.",
            "A pass requires the face to be the subject of the tile, not a sliver at the bottom.",
            "If you fail, suggest a normalized bbox on Image A (origin top-left, 0–1) that frames the face. Make it nearly square in PIXELS: h ≈ w * (imageWidth / imageHeight). Include forehead through chin, not the whole body.",
            "Return strict JSON only.",
        ],
        "outputSchema": {
            "faceInFrame": True,
            "faceCentered": True,
            "decision": "pass|fail",
            "whatDominates": "face|quills|ears|wings|torso|background|other",
            "reasoning": [
                "where the face sits on the full plate",
                "what the tile crop actually shows",
                "why that is or is not centered",
            ],
            "suggestedBBox": {"x": 0.1, "y": 0.2, "w": 0.4, "h": 0.3},
        },
    }
    content = [
        {"type": "input_text", "text": json.dumps(instruction)},
        {"type": "input_text", "text": f"Image A — full plate for {kind}."},
        {"type": "input_image", "image_url": data_url_image(full)},
        {"type": "input_text", "text": f"Image B — current tile crop for {kind}."},
        {"type": "input_image", "image_url": data_url_image(tile)},
    ]
    kwargs: dict[str, Any] = {
        "model": model,
        "input": [{"role": "user", "content": content}],
    }
    try:
        response = client.responses.create(**kwargs, reasoning={"effort": "medium"})
    except Exception:
        response = client.responses.create(**kwargs)
    text = (response.output_text or "").strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        return {
            "decision": "fail",
            "faceInFrame": False,
            "faceCentered": False,
            "whatDominates": "other",
            "reasoning": [f"Model returned non-JSON: {error}"],
            "suggestedBBox": None,
            "raw": text[:2000],
        }
    decision = str(parsed.get("decision", "fail")).lower()
    if not parsed.get("faceInFrame") or not parsed.get("faceCentered"):
        decision = "fail"
    parsed["decision"] = decision
    return parsed


def suggested_box(payload: dict[str, Any]) -> tuple[float, float, float, float] | None:
    raw = payload.get("suggestedBBox")
    if not isinstance(raw, dict):
        return None
    try:
        box = clamp_box(
            (float(raw["x"]), float(raw["y"]), float(raw["w"]), float(raw["h"]))
        )
    except (KeyError, TypeError, ValueError):
        return None
    return box


def review_kind(
    client: Any,
    model: str,
    kind: str,
    path: Path,
    explicit: dict[str, tuple[float, float, float, float] | None],
    out_dir: Path,
    seed: tuple[float, float, float, float] | None = None,
    attempts: int = 3,
) -> dict[str, Any]:
    full = Image.open(path).convert("RGBA")
    start = seed or explicit.get(kind) or TOP_CENTER_HEAD
    used_default = seed is None and kind not in explicit
    history: list[dict[str, Any]] = []
    box = start
    tile = render_tile(full, box)
    for attempt in range(1, attempts + 1):
        tile_path = out_dir / f"{kind}-tile-a{attempt}.jpg"
        tile.convert("RGB").save(tile_path, quality=90)
        print(f"→ {kind} attempt {attempt} bbox={tuple(round(v, 3) for v in box)}", flush=True)
        verdict = review_pair(client, model, kind, full, tile, box)
        verdict["attempt"] = attempt
        verdict["bbox"] = {"x": box[0], "y": box[1], "w": box[2], "h": box[3]}
        history.append(verdict)
        print(
            f"  {verdict.get('decision')} dominates={verdict.get('whatDominates')}",
            flush=True,
        )
        if verdict.get("decision") == "pass":
            break
        nxt = suggested_box(verdict)
        if nxt is None or nxt == box:
            break
        box = nxt
        tile = render_tile(full, box)
    full_path = out_dir / f"{kind}-full.jpg"
    full.convert("RGB").save(full_path, quality=85)
    passed = history[-1].get("decision") == "pass"
    return {
        "kind": kind,
        "source": str(path.relative_to(ROOT)),
        "imageSize": {"width": full.size[0], "height": full.size[1]},
        "startedFromDefaultTopCenter": used_default,
        "passed": passed,
        "bbox": history[-1]["bbox"],
        "attempts": history,
    }


def apply_bboxes(results: list[dict[str, Any]]) -> None:
    text = KIND_SWIFT.read_text(encoding="utf-8")
    lines = [
        "    /// Face box for tall plates. Nil only when the default top-center crop",
        "    /// itself passed scripts/review_voyage_portraits.py.",
        "    var portraitFaceBBox: NormalizedRect? {",
        "        switch self {",
    ]
    for row in sorted(results, key=lambda item: item["kind"]):
        if not row.get("passed"):
            continue
        box = row["bbox"]
        values = (float(box["x"]), float(box["y"]), float(box["w"]), float(box["h"]))
        # Default top-center already passed — leave the kind on nil.
        if all(abs(a - b) < 0.011 for a, b in zip(values, TOP_CENTER_HEAD)):
            continue
        lines.append(f"        case .{row['kind']}:")
        lines.append(
            "            return NormalizedRect("
            f"x: {box['x']:.2f}, y: {box['y']:.2f}, w: {box['w']:.2f}, h: {box['h']:.2f})"
        )
    lines.append("        default:")
    lines.append("            return nil")
    lines.append("        }")
    lines.append("    }")
    replacement = "\n".join(lines)
    updated, count = re.subn(
        r"    /// Optional head/face crop.*?var portraitFaceBBox: NormalizedRect\? \{.*?\n    \}",
        replacement,
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        # Current file may already use the shorter comment.
        updated, count = re.subn(
            r"    /// Face box for tall plates.*?var portraitFaceBBox: NormalizedRect\? \{.*?\n    \}",
            replacement,
            text,
            count=1,
            flags=re.S,
        )
    if count != 1:
        updated, count = re.subn(
            r"    var portraitFaceBBox: NormalizedRect\? \{.*?\n    \}",
            replacement,
            text,
            count=1,
            flags=re.S,
        )
    if count != 1:
        raise SystemExit("could not rewrite portraitFaceBBox")
    KIND_SWIFT.write_text(updated, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write passing bboxes back into PlinkAttackerKind.swift",
    )
    parser.add_argument("--kinds", nargs="*", help="Limit to these raw values")
    parser.add_argument(
        "--seed-report",
        type=Path,
        help="Start each kind from the last suggested bbox in a previous report",
    )
    parser.add_argument("--attempts", type=int, default=3)
    args = parser.parse_args()

    ensure_openai_env()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print(
            "OPENAI_API_KEY missing. Source CreatureCreator/server/.env.local or export it.",
            file=sys.stderr,
        )
        return 2

    from openai import OpenAI

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = ROOT / "artifacts" / "voyage-portrait-review" / stamp
    out_dir.mkdir(parents=True, exist_ok=True)
    explicit = parse_face_bboxes(KIND_SWIFT.read_text(encoding="utf-8"))
    plates = idle_plates()
    if args.kinds:
        wanted = set(args.kinds)
        plates = [row for row in plates if row[0] in wanted]
    if not plates:
        print("No idle plates found", file=sys.stderr)
        return 2

    seeds: dict[str, tuple[float, float, float, float]] = {}
    if args.seed_report:
        prior = json.loads(args.seed_report.read_text(encoding="utf-8"))
        for row in prior.get("portraits") or []:
            last = (row.get("attempts") or [{}])[-1]
            seeded = suggested_box(last) or (
                (
                    float(row["bbox"]["x"]),
                    float(row["bbox"]["y"]),
                    float(row["bbox"]["w"]),
                    float(row["bbox"]["h"]),
                )
                if row.get("bbox")
                else None
            )
            if seeded:
                seeds[row["kind"]] = seeded

    client = OpenAI(api_key=api_key)
    model = resolve_model()
    results = [
        review_kind(
            client,
            model,
            kind,
            path,
            explicit,
            out_dir,
            seed=seeds.get(kind),
            attempts=args.attempts,
        )
        for kind, path in plates
    ]
    failed = [row["kind"] for row in results if not row["passed"]]
    report = {
        "ok": not failed,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "failed": failed,
        "portraits": results,
    }
    report_path = out_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    latest = ROOT / "artifacts" / "voyage-portrait-review" / "latest.json"
    latest.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"report: {report_path.relative_to(ROOT)}")
    if failed:
        print("FAILED: " + ", ".join(failed))
    else:
        print("OK — every tile crop was judged face-centered")
    if args.apply and not failed:
        apply_bboxes(results)
        print(f"applied passing bboxes → {KIND_SWIFT.relative_to(ROOT)}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
