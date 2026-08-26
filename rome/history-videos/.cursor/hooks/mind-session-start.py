#!/usr/bin/env python3
"""sessionStart: fetch origin, inject a small context pack — not the whole mind."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mind_lib import (  # noqa: E402
    LOG_DIR,
    REPO,
    body_name,
    read_stdin,
    reply,
    should_participate,
)

CTX_LIMIT = 4000


def pull() -> None:
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


def _show_origin(rel: str) -> str:
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


def _head(text: str, n: int) -> str:
    lines = text.splitlines()
    return "\n".join(lines[:n])


def tail_log(n: int = 4) -> str:
    chunks = []
    try:
        listed = subprocess.check_output(
            ["git", "ls-tree", "--name-only", "origin/main", "mind/log"],
            cwd=str(REPO),
            text=True,
            stderr=subprocess.DEVNULL,
        ).split()
        for rel in listed:
            chunks.extend(_show_origin(rel).splitlines())
    except (OSError, subprocess.CalledProcessError):
        if LOG_DIR.is_dir():
            for path in sorted(LOG_DIR.glob("*.ndjson")):
                try:
                    chunks.extend(path.read_text(encoding="utf-8").splitlines())
                except OSError:
                    pass
    slim = []
    seen = set()
    for raw in chunks:
        if not raw or raw in seen:
            continue
        seen.add(raw)
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        text = str(row.get("text") or "")[:160]
        slim.append(
            f"{row.get('ts','')} {row.get('body','')} {row.get('event','')}: {text}"
        )
    return "\n".join(slim[-n:])


def main() -> int:
    payload = read_stdin()
    if not should_participate(payload):
        reply({})
        return 0

    pull()
    goals = _show_origin("mind/GOALS.md")
    respect = _show_origin("mind/RESPECT.md")
    state = _head(_show_origin("mind/STATE.md"), 28)
    tail = tail_log()
    ctx = (
        f"Body={body_name()}. You are Evan's assistant (luna-local owns plumbing).\n\n"
        f"--- GOALS ---\n{goals}\n\n"
        f"--- RESPECT ---\n{respect}\n\n"
        f"--- STATE (head) ---\n{state}\n\n"
        f"--- log tail ---\n{tail}\n"
    )
    reply(
        {
            "env": {"MIND_BODY": body_name(), "MIND_REPO": str(REPO)},
            "additional_context": ctx[:CTX_LIMIT],
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
