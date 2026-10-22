"""Outbound pull from Studio cloud queue (creative.executionCapacity).

Worker machine reaches out — no inbound tunnel.
"""
from __future__ import annotations

import json
import os
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from auth import load_household_token

ROOT = Path(__file__).resolve().parent
WORKER_ID_PATH = ROOT / "data" / "worker_id.txt"
DEFAULT_CLOUD = "https://studio-mock-iota.vercel.app"

_last_cloud_error: str | None = None


def cloud_enabled() -> bool:
    raw = str(os.environ.get("EXECUTION_CAPACITY_CLOUD_PULL", "1")).strip().lower()
    return raw not in ("0", "false", "no", "off")


def cloud_base() -> str:
    return str(os.environ.get("EXECUTION_CAPACITY_CLOUD_URL") or DEFAULT_CLOUD).rstrip("/")


def worker_id() -> str:
    WORKER_ID_PATH.parent.mkdir(parents=True, exist_ok=True)
    if WORKER_ID_PATH.is_file():
        existing = WORKER_ID_PATH.read_text(encoding="utf-8").strip()
        if existing:
            return existing
    prefix = "win" if sys.platform == "win32" else "mac" if sys.platform == "darwin" else "linux"
    stable = f"{prefix}.{socket.gethostname()}"
    WORKER_ID_PATH.write_text(stable + "\n", encoding="utf-8")
    return stable


def _request(op: str, payload: dict | None = None, *, method: str = "POST", job_id: str | None = None) -> dict:
    token = load_household_token()
    if not token:
        return {"ok": False, "error": "no_household_token"}
    base = cloud_base()
    if method == "GET":
        url = f"{base}/api/execution-capacity"
        if job_id:
            url += f"?jobId={urllib.parse.quote(job_id)}"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            method="GET",
        )
    else:
        body = {"op": op, **(payload or {})}
        data = json.dumps(body).encode()
        req = urllib.request.Request(
            f"{base}/api/execution-capacity",
            data=data,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
    try:
        with urllib.request.urlopen(req, timeout=45) as res:
            raw = res.read().decode() or "{}"
            return json.loads(raw)
    except urllib.error.HTTPError as err:
        raw = err.read().decode() if err.fp else ""
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"message": raw[:300]}
        return {"ok": False, "error": f"http_{err.code}", **parsed}
    except Exception as err:  # noqa: BLE001 — surface to worker loop
        return {"ok": False, "error": "cloud_unreachable", "message": str(err)[:200]}


def claim_job(capabilities: list[str] | None = None) -> dict | None:
    global _last_cloud_error
    if not cloud_enabled():
        return None
    res = _request(
        "claim",
        {
            "workerId": worker_id(),
            "capabilities": capabilities or ["midjourney.imagine"],
        },
    )
    if not res.get("ok"):
        # Stash last cloud error for the tray/status surface.
        err = res.get("error") or res.get("message") or "cloud_claim_failed"
        msg = f"{err} {res.get('message') or ''}".lower()
        if "unauthorized" in msg or "invalid access token" in msg or "http_401" in msg:
            _last_cloud_error = "cloud_auth_expired — refresh ~/.abbies_world_token (Studio → Copy MCP token)"
        else:
            _last_cloud_error = str(err)[:180]
        return None
    _last_cloud_error = None
    job = res.get("job")
    return job if isinstance(job, dict) else None


def last_cloud_error() -> str | None:
    return _last_cloud_error


def heartbeat(*, current_job_id: str | None = None, last_message: str | None = None) -> dict:
    if not cloud_enabled():
        return {"ok": False, "skipped": True}
    return _request(
        "heartbeat",
        {
            "workerId": worker_id(),
            "capabilities": ["midjourney.imagine"],
            "currentJobId": current_job_id,
            "lastMessage": last_message,
        },
    )


def complete_job(job_id: str, result: dict) -> dict:
    return _request(
        "complete",
        {"jobId": job_id, "workerId": worker_id(), "result": result},
    )


def fail_job(job_id: str, error: str, *, requeue: bool = True) -> dict:
    return _request(
        "fail",
        {
            "jobId": job_id,
            "workerId": worker_id(),
            "error": error,
            "requeue": requeue,
        },
    )


def get_job(job_id: str) -> dict:
    return _request("status", method="GET", job_id=job_id)
