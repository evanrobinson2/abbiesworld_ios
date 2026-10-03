#!/usr/bin/env python3
"""Studio mock server. Static files + Mac browser assist (Suno pull, Midjourney fill)."""

import base64
import json
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PORT = 8766
GRAB_JS = (ROOT / "suno-grab.js").read_text()
MJ_FILL_JS = (ROOT / "mj-fill.js").read_text()

BROWSERS = [
    ("Google Chrome", "chrome"),
    ("Arc", "chrome"),
    ("Brave Browser", "chrome"),
    ("Microsoft Edge", "chrome"),
    ("Comet", "chrome"),
    ("Dia", "chrome"),
    ("Safari", "safari"),
]


def running(app_name):
    script = f'tell application "System Events" to (name of processes) contains "{app_name}"'
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=8,
        )
    except subprocess.TimeoutExpired:
        return False
    return result.returncode == 0 and result.stdout.strip() == "true"


def make_runner(url_needle):
    return f'''
on run argv
  set appName to item 1 of argv
  set kind to item 2 of argv
  set expression to item 3 of argv
  if kind is "safari" then
    using terms from application "Safari"
      tell application appName
        set windowList to every window
        repeat with aWindow in windowList
          set tabList to every tab of aWindow
          repeat with aTab in tabList
            if (URL of aTab as text) contains "{url_needle}" then
              return do JavaScript expression in aTab
            end if
          end repeat
        end repeat
      end tell
    end using terms from
  else
    using terms from application "Google Chrome"
      tell application appName
        set windowList to every window
        repeat with aWindow in windowList
          set tabList to every tab of aWindow
          repeat with aTab in tabList
            if (URL of aTab as text) contains "{url_needle}" then
              return execute aTab javascript expression
            end if
          end repeat
        end repeat
      end tell
    end using terms from
  end if
  return ""
end run
'''


RUNNER_SUNO = make_runner("suno.com")
RUNNER_MJ = make_runner("midjourney.com")


def grab_expression():
    encoded = base64.b64encode(GRAB_JS.encode()).decode()
    return f'(function(){{return eval(atob("{encoded}"));}})()'


def mj_fill_expression(prompt):
    encoded_script = base64.b64encode(MJ_FILL_JS.encode()).decode()
    encoded_prompt = base64.b64encode(prompt.encode()).decode()
    return (
        f'(function(){{'
        f'window.__ABBIE_MJ_PROMPT__=atob("{encoded_prompt}");'
        f'return eval(atob("{encoded_script}"));'
        f'}})()'
    )


def run_browser_js(runner, expression, product_label, open_hint):
    checked = []
    blocked = []
    for app_name, kind in BROWSERS:
        if not running(app_name):
            continue
        checked.append(app_name)
        try:
            result = subprocess.run(
                ["osascript", "-e", runner, app_name, kind, expression],
                capture_output=True,
                text=True,
                timeout=45,
            )
        except subprocess.TimeoutExpired:
            blocked.append(app_name)
            continue
        stderr = f"{result.stderr or ''}\n{result.stdout or ''}"
        if result.returncode != 0:
            if "JavaScript" in stderr or "not allowed" in stderr or "-1723" in stderr or "-2741" in stderr:
                blocked.append(app_name)
            continue
        raw = (result.stdout or "").strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            # Suno grab returns JSON object with songs; tolerate raw
            payload = {"ok": True, "raw": raw}
        if isinstance(payload, dict):
            payload = dict(payload)
            payload.setdefault("browser", app_name)
            if payload.get("ok") or payload.get("songs"):
                return payload
            if payload.get("message"):
                return payload
    if not checked:
        return {
            "ok": False,
            "message": f"No {product_label} tab is open in Chrome, Arc, Brave, Edge, or Safari. {open_hint}",
        }
    if blocked:
        return {
            "ok": False,
            "message": (
                f"{product_label} is open, but the browser blocked the assist. "
                "In Chrome: View → Developer → Allow JavaScript from Apple Events, then try again."
            ),
        }
    return {
        "ok": False,
        "message": f"Those browsers are open, but none of their tabs is {product_label}. {open_hint}",
    }


def pull_open_tab():
    payload = run_browser_js(
        RUNNER_SUNO,
        grab_expression(),
        "Suno",
        "Open the library, then pull again. Or paste the song links.",
    )
    if payload.get("songs"):
        songs = sanitize_songs(payload.get("songs") or [])
        if songs:
            return {
                "ok": True,
                "songs": songs,
                "browser": payload.get("browser"),
                "note": payload.get("note") or "",
            }
    return payload if "ok" in payload else {
        "ok": False,
        "message": payload.get("message") or "Could not pull Suno songs.",
    }


def fill_midjourney(prompt):
    prompt = str(prompt or "").strip()
    if not prompt:
        return {"ok": False, "message": "Write a Midjourney prompt first."}
    if len(prompt) > 8000:
        prompt = prompt[:8000]
    return run_browser_js(
        RUNNER_MJ,
        mj_fill_expression(prompt),
        "Midjourney",
        "Open midjourney.com/imagine (Create), then Send again.",
    )


def sanitize_songs(songs):
    clean = []
    seen = set()
    for song in songs:
        if not isinstance(song, dict):
            continue
        song_id = str(song.get("id") or "").strip()
        audio = str(song.get("audio") or "").strip()
        if not song_id or song_id in seen:
            continue
        if audio and not audio.startswith("https://"):
            continue
        seen.add(song_id)
        clean.append({
            "id": song_id[:80],
            "name": str(song.get("name") or "Untitled")[:180],
            "audio": audio[:300],
            "image": str(song.get("image") or "")[:300],
            "page": str(song.get("page") or "")[:300],
        })
        if len(clean) >= 400:
            break
    return clean


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin") or ""
        if origin.startswith("http://127.0.0.1:") or origin.startswith("http://localhost:") \
                or origin.endswith(".vercel.app") or origin == "https://studio-mock-iota.vercel.app":
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")
        super().end_headers()

    def _json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/plate":
            qs = parse_qs(parsed.query)
            semantic = (qs.get("semantic") or [""])[0]
            overrides = {
                "poi.spookyPortal.exterior": ROOT / "plates" / "world2_world_portal.png",
                "poi.portal.exterior": ROOT / "plates" / "world2_world_portal.png",
                "poi.homePortal.exterior": ROOT / "plates" / "world2_world_portal.png",
                "poi.worldSeed.portal": ROOT / "plates" / "world2_world_portal.png",
                "poi.sceneCreator.exterior": ROOT / "plates" / "world2_world_portal.png",
            }
            local = overrides.get(semantic)
            if local and local.exists():
                data = local.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("X-Abbie-Plate-Source", "local-override")
                self.end_headers()
                self.wfile.write(data)
                return
            self.send_error(404, "Plate override missing")
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(min(length, 2_000_000)) if length else b""
        if parsed.path == "/api/suno/pull":
            self._json(pull_open_tab())
            return
        if parsed.path == "/api/midjourney/fill":
            try:
                body = json.loads(raw.decode() or "{}")
            except json.JSONDecodeError:
                body = {}
            self._json(fill_midjourney(body.get("prompt") or ""))
            return
        self.send_error(404)

    def log_message(self, format, *args):
        message = format % args
        if "/api/suno/pull" in message or "/api/midjourney/fill" in message:
            print(message)
            return
        if self.command == "GET" and ("." in self.path or self.path == "/"):
            return
        super().log_message(format, *args)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Studio mock http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
