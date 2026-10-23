"""Publish the toy-car GLBs to the /models desk (group "Free sources · Printables") and write CARS.md.

python publish_cars.py    # after stl_pipeline.py has run for every car-* slug
Each car goes to prototypes/ranch-atelier/dist/models/stl-car-<name>/model.glb (+ ref.jpg) with a manifest entry.
"""
import json, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.abspath(os.path.join(HERE, "..", "..", "prototypes", "ranch-atelier", "dist"))
GROUP = "Free sources \u00b7 Printables"
ORDER = ["car-racer", "car-toddler", "car-pickup", "car-sedan", "car-wedge", "car-concept"]
NOTES = json.load(open(os.path.join(HERE, "car_notes.json"), encoding="utf-8"))

mp = os.path.join(DIST, "models", "manifest.json")
manifest = json.load(open(mp, encoding="utf-8"))
keep = [m for m in manifest["models"] if not m["id"].startswith("stl-car-")]
new, rows = [], []
for slug in ORDER:
    d = os.path.join(HERE, slug)
    n = json.load(open(os.path.join(d, "notes.json"), encoding="utf-8"))
    p = json.load(open(os.path.join(d, "provenance.json"), encoding="utf-8"))
    note = NOTES[slug]
    mid = "stl-" + slug
    out = os.path.join(DIST, "models", mid); os.makedirs(out, exist_ok=True)
    shutil.copy(os.path.join(d, slug + ".glb"), os.path.join(out, "model.glb"))
    shutil.copy(os.path.join(d, "source-image.jpg"), os.path.join(out, "ref.jpg"))
    cc0 = "Zero" in p["licence"]
    lic = "CC0 1.0 (public domain)" if cc0 else "CC BY 4.0 (credit the author)"
    sz = n["scale_to_metres"]["final_size_m"]  # width, height, length
    new.append({
        "id": mid, "name": note["name"], "style": "", "group": GROUP, "subject": "toy car", "status": note["status"],
        "ask": "A free toy car for the garage. Does it look right, and is it worth keeping or rebuilding?",
        "orbit": note["orbit"], "date": "2026-10-23",
        "urls": {"ref": f"/models/{mid}/ref.jpg", "glb": f"/models/{mid}/model.glb"},
        "good": note["good"], "off": note["off"],
        "source": {"site": "Printables", "author": p["author"], "licence": "CC0" if cc0 else "CC BY 4.0", "licenceUrl": p["licence_url"],
                   "url": p["model_url"], "authorUrl": p["author_url"], "credit": p.get("origin", "")},
        "steps": [["Where it came from.", f"{p['title']} by {p['author']} on Printables, shared under {lic}."],
                  ["What we did.", "Repaired the mesh, set it to car size facing forward with its wheels on the ground, lightened it for the game and baked in surface shading. Wheels are separate so they can spin."]],
        "details": [["Size", f"{sz[0]:g} wide \u00d7 {sz[1]:g} tall \u00d7 {sz[2]:g} long, m"], ["Wheels", str(n["wheel_count"]) if n["wheel_count"] else "Fused to the body"], ["Licence", lic]],
    })
    rows.append((slug, p, n, note))
manifest["models"] = keep + new
json.dump(manifest, open(mp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

md = ["# Toy cars from Printables", "",
      "Six toy cars (CC0 or CC BY only), cleaned with `stl_pipeline.py` (car mode, `stl_cars.py`). Garage contract: glTF Y-up, metres, car faces +Z, "
      "wheel bottoms on y = 0, body is one node, each wheel its own node named `wheel`, `wheel.001`, ... with its origin at the wheel centre and the axle along X. "
      "Published at `prototypes/ranch-atelier/dist/models/stl-car-<name>/model.glb`.", "",
      "| Car | Licence | Status | Source tris | Final tris | Wheels | W × H × L (m) | Time | GLB |", "|---|---|---|---:|---:|---:|---|---:|---:|"]
for slug, p, n, note in rows:
    sz = n["scale_to_metres"]["final_size_m"]
    md.append(f"| [{note['name']}]({p['model_url']}) | {'CC0' if 'Zero' in p['licence'] else 'CC BY 4.0'} | {note['status']} | {n['stages']['import']['tris']:,} | {n['final_tris']:,} | {n['wheel_count'] or 'fused'} | {sz[0]:g} × {sz[1]:g} × {sz[2]:g} | {n.get('process_wall_s', n['script_total_s']):.0f}s | {n['stages']['export']['bytes']/1024:.0f} KB |")
md += ["", "## Notes", "",
       "- No shopping-cart car exists on Printables under CC0 or CC BY (searches for shopping cart, shopping trolley, trolley car return only coins, tokens and keys).",
       "- Skipped: a low-poly sports car (\"inspired by a Porsche 911\") and a Cars-movie style car (a licensed character).",
       "- Wheels of the racer, toddler car and pickup are separate files in the source, so we placed copies on estimated axles. The sedan's four wheels are separate shells inside its one file and were found automatically.",
       "- The wedge and the concept car have their wheels fused to the body; they are published as weak because the wheels cannot spin.",
       "- Sizes are set to about car size (2.6 to 4.6 m long) for the garage; change `length_m` in `stl_cars.py` for another scale.",
       "- The source STLs stay on the PC (git-ignored); `provenance.json` has each sha256. Wheel bottoms land within about 3 cm of y = 0 (the sedan's two wheel sizes share meshes)."]
open(os.path.join(HERE, "CARS.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print("published", len(new))
