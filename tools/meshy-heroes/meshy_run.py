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


def spend(n, what):
    with lock:
        d = json.loads(CREDITS.read_text()) if CREDITS.exists() else {"cap": CAP, "total": 0, "log": []}
        if d["total"] + n > CAP:
            raise RuntimeError(f"cap: {d['total']}+{n} would pass {CAP}")
        d["total"] += n
        d["log"].append({"what": what, "credits": n, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        CREDITS.parent.mkdir(parents=True, exist_ok=True)
        CREDITS.write_text(json.dumps(d, indent=1))


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
    urllib.request.urlretrieve(url, dest)


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
    with lock:
        subprocess.run(["git", "add", "-f"] + [str(p) for p in paths], cwd=ROOT)
        subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, capture_output=True)
        for i in range(4):
            if subprocess.run(["git", "pull", "--rebase", "-q", "origin", "claude/project-thread-4a30bd"], cwd=ROOT).returncode == 0 \
               and subprocess.run(["git", "push", "-q", "origin", "HEAD:claude/project-thread-4a30bd"], cwd=ROOT).returncode == 0:
                return
            time.sleep(2 ** (i + 1))


def run(job):
    jid = job["id"]
    out = ROOT / job["save_to"]
    out.mkdir(parents=True, exist_ok=True)
    prov = {"job": jid, "tasks": [], "credits": 0}
    tmp = out / "views"
    kind = job["kind"]
    if kind == "retexture":
        raise RuntimeError("retexture not wired")
    views = views_for(job, tmp)
    textured = job.get("should_texture", True)
    n = len(views)
    body = {"ai_model": "latest", "should_texture": textured, "enable_pbr": textured,
            "topology": "triangle", "target_polycount": 12000, "symmetry_mode": "auto"}
    if kind == "multi-image-to-3d" and n >= 2:
        ep, body["image_urls"] = "/v1/multi-image-to-3d", [data_uri(v) for v in views]
    else:
        ep, body["image_url"] = "/v1/image-to-3d", data_uri(views[0])
        if kind == "multi-image-to-3d":
            prov["note"] = "fewer than 2 clean views: image-to-3d on front"
    cost = job.get("credits", 30)
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
        spend(rig["credits"], f"{jid} rig")
        rb = {"input_task_id": tid, "height_meters": rig.get("height_meters", 1.7)}
        rid = call("POST", "/v1/rigging", rb)["result"]
        prov["tasks"].append({"stage": "rig", "task_id": rid, "credits": rig["credits"], "params": rb})
        prov["credits"] += rig["credits"]
        rr = poll("/v1/rigging", rid, jid + " rig")["result"]
        for k, u in rr.items():
            if isinstance(u, str) and u.startswith("http") and "glb" in k:
                fetch(u, out / f"{jid}_{k.replace('_url','')}.glb")
        for k, u in (rr.get("basic_animations") or {}).items():
            if isinstance(u, str) and u.startswith("http") and "glb" in k:
                fetch(u, out / "basic_animations" / f"{k.replace('_url','')}.glb")
    (out / "provenance.json").write_text(json.dumps(prov, indent=1))
    import shutil; shutil.rmtree(tmp, ignore_errors=True)
    git(f"Meshy hero {jid}: textured model + rig, {prov['credits']} credits", [out, CREDITS])
    print("done", jid, prov["credits"], flush=True)


if __name__ == "__main__":
    KEY = key()
    queue = {j["id"]: j for j in json.loads((HERE / "meshy-queue.json").read_text())["jobs"]}
    ids = sys.argv[1:]
    from concurrent.futures import ThreadPoolExecutor
    def safe(i):
        try:
            run(queue[i])
        except Exception as e:
            print("FAIL", i, str(e).replace(KEY, "***"), flush=True)
    with ThreadPoolExecutor(3) as ex:
        list(ex.map(safe, ids))
