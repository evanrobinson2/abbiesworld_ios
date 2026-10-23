"""Builds studies/rig-hero/index.html; --inline makes a single-file copy for the artifact."""
import sys, base64, pathlib
D = pathlib.Path("prototypes/ranch-atelier/dist/studies/rig-hero"); inline = "--inline" in sys.argv
CSS = ':root{--bg:#fbf9f4;--ink:#1c2740;--mut:#5d6a85;--card:#fff;--line:#d8dfec;--acc:#2f5fb3;--bad:#b4442f;--good:#2e7d5b}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}}:root[data-theme=dark]{--bg:#12161f;--ink:#e6ebf6;--mut:#9aa7c2;--card:#1a2030;--line:#2b3550;--acc:#7da4ec;--bad:#e8826c;--good:#6fcf9f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,system-ui,Segoe UI,sans-serif}main{max-width:980px;margin:0 auto;padding:28px 16px 64px}h1{font-size:1.9rem;margin:.2em 0}h2{margin:2em 0 .4em;font-size:1.25rem}.id{color:var(--mut);font-size:.85rem;letter-spacing:.04em}p,li{max-width:68ch}.lede{font-size:1.1rem}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:14px 0}figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px}figure img{width:100%;display:block;border-radius:8px;background:#fff}figcaption{font-size:.82rem;color:var(--mut);padding:6px 4px 2px}.wide{grid-column:1/-1}table{border-collapse:collapse;width:100%;font-size:.88rem;background:var(--card);border-radius:12px;overflow:hidden;border:1px solid var(--line)}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}.bad{color:var(--bad)}.good{color:var(--good)}.tbl{overflow-x:auto}code{font-size:.85em}'
def img(n, cap):
    p = D/"img"/n; src = "data:image/jpeg;base64,"+base64.b64encode(p.read_bytes()).decode() if inline else "img/"+n
    return f'<figure><img src="{src}" alt="{cap}"><figcaption>{cap}</figcaption></figure>'
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rigged Hero Cut-Out</title><style>{CSS}</style></head><body><main>
<div class="id">AW-STUDY-0047</div><h1>Rigged Hero Cut-Out</h1>
<p class="lede">Evan pasted a flying hero and asked for a fully rigged skeleton with decorations, so stock 2D bipedal animations can drive it. We cut the picture into <b>16 body parts and 3 decorations</b>, hung them on <b>16 named bones</b>, and exported a Unity-style package. The rig turns correctly in our test renders. <b>I could not run Unity here, so the Unity builder script is untested.</b></p>
<div class="grid">{img("original.jpg","The pasted picture")}{img("skeleton.jpg","The skeleton, fitted to it (yellow = bone links, pink = bones, dots = pivots)")}</div>
<h2>The parts</h2>{img("parts.jpg","16 body parts and 3 decorations (hair, belt, scarf). Each part keeps a little extra picture under its parent so a joint can turn without a gap.")}
<h2>The rig turning</h2>
<div class="grid">{img("pose-rest.jpg","Rest: the original, rebuilt from the parts (average pixel error under 1 level)")}{img("pose-a_pose.jpg","Standing A-pose")}{img("pose-walk_contact.jpg","Walk, contact frame")}{img("pose-run_flight.jpg","Run, flight frame")}</div>
<h2>What is in the package</h2>
<ul><li><code>rig.json</code>: bones (parent, pivot, tip), parts (sprite file, bone, draw order), decorations flagged. Bone names follow the Character Studio set, with the character's own sides: <code>hips, spine, neck, head, upperarm/forearm/hand_L/R, thigh/shin/foot_L/R</code>.</li>
<li><code>sprites/</code>: 19 transparent PNGs. <code>poses.json</code>: the four poses as local rotations per bone, ready to key.</li>
<li><code>unity/AwRigBuilder.cs</code>: an editor menu that builds a prefab (bone GameObjects with SpriteRenderers sorted by draw order) from the rig. Any stock clip that rotates those bone paths then plays on it.</li></ul>
<h2>How to use it in Unity</h2>
<ol><li>Copy the study folder (rig.json, sprites, unity) under Assets, keep AwRigBuilder.cs in an Editor folder.</li><li>Menu Abbie's World, Build 2D Rig From rig.json, and pick rig.json.</li><li>Drag the prefab into a scene; make clips that rotate the bone transforms, or retarget a stock set to the same bone names.</li></ol>
<h2>Honest limits</h2>
<ul><li><b>Unity untested.</b> The script is written to the Unity 2021 API but never compiled or run.</li>
<li><b>Rigid parts, not a mesh skin.</b> Parts rotate like paper cut-outs; elbows and knees show a seam when bent far. Unity's 2D Animation package (sprite mesh skinning) would blend them, and needs a layered PSB.</li>
<li><b>Hidden areas are missing.</b> Where one limb covered another, nothing was ever drawn behind it, so big turns show gaps. The hair and belt cut-outs left smeary fill on the head and chest.</li>
<li><b>The hero is front-facing.</b> Most stock 2D clips are side views, so a walk or run on this picture reads oddly. A side or neutral three-quarter view would take stock clips better.</li>
<li>Our web engine uses its own 2D rig format; the same bones and parts load there too if we want to skip Unity.</li></ul>
<h2>Even better if</h2>
<ol><li>Midjourney drew the hero as a rest-pose turnaround (front, side, back) with arms down and no overlaps, so every part is fully visible.</li>
<li>Each part were painted complete (the hidden half of every limb) before rigging.</li>
<li>Limbs became soft meshes with weights at the joints instead of rigid pieces.</li>
<li>A real Unity test, with one stock walk cycle retargeted, before we call this finished.</li></ol>
<p class="id">Code: tools/rig-cutout/ (cutout.py, pose.py, example/). Picture: pasted by Evan. Tour: no.</p>
</main></body></html>"""
out = D/("artifact.html" if inline else "index.html"); out.write_text(html); print(out, len(html))
