"""Durable job queue (SQLite) for local execution capacity."""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATES = (
    "queued",
    "awaiting_auth",
    "filled",
    "submitted",
    "completed",
    "failed",
    "cancelled",
)

DEFAULT_CAPABILITY = "midjourney.imagine"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class JobStore:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS jobs (
                      id TEXT PRIMARY KEY,
                      capability TEXT NOT NULL,
                      payload_json TEXT NOT NULL,
                      state TEXT NOT NULL,
                      result_json TEXT,
                      error TEXT,
                      attempts INTEGER NOT NULL DEFAULT 0,
                      max_attempts INTEGER NOT NULL DEFAULT 2,
                      created_at TEXT NOT NULL,
                      updated_at TEXT NOT NULL,
                      started_at TEXT,
                      finished_at TEXT
                    );
                    CREATE TABLE IF NOT EXISTS meta (
                      key TEXT PRIMARY KEY,
                      value TEXT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_jobs_state_created
                      ON jobs(state, created_at);
                    """
                )
                conn.commit()
                if self.get_meta("stopped") is None:
                    self.set_meta("stopped", "0")
                if self.get_meta("min_gap_sec") is None:
                    self.set_meta("min_gap_sec", "30")
                if self.get_meta("last_start_at") is None:
                    self.set_meta("last_start_at", "0")
            finally:
                conn.close()

    def get_meta(self, key: str) -> str | None:
        with self._lock:
            conn = self._connect()
            try:
                row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
                return None if row is None else str(row["value"])
            finally:
                conn.close()

    def set_meta(self, key: str, value: str) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    (key, str(value)),
                )
                conn.commit()
            finally:
                conn.close()

    def stopped(self) -> bool:
        return self.get_meta("stopped") == "1"

    def set_stopped(self, stopped: bool) -> None:
        self.set_meta("stopped", "1" if stopped else "0")

    def min_gap_sec(self) -> int:
        try:
            return max(0, int(self.get_meta("min_gap_sec") or "30"))
        except ValueError:
            return 30

    def set_min_gap_sec(self, seconds: int) -> None:
        self.set_meta("min_gap_sec", str(max(0, int(seconds))))

    def last_start_at(self) -> int:
        try:
            return int(self.get_meta("last_start_at") or "0")
        except ValueError:
            return 0

    def touch_last_start(self) -> None:
        import time

        self.set_meta("last_start_at", str(int(time.time())))

    def _row_to_job(self, row: sqlite3.Row) -> dict[str, Any]:
        payload = json.loads(row["payload_json"] or "{}")
        result = json.loads(row["result_json"]) if row["result_json"] else None
        return {
            "id": row["id"],
            "capability": row["capability"],
            "payload": payload,
            "state": row["state"],
            "result": result,
            "error": row["error"],
            "attempts": row["attempts"],
            "maxAttempts": row["max_attempts"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "startedAt": row["started_at"],
            "finishedAt": row["finished_at"],
        }

    def create_job(
        self,
        *,
        job_id: str | None,
        capability: str,
        payload: dict[str, Any],
        max_attempts: int = 2,
    ) -> dict[str, Any]:
        capability = (capability or DEFAULT_CAPABILITY).strip()
        job_id = (job_id or "").strip() or f"job_{uuid.uuid4().hex[:12]}"
        with self._lock:
            conn = self._connect()
            try:
                existing = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
                if existing:
                    return {"duplicate": True, "job": self._row_to_job(existing)}
                ts = now_iso()
                conn.execute(
                    """
                    INSERT INTO jobs(
                      id, capability, payload_json, state, result_json, error,
                      attempts, max_attempts, created_at, updated_at
                    ) VALUES (?, ?, ?, 'queued', NULL, NULL, 0, ?, ?, ?)
                    """,
                    (
                        job_id,
                        capability,
                        json.dumps(payload or {}),
                        max(1, int(max_attempts)),
                        ts,
                        ts,
                    ),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
                return {"duplicate": False, "job": self._row_to_job(row)}
            finally:
                conn.close()

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            conn = self._connect()
            try:
                row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
                return None if row is None else self._row_to_job(row)
            finally:
                conn.close()

    def list_jobs(self, *, limit: int = 50) -> list[dict[str, Any]]:
        with self._lock:
            conn = self._connect()
            try:
                rows = conn.execute(
                    "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?",
                    (max(1, min(200, int(limit))),),
                ).fetchall()
                return [self._row_to_job(r) for r in rows]
            finally:
                conn.close()

    def claim_next(self) -> dict[str, Any] | None:
        """Atomically claim the oldest queued job (serial worker)."""
        if self.stopped():
            return None
        with self._lock:
            conn = self._connect()
            try:
                row = conn.execute(
                    """
                    SELECT * FROM jobs
                    WHERE state = 'queued'
                    ORDER BY created_at ASC
                    LIMIT 1
                    """
                ).fetchone()
                if row is None:
                    return None
                ts = now_iso()
                conn.execute(
                    """
                    UPDATE jobs
                    SET state = 'awaiting_auth',
                        attempts = attempts + 1,
                        started_at = COALESCE(started_at, ?),
                        updated_at = ?
                    WHERE id = ? AND state = 'queued'
                    """,
                    (ts, ts, row["id"]),
                )
                conn.commit()
                claimed = conn.execute("SELECT * FROM jobs WHERE id = ?", (row["id"],)).fetchone()
                return self._row_to_job(claimed)
            finally:
                conn.close()

    def update_job(
        self,
        job_id: str,
        *,
        state: str | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
        finished: bool = False,
    ) -> dict[str, Any] | None:
        with self._lock:
            conn = self._connect()
            try:
                row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
                if row is None:
                    return None
                ts = now_iso()
                new_state = state or row["state"]
                if new_state not in STATES:
                    raise ValueError(f"invalid_state:{new_state}")
                result_json = row["result_json"]
                if result is not None:
                    result_json = json.dumps(result)
                finished_at = row["finished_at"]
                if finished or new_state in ("completed", "failed", "cancelled"):
                    finished_at = ts
                conn.execute(
                    """
                    UPDATE jobs
                    SET state = ?, result_json = ?, error = ?, updated_at = ?, finished_at = ?
                    WHERE id = ?
                    """,
                    (
                        new_state,
                        result_json,
                        error if error is not None else row["error"],
                        ts,
                        finished_at,
                        job_id,
                    ),
                )
                conn.commit()
                return self._row_to_job(conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone())
            finally:
                conn.close()

    def cancel_job(self, job_id: str) -> dict[str, Any] | None:
        job = self.get_job(job_id)
        if not job:
            return None
        if job["state"] in ("completed", "failed", "cancelled"):
            return job
        return self.update_job(job_id, state="cancelled", error="cancelled_by_owner", finished=True)

    def cancel_queued(self) -> int:
        with self._lock:
            conn = self._connect()
            try:
                ts = now_iso()
                cur = conn.execute(
                    """
                    UPDATE jobs
                    SET state = 'cancelled', error = 'stopped', updated_at = ?, finished_at = ?
                    WHERE state = 'queued'
                    """,
                    (ts, ts),
                )
                conn.commit()
                return cur.rowcount or 0
            finally:
                conn.close()

    def summary(self) -> dict[str, Any]:
        with self._lock:
            conn = self._connect()
            try:
                rows = conn.execute(
                    "SELECT state, COUNT(*) AS n FROM jobs GROUP BY state"
                ).fetchall()
                by_state = {r["state"]: r["n"] for r in rows}
                return {
                    "byState": by_state,
                    "queued": by_state.get("queued", 0),
                    "active": sum(by_state.get(s, 0) for s in ("awaiting_auth", "filled", "submitted")),
                    "completed": by_state.get("completed", 0),
                    "failed": by_state.get("failed", 0),
                    "cancelled": by_state.get("cancelled", 0),
                }
            finally:
                conn.close()
