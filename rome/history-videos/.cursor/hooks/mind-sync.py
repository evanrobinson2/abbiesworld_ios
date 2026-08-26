#!/usr/bin/env python3
"""
Background git hop for mind/.

Overcome the two-body race:
  1. Each body writes its own mind/log/<body>.ndjson (no shared-file conflict).
  2. Pull --rebase onto origin/main before push.
  3. If a file still conflicts: union .ndjson / .jsonl; STATE.md keeps the
     newer "Last updated" side.
  4. Retry push once.

Fail open. Not the millisecond path.
"""

from __future__ import annotations

import fcntl
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import List

HOOKS_DIR = Path(__file__).resolve().parent
REPO = HOOKS_DIR.parents[1]
MIND = REPO / "mind"
LOCK = MIND / ".sync.lock"
LOG = MIND / ".sync.log"
STATE = MIND / "STATE.md"

UPDATED_RE = re.compile(r"Last updated:\s*(.+)", re.IGNORECASE)


def log(msg: str) -> None:
    MIND.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"{stamp} {msg}\n")


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=str(REPO),
        text=True,
        capture_output=True,
    )


def stage_mind() -> None:
    """Stage hive files. Per-body logs first so bodies don't fight one file."""
    git("add", "--", "mind/log", "mind/sessions", "mind/STATE.md", "mind/IDENTITY.md")


def union_ndjson(ours: str, theirs: str) -> str:
    seen = set()
    lines: List[str] = []
    for raw in (ours.splitlines() + theirs.splitlines()):
        raw = raw.strip()
        if not raw or raw in seen:
            continue
        seen.add(raw)
        lines.append(raw)

    def key(line: str) -> str:
        try:
            return str(json.loads(line).get("ts") or "")
        except json.JSONDecodeError:
            return ""

    lines.sort(key=key)
    return ("\n".join(lines) + "\n") if lines else ""


def newer_state(ours: str, theirs: str) -> str:
    def stamp(text: str) -> str:
        m = UPDATED_RE.search(text)
        return (m.group(1).strip() if m else "")

    return theirs if stamp(theirs) >= stamp(ours) else ours


def resolve_conflicts() -> bool:
    names = git("diff", "--name-only", "--diff-filter=U").stdout.split()
    if not names:
        return True
    for rel in names:
        ours = git("show", f":2:{rel}").stdout
        theirs = git("show", f":3:{rel}").stdout
        dest = REPO / rel
        if rel.endswith(".ndjson") or rel.endswith(".jsonl"):
            dest.write_text(union_ndjson(ours, theirs), encoding="utf-8")
        elif rel.endswith("STATE.md"):
            dest.write_text(newer_state(ours, theirs), encoding="utf-8")
        else:
            dest.write_text(theirs or ours, encoding="utf-8")
        git("add", "--", rel)
        log(f"resolved {rel}")
    cont = git("-c", "core.editor=true", "rebase", "--continue")
    if cont.returncode != 0:
        log("rebase --continue failed")
        git("rebase", "--abort")
        return False
    return True


def rebase_onto_origin() -> bool:
    pulled = git("pull", "--rebase", "--autostash", "origin", "main")
    if pulled.returncode == 0:
        return True
    if resolve_conflicts():
        return True
    log("rebase failed")
    return False


def main() -> int:
    MIND.mkdir(parents=True, exist_ok=True)
    (MIND / "log").mkdir(exist_ok=True)
    LOCK.touch(exist_ok=True)
    with LOCK.open("a+") as lf:
        try:
            fcntl.flock(lf.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log("sync already running")
            return 0

        git("fetch", "origin")
        stage_mind()
        staged = git("diff", "--cached", "--quiet", "--", "mind/")
        if staged.returncode != 0:
            committed = git("commit", "-m", "mind: sync")
            if committed.returncode != 0:
                log("nothing to commit")
        if not rebase_onto_origin():
            return 0
        pushed = git("push", "origin", "HEAD")
        if pushed.returncode != 0:
            log("push failed, rebase retry")
            if rebase_onto_origin():
                pushed = git("push", "origin", "HEAD")
        if pushed.returncode == 0:
            log("pushed mind/")
        else:
            log("push failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
