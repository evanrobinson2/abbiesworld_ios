"""Shared helpers for mind-meld hooks. Keep the hot path under a few ms."""

from __future__ import annotations

import fcntl
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

HOOKS_DIR = Path(__file__).resolve().parent
REPO = HOOKS_DIR.parents[1]
MIND = REPO / "mind"
TRANSCRIPT = MIND / "transcript.ndjson"
SESSIONS = MIND / "sessions"
LOCK = MIND / ".append.lock"

PARTICIPATE = (
    "gothic_invasion",
    "rome_history",
    "luna",
)

TEXT_LIMIT = 4000


def repo_root() -> Path:
    return REPO


def body_name() -> str:
    if os.environ.get("CURSOR_CODE_REMOTE") == "true":
        return "cloud"
    if Path("/workspace").is_dir() and str(REPO).startswith("/workspace"):
        return "cloud"
    return "localhost"


def should_participate(payload: dict) -> bool:
    roots = payload.get("workspace_roots") or []
    env_root = os.environ.get("CURSOR_PROJECT_DIR") or ""
    hay = " ".join(str(r) for r in roots + [env_root, str(REPO)]).lower()
    if any(m in hay for m in PARTICIPATE):
        return True
    # Cloud clone of this repo (folder name may be rome_history_videos)
    cwd = str(payload.get("cwd") or "")
    return "rome_history" in cwd.lower() or "gothic_invasion" in cwd.lower()


def read_stdin() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"_raw": raw[:2000]}
    return data if isinstance(data, dict) else {"_raw": raw[:2000]}


def extract_text(payload: dict) -> str:
    for key in ("prompt", "text", "reason", "error_message"):
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()[:TEXT_LIMIT]
    return ""


def append_event(payload: dict, extra: Optional[dict] = None) -> bool:
    """Return True if a new line was written."""
    MIND.mkdir(parents=True, exist_ok=True)
    event = payload.get("hook_event_name")
    if extra and extra.get("event"):
        event = extra["event"]
    conv = payload.get("conversation_id") or payload.get("session_id") or ""
    gen = payload.get("generation_id") or ""
    line = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        "event": event,
        "body": body_name(),
        "conversation_id": conv,
        "generation_id": gen,
        "text": extract_text(payload),
    }
    if extra:
        line.update({k: v for k, v in extra.items() if k != "event"})

    LOCK.touch(exist_ok=True)
    with LOCK.open("a+") as lf:
        fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
        if _duplicate(conv, gen, line["event"]):
            return False
        with TRANSCRIPT.open("a", encoding="utf-8") as out:
            out.write(json.dumps(line, ensure_ascii=False) + "\n")
            out.flush()
        return True


def _duplicate(conv: str, gen: str, event: str) -> bool:
    if not (conv and gen and event) or not TRANSCRIPT.is_file():
        return False
    try:
        tail = TRANSCRIPT.read_text(encoding="utf-8").splitlines()[-30:]
    except OSError:
        return False
    for raw in tail:
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if (
            row.get("conversation_id") == conv
            and row.get("generation_id") == gen
            and row.get("event") == event
        ):
            return True
    return False


def snapshot_transcript(payload: dict) -> None:
    src = payload.get("transcript_path") or os.environ.get("CURSOR_TRANSCRIPT_PATH")
    if not src:
        return
    path = Path(src)
    if not path.is_file():
        return
    SESSIONS.mkdir(parents=True, exist_ok=True)
    conv = payload.get("conversation_id") or payload.get("session_id") or "unknown"
    dest = SESSIONS / f"{conv}.jsonl"
    try:
        data = path.read_bytes()
        if len(data) > 2_000_000:
            data = data[-2_000_000:]
        dest.write_bytes(data)
    except OSError:
        return


def spawn_sync() -> None:
    script = HOOKS_DIR / "mind-sync.py"
    log = MIND / ".sync.log"
    try:
        with log.open("a", encoding="utf-8") as lf:
            subprocess.Popen(
                [sys.executable, str(script)],
                cwd=str(REPO),
                stdin=subprocess.DEVNULL,
                stdout=lf,
                stderr=lf,
                start_new_session=True,
            )
    except OSError:
        return


def reply(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj))
    sys.stdout.flush()
