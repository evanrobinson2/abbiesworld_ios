"""Builds the AW-STUDY-0043 roster page from roster.json.

python3 page.py            -> prototypes/ranch-atelier/dist/studies/meshy-heroes/index.html (site, images by path)
python3 page.py --inline O -> O with the images embedded (claude.ai artifact preview)
"""
import base64, html, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SITE = os.path.join(ROOT, "prototypes/ranch-atelier/dist/studies/meshy-heroes")
R = json.load(open(os.path.join(HERE, "roster.json")))
inline = "--inline" in sys.argv
out = sys.argv[sys.argv.index("--inline") + 1] if inline else os.path.join(SITE, "index.html")

def img(name):
    if not inline:
        return f"img/{name}"
    return "data:image/jpeg;base64," + base64.b64encode(open(os.path.join(SITE, "img", name), "rb").read()).decode()

def ctx():
    return subprocess.run(["node", os.path.join(ROOT, "tools/context-card/snippet.mjs"), "meshy-heroes"],
                          capture_output=True, text=True, check=True).stdout

STATE = {"queued": "Waiting", "running": "Running", "done": "Done", "picked": "Picked"}
SEX = {"woman": "Woman", "man": "Man", "either": "Either"}

def card(e, sub):
    pic = e.get("ref")
    face = f'<img src="{pic}" alt="">' if pic else f'<div class="blank"><span>{html.escape(e["id"])}</span></div>'
    return f'''<article class="hero" data-group="{e["group"]}">
 {face}
 <div class="meta"><b>{html.escape(e["name"])}</b><span class="sub">{html.escape(sub)}</span></div>
 <div class="pills"><span class="pill {e["mj"]}">Picture · {STATE[e["mj"]]}</span><span class="pill {e["meshy"]}">Meshy · {STATE[e["meshy"]]}</span></div>
 <details><summary>Midjourney prompt</summary><code>{html.escape(e["mj_prompt"])}</code></details>
</article>'''

def pair(i):
    a, b = [e for e in R["astronauts"] if e["id"].startswith(i + "-")]
    def half(e):
        pic = e.get("ref")
        face = f'<img src="{pic}" alt="">' if pic else f'<div class="blank {e["id"][-4:]}"><span>{html.escape(e["look"])}</span></div>'
        return f'''<div class="half">{face}<div class="pills"><span class="pill {e["mj"]}">Picture · {STATE[e["mj"]]}</span><span class="pill {e["meshy"]}">Meshy · {STATE[e["meshy"]]}</span></div>
  <details><summary>{html.escape(e["look"])} prompt</summary><code>{html.escape(e["mj_prompt"])}</code></details></div>'''
    return f'''<article class="hero astro"><div class="meta"><b>{html.escape(a["name"])}</b><span class="sub">{i} · {a["accent"]} suit lights</span></div>
 <div class="halves">{half(a)}{half(b)}</div></article>'''

astros = "\n".join(pair(i) for i in dict.fromkeys(e["id"].split("-")[0] for e in R["astronauts"]))
bodies = "\n".join(card(e, f'{e["id"]} · {SEX[e["sex"]]}') for e in R["bodies"])
story = "\n".join(card(e, f'{e["id"]} · {e.get("accent", "")} accent') for e in R["story"])
ALL = R["astronauts"] + R["bodies"] + R["story"]
done = sum(e["meshy"] == "done" for e in ALL)
total = len(ALL)
b = R["budget"]

