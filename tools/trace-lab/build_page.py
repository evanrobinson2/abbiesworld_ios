"""Builds studies/drawing/index.html (images by relative path) and, with --inline, a single-file copy for the artifact."""
import sys, base64, json, pathlib
D = pathlib.Path("prototypes/ranch-atelier/dist/studies/drawing"); inline = "--inline" in sys.argv
tr = json.load(open(D/"traces-scores.json")); tr2 = json.load(open(D/"traces-scores-second-image.json")); fit = json.load(open(D/"fit.json")); sk = json.load(open(D/"skin_scores.json"))
def img(n, cap, cls=""):
    p = D/"img"/n; src = "data:image/jpeg;base64,"+base64.b64encode(p.read_bytes()).decode() if inline else "img/"+n
    return f'<figure class="{cls}"><img src="{src}" alt="{cap}"><figcaption>{cap}</figcaption></figure>'
def row(k, label, note):
    a, b = tr[k], tr2[k]
    return f'<tr><td>{label}</td><td>{a["recall"]*100:.1f}%</td><td>{a["precision"]*100:.1f}%</td><td>{a["weight_corr"]:.2f} / {b["weight_corr"]:.2f}</td><td>{note}</td></tr>'
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Why Our Drawing Is Weak</title><style>
:root{{--bg:#fbf9f4;--ink:#1c2740;--mut:#5d6a85;--card:#fff;--line:#d8dfec;--acc:#2f5fb3;--bad:#b4442f;--good:#2e7d5b}}
@media(prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}}}}
:root[data-theme=dark]{{--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,system-ui,Segoe UI,sans-serif}}
main{{max-width:980px;margin:0 auto;padding:28px 16px 64px}}h1{{font-size:1.9rem;margin:.2em 0}}h2{{margin:2em 0 .4em;font-size:1.25rem}}.id{{color:var(--mut);font-size:.85rem;letter-spacing:.04em}}
p,li{{max-width:68ch}}.lede{{font-size:1.1rem}}.grid{{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:14px 0}}
figure{{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px}}figure img{{width:100%;display:block;border-radius:8px;background:#fff}}figcaption{{font-size:.82rem;color:var(--mut);padding:6px 4px 2px}}
.wide{{grid-column:1/-1}}table{{border-collapse:collapse;width:100%;font-size:.88rem;background:var(--card);border-radius:12px;overflow:hidden;border:1px solid var(--line)}}th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}}th{{color:var(--mut);font-weight:600}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}}.bad{{color:var(--bad)}}.good{{color:var(--good)}}.tbl{{overflow-x:auto}}code{{font-size:.85em}}
</style></head><body><main>
<div class="id">AW-STUDY-0044</div><h1>Why Our Drawing Is Weak</h1>
<p class="lede">Midjourney draws a leaping wooden mannequin in one shot. When we draw the same thing in code it comes out as disconnected capsules. We traced the Midjourney picture four ways, fitted our puppet to it with a render-and-compare loop, and cut the traced lines into puppet parts. <b>Short answer: tracing is not what is broken. We draw from a description instead of from the picture, we never measure the result, and our score cannot see line or feeling.</b></p>
<h2>1. The failure, beside what was intended</h2>
<div class="grid">{img("original.jpg","What was intended: a Midjourney sketch (blue graphite, job1_1). Line weight, bevelled joints, a floating flung arm.")}{img("before-hand.jpg","What our code drew for the same leap (tools/figure-practice, the 2D puppet). Parts do not touch, the torso is a blob, the head floats.")}{img("round0.jpg","Landmarks read by eye off a 32px grid, with the picture in front of me. Red = puppet outline. Silhouette match 0.49, up to 30 px off.")}</div>
<h2>2. Can code trace the picture at all?</h2>
<p>Yes. Same picture, ink mask at 3x, then four routes. Recall and precision are measured with a 3 px tolerance; line weight is the correlation of stroke thickness along the line (two images, first / second).</p>
<div class="tbl"><table><tr><th>Route</th><th>Ink covered</th><th>Drawn ink that is real</th><th>Line-weight match</th><th>What it keeps or loses</th></tr>
{row("A_potrace","potrace (filled outline)","shape and pressure kept. Tone and soft pencil flatten to one dark ink.")}
{row("C0_centerline_flat","centerline, one width","shape kept, every line the same: reads as a wire diagram.")}
{row("C_centerline_weighted","centerline, width per segment","shape kept, weight half-recovered; strokes break into dashes.")}</table></div>
<p class="card"><b>Honest limit:</b> these are scored against my own thresholded ink mask, so they prove the tracing is faithful, not that the picture is perfectly captured. What the mask throws away is the light blue construction lines and the soft shading. vtracer in colour mode was tried and dropped (it traced the paper, my setup error), so it is not scored.</p>
<div class="grid">{img("potrace.jpg","potrace: shape and weight survive")}{img("centerline-flat.jpg","centerline, one width: a wire")}{img("centerline-weighted.jpg","centerline with measured width")}</div>
{img("detail.jpg","Same 130 px square of the head and chest: original, potrace, centerline flat, centerline weighted, traced skin (two ink layers), our fitted capsules. The capsule version has no line at all.","wide")}
<h2>3. Why our drawing is weak: five causes, in order</h2>
<ol><li><b>We draw from a description, not the picture.</b> The hand puppet was built from a stock photo's joints and a capsule recipe. Nothing in the pipeline looks at the Midjourney image.</li>
<li><b>No measuring loop.</b> The practice reps ran a loop by hand: nine reps, one change per round, to reach 0.871 on the leap. My render-and-compare loop took the eyeballed 0.49 to <b>{fit["round1"]["iou"]:.3f}</b> in 4,000 automatic tries (chamfer {fit["round0"]["chamfer"]:.1f} to {fit["round1"]["chamfer"]:.1f} px), and then stopped improving for the same reason the reps did.</li>
<li><b>Primitives have no line.</b> A capsule is a filled shape with one stroke width. A drawn mannequin gets its feel from heavy and light lines, bevelled joints and hatching. None of that can come out of ellipses and tapers.</li>
<li><b>The score cannot see feeling.</b> Silhouette overlap tops out near 0.87 for both the practice reps and my loop, while the fitted capsules still look nothing like the sketch. We need line weight, tone and gesture in the score.</li>
<li><b>Tracing was never used as the skin.</b> We trace to compare, then re-draw. The picture's line quality is thrown away at the one moment it could be kept.</li></ol>
<h2>4. The fix, proven on the 2D example</h2>
<p>Three steps: measure the landmarks with the loop, trace the picture in two ink layers (dark outline, light construction), and cut the trace into the fitted parts on the skeleton. At rest the puppet <b>is</b> the Midjourney picture again: {sk["rest_recall"]*100:.1f}% of the ink covered, {sk["rest_precision"]*100:.1f}% of drawn ink real, {sk["parts"]} parts, vector. Posed, the parts keep their line.</p>
<div class="grid">{img("original.jpg","Intended")}{img("puppet-round1.jpg","BEFORE: our puppet, fitted by the loop (best it can do)")}{img("skin-rest.jpg","AFTER: traced-skin puppet at rest")}{img("skin-posed.jpg","AFTER, posed: arms lowered, kicking leg swung down. Rotation about the fitted joints.")}</div>
<p class="card"><b>What is still wrong:</b> turning a part opens gaps where it used to overlap its neighbour (the drawn joint behind it was never drawn), and the floating arm is Midjourney's own mistake, so it posed badly. Both are the 0041 rig's job: joint caps and overlap fill. One image was fitted; the second image was only traced.</p>
<h2>5. What we change</h2>
<ol><li><b>Reference first.</b> Any figure or character drawn in code starts from a Midjourney picture (or one Evan gives us). We trace it; we do not re-draw it.</li>
<li><b>Measure, never eyeball.</b> Landmarks come from the render-and-compare loop (<code>tools/trace-lab/fit.py</code>) before anything is shown.</li>
<li><b>Parts are traced cut-outs on the rig.</b> <code>skin.py</code> output feeds the 2D rigging study (0041) and the mannequin puppet (0038) as skins; drawing stays for geometry that is geometry.</li>
<li><b>Score the feeling.</b> Add line-weight match, ink coverage and a two-layer tone check to the practice-rep score next to silhouette overlap.</li>
<li><b>Next test:</b> a Midjourney character with a face, expression and hands (fictional adult), to see what the skin keeps when the picture has feeling in the face. No kids' faces are redrawn.</li></ol>
<p class="id">Code: tools/trace-lab/ (traces.py, fit.py, skin.py). Data: scores in this folder. Tour: no. Sources: our practice reps and 0038/0041 notes, potrace (Selinger), Midjourney sketches in tools/midjourney/outputs/figure-practice-sketches.</p>
</main></body></html>"""
out = D/("artifact.html" if inline else "index.html"); out.write_text(html); print(out, len(html))
