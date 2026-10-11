"""Household auth for the local execution-capacity app."""
from __future__ import annotations

import os
from pathlib import Path


def load_household_token() -> str:
    """
    Prefer on-disk household token for the local Mac app.
    Cursor/agent shells often inject a different ABBIES_WORLD_TOKEN; that must not
    silently lock out the owner's ~/.abbies_world_token.
    Override with EXECUTION_CAPACITY_TOKEN when needed.
    """
    explicit = str(os.environ.get("EXECUTION_CAPACITY_TOKEN") or "").strip()
    if explicit and explicit != "[SENSITIVE]" and "${" not in explicit:
        return explicit

    path = Path.home() / ".abbies_world_token"
    if path.is_file():
        token = path.read_text(encoding="utf-8").strip().splitlines()[0].strip()
        if token and not token.startswith("#"):
            return token

    env = str(os.environ.get("ABBIES_WORLD_TOKEN") or "").strip()
    if env and env != "[SENSITIVE]" and "${" not in env:
        return env
    return ""


def authorize(header_value: str | None, query_token: str | None = None) -> bool:
    expected = load_household_token()
    if not expected:
        # Fail closed if no token configured — force local setup.
        return False
    if query_token and query_token.strip() == expected:
        return True
    raw = (header_value or "").strip()
    if raw.lower().startswith("bearer "):
        raw = raw[7:].strip()
    return bool(raw) and raw == expected
