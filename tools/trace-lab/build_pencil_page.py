"""Builds studies/pencil/index.html; --inline makes a single-file copy for the artifact."""
import sys, base64, pathlib
D = pathlib.Path("prototypes/ranch-atelier/dist/studies/pencil"); inline = "--inline" in sys.argv
CSS = ':root{--bg:#fbf9f4;--ink:#1c2740;--mut:#5d6a85;--card:#fff;--line:#d8dfec;--acc:#2f5fb3;--bad:#b4442f;--good:#2e7d5b}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}}:root[data-theme=dark]{--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,system-ui,Segoe UI,sans-serif}main{max-width:980px;margin:0 auto;padding:28px 16px 64px}h1{font-size:1.9rem;margin:.2em 0}h2{margin:2em 0 .4em;font-size:1.25rem}.id{color:var(--mut);font-size:.85rem;letter-spacing:.04em}p,li{max-width:68ch}.lede{font-size:1.1rem}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:14px 0}figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px}figure img{width:100%;display:block;border-radius:8px;background:#fff}figcaption{font-size:.82rem;color:var(--mut);padding:6px 4px 2px}.wide{grid-column:1/-1}table{border-collapse:collapse;width:100%;font-size:.88rem;background:var(--card);border-radius:12px;overflow:hidden;border:1px solid var(--line)}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}.bad{color:var(--bad)}.good{color:var(--good)}.tbl{overflow-x:auto}code{font-size:.85em}'
def img(n, cap, cls=""):
    p = D/"img"/n; src = "data:image/jpeg;base64,"+base64.b64encode(p.read_bytes()).decode() if inline else "img/"+n
    return f'<figure class="{cls}"><img src="{src}" alt="{cap}"><figcaption>{cap}</figcaption></figure>'
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Perfect Drawing Pipeline</title><style>{CSS}</style></head><body><main>
<div class="id">AW-STUDY-0045</div><h1>The Perfect Drawing Pipeline</h1>
<p class="lede">Evan's perfect world: say "draw me a dramatic leaping heroic male figure", Midjourney gives the feel, the wooden mannequin takes the pose, Midjourney draws just the outline as a sketch, and code draws the lines with a real pencil. We ran it end to end. <b>Today the pencil works; the Midjourney steps for the male hero are waiting on Evan's signed-in Chrome, so every step below uses the Midjourney leap sketches we already had.</b></p>
<h2>The five steps, side by side</h2>
<div class="card"><b>1. You say it.</b> "Draw me a dramatic leaping heroic male figure." (Not run: the hero prompts are queued on the PC.)</div>
<div class="grid wide">{img("feel.jpg","2. Midjourney for the feel: four of the existing leap sketches (a mannequin, not the male hero)","wide")}</div>
<div class="grid">{img("pose.jpg","3. Pose the mannequin to match: landmarks fitted by the render-and-compare loop, silhouette match 0.871 (red = puppet outline)")}{img("outline.jpg","4. Midjourney as just the outline sketch (the same picture, not a fresh re-prompt)")}{img("draw3.jpg","5. Drawn in code: 280 strokes, pencil tip with pressure, taper, hand wobble, paper tooth")}</div>
<p class="card"><b>What is honest here:</b> step 3 only checks the pose, it does not yet drive the drawing; step 4 is the same Midjourney picture, not a new prompt from the posed mannequin; step 5 re-strokes Midjourney's own lines. So this proves the last step, a code pencil that reads as pencil, and not yet the whole chain.</p>
<h2>The pencil, three attempts, each with its "even better if"</h2>
<div class="grid">{img("crop1.jpg","Attempt 1: thin, even line on blotchy cool paper")}{img("crop2.jpg","Attempt 2: thicker, grainier; reads as crayon")}{img("crop3.jpg","Attempt 3: two passes with different wobble, lighter, grain beats pressure in the light parts")}</div>
<ol><li><b>Attempt 1.</b> Even better if the paper were warm and fine, and the line varied with pressure, not the picture's width. (Fixed in attempt 2.)</li>
<li><b>Attempt 2.</b> Even better if the graphite were lighter and the line were drawn twice with a slightly different hand. (Fixed in attempt 3.)</li>
<li><b>Attempt 3.</b> Even better if the stroke ran through junctions as one gesture: today it breaks into dashes wherever lines meet, which is where a hand would not lift.</li>
<li><b>Attempt 4 (failed).</b> I added hatching from the picture's soft tone; it drew nothing visible because the tone mask came out empty. Even better if the shading came from its own Midjourney pass ("shading only, soft pencil") and the pencil laid hatch strokes along the form, instead of thresholding tone out of the outline.</li></ol>
<div class="grid">{img("draw1.jpg","Attempt 1, whole page")}{img("draw2.jpg","Attempt 2, whole page")}{img("draw3.jpg","Attempt 3, whole page")}</div>
<h2>Even better if, for the whole pipeline</h2>
<ol><li>The posed mannequin is rendered as a plain outline and handed to Midjourney as the structure reference, so the sketch follows the pose exactly instead of us checking it afterwards.</li>
<li>Midjourney is asked for one clean contour and one separate shading pass, never both in one picture.</li>
<li>The pencil gets tilt (side-of-lead for tone, point for line) and lead wear, so strokes soften as they go.</li>
<li>Stroke order and speed come from the figure: gesture line first, big forms, then contour, then accents. Today it draws in pressure order.</li></ol>
<p class="id">Code: tools/trace-lab/pencil.py (run: python3 pencil.py in.png out.png --layers 2 --tone .9 --grain 1.0). The Midjourney hero set is queued as branch mj-aw-study-0045. Tour: no.</p>
</main></body></html>"""
out = D/("artifact.html" if inline else "index.html"); out.write_text(html); print(out, len(html))
