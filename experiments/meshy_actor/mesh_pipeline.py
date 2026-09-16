#!/usr/bin/env python3
"""Meshy animated humanoid spike pipeline.

Pipeline (fully automated via Meshy OpenAPI):
  1. Image-to-3D  (pose_mode=a-pose for rigging)
  2. Auto-rig / skin
  3. Multi-clip animation via action_ids → one GLB with multiple clips
  4. Optional USDZ post-process for RealityKit

Reads MESHY_API_KEY from the environment. Never writes the key to disk.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import struct
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

API_BASE = "https://api.meshy.ai/openapi/v1"

# Chosen from GET /animations/library on 2026-09-15 for the spike states.
DEFAULT_ACTIONS: dict[str, int] = {
    "idle": 0,  # Idle
    "walk": 30,  # Casual Walk
    "run": 14,  # Run 2
    "wave": 290,  # Wave One Hand
    "celebrate": 59,  # Victory Cheer
}


class PipelineError(RuntimeError):
    pass


def log(msg: str) -> None:
    print(msg, flush=True)


def ensure_key() -> str:
    key = os.environ.get("MESHY_API_KEY", "").strip()
    if not key:
        raise PipelineError("MESHY_API_KEY is not set in the environment.")
    return key


def api_request(
    method: str,
    path: str,
    *,
    key: str,
    body: dict[str, Any] | None = None,
    timeout: float = 120.0,
) -> Any:
    url = f"{API_BASE}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if not raw:
                return None
            return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise PipelineError(f"{method} {path} → HTTP {e.code}: {detail}") from e
    except urllib.error.URLError as e:
        raise PipelineError(f"{method} {path} → network error: {e}") from e


def save_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def download(url: str, dest: Path, *, timeout: float = 300.0) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "meshy-actor-spike/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    return dest


def image_to_data_uri(image_path: Path) -> str:
    mime, _ = mimetypes.guess_type(str(image_path))
    if mime is None:
        mime = "image/png"
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def poll_task(
    kind: str,
    task_id: str,
    *,
    key: str,
    logs_dir: Path,
    interval_s: float = 5.0,
    timeout_s: float = 1800.0,
) -> dict[str, Any]:
    """Poll until SUCCEEDED / FAILED / CANCELED. Persist every response."""
    started = time.time()
    n = 0
    while True:
        n += 1
        if kind == "image-to-3d":
            task = api_request("GET", f"/image-to-3d/{task_id}", key=key)
        elif kind == "rigging":
            task = api_request("GET", f"/rigging/{task_id}", key=key)
        elif kind == "animations":
            task = api_request("GET", f"/animations/{task_id}", key=key)
        else:
            raise PipelineError(f"Unknown poll kind: {kind}")

        save_json(logs_dir / f"{kind}_{task_id}_poll_{n:04d}.json", task)
        status = task.get("status")
        progress = task.get("progress")
        log(f"  [{kind}] {task_id} status={status} progress={progress}")

        if status == "SUCCEEDED":
            save_json(logs_dir / f"{kind}_{task_id}_final.json", task)
            return task
        if status in {"FAILED", "CANCELED"}:
            save_json(logs_dir / f"{kind}_{task_id}_final.json", task)
            err = (task.get("task_error") or {}).get("message") or json.dumps(task)
            raise PipelineError(f"{kind} task {task_id} {status}: {err}")
        if time.time() - started > timeout_s:
            raise PipelineError(f"{kind} task {task_id} timed out after {timeout_s}s")
        time.sleep(interval_s)


def inspect_glb(path: Path) -> dict[str, Any]:
    """Lightweight GLB/glTF inspector — no Blender, no third-party deps."""
    data = path.read_bytes()
    size = path.stat().st_size
    report: dict[str, Any] = {
        "path": str(path),
        "file_size_bytes": size,
        "file_size_mb": round(size / (1024 * 1024), 3),
    }
    if len(data) < 12 or data[0:4] != b"glTF":
        report["error"] = "Not a GLB (missing glTF magic)"
        return report

    version, length = struct.unpack_from("<II", data, 4)
    report["glb_version"] = version
    report["glb_declared_length"] = length

    offset = 12
    json_chunk: dict[str, Any] | None = None
    while offset + 8 <= len(data):
        chunk_len, chunk_type = struct.unpack_from("<I4s", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_len]
        offset += chunk_len
        if chunk_type == b"JSON":
            json_chunk = json.loads(chunk.decode("utf-8"))
            break

    if json_chunk is None:
        report["error"] = "No JSON chunk found"
        return report

    nodes = json_chunk.get("nodes") or []
    meshes = json_chunk.get("meshes") or []
    skins = json_chunk.get("skins") or []
    animations = json_chunk.get("animations") or []
    materials = json_chunk.get("materials") or []
    textures = json_chunk.get("textures") or []
    images = json_chunk.get("images") or []
    accessors = json_chunk.get("accessors") or []

    joint_indices: set[int] = set()
    for skin in skins:
        for j in skin.get("joints") or []:
            joint_indices.add(j)

    triangle_count = 0
    for mesh in meshes:
        for prim in mesh.get("primitives") or []:
            indices_acc = prim.get("indices")
            mode = prim.get("mode", 4)  # 4 = TRIANGLES
            if indices_acc is not None and mode == 4:
                count = accessors[indices_acc].get("count", 0)
                triangle_count += count // 3
            elif mode == 4:
                # Non-indexed triangles via POSITION accessor
                attrs = prim.get("attributes") or {}
                pos = attrs.get("POSITION")
                if pos is not None:
                    triangle_count += accessors[pos].get("count", 0) // 3

    anim_names = [a.get("name") or f"unnamed_{i}" for i, a in enumerate(animations)]
    joint_names = []
    for idx in sorted(joint_indices):
        if 0 <= idx < len(nodes):
            joint_names.append(nodes[idx].get("name") or f"node_{idx}")

    report.update(
        {
            "mesh_count": len(meshes),
            "node_count": len(nodes),
            "skeleton_skin_present": len(skins) > 0,
            "skin_count": len(skins),
            "joint_bone_count": len(joint_indices),
            "joint_names_sample": joint_names[:40],
            "animation_clip_count": len(animations),
            "animation_clip_names": anim_names,
            "material_count": len(materials),
            "texture_count": len(textures),
            "image_count": len(images),
            "triangle_count_approx": triangle_count,
            "extensions_used": json_chunk.get("extensionsUsed") or [],
            "asset": json_chunk.get("asset") or {},
        }
    )
    return report


def run_pipeline(image_path: Path, out_dir: Path) -> dict[str, Any]:
    key = ensure_key()
    image_path = image_path.resolve()
    if not image_path.is_file():
        raise PipelineError(f"Input image not found: {image_path}")

    intermediates = out_dir / "intermediates"
    logs = out_dir / "logs"
    intermediates.mkdir(parents=True, exist_ok=True)
    logs.mkdir(parents=True, exist_ok=True)

    summary: dict[str, Any] = {
        "input_image": str(image_path),
        "actions": DEFAULT_ACTIONS,
        "stages": {},
    }

    # --- Stage 1: Image-to-3D ---
    log("== Stage 1: Image-to-3D ==")
    data_uri = image_to_data_uri(image_path)
    # Keep a copy of the source next to intermediates for provenance.
    source_copy = intermediates / "source_character.png"
    if image_path.resolve() != source_copy.resolve():
        source_copy.write_bytes(image_path.read_bytes())

    i23_body = {
        # Docs (2026): a-pose helps auto-rig; remesh keeps face count under 300k.
        "image_url": data_uri,
        "ai_model": "latest",
        "should_texture": True,
        "enable_pbr": True,
        "should_remesh": True,
        "target_polycount": 60000,
        "pose_mode": "a-pose",
        "target_formats": ["glb"],
    }
    # Don't persist the huge data URI in logs.
    save_json(
        logs / "image_to_3d_request_meta.json",
        {k: v for k, v in i23_body.items() if k != "image_url"}
        | {"image_url": f"<data-uri omitted, source={source_copy.name}>"},
    )

    created = api_request("POST", "/image-to-3d", key=key, body=i23_body)
    save_json(logs / "image_to_3d_create.json", created)
    i23_id = created.get("result") if isinstance(created, dict) else created
    if not isinstance(i23_id, str):
        # Some responses return the id at top level.
        i23_id = created.get("id") if isinstance(created, dict) else None
    if not i23_id:
        raise PipelineError(f"Unexpected image-to-3d create response: {created}")
    log(f"  created image-to-3d task: {i23_id}")

    i23 = poll_task("image-to-3d", i23_id, key=key, logs_dir=logs)
    model_urls = i23.get("model_urls") or {}
    glb_url = model_urls.get("glb")
    if not glb_url:
        raise PipelineError("Image-to-3D succeeded but no model_urls.glb")
    mesh_glb = download(glb_url, intermediates / "01_image_to_3d.glb")
    log(f"  downloaded mesh → {mesh_glb}")
    if i23.get("thumbnail_url"):
        try:
            download(i23["thumbnail_url"], intermediates / "01_thumbnail.png")
        except Exception as e:  # noqa: BLE001 — best-effort artifact
            log(f"  warn: thumbnail download failed: {e}")

    summary["stages"]["image_to_3d"] = {
        "task_id": i23_id,
        "status": i23.get("status"),
        "consumed_credits": i23.get("consumed_credits"),
        "output": str(mesh_glb),
        "inspection": inspect_glb(mesh_glb),
    }

    # --- Stage 2: Rigging ---
    log("== Stage 2: Rigging ==")
    rig_body = {
        "input_task_id": i23_id,
        "height_meters": 1.2,  # child-proportioned stylized humanoid
    }
    save_json(logs / "rigging_request.json", rig_body)
    created = api_request("POST", "/rigging", key=key, body=rig_body)
    save_json(logs / "rigging_create.json", created)
    rig_id = created.get("result") if isinstance(created, dict) else created
    if not isinstance(rig_id, str):
        rig_id = created.get("id") if isinstance(created, dict) else None
    if not rig_id:
        raise PipelineError(f"Unexpected rigging create response: {created}")
    log(f"  created rigging task: {rig_id}")

    rig = poll_task("rigging", rig_id, key=key, logs_dir=logs)
    result = rig.get("result") or {}
    rigged_url = result.get("rigged_character_glb_url")
    if not rigged_url:
        raise PipelineError("Rigging succeeded but no rigged_character_glb_url")
    rigged_glb = download(rigged_url, intermediates / "02_rigged_character.glb")
    log(f"  downloaded rigged character → {rigged_glb}")

    basic = result.get("basic_animations") or {}
    for label, url_key in (
        ("walk_basic", "walking_glb_url"),
        ("run_basic", "running_glb_url"),
    ):
        url = basic.get(url_key)
        if url:
            download(url, intermediates / f"02_basic_{label}.glb")

    summary["stages"]["rigging"] = {
        "task_id": rig_id,
        "status": rig.get("status"),
        "consumed_credits": rig.get("consumed_credits"),
        "output": str(rigged_glb),
        "inspection": inspect_glb(rigged_glb),
        "basic_animation_keys": list(basic.keys()),
    }

    # --- Stage 3: Multi-clip animation ---
    log("== Stage 3: Multi-clip animation (action_ids) ==")
    action_ids = list(DEFAULT_ACTIONS.values())
    anim_body = {
        "rig_task_id": rig_id,
        "action_ids": action_ids,
        # RealityKit prefers USDZ; Meshy can convert the merged FBX.
        "post_process": {"operation_type": "fbx2usdz"},
    }
    save_json(logs / "animations_request.json", anim_body)
    save_json(logs / "action_id_map.json", DEFAULT_ACTIONS)

    created = api_request("POST", "/animations", key=key, body=anim_body)
    save_json(logs / "animations_create.json", created)
    anim_id = created.get("result") if isinstance(created, dict) else created
    if not isinstance(anim_id, str):
        anim_id = created.get("id") if isinstance(created, dict) else None
    if not anim_id:
        raise PipelineError(f"Unexpected animations create response: {created}")
    log(f"  created animation task: {anim_id} action_ids={action_ids}")

    anim = poll_task("animations", anim_id, key=key, logs_dir=logs)
    ares = anim.get("result") or {}
    anim_glb_url = ares.get("animation_glb_url")
    if not anim_glb_url:
        raise PipelineError("Animation succeeded but no animation_glb_url")

    character_glb = download(anim_glb_url, out_dir / "character.glb")
    # Also keep under intermediates for provenance.
    download(anim_glb_url, intermediates / "03_animated_multiclip.glb")
    log(f"  downloaded multi-clip GLB → {character_glb}")

    usdz_path = None
    usdz_url = ares.get("processed_usdz_url")
    if usdz_url:
        usdz_path = download(usdz_url, out_dir / "character.usdz")
        download(usdz_url, intermediates / "03_animated_multiclip.usdz")
        log(f"  downloaded USDZ → {usdz_path}")
    else:
        log("  warn: no processed_usdz_url (fbx2usdz may have been skipped)")

    inspection = inspect_glb(character_glb)
    save_json(out_dir / "inspection.json", inspection)
    log(f"  inspection written → {out_dir / 'inspection.json'}")
    log(f"  clips: {inspection.get('animation_clip_names')}")

    summary["stages"]["animations"] = {
        "task_id": anim_id,
        "status": anim.get("status"),
        "consumed_credits": anim.get("consumed_credits"),
        "action_ids": action_ids,
        "action_map": DEFAULT_ACTIONS,
        "output_glb": str(character_glb),
        "output_usdz": str(usdz_path) if usdz_path else None,
        "inspection": inspection,
    }
    summary["final_glb"] = str(character_glb)
    summary["final_usdz"] = str(usdz_path) if usdz_path else None
    save_json(out_dir / "pipeline_summary.json", summary)
    log("== Pipeline complete ==")
    log(json.dumps({"final_glb": summary["final_glb"], "final_usdz": summary["final_usdz"]}, indent=2))
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Meshy animated actor spike pipeline")
    parser.add_argument(
        "image",
        nargs="?",
        default="output/intermediates/source_character.png",
        help="Path to rigging-optimized humanoid reference image",
    )
    parser.add_argument(
        "--out",
        default="output",
        help="Output directory (default: ./output relative to cwd)",
    )
    parser.add_argument(
        "--inspect-only",
        metavar="GLB",
        help="Only inspect an existing GLB and write inspection.json",
    )
    args = parser.parse_args()

    # Run relative to this script's directory so paths stay stable.
    root = Path(__file__).resolve().parent
    os.chdir(root)
    out_dir = Path(args.out)

    try:
        if args.inspect_only:
            report = inspect_glb(Path(args.inspect_only))
            dest = out_dir / "inspection.json"
            save_json(dest, report)
            log(json.dumps(report, indent=2))
            log(f"Wrote {dest}")
            return 0
        run_pipeline(Path(args.image), out_dir)
        return 0
    except PipelineError as e:
        log(f"ERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
