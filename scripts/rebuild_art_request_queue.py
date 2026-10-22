#!/usr/bin/env python3
"""Rebuild art-requests/queue.json from open|in_review|fulfilled|wont_fix folders.

Also soft-validates that relatedPaths exist and are repo-relative (no /Users/).
Run from repo root: python3 scripts/rebuild_art_request_queue.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art-requests"
BUCKETS = {
    "open": "open",
    "inReview": "in_review",
    "fulfilled": "fulfilled",
    "wontFix": "wont_fix",
}
PRIORITY_RANK = {"blocker": 0, "high": 1, "normal": 2, "low": 3, "optional": 4}


def load_requests(folder: str) -> list[dict]:
    path = ART / folder
    rows: list[dict] = []
    if not path.is_dir():
        return rows
    for fp in sorted(path.glob("*.json")):
        data = json.loads(fp.read_text())
        rows.append(
            {
                "id": data.get("id") or fp.stem,
                "semanticId": data.get("semanticId", ""),
                "priority": data.get("priority", "normal"),
                "type": data.get("type") or data.get("kind") or "other",
                "path": f"art-requests/{folder}/{fp.name}",
                "_createdAt": data.get("createdAt") or data.get("requestedAt") or "",
            }
        )
    rows.sort(
        key=lambda r: (
            PRIORITY_RANK.get(r["priority"], 9),
            r["_createdAt"],
            r["id"],
        )
    )
    for r in rows:
        r.pop("_createdAt", None)
    return rows


def validate_related_paths() -> list[str]:
    problems: list[str] = []
    for folder in BUCKETS.values():
        for fp in (ART / folder).glob("*.json"):
            data = json.loads(fp.read_text())
            for rel in data.get("relatedPaths") or []:
                if not isinstance(rel, str):
                    problems.append(f"{fp.name}: non-string relatedPath")
                    continue
                if rel.startswith("/") or rel.startswith("~") or "/Users/" in rel:
                    problems.append(f"{fp.name}: absolute/local path → {rel}")
                    continue
                # Allow trailing slash as directory pointer
                target = ROOT / rel.rstrip("/")
                if not target.exists():
                    problems.append(f"{fp.name}: missing relatedPath → {rel}")
    return problems


def main() -> int:
    queue = {
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "sourceOfTruth": "Individual JSON files under art-requests/{open,in_review,fulfilled,wont_fix}/",
        "artDirectorGuide": "art-requests/ART_DIRECTOR_AGENT.md",
    }
    for key, folder in BUCKETS.items():
        queue[key] = load_requests(folder)

    out = ART / "queue.json"
    out.write_text(json.dumps(queue, indent=2) + "\n")
    print(f"Wrote {out.relative_to(ROOT)}")
    for key in BUCKETS:
        print(f"  {key}: {len(queue[key])}")

    problems = validate_related_paths()
    if problems:
        print("RELATED PATH ISSUES:")
        for p in problems:
            print(f"  • {p}")
        return 1
    print("All relatedPaths are repo-relative and present on disk.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
