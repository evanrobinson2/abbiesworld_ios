"""Run Meshy hero jobs from meshy-queue.json.

    python meshy_run.py <job_id> [<job_id> ...]      (key: MESHY_API_KEY env var, else Windows clipboard)

Per job: split the pick into views (or use a views dir), multi-image-to-3d (or image-to-3d),
then rig if the job asks. Saves GLBs and provenance.json under save_to, keeps a running credit
total in meshy/credits.json and refuses to start a task that would pass the cap. The key is
never printed, logged or written.
"""
import base64, io, json, os, subprocess, sys, threading, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
API = "https://api.meshy.ai/openapi"
CAP = 2000
CREDITS = HERE / "meshy" / "credits.json"
lock = threading.Lock()


def key():
    k = os.environ.get("MESHY_API_KEY", "").strip()
    if not k:
        k = subprocess.run(["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"],
                           capture_output=True, text=True).stdout.strip()
    if not k.startswith("msy_"):
        sys.exit("no Meshy key found")
    return k


KEY = None


def call(method, path, body=None, raw=False):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code == 429 or e.code >= 500:
                time.sleep(5 * (attempt + 1)); continue
            raise RuntimeError(f"{method} {path} -> {e.code} {msg}")
    raise RuntimeError(f"{method} {path} failed after retries")


PENDING = []  # ledger entries spent in this run and not yet pushed


def ledger():
    return json.loads(CREDITS.read_text()) if CREDITS.exists() else {"cap": CAP, "total": 0, "log": []}


def spend(n, what):
    """Refuse a task that would pass the cap. Entries stay in memory until git() merges them into the ledger
    on top of whatever other runs pushed, so two runs never fight over credits.json."""
    with lock:
        total = ledger()["total"] + sum(e["credits"] for e in PENDING)
        if total + n > CAP:
            raise RuntimeError(f"cap: {total}+{n} would pass {CAP}")
        PENDING.append({"what": what, "credits": n, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})


def data_uri(path):
    b = Path(path).read_bytes()
    mime = "image/png" if str(path).endswith("png") else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(b).decode()


def poll(path, tid, what):
    while True:
        r = call("GET", f"{path}/{tid}")
        if r["status"] == "SUCCEEDED":
            return r
        if r["status"] in ("FAILED", "CANCELED"):
            raise RuntimeError(f"{what} {tid} {r['status']}: {r.get('task_error')}")
        time.sleep(10)


def fetch(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (meshy_run.py)"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)


def views_for(job, tmp):
    if job.get("single_view"):
        return [ROOT / job["image"]]
    if "image" in job:
        sys.path.insert(0, str(ROOT / "tools" / "midjourney"))
        import split_views
        split_views.main(str(ROOT / job["image"]), str(tmp), "front", "side", "back")
        return [tmp / f"view_{n}.png" for n in ("front", "side", "back")]
    d = ROOT / job["images"].split(" ")[0]
    return sorted(d.glob("view*"))[:4]


def git(msg, paths):
    """Commit outputs, rebase onto the branch, then add this run's ledger entries to the branch's credits.json."""
    br = os.environ.get("MESHY_BRANCH", "claude/project-thread-4a30bd")
    sh = lambda *a: subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True)
    with lock:
        sh("add", "-f", *[str(p) for p in paths if Path(p) != CREDITS])
        sh("commit", "-m", msg)
        for i in range(8):
            sh("fetch", "-q", "origin", br)
            if sh("rebase", "-q", "--autostash", f"origin/{br}").returncode != 0:
                sh("rebase", "--abort"); time.sleep(2 ** min(i, 4)); continue
            if PENDING:
                d = ledger(); d["log"] += PENDING; d["total"] = sum(e["credits"] for e in d["log"])
                CREDITS.parent.mkdir(parents=True, exist_ok=True)
                CREDITS.write_text(json.dumps(d, indent=1))
                sh("add", str(CREDITS)); sh("commit", "-m", "Meshy credits ledger")
            if sh("push", "-q", "origin", f"HEAD:{br}").returncode == 0:
                PENDING.clear(); return
            if PENDING:
                sh("reset", "-q", "HEAD~1"); sh("checkout", "--", str(CREDITS))
            time.sleep(2 ** min(i, 4))
        print("PUSH FAIL", msg, flush=True)


