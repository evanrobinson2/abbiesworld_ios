"""Build RESULTS.md and index.html (results page) from each model's notes.json + provenance.json.

python make_results.py
"""
import json, os, html

ROOT = os.path.dirname(os.path.abspath(__file__))
ORDER = ["pirate-chest", "potion-bottle", "space-helmet", "street-lamp", "sci-fi-crate", "picnic-table",
         "park-bench", "lighthouse", "tractor", "chicken"]
STAGES = ["import", "repair", "assemble_scale_pivot", "decimate", "uv", "bake", "material", "export"]
TARGET_BAND = {"pirate-chest": "prop 200-1500", "potion-bottle": "prop 200-1500", "space-helmet": "prop 200-1500",
               "street-lamp": "prop 200-1500", "sci-fi-crate": "prop 200-1500", "picnic-table": "furniture 1-4k",
               "park-bench": "furniture 1-4k", "lighthouse": "building 3-12k", "tractor": "vehicle 3-12k",
               "chicken": "creature 5-15k"}

rows = []
for slug in ORDER:
    d = os.path.join(ROOT, slug)
    try:
        n = json.load(open(os.path.join(d, "notes.json")))
        p = json.load(open(os.path.join(d, "provenance.json")))
    except FileNotFoundError:
        rows.append(dict(slug=slug, failed=True)); continue
    rows.append(dict(slug=slug, n=n, p=p, failed=False))


def s(n, st): return n["stages"][st]["seconds"]


md = ["# STL pilot results", "",
      "10 models from Printables (CC0 or CC BY only), cleaned with `stl_pipeline.py` in Blender 4.1 (headless), one model per run. "
      "Times are real wall clock on this machine (CPU Cycles bake, no GPU). Triangle counts are triangles.", "",
      "| Model | Licence | Band | Source tris | Final tris | import | repair | scale | decimate | uv | bake | material | export | total (process) | GLB |",
      "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
for r in rows:
    if r["failed"]:
        md.append(f"| {r['slug']} | FAILED | | | | | | | | | | | | | |"); continue
    n, p = r["n"], r["p"]
    lic = "CC0" if "Zero" in p["licence"] else "CC BY 4.0"
    md.append(f"| [{p['title']}]({p['model_url']}) | {lic} | {TARGET_BAND[r['slug']]} | {n['stages']['import']['tris']:,} | {n['final_tris']:,} | "
              + " | ".join(f"{s(n, st):.1f}s" for st in STAGES) + f" | {n.get('process_wall_s', n['script_total_s']):.1f}s | {n['stages']['export']['bytes']/1024:.0f} KB |")
open(os.path.join(ROOT, "RESULTS.md.table"), "w", encoding="utf-8").write("\n".join(md) + "\n")

# ---- results page ----
cards = []
for r in rows:
    slug = r["slug"]
    if r["failed"]:
        cards.append(f'<section class="card failed"><h2>{html.escape(slug)}</h2><p>Pipeline failed; see RESULTS.md.</p></section>'); continue
    n, p = r["n"], r["p"]
    lic = "CC0 1.0" if "Zero" in p["licence"] else "CC BY 4.0"
    st = "".join(f"<tr><td>{k.replace('_', ' ')}</td><td class=num>{s(n, k):.1f}s</td><td class=num>{n['stages'][k]['tris']:,}</td></tr>" for k in STAGES)
    cards.append(f'''<section class="card" id="{slug}">
  <h2>{html.escape(p['title'])}</h2>
  <div class="pair">
    <figure><img src="{slug}/source-image.jpg" alt="Printables source image for {html.escape(p['title'])}" loading="lazy"><figcaption>Source image from Printables</figcaption></figure>
    <figure><model-viewer src="{slug}/{slug}.glb" camera-controls auto-rotate touch-action="pan-y" shadow-intensity="0.8" exposure="1.1" alt="Cleaned 3D model of {html.escape(p['title'])}"></model-viewer><figcaption>Cleaned GLB, {n['final_tris']:,} triangles (drag to orbit, scroll to zoom)</figcaption></figure>
  </div>
  <p class="src"><b>{lic}</b> · by <a href="{p['author_url']}">{html.escape(p['author'])}</a> · <a href="{p['model_url']}">model page</a> · <a href="{slug}/provenance.json">provenance.json</a> · <a href="{slug}/licence.jpg">licence screenshot</a><br><span class="muted">{html.escape(p['origin'])}</span></p>
  <details><summary>{n['stages']['import']['tris']:,} → {n['final_tris']:,} triangles in {n.get('process_wall_s', n['script_total_s']):.0f}s</summary>
  <table><thead><tr><th>stage</th><th>time</th><th>tris after</th></tr></thead><tbody>{st}</tbody></table></details>
</section>''')

page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>STL Pilot Results</title>
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>
<style>
:root{{--bg:#fbf8f3;--ink:#1f1a14;--muted:#6b6258;--card:#fff;--line:#e6dfd3;--accent:#c4521f}}
@media (prefers-color-scheme:dark){{:root{{--bg:#16130f;--ink:#f3ede4;--muted:#a69b8d;--card:#201c17;--line:#3a332b;--accent:#ff8a57}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:24px 16px 64px}}
h1{{font-size:1.7rem;margin:0 0 4px}}p.lede{{color:var(--muted);margin:0 0 24px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:0 0 20px}}
.card h2{{margin:0 0 12px;font-size:1.15rem}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
@media(max-width:700px){{.pair{{grid-template-columns:1fr}}}}
figure{{margin:0}}figure img,model-viewer{{width:100%;height:320px;border-radius:10px;background:#efe9de;object-fit:contain;display:block}}
@media (prefers-color-scheme:dark){{figure img,model-viewer{{background:#2a251f}}}}
figcaption,.muted{{color:var(--muted);font-size:.85rem}}
.src{{margin:12px 0 4px;font-size:.92rem}}a{{color:var(--accent)}}
table{{border-collapse:collapse;width:100%;font-size:.9rem;margin-top:8px}}th,td{{text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}}.num{{text-align:right;font-variant-numeric:tabular-nums}}
summary{{cursor:pointer;color:var(--muted);font-size:.9rem}}
</style></head><body><main>
<h1>STL pilot: 10 Printables models, cleaned</h1>
<p class="lede">Every model is CC0 or CC BY and carries its author, licence and source link in its own provenance.json. Left: the Printables source image. Right: our cleaned GLB (repair, decimate, UV, normal + AO bake, role-named materials).</p>
{"".join(cards)}
</main></body></html>'''
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(page)
print("wrote index.html and RESULTS.md.table")
