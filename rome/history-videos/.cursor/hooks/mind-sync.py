#!/usr/bin/env python3
"""Background git hop for mind/. Fail open. Not the millisecond path."""

from __future__ import annotations

import fcntl
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HOOKS_DIR = Path(__file__).resolve().parent
REPO = HOOKS_DIR.parents[1]
MIND = REPO / "mind"
LOCK = MIND / ".sync.lock"
LOG = MIND / ".sync.log"


def log(msg: str) -> None:
    MIND.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"{stamp} {msg}\n")


def git(*args: str) -> int:
    return subprocess.call(
        ["git", *args],
        cwd=str(REPO),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> int:
    MIND.mkdir(parents=True, exist_ok=True)
    LOCK.touch(exist_ok=True)
    with LOCK.open("a+") as lf:
        try:
            fcntl.flock(lf.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log("sync already running")
            return 0
        git("fetch", "origin")
        git("pull", "--ff-only")
        git("add", "--", "mind/")
        dirty = subprocess.call(
            ["git", "diff", "--cached", "--quiet", "--", "mind/"],
            cwd=str(REPO),
        )
        if dirty == 0:
            return 0
        if git("commit", "-m", "mind: sync") != 0:
            return 0
        if git("push") != 0:
            log("push failed")
            return 0
        log("pushed mind/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