def do_rig(job, out, prov, tid, rig, rig_credits):
    jid = job["id"]
    if rig_credits:
        spend(rig["credits"], f"{jid} rig")
    if prov["tasks"][0].get("params", {}).get("should_remesh") is not True:
        spend(5, f"{jid} remesh")
        mb = {"input_task_id": tid, "target_formats": ["glb"], "topology": "triangle", "target_polycount": 30000}
        mid = call("POST", "/v1/remesh", mb)["result"]
        prov["tasks"].append({"stage": "remesh", "task_id": mid, "credits": 5, "params": mb})
        prov["credits"] += 5
        (out / "provenance.json").write_text(json.dumps(prov, indent=1))
        mr = poll("/v1/remesh", mid, jid + " remesh")
        fetch((mr.get("model_urls") or {})["glb"], out / f"{jid}_remesh30k.glb")
        tid = mid
    rb = {"input_task_id": tid, "height_meters": rig.get("height_meters", 1.7)}
    rid = call("POST", "/v1/rigging", rb)["result"]
    prov["tasks"].append({"stage": "rig", "task_id": rid, "credits": rig["credits"], "params": rb})
    prov["credits"] += rig["credits"]
    (out / "provenance.json").write_text(json.dumps(prov, indent=1))
    r = poll("/v1/rigging", rid, jid + " rig")
    rr = r.get("result") or r
    (out / "rig_result.json").write_text(json.dumps({k: (v if not isinstance(v, str) else v.split("?")[0]) for k, v in rr.items()}, indent=1, default=str))
    for k, u in rr.items():
        if isinstance(u, str) and u.startswith("http") and "glb" in k:
            fetch(u, out / f"{jid}_{k.replace('_url','')}.glb")
    ba = rr.get("basic_animations") or {}
    for k, u in ba.items():
        if isinstance(u, str) and u.startswith("http") and "glb" in k:
            fetch(u, out / "basic_animations" / f"{k.replace('_url','')}.glb")


def retexture(job, out, prov):
    """POST /v1/retexture on an earlier Meshy task (or a hero's 3d task), keeping its UVs; 10 credits."""
    jid = job["id"]
    tid = job.get("input_task_id")
    if not tid and job.get("from_hero"):
        hero = json.loads((ROOT / job["from_hero"] / "provenance.json").read_text())
        tid = hero["tasks"][0]["task_id"]
    body = {"input_task_id": tid, "enable_original_uv": True, "enable_pbr": True}
    if job.get("image_style"):
        body["image_style_url"] = data_uri(ROOT / job["image_style"])
    if job.get("text_style_prompt"):
        body["text_style_prompt"] = job["text_style_prompt"]
    cost = job.get("credits", 10)
    spend(cost, f"{jid} retexture")
    rid = call("POST", "/v1/retexture", body)["result"]
    prov["tasks"].append({"stage": "retexture", "task_id": rid, "credits": cost,
                          "params": {k: v for k, v in body.items() if k != "image_style_url"},
                          "image_style": job.get("image_style")})
    prov["credits"] += cost
    (out / "provenance.json").write_text(json.dumps(prov, indent=1))
    r = poll("/v1/retexture", rid, jid)
    fetch(r["model_urls"]["glb"], out / "model.glb")
    for name, u in (r.get("texture_urls") or [{}])[0].items():
        if u: fetch(u, out / f"tex_{name}.png")
    git(f"Meshy retexture {jid}: {cost} credits", [out, CREDITS])
    print("done", jid, cost, flush=True)


