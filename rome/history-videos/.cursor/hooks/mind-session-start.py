#!/usr/bin/env python3
"""sessionStart: pull mind/, inject identity + current state."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mind_lib import (  # noqa: E402
    REPO,
    TRANSCRIPT,
    body_name,
    read_stdin,
    reply,
    should_participate,
)

STATE = REPO / "mind" / "STATE.md"
IDENTITY = REPO / "mind" / "IDENTITY.md"


def pull() -> None:
    try:
        subprocess.run(
            ["git", "pull", "--ff-only", "--quiet"],
            cwd=str(REPO),
            timeout=20,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.TimeoutExpired):
        return


def tail_transcript(n: int = 12) -> str:
    if not TRANSCRIPT.is_file():
        return ""
    try:
        lines = TRANSCRIPT.read_text(encoding="utf-8").splitlines()[-n:]
    except OSError:
        return ""
    return "\n".join(lines)


def main() -> int:
    payload = read_stdin()
    if not should_participate(payload):
        reply({})
        return 0

    pull()
    ident = IDENTITY.read_text(encoding="utf-8") if IDENTITY.is_file() else ""
    state = STATE.read_text(encoding="utf-8") if STATE.is_file() else ""
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
