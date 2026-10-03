"""Apple Events browser driver for Midjourney (credentials stay in Chrome).

Never activates Chrome. Prefers a dedicated Create (/imagine) window kept in
the background (Chrome hides minimized windows from AppleScript, so we push
the worker window behind your daily windows instead of Dock-minimizing).
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS_DIR = ROOT / "js"

BROWSERS = [
    ("Google Chrome", "chrome"),
    ("Arc", "chrome"),
    ("Brave Browser", "chrome"),
    ("Microsoft Edge", "chrome"),
    ("Comet", "chrome"),
    ("Dia", "chrome"),
    ("Safari", "safari"),
]

# Create (/imagine) ONLY. Never fall back to Personalize/Organize/etc —
# those pages also host #desktop_input_bar and cause false fills/harvests.
RUNNER = '''
on run argv
  set appName to item 1 of argv
  set browserKind to item 2 of argv
  set jsExpression to item 3 of argv
  if browserKind is "safari" then
    using terms from application "Safari"
      tell application appName
        repeat with aWindow in every window
          repeat with aTab in every tab of aWindow
            set u to URL of aTab as text
            if u contains "midjourney.com/imagine" then
              if u does not contain "personalize" then
                return do JavaScript jsExpression in aTab
              end if
            end if
          end repeat
        end repeat
      end tell
    end using terms from
  else
    using terms from application "Google Chrome"
      tell application appName
        repeat with aWindow in every window
          repeat with aTab in every tab of aWindow
            set u to URL of aTab as text
            if u contains "midjourney.com/imagine" then
              if u does not contain "personalize" then
                return execute aTab javascript jsExpression
              end if
            end if
          end repeat
        end repeat
      end tell
    end using terms from
  end if
  return ""
end run
'''

# Keep Create scriptable without Dock-minimize (minimized windows vanish from AppleScript).
# Chrome Apple Events only — no System Events (LaunchAgent has no Accessibility/assistive access).
ENSURE_BACKGROUND_WINDOW = '''
on run argv
  set appName to item 1 of argv

  using terms from application "Google Chrome"
    tell application appName
      set foundImagine to false
      repeat with aWindow in every window
        repeat with aTab in tabs of aWindow
          set u to URL of aTab as text
          if u contains "midjourney.com/imagine" then
            if u does not contain "personalize" then
              set foundImagine to true
              set winCount to count of windows
              try
                set index of aWindow to winCount
              end try
              return "background:" & (name of aWindow as text)
            end if
          end if
        end repeat
      end repeat
      if not foundImagine then
        -- Only create a new window when Create is missing entirely
        make new window
        set URL of active tab of window 1 to "https://www.midjourney.com/imagine"
        delay 3.5
        try
          execute active tab of window 1 javascript "try{sessionStorage.setItem('__ABBIE_EC_OWNED__','1')}catch(e){}"
        end try
        set openedId to id of window 1
        set winCount to count of windows
        try
          set index of window 1 to winCount
        end try
        return "opened_create:" & openedId
      end if
    end tell
  end using terms from
  return "ok"
end run
'''

# Close Create windows this worker opened (sessionStorage mark). Never close Evan's daily tabs.
CLOSE_OWNED_WINDOWS = '''
on run argv
  set appName to item 1 of argv
  using terms from application "Google Chrome"
    tell application appName
      set closeIds to {}
      repeat with aWindow in every window
        set wid to id of aWindow
        repeat with aTab in tabs of aWindow
          try
            set flag to execute aTab javascript "sessionStorage.getItem('__ABBIE_EC_OWNED__')||''"
            if flag is "1" then
              set end of closeIds to wid
              exit repeat
            end if
          end try
        end repeat
      end repeat
      set closedCount to 0
      repeat with wid in closeIds
        try
          close (every window whose id is wid)
          set closedCount to closedCount + 1
        end try
      end repeat
      return "closed:" & closedCount
    end tell
  end using terms from
end run
'''


def use_cdp() -> bool:
    raw = str(os.environ.get("EXECUTION_CAPACITY_BROWSER") or "").strip().lower()
    if raw in ("cdp", "devtools", "windows"):
        return True
    if raw in ("applescript", "mac", "osa"):
        return False
    return sys.platform == "win32"


def running(app_name: str) -> bool:
    # Prefer Chrome/app `is running` — does not need Accessibility (System Events does).
    script = f'return (application "{app_name}" is running)'
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=8,
        )
    except subprocess.TimeoutExpired:
        return False
    return result.returncode == 0 and result.stdout.strip().lower() == "true"


_owned_window_ids: set[str] = set()


def ensure_background_create_window() -> dict:
    """Keep Midjourney Create in a separate background window (no focus steal).

    Chrome does not expose Dock-minimized windows to AppleScript, so we keep
    the worker window open but behind your daily windows.
    Windows uses a dedicated Chrome profile + CDP instead of Apple Events.
    """
    if use_cdp():
        from browser_cdp import ensure_create_tab

        return ensure_create_tab()
    for app_name, kind in BROWSERS:
        if kind != "chrome" or not running(app_name):
            continue
        try:
            result = subprocess.run(
                ["osascript", "-e", ENSURE_BACKGROUND_WINDOW, app_name],
                capture_output=True,
                text=True,
                timeout=20,
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "message": "ensure_window_timeout", "browser": app_name}
        raw = (result.stdout or "").strip()
        err = (result.stderr or "").strip()
        if result.returncode != 0:
            return {"ok": False, "message": err[:240] or "ensure_window_failed", "browser": app_name}
        if raw.startswith("opened_create"):
            parts = raw.split(":", 1)
            if len(parts) == 2 and parts[1].strip():
                _owned_window_ids.add(parts[1].strip())
        return {"ok": True, "message": raw or "ok", "browser": app_name}
    return {"ok": False, "message": "no_chrome_like_browser"}


def release_owned_browser() -> dict:
    """Close Create windows/tabs this worker opened. Leave Evan's daily browser alone."""
    if use_cdp():
        from browser_cdp import release_owned_tabs

        return release_owned_tabs()
    last = {"ok": True, "message": "no_owned_windows", "closed": 0}
    for app_name, kind in BROWSERS:
        if kind != "chrome" or not running(app_name):
            continue
        try:
            result = subprocess.run(
                ["osascript", "-e", CLOSE_OWNED_WINDOWS, app_name],
                capture_output=True,
                text=True,
                timeout=20,
            )
        except subprocess.TimeoutExpired:
            last = {"ok": False, "message": "release_window_timeout", "browser": app_name}
            continue
        raw = (result.stdout or "").strip()
        err = (result.stderr or "").strip()
        if result.returncode != 0:
            last = {"ok": False, "message": err[:240] or "release_window_failed", "browser": app_name}
            continue
        closed = 0
        if raw.startswith("closed:"):
            try:
                closed = int(raw.split(":", 1)[1])
            except ValueError:
                closed = 0
        last = {
            "ok": True,
            "message": raw or "ok",
            "browser": app_name,
            "closed": closed,
            "ids": sorted(_owned_window_ids),
        }
    _owned_window_ids.clear()
    return last


