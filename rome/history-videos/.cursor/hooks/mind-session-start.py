#!/usr/bin/env python3
"""sessionStart: fetch origin, inject Attention-first context pack."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # mind_lib, mind_pack
from mind_lib import REPO, body_name, read_stdin, reply, should_participate  # noqa: E402
from mind_pack import build_pack, fetch_origin  # noqa: E402


def main() -> int:
    payload = read_stdin()
    if not should_participate(payload):
        reply({})
        return 0

    fetch_origin()
    reply(
        {
            "env": {"MIND_BODY": body_name(), "MIND_REPO": str(REPO)},
            "additional_context": build_pack(body_name()),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
