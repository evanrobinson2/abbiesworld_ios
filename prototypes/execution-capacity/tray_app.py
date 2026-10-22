"""macOS menu bar (tray) — VPN-style presence for execution capacity."""
from __future__ import annotations

import urllib.request
import webbrowser
from pathlib import Path

import rumps

from auth import load_household_token
from queue_store import JobStore
from worker import Worker

HOST = "127.0.0.1"
ASSETS = Path(__file__).resolve().parent / "assets"
ICON_GREEN = ASSETS / "tray-green.png"  # available
ICON_BLUE = ASSETS / "tray-blue.png"  # job in progress
ICON_RED = ASSETS / "tray-red.png"  # can't connect
ICON_FALLBACK = ASSETS / "tray-icon.png"


class ExecutionTray(rumps.App):
    def __init__(self, *, store: JobStore, worker: Worker, port: int):
        icon = str(ICON_GREEN if ICON_GREEN.is_file() else ICON_FALLBACK)
        # Colored badge on sailboat — not a template (templates are forced monochrome).
        super().__init__("", icon=icon, quit_button=None, template=False)
        self.store = store
        self.worker = worker
        self.port = port
        self.url = f"http://{HOST}:{port}/"
        self._last_icon = icon
        self._reachable = True

        self.status_item = rumps.MenuItem("Status: starting…")
        self.resume_item = rumps.MenuItem("Resume", callback=self.on_resume)
        self.pause_item = rumps.MenuItem("Pause", callback=self.on_pause)
        self.open_item = rumps.MenuItem("Open status window", callback=self.on_open)
        self.quit_item = rumps.MenuItem("Quit execution capacity", callback=self.on_quit)

        self.menu = [
            self.status_item,
            None,
            self.open_item,
            self.resume_item,
            self.pause_item,
            None,
            self.quit_item,
        ]
        self._timer = rumps.Timer(self._tick, 2)
        self._timer.start()
        self._tick(None)

    def _set_icon(self, path: Path) -> None:
        if not path.is_file():
            path = ICON_FALLBACK
        icon = str(path)
        if icon == self._last_icon:
            return
        self.icon = icon
        self._last_icon = icon

    def _probe_local(self) -> bool:
        """True when the local HTTP surface answers (service is connectable)."""
        try:
            with urllib.request.urlopen(f"http://{HOST}:{self.port}/health", timeout=1.0) as res:
                return 200 <= getattr(res, "status", 200) < 300
        except Exception:
            return False

    def _tick(self, _sender) -> None:
        snap = self.worker.snapshot()
        summary = self.store.summary()
        current = snap.get("currentJobId")
        msg = snap.get("lastMessage") or "—"
        stopped = self.store.stopped()
        alive = bool(snap.get("alive"))
        reachable = self._probe_local()
        self._reachable = reachable

        # Red = can't connect / not available to take work.
        if not reachable or not alive or stopped:
            self._set_icon(ICON_RED)
            if not reachable:
                label = "Red · Can't connect"
            elif not alive:
                label = "Red · Can't connect · worker down"
            else:
                label = f"Red · Can't connect · paused · {msg}"
        elif current:
            # Blue = job in progress.
            self._set_icon(ICON_BLUE)
            label = f"Blue · In progress · {current} · {msg}"
        else:
            # Green = actively available.
            self._set_icon(ICON_GREEN)
            label = f"Green · Available · queued {summary.get('queued', 0)} · {msg}"

        self.title = ""
        self.status_item.title = label[:80]
        # Don't pop alerts — silent like a VPN.

    def on_open(self, _sender) -> None:
        webbrowser.open(self.url)

    def on_resume(self, _sender) -> None:
        self.store.set_stopped(False)
        self._tick(None)

    def on_pause(self, _sender) -> None:
        self.store.set_stopped(True)
        self.store.cancel_queued()
        self._tick(None)

    def on_quit(self, _sender) -> None:
        # Soft pause + quit process; LaunchAgent KeepAlive will restart unless unloaded.
        self.store.set_stopped(True)
        rumps.quit_application()


def run_tray(*, store: JobStore, worker: Worker, port: int) -> None:
    if not load_household_token():
        # Still show tray so the machine presence is visible; jobs will 401 until token exists.
        pass
    ExecutionTray(store=store, worker=worker, port=port).run()
