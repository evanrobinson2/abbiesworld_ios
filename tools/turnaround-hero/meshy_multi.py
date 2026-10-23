#!/usr/bin/env python3
"""AW-STUDY-0023: Meshy multi-image-to-3D on the hero's front, side and back views.

usage: MESHY_API_KEY=... python3 tools/turnaround-hero/meshy_multi.py [--single]

--single falls back to image-to-3d on ref/hero-front.png with the same settings.
Reuses the request, download and GLB-inspect helpers from experiments/meshy_actor/mesh_pipeline.py.
The key is read from the environment only and never written anywhere.
"""
import sys, time, json, hashlib
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "experiments/meshy_actor"))
from mesh_pipeline import ensure_key, api_request, download, image_to_data_uri, inspect_glb, PipelineError  # noqa: E402

HERE = ROOT / "tools/turnaround-hero"
OUT = HERE / "meshy"
VIEWS = [HERE / f"ref/turnaround/view_{v}.png" for v in ("front", "side", "back")]
SETTINGS = {"should_remesh": True, "topology": "triangle", "target_polycount": 30000, "should_texture": False}


def now():
    return datetime.now(timezone.utc).isoformat()


def balance(key):
    try:
        return api_request("GET", "/balance", key=key).get("balance")
    except PipelineError:
        return None


def poll(kind, task_id, key, timeout_s=1800):
    t0 = time.time()
    while True:
        task = api_request("GET", f"/{kind}/{task_id}", key=key)
        print(f"  [{kind}] {task_id} status={task.get('status')} progress={task.get('progress')}", flush=True)
        if task.get("status") == "SUCCEEDED":
            return task
        if task.get("status") in ("FAILED", "CANCELED"):
            raise PipelineError(f"{kind} {task_id} {task.get('status')}: {(task.get('task_error') or {}).get('message')}")
        if time.time() - t0 > timeout_s:
            raise PipelineError(f"{kind} {task_id} timed out")
        time.sleep(6)


def main():
    key = ensure_key()
    single = "--single" in sys.argv
    if single:
        kind, sources = "image-to-3d", [HERE / "ref/hero-front.png"]
        body = {"image_url": image_to_data_uri(sources[0]), **SETTINGS}
    else:
        kind, sources = "multi-image-to-3d", VIEWS
        body = {"image_urls": [image_to_data_uri(p) for p in sources], **SETTINGS}
    before = balance(key)
    submitted = now()
    task_id = api_request("POST", f"/{kind}", key=key, body=body)["result"]
    print(f"submitted {kind} task {task_id}", flush=True)
    task = poll(kind, task_id, key)
    after = balance(key)
    glb = download(task["model_urls"]["glb"], OUT / "hero_meshy.glb")
    stats = inspect_glb(glb)
    stats["path"] = str(glb.relative_to(ROOT))
    prov = {
        "study": "AW-STUDY-0023 Turnaround Hero",
        "tool": f"Meshy {kind} (OpenAPI v1)",
        "source_images": [{"file": str(p.relative_to(ROOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources],
        "meshy_task_id": task_id,
        "request_settings": {**SETTINGS, ("image_url" if single else "image_urls"): "base64 data URIs of source_images"},
        "fallback_single_image": single,
        "submitted_at": submitted,
        "meshy_created_at": task.get("created_at"),
        "meshy_started_at": task.get("started_at"),
        "meshy_finished_at": task.get("finished_at"),
        "downloaded_at": now(),
        "credits_used": (before - after) if before is not None and after is not None else None,
        "glb": {"path": stats["path"], "sha256": hashlib.sha256(glb.read_bytes()).hexdigest(), "inspect": stats},
    }
    (OUT / "provenance.json").write_text(json.dumps(prov, indent=2) + "\n")
    print(json.dumps({"task_id": task_id, "bytes": stats["file_size_bytes"], "tris": stats.get("triangle_count_approx"), "credits": prov["credits_used"]}))


if __name__ == "__main__":
    main()
