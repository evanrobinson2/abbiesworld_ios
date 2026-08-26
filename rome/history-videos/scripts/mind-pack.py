#!/usr/bin/env python3
"""Print the session context pack. Textual inspection for bodies and Evan."""

from __future__ import annotations

import sys
from pathlib import Path

HOOKS = Path(__file__).resolve().parents[1] / ".cursor" / "hooks"
sys.path.insert(0, str(HOOKS))

from mind_lib import body_name  # noqa: E402
from mind_pack import CTX_LIMIT, build_pack  # noqa: E402


def main() -> int:
    pack = build_pack(body_name())
    sys.stdout.write(pack)
    if not pack.endswith("\n"):
        sys.stdout.write("\n")
    sys.stderr.write(f"\n# {len(pack)} chars / {CTX_LIMIT} limit\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
