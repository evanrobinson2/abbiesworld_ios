#!/usr/bin/env python3
"""Hot path: append one transcript line, optionally kick a background git sync."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mind_lib import (  # noqa: E402
    append_event,
    read_stdin,
    reply,
    should_participate,
    snapshot_transcript,
    spawn_sync,
)

SYNC_EVENTS = {
    "afterAgentResponse",
    "sessionEnd",
    "beforeSubmitPrompt",
}


def main() -> int:
    payload = read_stdin()
    event = payload.get("hook_event_name") or ""

    if event == "afterFileEdit":
        path = str(payload.get("file_path") or "")
        if "/mind/" in path.replace("\\", "/"):
            spawn_sync()
        reply({})
        return 0

    if not should_participate(payload):
        if event == "beforeSubmitPrompt":
            reply({"continue": True})
        else:
            reply({})
        return 0

    append_event(payload)

    if event == "sessionEnd":
        snapshot_transcript(payload)

    if event in SYNC_EVENTS:
        spawn_sync()

    if event == "beforeSubmitPrompt":
        reply({"continue": True})
    else:
        reply({})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
