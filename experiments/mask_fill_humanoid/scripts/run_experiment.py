#!/usr/bin/env python3
"""Run mask-fill conditions against /api/create and OpenAI images.edit."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
INPUTS = ROOT / "inputs"
OUTPUTS = ROOT / "outputs"
PROMPT_A = "clay kid left bicep, knitted orange sweater sleeve"
PROMPT_FILL = (
    "fill ONLY the white mask with this knitted fabric as the bicep / upper sleeve. "
    "Do not change the rest of the body."
)
PROMPT_B = (
    "Fill ONLY the masked left-upper-arm / bicep region of this clay kid figure "
    "with a knitted orange sweater sleeve. Do not change the rest of the body, "
    "face, or background."
)
PREFERRED_MODELS = [
    "gpt-image-2.5-flare",
    "gpt-image-1.5",
    "gpt-image-1",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'").strip('"')
    return values


def load_secrets() -> dict[str, str]:
    merged: dict[str, str] = {}
    candidates = [
        ROOT.parents[1] / ".env",
        ROOT.parents[1] / "CreatureCreator" / "server" / ".env.local",
        Path.home() / ".env",
    ]
    for path in candidates:
        merged.update(load_dotenv(path))
    for key in (
        "ABBIES_WORLD_SERVER_API_KEY",
        "ABBIES_WORLD_API_KEY",
        "OPENAI_API_KEY",
        "ABBIES_WORLD_SERVER_URL",
    ):
        if os.environ.get(key):
            merged[key] = os.environ[key]
    return merged


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def redact(payload: dict[str, Any]) -> dict[str, Any]:
    blocked = {
        "authorization",
        "api_key",
        "apikey",
        "openai_api_key",
        "abbies_world_server_api_key",
        "abbies_world_api_key",
    }
    cleaned: dict[str, Any] = {}
    for key, value in payload.items():
        if key.lower() in blocked or "key" in key.lower() or "token" in key.lower():
            cleaned[key] = "REDACTED"
        elif isinstance(value, dict):
            cleaned[key] = redact(value)
        else:
            cleaned[key] = value
    return cleaned


def analyze(output_path: Path, original_path: Path, edit_mask_path: Path) -> dict[str, Any]:
    output = Image.open(output_path).convert("RGB").resize((1024, 1024))
    original = Image.open(original_path).convert("RGB")
    mask = Image.open(edit_mask_path).convert("RGBA")
    edit = Image.eval(mask.split()[-1], lambda p: 255 if p == 0 else 0)
    keep = Image.eval(edit, lambda p: 255 - p)
    diff = ImageChops.difference(original, output)
    gray = diff.convert("L")
    changed = gray.point(lambda p: 255 if p > 18 else 0)

    def region_stats(region: Image.Image) -> dict[str, float]:
        clipped = ImageChops.multiply(changed, region)
        total = ImageStat.Stat(region).sum[0] / 255.0
        changed_count = ImageStat.Stat(clipped).sum[0] / 255.0
        mean_diff = ImageStat.Stat(ImageChops.multiply(gray, region)).mean[0]
        return {
            "pixels": round(total),
            "changed_pixels": round(changed_count),
            "changed_pct": round((changed_count / total) * 100, 2) if total else 0.0,
            "mean_abs_diff": round(mean_diff, 2),
        }

    bicep_rgb = Image.composite(output, Image.new("RGB", output.size, (0, 0, 0)), edit)
    color = ImageStat.Stat(bicep_rgb, mask=edit).mean
    return {
        "edit_region": region_stats(edit),
        "keep_region": region_stats(keep),
        "bicep_mean_rgb": [round(c, 1) for c in color],
        "threshold": 18,
    }


def parse_sse_image(text: str) -> dict[str, Any]:
    last: dict[str, Any] = {}
    for raw in text.splitlines():
        if not raw.startswith("data: "):
            continue
        try:
            event = json.loads(raw[6:])
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict):
            last = event
            if event.get("status") in {"done", "completed", "complete"} or event.get("type") == "final":
                return event
    return last


class HardFailure(RuntimeError):
    pass


def probe_create(base_url: str, api_key: str) -> dict[str, Any]:
    health = requests.get(f"{base_url}/api/health", timeout=20)
    probe_body = {
        "recipeItems": [],
        "freeTextDescription": "probe only — should 400 or ignore extra fields",
        "referenceImageIds": [],
        "quality": "low",
        "model": "gpt-image-2.5-flare",
        "mask": "<pixel-mask-not-supported-probe>",
        "image": "<pixel-image-not-supported-probe>",
    }
    # Intentionally tiny/invalid so we learn accepted fields without spending image credits.
    response = requests.post(
        f"{base_url}/api/create",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json={
            "recipeItems": "not-an-array",
            "mask": {"note": "does this field exist"},
            "quality": "low",
            "model": "gpt-image-2.5-flare",
        },
        timeout=30,
    )
    return {
        "health_status": health.status_code,
        "health_ok": health.ok,
        "invalid_probe_status": response.status_code,
        "invalid_probe_body": response.text[:800],
        "would_have_sent_fields": sorted(probe_body.keys()),
        "client_known_fields": [
            "recipeItems",
            "freeTextDescription",
            "referenceImageIds",
            "quality",
            "model",
            "imageWidth",
            "imageHeight",
            "packId",
            "packVersion",
            "packManifestChecksum",
            "packSelections",
        ],
        "pixel_mask_field_in_server_source": False,
    }


def download_create_image(base_url: str, api_key: str, image_url: str, dest: Path) -> None:
    if image_url.startswith("/"):
        url = urljoin(base_url + "/", image_url.lstrip("/"))
    else:
        url = image_url
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=60,
    )
    response.raise_for_status()
    dest.write_bytes(response.content)


def run_create_condition(
    *,
    condition: str,
    prompt: str,
    base_url: str,
    api_key: str,
    reference_ids: list[str] | None,
    extra_fields: dict[str, Any] | None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "recipeItems": [],
        "freeTextDescription": prompt,
        "quality": "low",
        "model": "gpt-image-2.5-flare",
    }
    if reference_ids:
        body["referenceImageIds"] = reference_ids
    if extra_fields:
        body.update(extra_fields)
    started = time.time()
    response = requests.post(
        f"{base_url}/api/create",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        json=body,
        timeout=600,
    )
    elapsed = round(time.time() - started, 2)
    record: dict[str, Any] = {
        "api": "abbies.world /api/create",
        "condition": condition,
        "http_status": response.status_code,
        "elapsed_sec": elapsed,
        "request": redact({k: v for k, v in body.items()}),
        "response_excerpt": response.text[:1200],
        "ok": False,
    }
    if response.status_code >= 500:
        raise HardFailure(f"/api/create hard failure HTTP {response.status_code}")
    if not response.ok:
        record["error"] = f"HTTP {response.status_code}"
        return record
    event = parse_sse_image(response.text)
    record["sse_event_keys"] = sorted(event.keys())
    image_url = event.get("image_url") or event.get("url")
    if not image_url:
        record["error"] = "no image_url in SSE stream"
        record["sse_event"] = event
        return record
    dest = OUTPUTS / f"{condition}_create.png"
    download_create_image(base_url, api_key, str(image_url), dest)
    record.update(
        {
            "ok": True,
            "output": str(dest.relative_to(ROOT)),
            "image_url": image_url,
            "sse_status": event.get("status"),
            "model_used": event.get("modelUsed") or event.get("model_used"),
        }
    )
    return record


def upload_reference(base_url: str, api_key: str, path: Path) -> str:
    with path.open("rb") as handle:
        response = requests.post(
            f"{base_url}/api/reference-image",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (path.name, handle, "image/png")},
            timeout=60,
        )
    if response.status_code >= 500:
        raise HardFailure(f"reference upload hard failure HTTP {response.status_code}")
    response.raise_for_status()
    payload = response.json()
    image_id = payload.get("image_id") or payload.get("id")
    if not image_id:
        raise HardFailure("reference upload returned no image_id")
    return str(image_id)


def openai_client(api_key: str):
    from openai import OpenAI

    return OpenAI(api_key=api_key, timeout=600, max_retries=1)


def save_b64_png(b64_json: str, dest: Path) -> None:
    import base64

    dest.write_bytes(base64.b64decode(b64_json))


def run_openai_condition(
    *,
    client: Any,
    condition: str,
    prompt: str,
    images: list[Path],
    mask: Path | None,
    model: str,
) -> dict[str, Any]:
    started = time.time()
    request_meta = {
        "api": "openai.images." + ("edit" if images else "generate"),
        "condition": condition,
        "model": model,
        "quality": "low",
        "size": "1024x1024",
        "prompt": prompt,
        "images": [str(path.relative_to(ROOT)) for path in images],
        "mask": str(mask.relative_to(ROOT)) if mask else None,
        "mask_convention": (
            "alpha=0 edit / alpha=255 keep" if mask else None
        ),
    }
    try:
        if images:
            handles = [path.open("rb") for path in images]
            mask_handle = mask.open("rb") if mask else None
            try:
                kwargs: dict[str, Any] = {
                    "model": model,
                    "prompt": prompt,
                    "image": handles[0] if len(handles) == 1 else handles,
                    "size": "1024x1024",
                    "quality": "low",
                    "n": 1,
                }
                if mask_handle is not None:
                    kwargs["mask"] = mask_handle
                try:
                    kwargs["output_format"] = "png"
                    response = client.images.edit(**kwargs)
                except TypeError:
                    kwargs.pop("output_format", None)
                    response = client.images.edit(**kwargs)
            finally:
                for handle in handles:
                    handle.close()
                if mask_handle is not None:
                    mask_handle.close()
        else:
            kwargs = {
                "model": model,
                "prompt": prompt,
                "size": "1024x1024",
                "quality": "low",
                "n": 1,
            }
            try:
                kwargs["output_format"] = "png"
                response = client.images.generate(**kwargs)
            except TypeError:
                kwargs.pop("output_format", None)
                response = client.images.generate(**kwargs)
        encoded = response.data[0].b64_json
        if not encoded:
            raise HardFailure("OpenAI returned no b64_json")
        dest = OUTPUTS / f"{condition}_openai.png"
        save_b64_png(encoded, dest)
        return {
            **request_meta,
            "ok": True,
            "elapsed_sec": round(time.time() - started, 2),
            "output": str(dest.relative_to(ROOT)),
        }
    except HardFailure:
        raise
    except Exception as error:
        message = str(error)
        record = {
            **request_meta,
            "ok": False,
            "elapsed_sec": round(time.time() - started, 2),
            "error_type": type(error).__name__,
            "error": message[:800],
        }
        if "insufficient_quota" in message or "invalid_api_key" in message:
            raise HardFailure(message) from error
        return record


def pick_working_model(client: Any) -> tuple[str, dict[str, Any]]:
    last: dict[str, Any] = {}
    for model in PREFERRED_MODELS:
        # Cheap generate probe: skip — first real condition A is the probe.
        return model, {"selected": model, "strategy": "prefer listed order, first success wins"}
    return PREFERRED_MODELS[0], last


def main() -> int:
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    secrets = load_secrets()
    server_key = (
        secrets.get("ABBIES_WORLD_SERVER_API_KEY")
        or secrets.get("ABBIES_WORLD_API_KEY")
    )
    openai_key = secrets.get("OPENAI_API_KEY")
    base_url = (
        secrets.get("ABBIES_WORLD_SERVER_URL")
        or os.environ.get("ABBIES_WORLD_SERVER_URL")
        or "http://abbies.world:8000"
    ).rstrip("/")

    summary: dict[str, Any] = {
        "startedAt": utc_now(),
        "base_url": base_url,
        "has_server_key": bool(server_key),
        "has_openai_key": bool(openai_key),
        "conditions": {},
        "stopped_early": False,
    }

    if server_key:
        try:
            summary["create_probe"] = probe_create(base_url, server_key)
        except Exception as error:
            summary["create_probe"] = {
                "ok": False,
                "error_type": type(error).__name__,
                "error": str(error)[:400],
            }

    try:
        if server_key:
            print("Running /api/create condition A (prompt-only)")
            summary["conditions"]["A_create"] = run_create_condition(
                condition="A_prompt_only",
                prompt=PROMPT_A,
                base_url=base_url,
                api_key=server_key,
                reference_ids=None,
                extra_fields=None,
            )
            if summary["conditions"]["A_create"].get("ok"):
                summary["conditions"]["A_create"]["analysis"] = analyze(
                    OUTPUTS / "A_prompt_only_create.png",
                    INPUTS / "humanoid.png",
                    INPUTS / "mask_bicep.png",
                )
            print("Skipping /api/create B–D pixel-mask fills: server CreateRequest has no mask.")
            summary["create_mask_finding"] = (
                "POST /api/create cannot take a pixel mask. Accepted generation "
                "fields are recipeItems, freeTextDescription, referenceImageIds, "
                "optional quality/model on the iOS client, plus pack + size fields. "
                "There is no image/mask multipart slot."
            )
        else:
            summary["create_mask_finding"] = "No server API key; skipped /api/create."

        if not openai_key:
            raise HardFailure("OPENAI_API_KEY missing; cannot run mask-aligned images.edit")

        from openai import OpenAI

        client = OpenAI(api_key=openai_key, timeout=600, max_retries=1)
        model = PREFERRED_MODELS[0]
        summary["openai_model_preference"] = PREFERRED_MODELS

        conditions = [
            {
                "id": "A_prompt_only",
                "prompt": PROMPT_A,
                "images": [],
                "mask": None,
            },
            {
                "id": "B_mask_prompt",
                "prompt": PROMPT_B,
                "images": [INPUTS / "humanoid.png"],
                "mask": INPUTS / "mask_bicep.png",
            },
            {
                "id": "C_mask_fabric",
                "prompt": PROMPT_FILL,
                "images": [INPUTS / "humanoid.png", INPUTS / "fabric.png"],
                "mask": INPUTS / "mask_bicep.png",
            },
            {
                "id": "D_mask_character_fabric",
                "prompt": PROMPT_FILL,
                "images": [
                    INPUTS / "humanoid.png",
                    INPUTS / "character.png",
                    INPUTS / "fabric.png",
                ],
                "mask": INPUTS / "mask_bicep.png",
            },
        ]

        used_model = model
        for spec in conditions:
            print(f"Running OpenAI condition {spec['id']} model={used_model}")
            record = run_openai_condition(
                client=client,
                condition=spec["id"],
                prompt=spec["prompt"],
                images=spec["images"],
                mask=spec["mask"],
                model=used_model,
            )
            if not record.get("ok"):
                error_text = record.get("error", "")
                if "model" in error_text.lower() and (
                    "not found" in error_text.lower() or "invalid" in error_text.lower()
                ):
                    for fallback in PREFERRED_MODELS[1:]:
                        print(f"Retrying {spec['id']} with {fallback}")
                        record = run_openai_condition(
                            client=client,
                            condition=spec["id"],
                            prompt=spec["prompt"],
                            images=spec["images"],
                            mask=spec["mask"],
                            model=fallback,
                        )
                        if record.get("ok"):
                            used_model = fallback
                            break
                        if "insufficient_quota" in str(record.get("error", "")):
                            raise HardFailure(str(record.get("error")))
            if record.get("ok"):
                record["analysis"] = analyze(
                    OUTPUTS / f"{spec['id']}_openai.png",
                    INPUTS / "humanoid.png",
                    INPUTS / "mask_bicep.png",
                )
            summary["conditions"][f"{spec['id']}_openai"] = record
            write_json(OUTPUTS / f"{spec['id']}_openai_meta.json", redact(record))
            if not record.get("ok"):
                print(f"Condition {spec['id']} failed; stopping remaining OpenAI calls.")
                summary["stopped_early"] = True
                break

    except HardFailure as error:
        summary["stopped_early"] = True
        summary["hard_failure"] = {
            "error_type": type(error).__name__,
            "error": str(error)[:800],
        }
        print(f"Hard failure: {error}")

    summary["finishedAt"] = utc_now()
    write_json(OUTPUTS / "run_summary.json", redact(summary))
    print(f"Wrote {OUTPUTS / 'run_summary.json'}")
    return 1 if summary.get("stopped_early") and not any(
        value.get("ok") for value in summary.get("conditions", {}).values()
    ) else 0


if __name__ == "__main__":
    raise SystemExit(main())
