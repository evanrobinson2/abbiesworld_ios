#!/usr/bin/env python3
"""Check a hive worker in. Writes mind/checkins.ndjson; POSTs if HIVE_URL is set."""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CHECKINS = ROOT / "mind" / "checkins.ndjson"
HOOKS = ROOT / ".cursor" / "hooks"
sys.path.insert(0, str(HOOKS))
from mind_lib import append_mail  # noqa: E402
from mind_pack import write_pack  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Hive worker check-in")
    p.add_argument("--worker", required=True)
    p.add_argument("--body", required=True)
    p.add_argument("--note", default="")
    args = p.parse_args()
    row = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "worker": args.worker,
        "body": args.body,
    }
    if args.note:
        row["note"] = args.note[:240]

    CHECKINS.parent.mkdir(parents=True, exist_ok=True)
    with CHECKINS.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    print("wrote", CHECKINS)
    try:
        append_mail(
            frm=args.worker,
            to="*",
            kind="checkin",
            text=args.note or "on",
        )
        write_pack(args.worker)
    except ValueError as e:
        print("mail skipped", e)

    url = os.environ.get("HIVE_URL", "").rstrip("/")
    if url:
        req = urllib.request.Request(
            f"{url}/api/hive/checkin",
            data=json.dumps(row).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        key = os.environ.get("HIVE_CHECKIN_KEY")
        if key:
            req.add_header("x-hive-key", key)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                print("posted", resp.status, resp.read()[:200])
        except urllib.error.URLError as e:
            print("post failed", e)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
