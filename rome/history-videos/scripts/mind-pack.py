#!/usr/bin/env python3
"""Compile and print the session pack. Writes mind/pack.md."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

HOOKS = Path(__file__).resolve().parents[1] / ".cursor" / "hooks"
sys.path.insert(0, str(HOOKS))

from mind_lib import body_name  # noqa: E402
from mind_pack import CTX_LIMIT, write_pack  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Compile mind/pack.md")
    p.add_argument("--body", default="")
    args = p.parse_args()
    pack = write_pack(args.body or body_name())
    sys.stdout.write(pack)
    if not pack.endswith("\n"):
        sys.stdout.write("\n")
    sys.stderr.write(f"\n# {len(pack)} chars / {CTX_LIMIT} limit · wrote mind/pack.md\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
