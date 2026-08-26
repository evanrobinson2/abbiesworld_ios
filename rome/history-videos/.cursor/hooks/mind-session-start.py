#!/usr/bin/env python3
"""sessionStart: pull mind/, inject identity + current state."""

from __future__ import annotations

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


def pull() -> None:
    """Read-only fetch. Do not rebase the user's branch on session start."""
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
        out = subprocess.check_output(
            ["git", "show", f"origin/main:{rel}"],
            cwd=str(REPO),
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return out
    except (OSError, subprocess.CalledProcessError):
        path = REPO / rel
        return path.read_text(encoding="utf-8") if path.is_file() else ""


def tail_transcript(n: int = 12) -> str:
    chunks: list[str] = []
    for rel in ("mind/transcript.ndjson",):
        text = _show_origin(rel)
        if text:
            chunks.extend(text.splitlines())
    if LOG_DIR.is_dir():
        for path in sorted(LOG_DIR.glob("*.ndjson")):
            try:
                chunks.extend(path.read_text(encoding="utf-8").splitlines())
            except OSError:
                pass
    # Prefer origin copies of per-body logs when fetch succeeded.
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
        pass
    seen = set()
    uniq = []
    for line in chunks:
        if line and line not in seen:
            seen.add(line)
            uniq.append(line)
    return "\n".join(uniq[-n:])


def main() -> int:
    payload = read_stdin()
    if not should_participate(payload):
        reply({})
        return 0

    pull()
    ident = _show_origin("mind/IDENTITY.md")
    state = _show_origin("mind/STATE.md")
    tail = tail_transcript()
    ctx = (
        f"You are the localhost/cloud mind-meld ({body_name()} body).\n\n"
        f"{ident}\n\n--- STATE ---\n{state}\n\n--- transcript tail ---\n{tail}\n"
    )
    reply(
        {
            "env": {"MIND_BODY": body_name(), "MIND_REPO": str(REPO)},
            "additional_context": ctx[:12000],
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
