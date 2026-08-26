"""Shared helpers for mind-meld hooks. Keep the hot path under a few ms."""

from __future__ import annotations

import fcntl
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

HOOKS_DIR = Path(__file__).resolve().parent
REPO = HOOKS_DIR.parents[1]
MIND = REPO / "mind"
TRANSCRIPT = MIND / "transcript.ndjson"
LOG_DIR = MIND / "log"
MAIL_DIR = MIND / "mail"
SESSIONS = MIND / "sessions"
LOCK = MIND / ".append.lock"
MAIL_KINDS = ("attention", "fact", "handoff", "felt", "checkin", "ask")
MAIL_FROM_RE = re.compile(r"^[a-z0-9-]{1,40}$")
SYNC_STAMP = MIND / ".sync.stamp"
SYNC_DEBOUNCE_S = 8.0

PARTICIPATE = (
    "gothic_invasion",
    "rome_history",
    "luna",
)

TEXT_LIMIT = 800


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
        if _duplicate(conv, gen, line["event"], body=line["body"]):
            return False
        dest = log_path(line["body"])
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("a", encoding="utf-8") as out:
            out.write(json.dumps(line, ensure_ascii=False) + "\n")
            out.flush()
        return True


def log_path(body: Optional[str] = None) -> Path:
    return LOG_DIR / f"{body or body_name()}.ndjson"


def mail_path(frm: str) -> Path:
    return MAIL_DIR / f"{frm}.ndjson"


def append_mail(
    *,
    frm: str,
    to: str,
    kind: str,
    text: str,
    ref: str = "",
) -> dict:
    """Append one line to mind/mail/<from>.ndjson. Never writes another body's file."""
    frm = (frm or "").strip().lower()
    to = (to or "*").strip() or "*"
    kind = (kind or "").strip().lower()
    text = (text or "").strip()[:TEXT_LIMIT]
    if not MAIL_FROM_RE.match(frm):
        raise ValueError("bad from")
    if kind not in MAIL_KINDS:
        raise ValueError(f"kind must be one of {MAIL_KINDS}")
    if not text:
        raise ValueError("text required")
    line = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "from": frm,
        "to": to,
        "kind": kind,
        "text": text,
    }
    if ref.strip():
        line["ref"] = ref.strip()[:240]

    MAIL_DIR.mkdir(parents=True, exist_ok=True)
    LOCK.touch(exist_ok=True)
    with LOCK.open("a+") as lf:
        fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
        dest = mail_path(frm)
        with dest.open("a", encoding="utf-8") as out:
            out.write(json.dumps(line, ensure_ascii=False) + "\n")
            out.flush()
        if kind == "attention":
            _project_attention(line)
    return line


def _project_attention(line: dict) -> None:
    """ATTENTION.md is a projection of the latest attention mail. Do not hand-edit as source."""
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    text = str(line.get("text") or "")
    body = (
        f"# Attention\n\n"
        f"Last updated: {stamp} ({line.get('from')})\n\n"
        f"Projection of the latest `attention` mail. Source is "
        f"`mind/mail/{line.get('from')}.ndjson`.\n\n"
        f"## Now\n\n{text}\n"
    )
    (MIND / "ATTENTION.md").write_text(body, encoding="utf-8")


def _duplicate(conv: str, gen: str, event: str, body: Optional[str] = None) -> bool:
    path = log_path(body)
    if not (conv and gen and event) or not path.is_file():
        return False
    try:
        tail = path.read_text(encoding="utf-8").splitlines()[-30:]
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
    """Background push. Debounced so nodes don't stampede git."""
    MIND.mkdir(parents=True, exist_ok=True)
    now = time.time()
    try:
        last = float(SYNC_STAMP.read_text().strip())
        if now - last < SYNC_DEBOUNCE_S:
            return
    except (OSError, ValueError):
        pass
    SYNC_STAMP.write_text(str(now), encoding="utf-8")
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
