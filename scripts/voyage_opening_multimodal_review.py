#!/usr/bin/env python3
"""One-shot OpenAI multimodal reasoning node for voyage opening stills.

Chains after the static opening-screen DAG. Each captured still is shown to a
vision model with that screen's predicted contracts; the model returns
structured findings + a short reasoning trace.

Usage (loads OPENAI_API_KEY from CreatureCreator/server/.env.local if unset):

  python3 scripts/voyage_opening_multimodal_review.py \\
    --stills artifacts/voyage-capture/<stamp> \\
    --json artifacts/voyage-opening-dag/multimodal.json

Env:
  OPENAI_API_KEY              required (or sourced from CreatureCreator env)
  VOYAGE_OPENING_EVAL_MODEL   optional; else WORLD2_ASSET_EVAL_MODEL; else gpt-5.6
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

# Screen → still filename + what the model must reason about.
SCREEN_RUBRICS: dict[str, dict[str, Any]] = {
    "title": {
        "file": "title.png",
        "predictions": [
            "Full-bleed voyage title plate fills most of the landscape frame",
            "Brand / Marble Voyage title is readable",
            "Campaign and Endless CTAs are visible and not clipped",
            "No broken placeholder art or empty letterbox dominating the frame",
        ],
    },
    "chart": {
        "file": "chart.png",
        "predictions": [
            "Overland climb chart is the main surface",
            "Abbie player token is visible on the path",
            "If a foe/cast card is present, it names the actual next foe (not a wrong gang member)",
            "Player/fighter name overlays should NOT dominate tiles when a cast card exists (names belong on the card / Abbie status card)",
            "Abbie status card at the bottom is ideal; flag if missing when the still claims post-redesign chrome",
        ],
    },
    "fight": {
        "file": "fight.png",
        "predictions": [
            "Peg board is the largest playable surface",
            "Active enemy cast card shows the lead foe for this fight (opening: Porcupine Boxer)",
            "If a 'Next up' / bench strip exists, it shows other foes in THIS fight — not the full named Raze/Vix/Morrow/Nib gang unless they are actually in the roster",
            "Abbie HP and marble count chrome are readable",
            "Rescue objective (Fox / friend) is visible somewhere on the battle chrome",
        ],
    },
    "shop": {
        "file": "shop.png",
        "predictions": [
            "Bell Market fits roughly one landscape screen without endless empty scroll",
            "Heal / upgrade / buy offers are visible without hunting",
            "Bag is drawer-like or docked, not a tall always-on strip eating the layout",
        ],
        "optional": True,
    },
    "event": {
        "file": "event.png",
        "predictions": [
            "Event / encounter chrome is readable",
            "Continue / leave control is visible",
        ],
        "optional": True,
    },
}


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


def data_url(path: Path) -> str:
    suffix = path.suffix.lower()
    media = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(suffix, "application/octet-stream")
    # Downscale large stills so the request stays reasonable.
    try:
        from PIL import Image
        import io

        with Image.open(path) as im:
            im = im.convert("RGB") if im.mode not in ("RGB", "RGBA") else im
            max_w = 1600
            if im.width > max_w:
                ratio = max_w / float(im.width)
                im = im.resize((max_w, max(1, int(im.height * ratio))), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=85, optimize=True)
            encoded = base64.b64encode(buf.getvalue()).decode("ascii")
            return f"data:image/jpeg;base64,{encoded}"
    except Exception:
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{media};base64,{encoded}"


def resolve_model() -> str:
    return (
        os.environ.get("VOYAGE_OPENING_EVAL_MODEL", "").strip()
        or os.environ.get("WORLD2_ASSET_EVAL_MODEL", "").strip()
        or "gpt-5.6"
    )


def review_still(
    client: Any,
    model: str,
    screen_id: str,
    image_path: Path,
    predictions: list[str],
) -> dict[str, Any]:
    instruction = {
        "task": "voyage_opening_screen_multimodal_review",
        "screen": screen_id,
        "rules": [
            "You are a fail-closed UI auditor for Abbie's World · Marble Voyage on iPad landscape.",
            "Describe only what is visible in the still. Do not invent chrome that is not shown.",
            "For each prediction, decide pass | fail | uncertain with one concrete visual evidence sentence.",
            "Write a short reasoning chain (3–6 steps) explaining how you judged the still against the predictions.",
            "List anomalies (hard layout/cast mistakes) and issues (softer polish).",
            "Return strict JSON only — no markdown fences.",
        ],
        "predictions": predictions,
        "outputSchema": {
            "decision": "pass|fail|uncertain",
            "reasoning": ["step 1", "step 2"],
            "predictionFindings": [
                {
                    "prediction": "exact prediction text",
                    "status": "pass|fail|uncertain",
                    "evidence": "visible observation",
                }
            ],
            "anomalies": [{"code": "short_code", "message": "what is wrong"}],
            "issues": [{"code": "short_code", "message": "softer concern"}],
            "summary": "one sentence",
        },
    }
    content = [
        {"type": "input_text", "text": json.dumps(instruction, ensure_ascii=False)},
        {"type": "input_text", "text": f"Opening still for screen '{screen_id}':"},
        {"type": "input_image", "image_url": data_url(image_path)},
    ]
    # Prefer reasoning effort when the Responses API supports it.
    kwargs: dict[str, Any] = {
        "model": model,
        "input": [{"role": "user", "content": content}],
    }
    try:
        response = client.responses.create(**kwargs, reasoning={"effort": "medium"})
    except TypeError:
        response = client.responses.create(**kwargs)
    except Exception:
        # Older models may reject reasoning= — retry plain.
        response = client.responses.create(**kwargs)

    text = (response.output_text or "").strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        return {
            "decision": "uncertain",
            "reasoning": [f"Model returned non-JSON: {error}"],
            "predictionFindings": [],
            "anomalies": [
                {
                    "code": "multimodal.invalid_json",
                    "message": f"Could not parse model output for {screen_id}",
                }
            ],
            "issues": [],
            "summary": "Evaluator returned invalid JSON",
            "raw": text[:4000],
        }
    parsed["model"] = model
    parsed["image"] = str(image_path.relative_to(ROOT)) if image_path.is_relative_to(ROOT) else str(image_path)
    parsed["screen"] = screen_id
    return parsed


def run_review(stills_dir: Path, model: str) -> dict[str, Any]:
    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit(
            "OPENAI_API_KEY missing. Source CreatureCreator/server/.env.local or export it."
        )
    client = OpenAI(api_key=api_key)

    screens: dict[str, Any] = {}
    anomalies: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    skipped: list[str] = []

    for screen_id, rubric in SCREEN_RUBRICS.items():
        path = stills_dir / rubric["file"]
        optional = bool(rubric.get("optional"))
        if not path.is_file():
            if optional:
                skipped.append(screen_id)
                screens[screen_id] = {
                    "decision": "skipped",
                    "summary": f"No still at {path.name}",
                }
                continue
            screens[screen_id] = {
                "decision": "fail",
                "reasoning": [f"Required still missing: {path}"],
                "anomalies": [
                    {
                        "code": f"{screen_id}.still_missing",
                        "message": f"Missing {path.name}",
                    }
                ],
                "issues": [],
                "predictionFindings": [],
                "summary": "Still missing",
            }
            anomalies.append(
                {"screen": screen_id, "code": f"{screen_id}.still_missing", "message": f"Missing {path.name}"}
            )
            continue

        print(f"→ multimodal {screen_id} ({path.name})", flush=True)
        result = review_still(
            client,
            model,
            screen_id,
            path,
            list(rubric["predictions"]),
        )
        screens[screen_id] = result
        for item in result.get("anomalies") or []:
            anomalies.append({"screen": screen_id, **item})
        for item in result.get("issues") or []:
            issues.append({"screen": screen_id, **item})

    failed = [
        sid
        for sid, payload in screens.items()
        if payload.get("decision") == "fail"
    ]
    return {
        "ok": len(anomalies) == 0 and not failed,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "template": "voyage_opening_multimodal_review.v1",
        "provider": "openai",
        "model": model,
        "stillsDir": str(stills_dir.relative_to(ROOT)) if stills_dir.is_relative_to(ROOT) else str(stills_dir),
        "screens": screens,
        "anomalies": anomalies,
        "issues": issues,
        "failedScreens": failed,
        "skippedScreens": skipped,
    }


def print_human(report: dict[str, Any]) -> None:
    print("=== Voyage opening multimodal review ===")
    print(f"model: {report.get('model')}")
    print(f"stills: {report.get('stillsDir')}")
    for sid, payload in (report.get("screens") or {}).items():
        decision = str(payload.get("decision", "?")).upper()
        print(f"  [{decision}] {sid} — {payload.get('summary', '')}")
        for step in payload.get("reasoning") or []:
            print(f"      reason: {step}")
        for finding in payload.get("predictionFindings") or []:
            print(
                f"      · {finding.get('status')}: {finding.get('prediction')} "
                f"— {finding.get('evidence')}"
            )
    print()
    anoms = report.get("anomalies") or []
    if anoms:
        print(f"ANOMALIES ({len(anoms)}):")
        for item in anoms:
            print(f"  - [{item.get('screen')}] {item.get('code')}: {item.get('message')}")
    else:
        print("ANOMALIES: none")
    issues = report.get("issues") or []
    if issues:
        print(f"ISSUES ({len(issues)}):")
        for item in issues:
            print(f"  - [{item.get('screen')}] {item.get('code')}: {item.get('message')}")
    print()
    print("MULTIMODAL OK" if report.get("ok") else "MULTIMODAL FOUND DEFECTS")


def latest_capture_dir() -> Path | None:
    root = ROOT / "artifacts" / "voyage-capture"
    if not root.is_dir():
        return None
    stamps = sorted([p for p in root.iterdir() if p.is_dir()], reverse=True)
    for stamp in stamps:
        if (stamp / "title.png").is_file():
            return stamp
    return None


def main(argv: list[str] | None = None) -> int:
    ensure_openai_env()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--stills",
        type=Path,
        default=None,
        help="Capture stamp directory containing title.png / chart.png / fight.png",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=ROOT / "artifacts" / "voyage-opening-dag" / "multimodal.json",
    )
    parser.add_argument("--model", default=None, help="Override VOYAGE_OPENING_EVAL_MODEL")
    args = parser.parse_args(argv)

    stills = args.stills
    if stills is None:
        stills = latest_capture_dir()
    if stills is None or not stills.is_dir():
        print("No capture stills directory found.", file=sys.stderr)
        return 2

    model = (args.model or resolve_model()).strip()
    report = run_review(stills.resolve(), model)
    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.json}")
    print_human(report)
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
