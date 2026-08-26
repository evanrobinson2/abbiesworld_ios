#!/usr/bin/env python3
"""Append one addressed mail line. Writes only mind/mail/<from>.ndjson."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HOOKS = Path(__file__).resolve().parents[1] / ".cursor" / "hooks"
sys.path.insert(0, str(HOOKS))

from mind_lib import MAIL_KINDS, append_mail  # noqa: E402
from mind_pack import write_pack  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Send hive mail")
    p.add_argument("--from", dest="frm", required=True)
    p.add_argument("--to", default="*")
    p.add_argument("--kind", required=True, choices=MAIL_KINDS)
    p.add_argument("--text", required=True)
    p.add_argument("--ref", default="")
    args = p.parse_args()
    try:
        line = append_mail(
            frm=args.frm,
            to=args.to,
            kind=args.kind,
            text=args.text,
            ref=args.ref,
        )
    except ValueError as e:
        print(e, file=sys.stderr)
        return 2
    write_pack(args.frm)
    print(json.dumps(line, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
