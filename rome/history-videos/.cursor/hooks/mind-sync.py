#!/usr/bin/env python3
"""Background sync for mind/ in its own Git repository.

Memory never commits to or pushes the checked-out app repository. A temporary
Git index builds a memory-only commit and pushes it to ``hive_mind`` while
preserving the user's worktree and real index.

Fail open. Not the millisecond path.
"""

from __future__ import annotations

import fcntl
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

HOOKS_DIR = Path(__file__).resolve().parent
REPO = HOOKS_DIR.parents[1]
MIND = REPO / "mind"
LOCK = MIND / ".sync.lock"
LOG = MIND / ".sync.log"
STATE = MIND / "STATE.md"
HIVE_REMOTE = os.environ.get(
    "HIVE_MIND_REMOTE",
    "https://github.com/evanrobinson2/hive_mind.git",
)
HIVE_BRANCH = os.environ.get("HIVE_MIND_BRANCH", "main")
HIVE_REF = f"refs/remotes/hive-mind/{HIVE_BRANCH}"

UPDATED_RE = re.compile(r"Last updated:\s*(.+)", re.IGNORECASE)


def log(msg: str) -> None:
    MIND.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"{stamp} {msg}\n")


def git(
    *args: str,
    env: Optional[dict[str, str]] = None,
    input_text: Optional[str] = None,
) -> subprocess.CompletedProcess:
    child_env = os.environ.copy()
    if env:
        child_env.update(env)
    return subprocess.run(
        ["git", *args],
        cwd=str(REPO),
        text=True,
        capture_output=True,
        env=child_env,
        input=input_text,
    )


def git_blob(ref: str, rel: str) -> bytes:
    result = subprocess.run(
        ["git", "show", f"{ref}:{rel}"],
        cwd=str(REPO),
        capture_output=True,
    )
    return result.stdout if result.returncode == 0 else b""


def ref_exists(ref: str) -> bool:
    return git("rev-parse", "--verify", "--quiet", ref).returncode == 0


def remote_mind_files(ref: str) -> list[str]:
    result = git("ls-tree", "-r", "--name-only", ref, "--", "mind")
    return result.stdout.splitlines() if result.returncode == 0 else []


def compile_pack() -> None:
    sys.path.insert(0, str(HOOKS_DIR))
    try:
        from mind_pack import write_pack

        write_pack()
    except Exception as e:
        log(f"pack compile skipped: {e}")


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


def merge_remote_mind(ref: str) -> None:
    """Hydrate remote-only files and merge append-only memory into the worktree."""
    for rel in remote_mind_files(ref):
        dest = REPO / rel
        remote = git_blob(ref, rel)
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(remote)
            continue
        if rel.endswith(".ndjson") or rel.endswith(".jsonl"):
            try:
                ours = dest.read_text(encoding="utf-8")
                theirs = remote.decode("utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            merged = union_ndjson(ours, theirs)
            if merged != ours:
                dest.write_text(merged, encoding="utf-8")
        elif rel.endswith("STATE.md") or rel.endswith("ATTENTION.md"):
            try:
                ours = dest.read_text(encoding="utf-8")
                theirs = remote.decode("utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            merged = newer_state(ours, theirs)
            if merged != ours:
                dest.write_text(merged, encoding="utf-8")
        else:
            try:
                ours = dest.read_bytes()
            except OSError:
                continue
            main_version = git_blob("origin/main", rel)
            # A normal main checkout carries an old snapshot of shared docs.
            # Hydrate it only when it is still unchanged from that snapshot;
            # otherwise preserve the node's unsynced local edit.
            if ours == main_version and remote != ours:
                dest.write_bytes(remote)


def fetch_hive() -> None:
    git(
        "fetch",
        "--quiet",
        HIVE_REMOTE,
        f"+refs/heads/{HIVE_BRANCH}:{HIVE_REF}",
    )


def build_commit(base_ref: Optional[str]) -> Optional[str]:
    """Create a hive-only commit with a temporary index; never move HEAD."""
    if base_ref:
        merge_remote_mind(base_ref)
    compile_pack()
    with tempfile.TemporaryDirectory(prefix="hive-mind-") as tmp:
        index = str(Path(tmp) / "index")
        env = {"GIT_INDEX_FILE": index}
        read_tree = git("read-tree", base_ref, env=env) if base_ref else git(
            "read-tree",
            "--empty",
            env=env,
        )
        if read_tree.returncode != 0:
            log(f"read-tree failed for {base_ref or 'empty hive'}")
            return None
        add = git("add", "-A", "--", "mind", env=env)
        if add.returncode != 0:
            log(f"staging mind failed: {add.stderr.strip()[:240]}")
            return None
        tree = git("write-tree", env=env)
        if tree.returncode != 0:
            log("write-tree failed")
            return None
        if base_ref:
            base_tree = git("rev-parse", f"{base_ref}^{{tree}}")
            if base_tree.returncode == 0 and tree.stdout.strip() == base_tree.stdout.strip():
                return ""
        commit_args = ["commit-tree", tree.stdout.strip()]
        if base_ref:
            commit_args.extend(["-p", base_ref])
        commit_args.extend(["-m", "mind: sync"])
        commit = git(*commit_args)
        if commit.returncode != 0:
            log(f"commit-tree failed: {commit.stderr.strip()[:240]}")
            return None
        return commit.stdout.strip()


def sync_once() -> Optional[bool]:
    fetch_hive()
    base_ref = HIVE_REF if ref_exists(HIVE_REF) else None
    commit = build_commit(base_ref)
    if commit is None:
        return None
    if not commit:
        log("mind already current")
        return True
    pushed = git(
        "push",
        HIVE_REMOTE,
        f"{commit}:refs/heads/{HIVE_BRANCH}",
    )
    if pushed.returncode == 0:
        log(f"pushed mind/ to {HIVE_REMOTE}")
        return True
    log("push to hive_mind rejected")
    return False


def main() -> int:
    dry_run = "--dry-run" in sys.argv[1:]
    MIND.mkdir(parents=True, exist_ok=True)
    (MIND / "log").mkdir(exist_ok=True)
    LOCK.touch(exist_ok=True)
    with LOCK.open("a+") as lf:
        try:
            fcntl.flock(lf.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log("sync already running")
            return 0

        if dry_run:
            fetch_hive()
            base_ref = HIVE_REF if ref_exists(HIVE_REF) else None
            commit = build_commit(base_ref)
            print(f"remote={HIVE_REMOTE}")
            print(f"branch={HIVE_BRANCH}")
            print(f"base={base_ref or 'empty'}")
            print(f"commit={commit or 'unchanged'}")
            if commit:
                changed = git(
                    "diff-tree",
                    "--root",
                    "--no-commit-id",
                    "--name-only",
                    "-r",
                    commit,
                )
                print(changed.stdout, end="")
            print("push=disabled")
            return 0

        result = sync_once()
        if result is False:
            log("retrying hive-mind sync")
            result = sync_once()
        if result is None:
            log("hive-mind sync failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
