"""Builds studies/figures-pencil/index.html; --inline makes a single-file copy for the artifact."""
import sys, base64, pathlib
D = pathlib.Path("prototypes/ranch-atelier/dist/studies/figures-pencil"); inline = "--inline" in sys.argv
CSS = ':root{--bg:#fbf9f4;--ink:#1c2740;--mut:#5d6a85;--card:#fff;--line:#d8dfec;--acc:#2f5fb3;--bad:#b4442f;--good:#2e7d5b}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}}:root[data-theme=dark]{--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,system-ui,Segoe UI,sans-serif}main{max-width:980px;margin:0 auto;padding:28px 16px 64px}h1{font-size:1.9rem;margin:.2em 0}h2{margin:2em 0 .4em;font-size:1.25rem}.id{color:var(--mut);font-size:.85rem;letter-spacing:.04em}p,li{max-width:68ch}.lede{font-size:1.1rem}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:14px 0}figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px}figure img{width:100%;display:block;border-radius:8px;background:#fff}figcaption{font-size:.82rem;color:var(--mut);padding:6px 4px 2px}.wide{grid-column:1/-1}table{border-collapse:collapse;width:100%;font-size:.88rem;background:var(--card);border-radius:12px;overflow:hidden;border:1px solid var(--line)}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}.bad{color:var(--bad)}.good{color:var(--good)}.tbl{overflow-x:auto}code{font-size:.85em}'
def img(n, cap):
    p = D/"img"/n; src = "data:image/jpeg;base64,"+base64.b64encode(p.read_bytes()).decode() if inline else "img/"+n
    return f'<figure><img src="{src}" alt="{cap}"><figcaption>{cap}</figcaption></figure>'
def row(w, p, title):
    return f'<h2>{title}</h2><div class="grid">{img(f"{w}-{p}-line.jpg","Posed mannequin, line render")}{img(f"{w}-{p}-v1.jpg","Pencil, outline only")}{img(f"{w}-{p}-v2.jpg","Pencil, with form hatching")}</div>'
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Male and Female Figures</title><style>{CSS}</style></head><body><main>
<div class="id">AW-STUDY-0046</div><h1>Male and Female Figures</h1>
<p class="lede">Evan asked for a male and a female figure study: figures and outlines. This time the <b>pose drives the drawing</b>: we pose our sealed mannequin bodies (fitted base layer, no anatomical detail), render their lines, and the code pencil draws them. Both figures get the same two poses, a heroic leap and a run.</p>
<p class="card"><b>Kept PG on purpose:</b> this is a kids' game with a public repo, so the bodies are smooth mannequins in a fitted base layer. Male and female read through proportion, shoulders, waist and hip mass, with no nipples or genital detail.</p>
{row("female","leap","Female, heroic leap")}{row("male","leap","Male, heroic leap")}{row("female","stride","Female, run")}{row("male","stride","Male, run")}
<h2>What this shows, honestly</h2>
<ul><li>The chain works end to end for the first time: pose, then line render, then pencil. No Midjourney picture was traced.</li>
<li>The form hatching is new: shading from the 3D normals becomes tapered pencil strokes, so the arms and torso gain volume.</li>
<li>The weak part is the bodies: our toned bases are low-poly with hexagonal limbs and cone hands, and male and female differ only slightly (waist taper and shoulders).</li></ul>
<h2>Even better if</h2>
<ol><li>The bodies were smooth, with real shoulder, rib-cage and hip shapes, so the contour carries gesture instead of straight segments.</li>
<li>Contour weight followed the form: heavy where the body turns away from the light, thin where it faces it, lifting at the ends.</li>
<li>Midjourney drew the same poses (male and female heroes, queued on the PC, waiting for Evan's signed-in Chrome) and we compared the feel side by side before choosing a final.</li>
<li>Hands were drawn as real mitten forms, not cones; hands and feet carry most of the expression in a figure drawing.</li>
<li>Gesture first: a line of action and big forms laid down before the contour, the way a figure drawer starts.</li></ol>
<p class="id">Code: tools/figure-pencil/pose_render.py (pose and render), tools/trace-lab/pencil.py (pencil, now with a shade map). Bodies: studies/bodies/male-toned.glb and female-toned.glb. Tour: no.</p>
</main></body></html>"""
out = D/("artifact.html" if inline else "index.html"); out.write_text(html); print(out, len(html))
