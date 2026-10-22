"""Serial worker loop — local queue + outbound cloud pull."""
from __future__ import annotations

import threading
import time

import cloud_pull
from browser_mj import fill_prompt, harvest_candidates, release_owned_browser, submit_create
from humanize import (
    after_fill_before_submit,
    after_submit_before_harvest,
    before_fill,
    between_harvest_polls,
    enabled as humanize_enabled,
)
from queue_store import JobStore

SUPPORTED = {"midjourney.imagine"}


class Worker:
    def __init__(self, store: JobStore, *, poll_sec: float = 1.0, harvest_wait_sec: int = 180):
        self.store = store
        self.poll_sec = poll_sec
        # Long prompts often need >90s before a full Create quartet lands.
        self.harvest_wait_sec = harvest_wait_sec
        self._thread: threading.Thread | None = None
        self._alive = False
        self._current_job_id: str | None = None
        self._last_message = "idle"
        self._cloud_heartbeat_at = 0.0

    @property
    def current_job_id(self) -> str | None:
        return self._current_job_id

    @property
    def last_message(self) -> str:
        return self._last_message

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._alive = True
        self._thread = threading.Thread(target=self._loop, name="ec-worker", daemon=True)
        self._thread.start()

    def stop_loop(self) -> None:
        self._alive = False

    def snapshot(self) -> dict:
        return {
            "alive": self._alive,
            "currentJobId": self._current_job_id,
            "lastMessage": self._last_message,
            "supportedCapabilities": sorted(SUPPORTED),
            "inFlightMax": 1,
            "humanize": humanize_enabled(),
            "cloudPull": cloud_pull.cloud_enabled(),
            "cloudUrl": cloud_pull.cloud_base() if cloud_pull.cloud_enabled() else None,
            "workerId": cloud_pull.worker_id() if cloud_pull.cloud_enabled() else None,
        }

    def _maybe_heartbeat(self) -> None:
        if not cloud_pull.cloud_enabled():
            return
        now = time.time()
        if now - self._cloud_heartbeat_at < 20:
            return
        self._cloud_heartbeat_at = now
        cloud_pull.heartbeat(
            current_job_id=self._current_job_id,
            last_message=self._last_message,
        )

    def _loop(self) -> None:
        while self._alive:
            self._maybe_heartbeat()
            if self.store.stopped():
                self._last_message = "stopped"
                time.sleep(self.poll_sec)
                continue
            gap = self.store.min_gap_sec()
            last = self.store.last_start_at()
            now = int(time.time())
            if last and now - last < gap:
                self._last_message = f"rate_wait:{gap - (now - last)}s"
                time.sleep(min(self.poll_sec, gap - (now - last)))
                continue

            job = self.store.claim_next()
            source = "local"
            if not job:
                cloud_job = cloud_pull.claim_job(sorted(SUPPORTED))
                if cloud_job:
                    cid = cloud_job["id"]
                    attempt = int(cloud_job.get("attempts") or 1)
                    local_id = f"cloud.{cid}.{attempt}"
                    mirrored = self.store.create_job(
                        job_id=local_id,
                        capability=cloud_job.get("capability") or "midjourney.imagine",
                        payload={
                            **(cloud_job.get("payload") or {}),
                            "cloudJobId": cid,
                        },
                        max_attempts=1,  # cloud owns retries
                    )
                    job = mirrored.get("job")
                    if job and job.get("state") == "queued":
                        self.store.update_job(job["id"], state="awaiting_auth")
                        job = self.store.get_job(job["id"])
                    source = "cloud"
                else:
                    err = cloud_pull.last_cloud_error()
                    self._last_message = err or "idle"
                    time.sleep(self.poll_sec)
                    continue

            if not job:
                self._last_message = "idle"
                time.sleep(self.poll_sec)
                continue

            self._run_job(job, source=source)

    def _run_job(self, job: dict, *, source: str = "local") -> None:
        job_id = job["id"]
        cloud_job_id = str((job.get("payload") or {}).get("cloudJobId") or "").strip()
        if source == "cloud" and not cloud_job_id and job_id.startswith("cloud."):
            cloud_job_id = job_id[len("cloud.") :]

        self._current_job_id = job_id
        self._last_message = f"running:{job_id}"
        self.store.touch_last_start()
        try:
            self._execute_job(job, job_id=job_id, cloud_job_id=cloud_job_id)
        finally:
            released = release_owned_browser()
            if released.get("closed"):
                self._last_message = f"{self._last_message}|released:{released.get('closed')}"
            self._current_job_id = None

    def _execute_job(self, job: dict, *, job_id: str, cloud_job_id: str) -> None:

        if self.store.stopped():
            self.store.update_job(job_id, state="cancelled", error="stopped", finished=True)
            if cloud_job_id:
                cloud_pull.fail_job(cloud_job_id, "stopped", requeue=True)
            self._current_job_id = None
            return

        capability = job.get("capability") or ""
        if capability not in SUPPORTED:
            err = f"unsupported_capability:{capability}"
            self.store.update_job(job_id, state="failed", error=err, finished=True)
            if cloud_job_id:
                cloud_pull.fail_job(cloud_job_id, err, requeue=False)
            self._current_job_id = None
            return

        prompt = str((job.get("payload") or {}).get("prompt") or "").strip()
        if not prompt:
            self.store.update_job(job_id, state="failed", error="prompt_required", finished=True)
            if cloud_job_id:
                cloud_pull.fail_job(cloud_job_id, "prompt_required", requeue=False)
            self._current_job_id = None
            return

        self._last_message = f"humanize_settle:{job_id}"
        before_fill()
        if self.store.stopped():
            self.store.update_job(job_id, state="cancelled", error="stopped", finished=True)
            if cloud_job_id:
                cloud_pull.fail_job(cloud_job_id, "stopped", requeue=True)
            self._current_job_id = None
            return

        self._last_message = f"typing:{job_id}"
        filled = fill_prompt(prompt)
        if not filled.get("ok"):
            self._fail_or_requeue(
                job,
                filled.get("message") or filled.get("code") or "fill_failed",
                cloud_job_id=cloud_job_id,
            )
            return
        self.store.update_job(job_id, state="filled", result={"fill": filled})

        if self.store.stopped():
            self.store.update_job(job_id, state="cancelled", error="stopped_after_fill", finished=True)
            if cloud_job_id:
                cloud_pull.fail_job(cloud_job_id, "stopped_after_fill", requeue=True)
            self._current_job_id = None
            return

        self._last_message = f"read_over:{job_id}"
        after_fill_before_submit()
        if self.store.stopped():
            self.store.update_job(job_id, state="cancelled", error="stopped_before_submit", finished=True)
            if cloud_job_id:
                cloud_pull.fail_job(cloud_job_id, "stopped_before_submit", requeue=True)
            self._current_job_id = None
            return

        self._last_message = f"submit:{job_id}"
        submitted = submit_create()
        if not submitted.get("ok"):
            self._fail_or_requeue(job, submitted.get("message") or "submit_failed", cloud_job_id=cloud_job_id)
            return
        self.store.update_job(
            job_id,
            state="submitted",
            result={"fill": filled, "submit": submitted},
        )

        after_submit_before_harvest()

        # Only harvest tiles from a NEW Create job — never prior debug/probe grids.
        exclude_job_ids = [str(x) for x in (submitted.get("beforeJobIds") or []) if str(x).strip()]
        prefer_job_id = str(submitted.get("newJobId") or "").strip() or None

        candidates: list[str] = []
        harvest_meta: dict = {}
        deadline = time.time() + self.harvest_wait_sec
        while time.time() < deadline:
            if self.store.stopped():
                self.store.update_job(job_id, state="cancelled", error="stopped_during_harvest", finished=True)
                if cloud_job_id:
                    cloud_pull.fail_job(cloud_job_id, "stopped_during_harvest", requeue=True)
                self._current_job_id = None
                return
            self._last_message = f"harvest:{job_id}"
            harvest = harvest_candidates(
                exclude_job_ids=exclude_job_ids,
                prefer_job_id=prefer_job_id,
            )
            harvest_meta = harvest if isinstance(harvest, dict) else {}
            urls = harvest_meta.get("candidateUrls") or []
            if isinstance(urls, list) and len(urls) >= 4:
                candidates = [str(u) for u in urls if str(u).startswith("https://")]
                if len(candidates) >= 4:
                    break
            between_harvest_polls()

        if not candidates:
            self._fail_or_requeue(job, "harvest_timeout_no_candidates", cloud_job_id=cloud_job_id)
            return

        result = {
            "fill": filled,
            "submit": submitted,
            "harvest": {
                "jobId": harvest_meta.get("jobId"),
                "excluded": len(exclude_job_ids),
                "preferJobId": prefer_job_id,
            },
            "candidateUrls": candidates[:8],
            "capability": capability,
        }
        self.store.update_job(job_id, state="completed", result=result, finished=True)
        if cloud_job_id:
            cloud_pull.complete_job(cloud_job_id, result)
        self._last_message = f"completed:{job_id}"
        self._current_job_id = None

    def _fail_or_requeue(self, job: dict, error: str, *, cloud_job_id: str = "") -> None:
        job_id = job["id"]
        attempts = int(job.get("attempts") or 1)
        max_attempts = int(job.get("maxAttempts") or 2)
        # Cloud-sourced: never requeue locally — cloud queue owns retry.
        if cloud_job_id:
            self.store.update_job(job_id, state="failed", error=str(error)[:300], finished=True)
            cloud_pull.fail_job(cloud_job_id, error, requeue=attempts < max_attempts)
            self._last_message = f"failed:{job_id}"
            self._current_job_id = None
            return
        if attempts < max_attempts and not self.store.stopped():
            self.store.update_job(job_id, state="queued", error=f"retry:{error}")
            self._last_message = f"requeue:{job_id}"
        else:
            self.store.update_job(job_id, state="failed", error=str(error)[:300], finished=True)
            self._last_message = f"failed:{job_id}"
        self._current_job_id = None
