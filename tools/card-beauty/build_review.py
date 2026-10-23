"""Builds the AW-STUDY-0014 review page: today's card against the Cards v3 directions, card by card, with a comment box
under each pair (comments are kept in the artifact's database, collection "notes", one document per section).
Usage: python3 build_review.py <shots dir> <out.html>
  <shots>/today/face-<id>.png       today's hand faces (capture.mjs)
  <shots>/faces/<id>-<style>.png    Cards v3 faces (faces.mjs)
  <shots>/inplace/*.png             same-camera scene shots (inplace.mjs)
  <shots>/mj/explore/*.png, <shots>/mj/*.png   Midjourney search picks and proofs (optional)
"""
import base64, io, json, pathlib, sys, html
from PIL import Image

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
IDS = [('ranch', 'Ranch'), ('garden', 'Garden'), ('meadow', 'Meadow'), ('moon', 'Moonbase')]
STYLES = [('slice', 'Slice'), ('print', "Artist's proof"), ('diecut', 'Die-cut')]

def uri(p, w=None, q=82):
    p = pathlib.Path(p)
    if not p.exists(): return None
    im = Image.open(p)
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if w and im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def img(p, alt, w=None, cls=''):
    u = uri(p, w)
    if not u: return f'<div class="slot {cls}" role="img" aria-label="{html.escape(alt)}, coming"><span>Coming</span></div>'
    return f'<img class="{cls}" src="{u}" alt="{html.escape(alt)}" loading="lazy">'

def note(key, label):
    return f'''<div class="note" data-key="{key}"><label for="n-{key}">{html.escape(label)}</label>
<textarea id="n-{key}" rows="3" placeholder="Your notes"></textarea><output aria-live="polite"></output></div>'''

def picks(key):
    return '<div class="picks" role="radiogroup" aria-label="Pick">' + ''.join(
        f'<button type="button" role="radio" aria-checked="false" data-key="{key}" data-pick="{s}">{html.escape(n)}</button>' for s, n in STYLES) + '</div>'

sec = []
# 1. The hand in the scene, same camera and hour.
tabs = ''.join(f'<button type="button" class="tab" data-shot="{s}" aria-pressed="{str(i == 0).lower()}">{html.escape(n)}</button>' for i, (s, n) in enumerate(STYLES))
afters = ''.join(f'<figure class="shot" data-shot="{s}"{" hidden" if i else ""}>{img(src / "inplace" / f"hand-{s}.png", f"The hand, {n}", 1280)}<figcaption>Cards v3 · {html.escape(n)}</figcaption></figure>' for i, (s, n) in enumerate(STYLES))
sec.append(f'''<section id="scene"><h2>In the scene</h2>
<div class="pair wide"><figure>{img(src / "inplace" / "hand-today.png", "The hand today", 1280)}<figcaption>Today</figcaption></figure>
<div class="after"><div class="tabs">{tabs}</div>{afters}</div></div>{picks("scene")}{note("scene", "The hand in the scene")}</section>''')
# 2. Card by card.
for cid, name in IDS:
    faces = ''.join(f'<figure>{img(src / "faces" / f"{cid}-{s}.png", f"{name}, {n}", 700, "face")}<figcaption>{html.escape(n)}</figcaption></figure>' for s, n in STYLES)
    sec.append(f'''<section id="{cid}"><h2>{name}</h2>
<div class="pair"><figure class="today">{img(src / "today" / f"face-{cid}.png", f"{name} today", 700, "face")}<figcaption>Today</figcaption></figure>
<div class="faces">{faces}</div></div>{picks(cid)}{note(cid, name)}</section>''')
# 3. Held at 4x, and turned over to its settings.
held = ''.join(f'<figure class="shot" data-shot="{s}"{" hidden" if i else ""}><div class="two">{img(src / "inplace" / f"held-{s}.png", f"Held, {n}", 1280)}{img(src / "inplace" / f"facets-{s}.png", f"Settings, {n}", 1280)}</div><figcaption>Tap: held at 4x · Button: turned over to its settings</figcaption></figure>' for i, (s, n) in enumerate(STYLES))
sec.append(f'''<section id="held"><h2>Held</h2><div class="after"><div class="tabs">{tabs}</div>{held}</div>{note("held", "The held card")}</section>''')
# 4. Midjourney: the search and the proofs.
mj = src / 'mj'
explore = sorted((mj / 'explore').glob('*.png')) if (mj / 'explore').exists() else []
meta = {}
if (mj / 'explore' / 'explore.json').exists():
    try:
        for e in json.loads((mj / 'explore' / 'explore.json').read_text()): meta[pathlib.Path(e.get('file', '')).name] = e
    except Exception: pass
grid = ''.join(f'<figure>{img(p, "Midjourney find", 520)}<figcaption>{html.escape(meta.get(p.name, {}).get("why", ""))}</figcaption></figure>' for p in explore) or '<div class="slot"><span>Coming from Midjourney</span></div>'
proofs = ''.join(f'<figure>{img(p, "Midjourney proof", 520)}<figcaption>{p.stem}</figcaption></figure>' for p in sorted(mj.glob('[A-D]-*.png'))) if mj.exists() else ''
sec.append(f'''<section id="mj"><h2>The world's best cards</h2><div class="grid">{grid}</div>{note("mj-search", "The search")}
<h2>Proofs</h2><div class="grid">{proofs or '<div class="slot"><span>Coming from Midjourney</span></div>'}</div>{note("mj-proofs", "The proofs")}</section>''')

page = (pathlib.Path(__file__).with_name('review_template.html').read_text()).replace('<!--SECTIONS-->', '\n'.join(sec))
out.write_text(page)
print(out, round(len(page) / 1e6, 2), 'MB')
