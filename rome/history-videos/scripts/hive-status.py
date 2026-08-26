#!/usr/bin/env python3
"""Print hive freshness: ahead/behind, last logs, last sync. For a node to inspect."""

from __future__ import annotations

import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=str(REPO), text=True).strip()


def main() -> int:
    subprocess.call(
        ["git", "fetch", "origin", "--quiet"],
        cwd=str(REPO),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    sb = git("status", "-sb")
    print(sb)
    print("HEAD", git("rev-parse", "--short", "HEAD"))
    print("origin/main", git("rev-parse", "--short", "origin/main"))
    logdir = REPO / "mind" / "log"
    if logdir.is_dir():
        for path in sorted(logdir.glob("*.ndjson")):
            lines = path.read_text(encoding="utf-8").splitlines()
            last = lines[-1] if lines else "(empty)"
            print(f"{path.name} lines={len(lines)} last={last[:140]}")
    stamp = REPO / "mind" / ".sync.stamp"
    print("sync_stamp", stamp.read_text().strip() if stamp.is_file() else "none")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