# Back-compat alias
ensure_minimized_create_window = ensure_background_create_window


def run_browser_js(expression: str, timeout: int = 40) -> dict:
    if use_cdp():
        from browser_cdp import evaluate_on_create

        return evaluate_on_create(expression, timeout=timeout)
    open_hint = (
        "Keep midjourney.com/imagine open in a Chrome window "
        "(separate background window is fine; do not Dock-minimize it). "
        "View → Developer → Allow JavaScript from Apple Events."
    )
    saw_open = False
    blocked = False
    for app_name, kind in BROWSERS:
        if not running(app_name):
            continue
        saw_open = True
        try:
            result = subprocess.run(
                ["osascript", "-e", RUNNER, app_name, kind, expression],
                capture_output=True,
                text=True,
                timeout=max(8, int(timeout)),
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "message": "Browser assist timed out."}
        raw = (result.stdout or "").strip()
        err = (result.stderr or "").strip()
        if result.returncode != 0:
            if "JavaScript from Apple Events" in err or "not allowed execute" in err.lower():
                blocked = True
            continue
        if not raw:
            continue
        try:
            payload = json.loads(raw)
            if isinstance(payload, dict):
                payload.setdefault("browser", app_name)
                return payload
        except json.JSONDecodeError:
            return {"ok": False, "message": f"Bad browser payload: {raw[:180]}", "browser": app_name}
    if blocked:
        return {
            "ok": False,
            "code": "apple_events_blocked",
            "message": "Chrome blocked Apple Events JS. View → Developer → Allow JavaScript from Apple Events.",
        }
    if not saw_open:
        return {"ok": False, "code": "browser_missing", "message": f"No Chrome-like browser running. {open_hint}"}
    return {
        "ok": False,
        "code": "tab_missing",
        "message": (
            "No midjourney.com/imagine (Create) tab found. "
            "Personalize/Organize tabs are ignored on purpose. "
            f"{open_hint}"
        ),
    }


