"""Humanization filter — jittered pauses between browser automation phases."""
from __future__ import annotations

import os
import random
import time


def enabled() -> bool:
    raw = str(os.environ.get("EXECUTION_CAPACITY_HUMANIZE", "1")).strip().lower()
    return raw not in ("0", "false", "no", "off")


def pause(lo_ms: float, hi_ms: float) -> float:
    """Sleep a random duration in [lo_ms, hi_ms]. Returns seconds slept."""
    if not enabled():
        return 0.0
    lo = max(0.0, float(lo_ms))
    hi = max(lo, float(hi_ms))
    sec = random.uniform(lo, hi) / 1000.0
    time.sleep(sec)
    return sec


def before_fill() -> float:
    # Glance at the page / settle focus.
    return pause(350, 900)


def after_fill_before_submit() -> float:
    # Read-over the prompt before Create.
    return pause(600, 1600)


def after_submit_before_harvest() -> float:
    # Let the UI react / generation start.
    return pause(1200, 2800)


def between_harvest_polls() -> float:
    return pause(2200, 4800)


def fill_timeout_sec(prompt: str) -> int:
    """Typing is sync + humanized; allow room for long prompts."""
    base = 45
    # ~45–80ms per char average in mj_fill.js bursts
    guess = int(len(prompt or "") * 0.09) + 25
    return max(base, min(180, guess))
