"""Windows system-tray presence for execution capacity (pystray)."""
from __future__ import annotations

import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

from auth import load_household_token
from queue_store import JobStore
from worker import Worker

HOST = "127.0.0.1"
ASSETS = Path(__file__).resolve().parent / "assets"
ICON_GREEN = ASSETS / "tray-green.png"
ICON_BLUE = ASSETS / "tray-blue.png"
ICON_RED = ASSETS / "tray-red.png"
ICON_FALLBACK = ASSETS / "tray-icon.png"


def _load_image(path: Path):
    from PIL import Image

    if not path.is_file():
        path = ICON_FALLBACK
    return Image.open(path)


def run_tray(*, store: JobStore, worker: Worker, port: int) -> None:
    try:
        import pystray
        from PIL import Image  # noqa: F401 — imported to fail fast
    except ImportError:
        print(
            "Windows tray needs: .venv\\Scripts\\pip install -r requirements-windows.txt",
            flush=True,
        )
        while True:
            time.sleep(3600)

    if not load_household_token():
        pass

    url = f"http://{HOST}:{port}/"
    icon_holder: dict = {}

    def probe_local() -> bool:
        try:
            with urllib.request.urlopen(f"http://{HOST}:{port}/health", timeout=1.0) as res:
                return 200 <= getattr(res, "status", 200) < 300
        except Exception:
            return False

    def label_and_icon():
        snap = worker.snapshot()
        summary = store.summary()
        current = snap.get("currentJobId")
        msg = snap.get("lastMessage") or "—"
        stopped = store.stopped()
        alive = bool(snap.get("alive"))
        reachable = probe_local()
        if not reachable or not alive or stopped:
            path = ICON_RED
            if not reachable:
                label = "Red · Can't connect"
            elif not alive:
                label = "Red · Can't connect · worker down"
            else:
                label = f"Red · Can't connect · paused · {msg}"
        elif current:
            path = ICON_BLUE
            label = f"Blue · In progress · {current} · {msg}"
        else:
            path = ICON_GREEN
            label = f"Green · Available · queued {summary.get('queued', 0)} · {msg}"
        return label[:80], path

    def on_open(icon, _item) -> None:
        webbrowser.open(url)

    def on_resume(icon, _item) -> None:
        store.set_stopped(False)

    def on_pause(icon, _item) -> None:
        store.set_stopped(True)
        store.cancel_queued()

    def on_quit(icon, _item) -> None:
        store.set_stopped(True)
        icon.stop()

    menu = pystray.Menu(
        pystray.MenuItem(lambda item: icon_holder.get("title") or "Status", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Open status window", on_open),
        pystray.MenuItem("Resume", on_resume),
        pystray.MenuItem("Pause", on_pause),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit execution capacity", on_quit),
    )

    first_title, first_icon = label_and_icon()
    icon = pystray.Icon(
        "abbies-execution-capacity",
        _load_image(first_icon),
        first_title,
        menu,
    )
    icon_holder["title"] = first_title
    icon_holder["icon_path"] = str(first_icon)

    def tick() -> None:
        last_path = str(first_icon)
        while True:
            time.sleep(2)
            try:
                title, path = label_and_icon()
                icon_holder["title"] = title
                icon.title = title
                if str(path) != last_path:
                    icon.icon = _load_image(path)
                    last_path = str(path)
            except Exception:
                pass

    threading.Thread(target=tick, name="ec-tray-tick", daemon=True).start()
    icon.run()
