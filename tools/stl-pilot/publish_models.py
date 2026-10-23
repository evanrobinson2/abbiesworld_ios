"""Put the STL pilot models on the /models review desk (a "STL pilot · Printables" group) and in the review feed.

python publish_models.py        # run after stl_pipeline.py has produced every <slug>/<slug>.glb + notes.json
Copies model.glb and ref.jpg into prototypes/ranch-atelier/dist/models/stl-<slug>/, upserts manifest.json entries,
and upserts one item (id "stl-pilot") in dist/review/feed.json so the set opens at /models/?set=stl-pilot.
"""
import json, os, shutil, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.abspath(os.path.join(HERE, "..", "..", "prototypes", "ranch-atelier", "dist"))
GROUP = "Free sources · Printables"
NOW = "2026-10-23"

ORDER = ["pirate-chest", "potion-bottle", "space-helmet", "street-lamp", "sci-fi-crate", "picnic-table",
         "park-bench", "lighthouse", "tractor", "chicken"]
# what we saw on review of the cleaned model (filled in by hand after looking at each preview)
NOTES = json.load(open(os.path.join(HERE, "review_notes.json"), encoding="utf-8"))

manifest_path = os.path.join(DIST, "models", "manifest.json")
manifest = json.load(open(manifest_path, encoding="utf-8"))
keep = [m for m in manifest["models"] if not m["id"].startswith("stl-")]
new = []
for slug in ORDER:
    d = os.path.join(HERE, slug)
    n = json.load(open(os.path.join(d, "notes.json"), encoding="utf-8"))
    p = json.load(open(os.path.join(d, "provenance.json"), encoding="utf-8"))
    mid = "stl-" + slug
    out = os.path.join(DIST, "models", mid)
    os.makedirs(out, exist_ok=True)
    shutil.copy(os.path.join(d, slug + ".glb"), os.path.join(out, "model.glb"))
    shutil.copy(os.path.join(d, "source-image.jpg"), os.path.join(out, "ref.jpg"))
    lic = "CC0 1.0 (public domain)" if "Zero" in p["licence"] else "CC BY 4.0 (credit the author)"
    lic_short = "CC0" if "Zero" in p["licence"] else "CC BY 4.0"
    sz = n["scale_to_metres"]["final_size_m"]
    st = n["stages"]
    wall = n.get("process_wall_s", n["script_total_s"])
    note = NOTES[slug]
    new.append({
        "id": mid, "name": p["title"], "style": "", "group": GROUP,
        "subject": p["category"],
        "status": note["status"],
        "ask": "A free Printables model, cleaned up for our game. Is it a good starting point, or should we rebuild it in our own style?",
        "orbit": note.get("orbit", [-25, 70]), "date": NOW,
        "urls": {"ref": f"/models/{mid}/ref.jpg", "glb": f"/models/{mid}/model.glb"},
        "good": note["good"], "off": note["off"],
        "source": {"site": "Printables", "author": p["author"], "licence": lic_short, "licenceUrl": p["licence_url"], "url": p["model_url"], "authorUrl": p["author_url"], "credit": p.get("origin", "")},
        "steps": [["Where it came from.", f"{p['title']} by {p['author']} on Printables, shared under {lic}."],
                  ["What we did.", "Repaired the mesh, set it to real-world size with its base on the ground, made it light enough for the game, unwrapped it and baked in surface detail and shading."]],
        "details": [["Size", " × ".join(f"{v:g}" for v in sz) + " m"], ["Licence", lic]],
    })
manifest["models"] = keep + new
manifest["updated"] = NOW
json.dump(manifest, open(manifest_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

feed_path = os.path.join(DIST, "review", "feed.json")
feed = json.load(open(feed_path, encoding="utf-8"))
feed["items"] = [i for i in feed["items"] if i["id"] != "stl-pilot"]
feed["items"].append({
    "id": "stl-pilot", "at": "2026-10-23T22:30:00Z", "title": "Free models from Printables",
    "ask": "Ten free Printables models (CC0 or CC BY), cleaned up. Which are worth keeping, and which should we rebuild in our own style?",
    "thread": "Free sources", "image": "img/stl-pilot.jpg",
    "link": "/models/?set=stl-pilot", "linkLabel": "Open the 10 models",
    "models": ["stl-*"], "status": "waiting"})
json.dump(feed, open(feed_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("published", len(new), "models")