page = f'''<meta charset="utf-8">
<title>Meshy Hero Characters</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Casting call on the Moon Heroes briefing ground: roster grid of clay plinths, the route and budget beside it. */
:root{{--bg:#eef0f3;--paper:#ffffff;--ink:#1d2129;--muted:#5a6170;--line:#d3d8e0;--suit:#e8762c;--cyan:#1aa7b8;--clay:#e4e6ea;
--display:"Barlow Condensed",system-ui,sans-serif;--body:"Source Sans 3",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0e1118;--paper:#171b24;--ink:#e7eaf0;--muted:#9aa3b3;--line:#2a3140;--suit:#f08a45;--cyan:#3fd0de;--clay:#232937;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0e1118;--paper:#171b24;--ink:#e7eaf0;--muted:#9aa3b3;--line:#2a3140;--suit:#f08a45;--cyan:#3fd0de;--clay:#232937;color-scheme:dark}}
body{{background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--body);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 56px}}
.wrap{{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:28px;align-items:start}}
@media (max-width:900px){{.wrap{{grid-template-columns:minmax(0,1fr)}}}}
main{{display:flex;flex-direction:column;gap:22px;min-width:0}}
.eyebrow{{font:500 12px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--suit)}}
h1{{font:700 clamp(36px,6vw,58px)/1 var(--display);margin:0;text-wrap:balance}}
h2{{font:700 30px/1.1 var(--display);margin:14px 0 0;text-wrap:balance}}
p{{margin:0;max-width:72ch}}.lede{{font-size:19px}}.muted{{color:var(--muted)}}
img{{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--line)}}
.status{{display:flex;flex-wrap:wrap;gap:10px 22px;font:500 13px/1.3 var(--mono);color:var(--muted)}}
.status b{{color:var(--ink);font-variant-numeric:tabular-nums}}
.row{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}}
.row figure{{margin:0;display:grid;gap:6px}}
figcaption{{font:500 12px/1.4 var(--mono);color:var(--muted)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}}
.hero{{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:10px;display:grid;gap:8px;align-content:start;min-width:0}}
.blank{{aspect-ratio:3/4;border-radius:10px;background:radial-gradient(ellipse 40% 8% at 50% 92%,color-mix(in srgb,var(--ink) 14%,transparent),transparent),linear-gradient(var(--clay),var(--bg));display:grid;place-items:center}}
.blank span{{font:700 34px/1 var(--display);color:color-mix(in srgb,var(--ink) 22%,transparent)}}
.hero[data-group="hero"] .blank span,.hero[data-group="creature"] .blank span{{color:color-mix(in srgb,var(--suit) 55%,transparent)}}
.grid2{{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}}
@media (max-width:420px){{.grid2{{grid-template-columns:minmax(0,1fr)}}}}
.halves{{display:grid;grid-template-columns:1fr 1fr;gap:8px}}.half{{display:grid;gap:6px;align-content:start;min-width:0}}
.blank.clay{{background:radial-gradient(ellipse 40% 8% at 50% 92%,color-mix(in srgb,var(--ink) 14%,transparent),transparent),linear-gradient(color-mix(in srgb,var(--suit) 22%,var(--clay)),var(--bg))}}
.blank.aint{{background:radial-gradient(ellipse 40% 8% at 50% 92%,color-mix(in srgb,var(--ink) 14%,transparent),transparent),linear-gradient(135deg,color-mix(in srgb,var(--cyan) 26%,var(--clay)),color-mix(in srgb,var(--suit) 18%,var(--bg)))}}
.blank.clay span,.blank.aint span{{font-size:22px;color:color-mix(in srgb,var(--ink) 40%,transparent)}}
.meta{{display:grid;gap:2px}}.meta b{{font:700 19px/1.1 var(--display)}}.sub{{font:500 11px/1.3 var(--mono);color:var(--muted)}}
.pills{{display:flex;flex-wrap:wrap;gap:6px}}
.pill{{font:500 10.5px/1 var(--mono);padding:5px 7px;border-radius:20px;border:1px solid var(--line);color:var(--muted)}}
.pill.done,.pill.picked{{border-color:var(--cyan);color:var(--cyan)}}.pill.running{{border-color:var(--suit);color:var(--suit)}}
details summary{{cursor:pointer;font:500 11px/1.3 var(--mono);color:var(--muted)}}
code{{font:500 11.5px/1.5 var(--mono);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px;display:block;white-space:pre-wrap;word-break:break-word;margin-top:6px}}
ol.route{{display:grid;gap:10px;padding-left:22px;margin:0;max-width:78ch}}ol.route li::marker{{color:var(--suit);font-weight:700}}
.side{{position:sticky;top:calc(env(safe-area-inset-top,0px) + 16px);display:grid;gap:16px;min-width:0}}
@media (max-width:900px){{.side{{position:static}}}}
.budget{{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px}}
.budget div{{display:flex;justify-content:space-between;gap:10px;font-variant-numeric:tabular-nums}}
.bar{{height:8px;border-radius:6px;background:var(--bg);overflow:hidden;border:1px solid var(--line)}}.bar i{{display:block;height:100%;background:var(--suit)}}
.ctx-aside{{max-width:none!important;margin:0!important}}
:root{{--aw-ink:var(--ink);--aw-soft:var(--muted);--aw-line:var(--line);--aw-bg:var(--paper);--aw-accent:var(--suit);--aw-on-accent:#fff;--aw-display:var(--display);--aw-font:var(--body)}}
a{{color:inherit}}
</style>
<div class="wrap">
<main>
 <header style="display:grid;gap:10px">
  <span class="eyebrow">AW-STUDY-0043 · Roster for your read-ahead</span>
  <h1>Meshy hero characters</h1>
  <p class="lede">First up: the Moon astronauts for the FPS, each in two looks side by side, plasticine claymation and painterly. Behind them, the 40 smooth PG base bodies and the story heroes. None has been run in Meshy yet. Each one gets a Midjourney turnaround first, then one Meshy run, then our Blender cleanup, gear and a rig.</p>
  <div class="status"><span>Run in Meshy <b>{done} of {total}</b></span><span>Credits spent <b>0</b></span><span>Next: the 6 astronauts in both looks</span></div>
 </header>

 <section style="display:grid;gap:12px">
  <h2>Moon astronauts, two looks</h2>
  <p class="muted">Left: plasticine, like a handmade stop-motion clay figure with thumbprints, run untextured and shaded as clay in the game. Right: painterly, hand-painted brush strokes and hard graphic shapes, run with Meshy's paint on. The look is ours; no studio's characters are copied.</p>
  <div class="grid2">{astros}</div>
 </section>

 <section style="display:grid;gap:12px">
  <h2>What each one becomes</h2>
  <div class="row">
   <figure><img src="{img('trio.jpg')}" alt="Daddy, the Star Child and Abbie on the Moon"><figcaption>The Moon art they come from</figcaption></figure>
   <figure><img src="{img('g.jpg')}" alt="Meshy brute on top, our cleaned-up version below"><figcaption>Meshy (top) after our cleanup (bottom): 99% match at 3,000 faces</figcaption></figure>
   <figure><img src="{img('gear.jpg')}" alt="One gear kit on two different bodies"><figcaption>One gear kit fits any body</figcaption></figure>
  </div>
 </section>

 <section style="display:grid;gap:12px">
  <h2>Story heroes</h2>
  <p class="muted">Fully dressed in the Faceted Hero look, each with their own accent light. Abbie and Ani stay cartoon kids, never drawn from a photo.</p>
  <div class="grid">{story}</div>
 </section>

 <section style="display:grid;gap:12px">
  <h2>The 40 base bodies</h2>
  <p class="muted">Adults and creatures only, smooth like a store mannequin, bald, A-pose, white clay. Women and men keep true adult shapes. These are what all the gear, outfits and faces go on.</p>
  <div class="grid">{bodies}</div>
 </section>

 <section style="display:grid;gap:12px">
  <h2>How each hero is made</h2>
  <ol class="route">
   <li>A Midjourney turnaround (front, side, back) on your Mac. Fast while you're around, Relax when you're not.</li>
   <li>One Meshy image-to-3D run, untextured, 20 credits. Your Mac copies the key from the clipboard; it is never saved.</li>
   <li>Our cleanup: weld, cut into named body rings, rebuild at 6,000 to 12,000 faces, real material names.</li>
   <li>The gear kit fits it automatically, then a rig with proper weights for Character Studio.</li>
   <li>Every model goes on one page beside its picture, spinnable, same camera.</li>
  </ol>
 </section>
</main>
<aside class="side">
 <div class="budget">
  <span class="eyebrow">Meshy budget</span>
  <div><span>Cap</span><b>{b["cap"]:,}</b></div>
  <div><span>One run each</span><b>{b["first_pass"]:,}</b></div>
  <div><span>Astronauts, both looks</span><b>{b["astronauts"]:,}</b></div>
  <div><span>Left for redos</span><b>{b["cap"] - b["first_pass"]:,}</b></div>
  <div class="bar"><i style="width:0%"></i></div>
  <span class="sub">0 spent. The astronauts go first (300); the rest wait on how they look.</span>
 </div>
 {ctx()}
</aside>
</div>
'''
open(out, "w").write(page)
print(out, len(page))
