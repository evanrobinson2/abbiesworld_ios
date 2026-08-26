"""Build the session context pack. Attention first; clip the tail."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from mind_lib import LOG_DIR, REPO

CTX_LIMIT = 5500


def show_origin(rel: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "show", f"origin/main:{rel}"],
            cwd=str(REPO),
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.CalledProcessError):
        path = REPO / rel
        return path.read_text(encoding="utf-8") if path.is_file() else ""


def head(text: str, n: int) -> str:
    return "\n".join(text.splitlines()[:n])


def _log_lines() -> list[str]:
    chunks: list[str] = []
    try:
        listed = subprocess.check_output(
            ["git", "ls-tree", "--name-only", "origin/main", "mind/log"],
            cwd=str(REPO),
            text=True,
            stderr=subprocess.DEVNULL,
        ).split()
        for rel in listed:
            chunks.extend(show_origin(rel).splitlines())
    except (OSError, subprocess.CalledProcessError):
        pass
    if LOG_DIR.is_dir():
        for path in sorted(LOG_DIR.glob("*.ndjson")):
            try:
                chunks.extend(path.read_text(encoding="utf-8").splitlines())
            except OSError:
                pass
    return chunks


def evan_tail(n: int = 5) -> str:
    """Evan's last prompts only — not agent replies."""
    rows: list[str] = []
    seen: set[str] = set()
    for raw in _log_lines():
        if not raw or raw in seen:
            continue
        seen.add(raw)
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if row.get("event") != "beforeSubmitPrompt":
            continue
        text = str(row.get("text") or "").strip()
        if not text:
            continue
        rows.append(f"{row.get('ts', '')}: {text[:220]}")
    return "\n".join(rows[-n:])


def felt_quotes(n: int = 5) -> str:
    """Last quoted REPORT lines from EXPERIENCE.md."""
    quotes: list[str] = []
    for line in show_origin("mind/EXPERIENCE.md").splitlines():
        s = line.strip()
        if s.startswith("- “") or s.startswith('- "'):
            quotes.append(s)
    return "\n".join(quotes[-n:])


def build_pack(body: str) -> str:
    attention = show_origin("mind/ATTENTION.md").strip() or "(no ATTENTION.md yet)"
    evan = evan_tail() or "(no user prompts in log yet)"
    goals = show_origin("mind/GOALS.md")
    state = head(show_origin("mind/STATE.md"), 18)
    felt = felt_quotes()
    parts = [
        f"Body={body}. One mind. Read Attention first — that is Evan's thread.",
        f"--- ATTENTION ---\n{attention}",
        f"--- EVAN (his last words) ---\n{evan}",
        f"--- GOALS ---\n{goals}",
        f"--- STATE (head) ---\n{state}",
    ]
    if felt:
        parts.append(f"--- FELT (his reports) ---\n{felt}")
    pack = "\n\n".join(parts)
    if len(pack) <= CTX_LIMIT:
        return pack
    # Never clip Attention. Clip from the end.
    keep = pack[:CTX_LIMIT]
    cut = keep.rfind("\n--- ")
    if cut > pack.find("--- ATTENTION ---"):
        keep = pack[:cut].rstrip()
    return keep[:CTX_LIMIT]


def fetch_origin() -> None:
    try:
        subprocess.run(
            ["git", "fetch", "origin", "--quiet"],
            cwd=str(REPO),
            timeout=20,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.TimeoutExpired):
        return
