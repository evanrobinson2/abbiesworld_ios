"""Compile the session pack from mail. Attention first; clip the tail."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from mind_lib import LOG_DIR, MAIL_DIR, MIND, REPO

CTX_LIMIT = 5500
PACK_PATH = MIND / "pack.md"


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


def _origin_tree(prefix: str) -> list[str]:
    try:
        return subprocess.check_output(
            ["git", "ls-tree", "--name-only", "origin/main", prefix],
            cwd=str(REPO),
            text=True,
            stderr=subprocess.DEVNULL,
        ).split()
    except (OSError, subprocess.CalledProcessError):
        return []


def _parse_mail_lines(raw_lines: list[str]) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for raw in raw_lines:
        if not raw or raw in seen:
            continue
        seen.add(raw)
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(row, dict) or not row.get("text"):
            continue
        rows.append(row)
    rows.sort(key=lambda r: str(r.get("ts") or ""))
    return rows


def read_mail() -> list[dict]:
    chunks: list[str] = []
    for rel in _origin_tree("mind/mail"):
        chunks.extend(show_origin(rel).splitlines())
    if MAIL_DIR.is_dir():
        for path in sorted(MAIL_DIR.glob("*.ndjson")):
            try:
                chunks.extend(path.read_text(encoding="utf-8").splitlines())
            except OSError:
                pass
    return _parse_mail_lines(chunks)


def _log_lines() -> list[str]:
    chunks: list[str] = []
    for rel in _origin_tree("mind/log"):
        chunks.extend(show_origin(rel).splitlines())
    if LOG_DIR.is_dir():
        for path in sorted(LOG_DIR.glob("*.ndjson")):
            try:
                chunks.extend(path.read_text(encoding="utf-8").splitlines())
            except OSError:
                pass
    return chunks


def evan_tail(n: int = 5) -> str:
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


def goals_table() -> str:
    keep: list[str] = []
    for line in show_origin("mind/GOALS.md").splitlines():
        if line.startswith("## Unified"):
            keep.append(line)
            continue
        if line.startswith("|") or line.startswith("## Workers"):
            keep.append(line)
    return "\n".join(keep).strip()


def learned_titles(n: int = 5) -> str:
    titles = [
        line[3:].strip()
        for line in show_origin("mind/LEARNED.md").splitlines()
        if line.startswith("## 20")
    ]
    return "\n".join(f"- {t}" for t in titles[-n:])


def _fmt_mail(row: dict) -> str:
    ref = f" · {row['ref']}" if row.get("ref") else ""
    return (
        f"{row.get('ts', '')} {row.get('from')} → {row.get('to')} "
        f"[{row.get('kind')}] {row.get('text', '')[:220]}{ref}"
    )


def addressed(mail: list[dict], body: str, n: int = 8) -> list[dict]:
    body_l = body.lower()
    hits = [
        row
        for row in mail
        if str(row.get("to") or "*") in ("*", body_l)
        or str(row.get("to") or "").lower() == body_l
    ]
    return hits[-n:]


def build_pack(body: str) -> str:
    mail = read_mail()
    attentions = [r for r in mail if r.get("kind") == "attention"]
    attention = (
        attentions[-1]["text"]
        if attentions
        else (MIND / "ATTENTION.md").read_text(encoding="utf-8")
        if (MIND / "ATTENTION.md").is_file()
        else "(no attention yet)"
    )
    evan = evan_tail() or "(no user prompts in log yet)"
    inbox = addressed(mail, body)
    facts = [r for r in mail if r.get("kind") in ("fact", "handoff", "felt", "ask")]
    dontlose = [r for r in facts if "do not lose" in str(r.get("text") or "").lower()]
    parts = [
        f"Body={body}. One mind. Read Attention first — that is Evan's thread.",
        "Source is mail (`mind/mail/`). This pack is compiled. Do not hand-edit it.",
        f"--- ATTENTION ---\n{attention}",
        f"--- EVAN (his last words) ---\n{evan}",
        f"--- GOALS ---\n{goals_table() or '(no goals table)'}",
    ]
    if inbox:
        parts.append("--- MAIL (to you or *) ---\n" + "\n".join(_fmt_mail(r) for r in inbox))
    learned = learned_titles()
    if learned:
        parts.append(f"--- LEARNED (recent) ---\n{learned}")
    if dontlose:
        parts.append("--- DO NOT LOSE ---\n" + "\n".join(f"- {r['text']}" for r in dontlose[-3:]))
    pack = "\n\n".join(parts)
    if len(pack) <= CTX_LIMIT:
        return pack
    keep = pack[:CTX_LIMIT]
    cut = keep.rfind("\n--- ")
    if cut > pack.find("--- ATTENTION ---"):
        keep = pack[:cut].rstrip()
    return keep[:CTX_LIMIT]


def write_pack(body: str = "localhost") -> str:
    pack = build_pack(body)
    PACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    header = (
        "<!-- compiled by scripts/mind-pack.py — do not hand-edit -->\n\n"
    )
    PACK_PATH.write_text(header + pack + ("\n" if not pack.endswith("\n") else ""), encoding="utf-8")
    return pack