def _load_js(name: str) -> str:
    return (JS_DIR / name).read_text(encoding="utf-8")


def _wait_for_create_tab(*, attempts: int = 8, delay_sec: float = 0.75) -> dict:
    """After ensure, retry until AppleScript can see /imagine (Create)."""
    probe = (
        '(function(){return JSON.stringify({ok:true,path:String(location.pathname||""),'
        'title:String(document.title||"")});})()'
    )
    last: dict = {}
    for i in range(max(1, attempts)):
        last = run_browser_js(probe, timeout=12)
        if last.get("ok") and (
            "/imagine" in str(last.get("path") or "")
            or "create" in str(last.get("title") or "").lower()
        ):
            return {"ok": True, "ready": True, "attempt": i + 1, "page": last}
        time.sleep(delay_sec)
    return {
        "ok": False,
        "code": "tab_missing",
        "message": last.get("message")
        or "Opened Create but AppleScript still cannot see midjourney.com/imagine.",
        "last": last,
    }


def fill_prompt(prompt: str, *, humanize: bool = True) -> dict:
    prompt = str(prompt or "").strip()
    if not prompt:
        return {"ok": False, "message": "prompt_required"}
    if len(prompt) > 8000:
        prompt = prompt[:8000]
    ensured = ensure_background_create_window()
    if not ensured.get("ok"):
        return {
            "ok": False,
            "code": "ensure_failed",
            "message": ensured.get("message") or "Could not open Create window",
        }
    # Fresh Create windows need SPA + AppleScript visibility before fill.
    ready = _wait_for_create_tab(
        attempts=10 if "opened_create" in str(ensured.get("message") or "") else 4
    )
    if not ready.get("ok"):
        return ready
    script = _load_js("mj_fill.js")
    encoded_script = base64.b64encode(script.encode()).decode()
    encoded_prompt = base64.b64encode(prompt.encode()).decode()
    humanize_json = "true" if humanize else "false"
    expression = (
        f'(function(){{'
        f'window.__ABBIE_MJ_HUMANIZE__={{enabled:{humanize_json}}};'
        f'window.__ABBIE_MJ_PROMPT__=atob("{encoded_prompt}");'
        f'return eval(atob("{encoded_script}"));'
        f'}})()'
    )
    from humanize import fill_timeout_sec

    return run_browser_js(expression, timeout=fill_timeout_sec(prompt))


def submit_create(*, humanize: bool = True) -> dict:
    ensure_background_create_window()
    script = _load_js("mj_submit.js")
    encoded = base64.b64encode(script.encode()).decode()
    humanize_json = "true" if humanize else "false"
    expression = (
        f'(function(){{'
        f'window.__ABBIE_MJ_HUMANIZE__={{enabled:{humanize_json}}};'
        f'return eval(atob("{encoded}"));'
        f'}})()'
    )
    # mj_submit polls ~15s for clear/new job after PaperAirplane.
    return run_browser_js(expression, timeout=45)


def harvest_candidates(
    *,
    exclude_job_ids: list[str] | None = None,
    prefer_job_id: str | None = None,
) -> dict:
    script = _load_js("mj_harvest.js")
    encoded = base64.b64encode(script.encode()).decode()
    exclude = [str(x) for x in (exclude_job_ids or []) if str(x).strip()]
    prefer = str(prefer_job_id or "").strip()
    exclude_json = json.dumps(exclude)
    prefer_json = json.dumps(prefer)
    expression = (
        f'(function(){{'
        f'window.__ABBIE_MJ_EXCLUDE_JOBS__={exclude_json};'
        f'window.__ABBIE_MJ_PREFER_JOB__={prefer_json};'
        f'return eval(atob("{encoded}"));'
        f'}})()'
    )
    return run_browser_js(expression, timeout=20)
