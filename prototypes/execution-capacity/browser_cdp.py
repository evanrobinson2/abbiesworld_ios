"""Chrome DevTools Protocol driver for Midjourney (Windows / optional fallback).

Apple Events do not exist on Windows. This talks to a dedicated Chrome (or Edge)
profile on localhost CDP so daily Chrome can stay running. Same Create-only
gates as the Mac driver: never fill Personalize.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import shutil
import socket
import struct
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_PORT = 9222
CREATE_URL = "https://www.midjourney.com/imagine"


def cdp_port() -> int:
    raw = str(os.environ.get("EXECUTION_CAPACITY_CDP_PORT") or DEFAULT_PORT).strip()
    try:
        port = int(raw)
    except ValueError:
        port = DEFAULT_PORT
    return port


def cdp_base() -> str:
    explicit = str(os.environ.get("EXECUTION_CAPACITY_CDP_URL") or "").strip().rstrip("/")
    if explicit:
        return explicit
    return f"http://127.0.0.1:{cdp_port()}"


def profile_dir() -> Path:
    explicit = str(os.environ.get("EXECUTION_CAPACITY_CHROME_PROFILE") or "").strip()
    if explicit:
        return Path(explicit)
    root = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    return Path(root) / "AbbiesWorld" / "execution-capacity-chrome"


def _http_json(url: str, *, method: str = "GET", timeout: float = 4.0):
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", "replace") or "null"
            return json.loads(raw)
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", "replace") if err.fp else ""
        try:
            return json.loads(raw) if raw else None
        except json.JSONDecodeError:
            return None
    except Exception:
        return None


def cdp_up() -> bool:
    payload = _http_json(f"{cdp_base()}/json/version", timeout=1.5)
    return isinstance(payload, dict) and bool(payload.get("webSocketDebuggerUrl") or payload.get("Browser"))


def list_pages() -> list[dict]:
    payload = _http_json(f"{cdp_base()}/json/list", timeout=3.0)
    if payload is None:
        payload = _http_json(f"{cdp_base()}/json", timeout=3.0)
    if not isinstance(payload, list):
        return []
    pages = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        if str(item.get("type") or "page") != "page":
            continue
        pages.append(item)
    return pages


def _is_create_url(url: str) -> bool:
    u = str(url or "").lower()
    if "midjourney.com" not in u:
        return False
    if "personalize" in u or "/organize" in u or "/explore" in u:
        return False
    return "/imagine" in u


def find_create_page() -> dict | None:
    for page in list_pages():
        if _is_create_url(str(page.get("url") or "")):
            return page
        title = str(page.get("title") or "").lower()
        url = str(page.get("url") or "").lower()
        if "midjourney.com" in url and "create" in title and "personalize" not in url:
            return page
    return None


_owned_target_ids: set[str] = set()


def _open_create_tab() -> dict | None:
    encoded = urllib.parse.quote(CREATE_URL, safe="")
    url = f"{cdp_base()}/json/new?{encoded}"
    created = _http_json(url, method="PUT", timeout=8.0)
    if not isinstance(created, dict):
        created = _http_json(url, method="GET", timeout=8.0)
    if isinstance(created, dict) and created.get("webSocketDebuggerUrl"):
        tid = str(created.get("id") or "").strip()
        if tid:
            _owned_target_ids.add(tid)
        _mark_owned_page(created)
        return created
    return find_create_page()


def find_browser() -> str | None:
    explicit = str(os.environ.get("EXECUTION_CAPACITY_CHROME") or "").strip()
    if explicit and Path(explicit).is_file():
        return explicit
    env_vars = (
        "ProgramFiles",
        "ProgramFiles(x86)",
        "LOCALAPPDATA",
    )
    rels = (
        r"Google\Chrome\Application\chrome.exe",
        r"Microsoft\Edge\Application\msedge.exe",
        r"BraveSoftware\Brave-Browser\Application\brave.exe",
    )
    for var in env_vars:
        root = os.environ.get(var)
        if not root:
            continue
        for rel in rels:
            path = Path(root) / rel
            if path.is_file():
                return str(path)
    for name in ("chrome", "msedge", "brave"):
        found = shutil.which(name)
        if found:
            return found
    return None


def launch_debug_browser() -> dict:
    exe = find_browser()
    if not exe:
        return {"ok": False, "message": "No Chrome/Edge found. Install Chrome or set EXECUTION_CAPACITY_CHROME."}
    if cdp_up():
        return {"ok": True, "message": "cdp_already_up", "browser": exe}
    port = cdp_port()
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        busy = probe.connect_ex(("127.0.0.1", port)) == 0
    finally:
        probe.close()
    if busy and not cdp_up():
        return {
            "ok": False,
            "code": "cdp_port_busy",
            "message": (
                f"Port {port} is in use but is not Chrome DevTools. "
                "Free it or set EXECUTION_CAPACITY_CDP_PORT — will not pick another port."
            ),
        }
    profile = profile_dir()
    profile.mkdir(parents=True, exist_ok=True)
    args = [
        exe,
        f"--remote-debugging-port={port}",
        "--remote-allow-origins=*",
        f"--user-data-dir={profile}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-session-crashed-bubble",
        "--hide-crash-restore-bubble",
        "--start-minimized",
        CREATE_URL,
    ]
    try:
        popen_kw: dict = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
        if os.name != "nt":
            popen_kw["close_fds"] = True
        subprocess.Popen(args, **popen_kw)
    except OSError as err:
        return {"ok": False, "message": f"chrome_launch_failed:{err}"}
    deadline = time.time() + 20
    while time.time() < deadline:
        if cdp_up():
            return {"ok": True, "message": "opened_create", "browser": exe, "profile": str(profile)}
        time.sleep(0.35)
    return {
        "ok": False,
        "code": "cdp_not_listening",
        "message": (
            f"Launched {Path(exe).name} with DevTools on {port} but CDP never answered. "
            "Sign in to Midjourney in the dedicated worker Chrome window once."
        ),
        "profile": str(profile),
    }


def ensure_create_tab() -> dict:
    """Keep Create attached on CDP. Launches a dedicated profile if needed."""
    if not cdp_up():
        launched = launch_debug_browser()
        if not launched.get("ok"):
            return launched
    page = find_create_page()
    if page:
        return {
            "ok": True,
            "message": "background:" + str(page.get("title") or "Create"),
            "browser": "cdp",
        }
    created = _open_create_tab()
    if created:
        return {"ok": True, "message": "opened_create", "browser": "cdp"}
    return {
        "ok": False,
        "code": "tab_missing",
        "message": (
            "Chrome DevTools is up but no midjourney.com/imagine tab. "
            f"Open Create in the worker profile ({profile_dir()})."
        ),
    }


class _CdpConn:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.sock: socket.socket | None = None
        self._next_id = 1
        self._buf = b""

    def connect(self, timeout: float) -> None:
        parsed = urllib.parse.urlparse(self.ws_url)
        host = parsed.hostname or "127.0.0.1"
        port = int(parsed.port or 80)
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        sock = socket.create_connection((host, port), timeout=timeout)
        sock.settimeout(timeout)
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        req = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        sock.sendall(req.encode("ascii"))
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = sock.recv(4096)
            if not chunk:
                raise RuntimeError("cdp_ws_handshake_closed")
            data += chunk
        header, _, rest = data.partition(b"\r\n\r\n")
        if b"101" not in header.split(b"\r\n", 1)[0]:
            sock.close()
            raise RuntimeError("cdp_ws_handshake_rejected")
        expected = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()
        )
        accept = b""
        for line in header.split(b"\r\n"):
            if line.lower().startswith(b"sec-websocket-accept:"):
                accept = line.split(b":", 1)[1].strip()
        if accept and accept != expected:
            sock.close()
            raise RuntimeError("cdp_ws_accept_mismatch")
        self.sock = sock
        self._buf = rest

    def close(self) -> None:
        if self.sock:
            try:
                self.sock.close()
            except OSError:
                pass
        self.sock = None

    def call(self, method: str, params: dict | None, timeout: float) -> dict:
        if not self.sock:
            raise RuntimeError("cdp_not_connected")
        self.sock.settimeout(timeout)
        msg_id = self._next_id
        self._next_id += 1
        payload = json.dumps({"id": msg_id, "method": method, "params": params or {}}).encode("utf-8")
        self.sock.sendall(_ws_mask_frame(payload))
        deadline = time.time() + timeout
        while time.time() < deadline:
            remaining = max(0.2, deadline - time.time())
            self.sock.settimeout(remaining)
            frame = self._read_text_frame()
            if frame is None:
                continue
            try:
                parsed = json.loads(frame)
            except json.JSONDecodeError:
                continue
            if parsed.get("id") == msg_id:
                return parsed
        raise TimeoutError("cdp_evaluate_timeout")

    def _read_text_frame(self) -> str | None:
        raw = self._read_frame()
        if raw is None:
            return None
        opcode, payload = raw
        if opcode == 0x8:
            raise RuntimeError("cdp_ws_closed")
        if opcode == 0x9:
            if self.sock:
                self.sock.sendall(_ws_mask_frame(payload, opcode=0xA))
            return None
        if opcode == 0xA:
            return None
        if opcode != 0x1:
            return None
        return payload.decode("utf-8", "replace")

    def _read_frame(self) -> tuple[int, bytes] | None:
        header = self._recv_exact(2)
        opcode = header[0] & 0x0F
        masked = header[1] & 0x80
        length = header[1] & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._recv_exact(8))[0]
        mask = self._recv_exact(4) if masked else b""
        payload = self._recv_exact(length)
        if masked:
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        return opcode, payload

    def _recv_exact(self, n: int) -> bytes:
        if not self.sock:
            raise RuntimeError("cdp_not_connected")
        while len(self._buf) < n:
            chunk = self.sock.recv(max(n - len(self._buf), 4096))
            if not chunk:
                raise RuntimeError("cdp_ws_eof")
            self._buf += chunk
        out, self._buf = self._buf[:n], self._buf[n:]
        return out


def _ws_mask_frame(payload: bytes, *, opcode: int = 0x1) -> bytes:
    mask = os.urandom(4)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    header = bytes([0x80 | opcode])
    n = len(payload)
    if n < 126:
        header += bytes([0x80 | n])
    elif n < 65536:
        header += bytes([0x80 | 126]) + struct.pack(">H", n)
    else:
        header += bytes([0x80 | 127]) + struct.pack(">Q", n)
    return header + mask + masked


def evaluate_on_create(expression: str, timeout: int = 40) -> dict:
    if not cdp_up():
        ensured = ensure_create_tab()
        if not ensured.get("ok"):
            return ensured
    page = find_create_page()
    if not page:
        return {
            "ok": False,
            "code": "tab_missing",
            "message": (
                "No midjourney.com/imagine (Create) tab on the worker Chrome. "
                "Personalize/Organize tabs are ignored on purpose. "
                f"Log into Midjourney once in {profile_dir()}."
            ),
        }
    ws_url = str(page.get("webSocketDebuggerUrl") or "")
    if not ws_url:
        return {"ok": False, "message": "create_tab_missing_websocket"}
    conn = _CdpConn(ws_url)
    try:
        conn.connect(timeout=min(12.0, float(timeout)))
        reply = conn.call(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": True,
            },
            timeout=float(max(8, timeout)),
        )
    except TimeoutError:
        return {"ok": False, "message": "Browser assist timed out."}
    except Exception as err:  # noqa: BLE001 — surface to worker
        return {"ok": False, "message": f"cdp_error:{str(err)[:180]}"}
    finally:
        conn.close()

    if reply.get("error"):
        return {"ok": False, "message": str(reply["error"])[:240]}
    result = reply.get("result") or {}
    if result.get("exceptionDetails"):
        detail = result["exceptionDetails"]
        text = str(detail.get("text") or detail.get("exception") or "js_exception")[:240]
        return {"ok": False, "message": text}
    inner = result.get("result") or {}
    raw = inner.get("value")
    if isinstance(raw, dict):
        raw.setdefault("browser", "cdp")
        return raw
    if not raw:
        return {"ok": False, "message": "empty_evaluate"}
    try:
        payload = json.loads(str(raw))
    except json.JSONDecodeError:
        return {"ok": False, "message": f"Bad browser payload: {str(raw)[:180]}", "browser": "cdp"}
    if isinstance(payload, dict):
        payload.setdefault("browser", "cdp")
        return payload
    return {"ok": False, "message": f"Bad browser payload: {str(raw)[:180]}", "browser": "cdp"}


def _evaluate_on_page(page: dict, expression: str, timeout: float = 8.0) -> dict | None:
    ws_url = str(page.get("webSocketDebuggerUrl") or "")
    if not ws_url:
        return None
    conn = _CdpConn(ws_url)
    try:
        conn.connect(timeout=min(8.0, timeout))
        reply = conn.call(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True},
            timeout=timeout,
        )
    except Exception:
        return None
    finally:
        conn.close()
    inner = ((reply or {}).get("result") or {}).get("result") or {}
    return inner


def _mark_owned_page(page: dict) -> None:
    _evaluate_on_page(
        page,
        "try{sessionStorage.setItem('__ABBIE_EC_OWNED__','1')}catch(e){}",
    )


def _page_is_owned(page: dict) -> bool:
    tid = str(page.get("id") or "").strip()
    if tid and tid in _owned_target_ids:
        return True
    inner = _evaluate_on_page(page, "sessionStorage.getItem('__ABBIE_EC_OWNED__')||''")
    if not inner:
        return False
    return str(inner.get("value") or "") == "1"


def release_owned_tabs() -> dict:
    """Close Create tabs this worker opened via CDP. Do not quit the dedicated profile Chrome."""
    closed = 0
    pages = list_pages()
    targets = []
    for page in pages:
        if _page_is_owned(page):
            targets.append(str(page.get("id") or "").strip())
    for tid in _owned_target_ids:
        if tid not in targets:
            targets.append(tid)
    for tid in [t for t in targets if t]:
        _http_json(f"{cdp_base()}/json/close/{urllib.parse.quote(tid, safe='')}", timeout=4.0)
        closed += 1
    _owned_target_ids.clear()
    return {"ok": True, "message": f"closed:{closed}", "closed": closed, "browser": "cdp"}