def run(job):
    jid = job["id"]
    out = ROOT / job["save_to"]
    out.mkdir(parents=True, exist_ok=True)
    prov = {"job": jid, "tasks": [], "credits": 0}
    tmp = out / "views"
    kind = job["kind"]
    if kind == "retexture":
        return retexture(job, out, prov)
    views = views_for(job, tmp)
    textured = job.get("should_texture", True)
    n = len(views)
    body = {"ai_model": "latest", "should_texture": textured, "enable_pbr": textured,
            "should_remesh": True, "topology": "triangle", "target_polycount": job.get("target_polycount", 30000), "symmetry_mode": job.get("symmetry_mode", "auto")}
    if kind == "multi-image-to-3d" and n >= 2:
        ep, body["image_urls"] = "/v1/multi-image-to-3d", [data_uri(v) for v in views]
    else:
        ep, body["image_url"] = "/v1/image-to-3d", data_uri(views[0])
        if kind == "multi-image-to-3d":
            prov["note"] = "fewer than 2 clean views: image-to-3d on front"
    cost = job.get("credits", 30)
    if job.get("recover_task"):  # paid for in an earlier run whose push failed
        tid, cost = job["recover_task"], 0
    else:
        spend(cost, f"{jid} 3d")
        tid = call("POST", ep, body)["result"]
    prov["tasks"].append({"stage": "3d", "endpoint": ep, "task_id": tid, "credits": cost,
                          "params": {k: v for k, v in body.items() if not k.startswith("image")},
                          "views": [v.name for v in views]})
    prov["credits"] += cost
    r = poll(ep, tid, jid)
    fetch(r["model_urls"]["glb"], out / f"{jid}.glb")
    for name, u in (r.get("texture_urls") or [{}])[0].items():
        if u: fetch(u, out / f"{jid}_tex_{name}.png")
    (out / "provenance.json").write_text(json.dumps(prov, indent=1))
    rig = (job.get("then") or {}).get("rigging")
    if rig:
        try:
            do_rig(job, out, prov, tid, rig, rig_credits=True)
        except Exception as e:
            prov["rig_error"] = str(e).replace(KEY, "***")[:500]
            print("RIG FAIL", jid, prov["rig_error"], flush=True)
    (out / "provenance.json").write_text(json.dumps(prov, indent=1))
    import shutil; shutil.rmtree(tmp, ignore_errors=True)
    git(f"Meshy hero {jid}: textured model + rig, {prov['credits']} credits", [out, CREDITS])
    print("done", jid, prov["credits"], flush=True)


if __name__ == "__main__":
    KEY = key()
    queue = {j["id"]: j for j in json.loads((HERE / "meshy-queue.json").read_text())["jobs"]}
    ids = sys.argv[1:]
    if ids == ["tasks"]:  # recent image-to-3d tasks with thumbnails, to recover runs whose push failed
        d = ROOT / "tools/meshy-heroes/meshy/recent-tasks"; d.mkdir(parents=True, exist_ok=True)
        rows = call("GET", "/v1/image-to-3d?page_size=12&sort_by=-created_at")
        rows = rows if isinstance(rows, list) else rows.get("result", rows)
        keep = []
        for t in rows:
            keep.append({k: t.get(k) for k in ("id", "status", "created_at", "finished_at", "art_style", "should_texture")})
            try:
                if t.get("thumbnail_url"):
                    fetch(t["thumbnail_url"], d / f"{t['id']}.png")
            except Exception as e:
                keep[-1]["thumb_error"] = str(e)
        (d / "tasks.json").write_text(json.dumps(keep, indent=1))
        git("Meshy: recent image-to-3d tasks for recovery", [d]); sys.exit()
    if ids and ids[0] == "--rig-only":
        ids = ids[1:]
        for i in ids:
            job = queue[i]; out = ROOT / job["save_to"]
            prov = json.loads((out / "provenance.json").read_text())
            tid = prov["tasks"][0]["task_id"]
            prov["tasks"] = prov["tasks"][:1]; prov["credits"] = prov["tasks"][0]["credits"]
            charged = any(t["stage"] == "rig" for t in prov["tasks"])
            try:
                do_rig(job, out, prov, tid, job["then"]["rigging"], rig_credits=True)
                prov.pop("rig_error", None)
                print("rigged", i, flush=True)
            except Exception as e:
                prov["rig_error"] = str(e).replace(KEY, "***")[:500]
                print("RIG FAIL", i, prov["rig_error"], flush=True)
            (out / "provenance.json").write_text(json.dumps(prov, indent=1))
            git(f"Meshy hero {i}: rig attempt", [out, CREDITS])
        sys.exit()
    from concurrent.futures import ThreadPoolExecutor
    def safe(i):
        try:
            run(queue[i])
        except Exception as e:
            print("FAIL", i, str(e).replace(KEY, "***"), flush=True)
    with ThreadPoolExecutor(3) as ex:
        list(ex.map(safe, ids))
