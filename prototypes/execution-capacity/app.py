#!/usr/bin/env python3
"""
Local execution-capacity app (Napster-for-execution v1).

Authorized requesters → durable SQLite queue → one Midjourney worker → results.
Credentials stay in the local Chrome session. Status UI + hard stop on :8780.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from auth import authorize, load_household_token
from queue_store import JobStore
from worker import Worker

PORT = int(os.environ.get("EXECUTION_CAPACITY_PORT", "8780"))
HOST = "127.0.0.1"
DB_PATH = ROOT / "data" / "jobs.sqlite3"
STATIC = ROOT / "static"

store = JobStore(DB_PATH)
worker = Worker(store)


def json_response(handler: SimpleHTTPRequestHandler, payload: dict, status: int = 200) -> None:
    body = json.dumps(payload).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    origin = handler.headers.get("Origin") or ""
    if origin.startswith("http://127.0.0.1:") or origin.startswith("http://localhost:"):
        handler.send_header("Access-Control-Allow-Origin", origin)
        handler.send_header("Access-Control-Allow-Headers", "authorization, content-type")
        handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        handler.send_header("Vary", "Origin")
    handler.end_headers()
    handler.wfile.write(body)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        msg = fmt % args
        if "/v1/" in msg or msg.startswith("POST") or msg.startswith("GET / "):
            sys.stderr.write(msg + "\n")

    def _authed(self) -> bool:
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        token_q = (qs.get("token") or [None])[0]
        return authorize(self.headers.get("Authorization"), token_q)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin") or "*")
        self.send_header("Access-Control-Allow-Headers", "authorization, content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/", "/index.html"):
            self.path = "/index.html"
            return super().do_GET()

        if path == "/health":
            return json_response(
                self,
                {
                    "ok": True,
                    "service": "execution-capacity",
                    "port": PORT,
                    "tokenConfigured": bool(load_household_token()),
                    "stopped": store.stopped(),
                    "worker": worker.snapshot(),
                },
            )

        if path == "/v1/status":
            if not self._authed():
                return json_response(self, {"error": "unauthorized"}, 401)
            return json_response(
                self,
                {
                    "stopped": store.stopped(),
                    "minGapSec": store.min_gap_sec(),
                    "lastStartAt": store.last_start_at(),
                    "summary": store.summary(),
                    "worker": worker.snapshot(),
                    "capabilities": ["midjourney.imagine"],
                    "jobs": store.list_jobs(limit=30),
                },
            )

        if path == "/v1/jobs":
            if not self._authed():
                return json_response(self, {"error": "unauthorized"}, 401)
            qs = parse_qs(parsed.query)
            limit = int((qs.get("limit") or ["50"])[0])
            return json_response(self, {"jobs": store.list_jobs(limit=limit)})

        if path.startswith("/v1/jobs/"):
            if not self._authed():
                return json_response(self, {"error": "unauthorized"}, 401)
            job_id = path[len("/v1/jobs/") :].strip("/")
            if "/" in job_id:
                return json_response(self, {"error": "not_found"}, 404)
            job = store.get_job(job_id)
            if not job:
                return json_response(self, {"error": "job_missing", "id": job_id}, 404)
            return json_response(self, {"job": job})

        return super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(min(length, 2_000_000)) if length else b"{}"
        try:
            body = json.loads(raw.decode() or "{}")
        except json.JSONDecodeError:
            body = {}

        if not self._authed():
            return json_response(self, {"error": "unauthorized"}, 401)

        if path == "/v1/jobs":
            capability = str(body.get("capability") or "midjourney.imagine").strip()
            payload = body.get("payload") if isinstance(body.get("payload"), dict) else {}
            if body.get("prompt") and "prompt" not in payload:
                payload = {**payload, "prompt": body.get("prompt")}
            created = store.create_job(
                job_id=body.get("id"),
                capability=capability,
                payload=payload,
                max_attempts=int(body.get("maxAttempts") or 2),
            )
            status = 200 if created.get("duplicate") else 201
            return json_response(self, created, status)

        if path.startswith("/v1/jobs/") and path.endswith("/cancel"):
            job_id = path[len("/v1/jobs/") : -len("/cancel")].strip("/")
            job = store.cancel_job(job_id)
            if not job:
                return json_response(self, {"error": "job_missing"}, 404)
            return json_response(self, {"job": job})

        if path == "/v1/stop":
            store.set_stopped(True)
            cancelled = store.cancel_queued()
            return json_response(
                self,
                {
                    "stopped": True,
                    "cancelledQueued": cancelled,
                    "note": "Hard stop: no new work; in-flight abandon on next check.",
                    "worker": worker.snapshot(),
                },
            )

        if path == "/v1/resume":
            store.set_stopped(False)
            return json_response(self, {"stopped": False, "worker": worker.snapshot()})

        if path == "/v1/limits":
            if "minGapSec" in body:
                store.set_min_gap_sec(int(body["minGapSec"]))
            return json_response(self, {"minGapSec": store.min_gap_sec(), "inFlightMax": 1})

        # Studio MCP compat — same shape as legacy :8766 fill helper.
        # Hosted midjourney_fill forwards here when MJ_WORKER_URL points at this app.
        if path == "/api/midjourney/fill":
            prompt = str(body.get("prompt") or "").strip()
            if not prompt:
                return json_response(self, {"ok": False, "message": "prompt_required"}, 400)
            if store.stopped():
                return json_response(
                    self,
                    {"ok": False, "message": "execution_capacity_paused", "hint": "Resume from the Midjourney sailboat tray."},
                    503,
                )
            created = store.create_job(
                job_id=body.get("id"),
                capability="midjourney.imagine",
                payload={"prompt": prompt[:8000]},
                max_attempts=int(body.get("maxAttempts") or 2),
            )
            job = created.get("job") or {}
            return json_response(
                self,
                {
                    "ok": True,
                    "queued": True,
                    "duplicate": bool(created.get("duplicate")),
                    "jobId": job.get("id"),
                    "message": "Queued on local execution-capacity Midjourney worker.",
                    "service": "execution-capacity",
                },
                200 if created.get("duplicate") else 201,
            )

        return json_response(self, {"error": "not_found"}, 404)


def start_http_server() -> ThreadingHTTPServer:
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as err:
        print(f"error: cannot bind {HOST}:{PORT} — {err}", file=sys.stderr)
        sys.exit(1)
    thread = threading.Thread(target=server.serve_forever, name="ec-http", daemon=True)
    thread.start()
    return server


def supervise_worker() -> None:
    """Silent reconnect — if the worker thread dies, start it again."""

    def loop() -> None:
        while True:
            try:
                alive = bool(getattr(worker, "_thread", None) and worker._thread.is_alive())
                if not alive:
                    worker.start()
            except Exception:
                try:
                    worker.start()
                except Exception:
                    pass
            time.sleep(5)

    threading.Thread(target=loop, name="ec-supervisor", daemon=True).start()


def main() -> None:
    if not load_household_token():
        print(
            "error: no household token. Set ~/.abbies_world_token or EXECUTION_CAPACITY_TOKEN",
            file=sys.stderr,
        )
        sys.exit(1)

    resume = os.environ.get("EXECUTION_CAPACITY_RESUME_ON_START", "1").lower() not in (
        "0",
        "false",
        "no",
    )
    if resume:
        store.set_stopped(False)

    server = start_http_server()
    worker.start()
    supervise_worker()

    url = f"http://{HOST}:{PORT}/"
    print(f"execution-capacity {url}")
    print(f"queue {DB_PATH}")
    print("capabilities: midjourney.imagine")
    print(f"stopped={store.stopped()}")

    use_tray = os.environ.get("EXECUTION_CAPACITY_TRAY", "1").lower() not in ("0", "false", "no")
    open_ui = os.environ.get("EXECUTION_CAPACITY_OPEN", "0").lower() in ("1", "true", "yes")
    if open_ui and not use_tray:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()

    try:
        if use_tray:
            if sys.platform == "win32":
                from tray_app_win import run_tray
            else:
                from tray_app import run_tray

            run_tray(store=store, worker=worker, port=PORT)
        else:
            while True:
                time.sleep(3600)
    except KeyboardInterrupt:
        pass
    finally:
        worker.stop_loop()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
