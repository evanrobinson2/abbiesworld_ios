"""Write the Ranch Atelier /models section: a landing page with a small navigator, and one page per model.
usage: python gen_models.py DIST_DIR
Each model page shows the reference image beside the live 3D model, how well it matches, what was done, and the details.
Data and files come from the paper warrior prop fits; manifest.json is the list a later model joins."""
import sys, os, json, shutil, html
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cards'))
import importlib.util
spec = importlib.util.spec_from_file_location('cards', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cards', 'gen_cards_data.py'))
cards = importlib.util.module_from_spec(spec); spec.loader.exec_module(cards)

HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(HERE, '..')
DIST = sys.argv[1]; OUT = os.path.join(DIST, 'models')
esc = html.escape
def pct(x): return f'{round(100 * x)}%'

def record(p):
    n = p['id']; a = cards.summ(n, 'r1_fit_summary.json'); b = cards.summ(n, 'fit_summary.json'); f = b['final']; m = cards.man[n]
    outline = 1 - f['sil']
    status = 'good' if outline >= 0.85 else ('partial' if outline >= 0.75 else 'weak')
    return dict(id=n, name=p['name'], group='Paper warrior · props', subject=p['photo'], orbit=p['orbit'],
                outline=round(outline, 3), status=status, builder=p['builder'], good=p['good'], off=p['off'],
                loss_before=round(a['final']['total'], 3), loss_after=round(f['total'], 3),
                terms=dict(silhouette=f['sil'], edge=f['cham'], ssim=f['ssim'], colour=f['tone'], style=f['style']),
                bars=[('Outline overlap', outline, 'Share of your silhouette and mine that coincide'),
                      ('Edge distance', max(0.0, 1 - f['cham'] * 20), 'How close the outlines run, edge to edge'),
                      ('Structure', 1 - f['ssim'], 'Light and shadow pattern inside the shape (SSIM)'),
                      ('Colour', 1 - f['tone'] * 4, 'Average colour difference from your photo'),
                      ('Paper style', max(0.0, 1 - f['style']), 'Edge statistics: clean folds versus noise')],
                triangles=m['triangles'], size_m=m['size_m'], minutes=round(((a.get('secs') or 0) + (b.get('secs') or 0)) / 60),
                files=dict(ref='ref.jpg', render='render.jpg', overlay='overlay.png', model='model.glb'),
                source=f'tools/paper-warrior/viewer/{n}.glb', made='Blender 5.2 (bpy) in the cloud, procedural Python, no third-party meshes or textures',
                date='2026-10-22')

LABEL = {'good': 'Close match', 'partial': 'Partial match', 'weak': 'Weak match'}

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<link rel="stylesheet" href="/app-style.css?v=1">
<link rel="stylesheet" href="/models/models.css?v=1">
{extra}
</head>
<body>
'''

def navigator(recs, cur=None):
    items = ''.join(f'''<a class="nv{' on' if r['id'] == cur else ''}" href="/models/{r['id']}"{' aria-current="page"' if r['id'] == cur else ''}><img src="/models/{r['id']}/ref.jpg" alt="" loading="lazy"><span>{esc(r['name'])}</span><b class="{r['status']}">{pct(r['outline'])}</b></a>''' for r in recs)
    return f'<nav class="navigator" aria-label="Models">{items}</nav>'

def topbar(crumb):
    return f'<header class="mbar"><a class="home" href="/sandbox" aria-label="Back to Ranch Atelier"><img src="/abbies-ranch-logo.png" alt=""></a><div class="crumb">{crumb}</div></header>'

def landing(recs):
    tiles = ''.join(f'''
<a class="tile" href="/models/{r['id']}">
  <div class="tp"><img src="/models/{r['id']}/ref.jpg" alt="Reference image" loading="lazy"><img src="/models/{r['id']}/render.jpg" alt="Fitted model" loading="lazy"></div>
  <div class="tm"><strong>{esc(r['name'])}</strong><span class="chip {r['status']}">{LABEL[r['status']]}</span></div>
  <div class="tm sub"><span>{esc(r['subject'])}</span><b>{pct(r['outline'])}</b></div>
</a>''' for r in recs)
    return HEAD.format(title='Models', extra='') + topbar('<a href="/models">Models</a>') + f'''
<main class="wrap">
  <div class="intro"><div class="eyebrow">Models</div><h1>Models made from your images</h1>
  <p>Every model I build to match an image gets a page: your image beside the 3D model, how well it matches, what I did, and the file details. Pick one to open it.</p></div>
  <section class="group"><h2>Paper warrior · props <small>{len(recs)} models · outline match shown</small></h2>{navigator(recs)}
  <div class="tiles">{tiles}</div></section>
</main>
</body>
</html>
'''

def page(r, recs):
    i = [x['id'] for x in recs].index(r['id']); prev = recs[i - 1]; nxt = recs[(i + 1) % len(recs)]
    bars = ''.join(f'<div class="bar"><span class="bl" title="{esc(t)}">{k}</span><span class="track"><i style="width:{max(2, round(v * 100))}%"></i></span><span class="bv">{pct(v)}</span></div>' for k, v, t in r['bars'])
    good = ''.join(f'<li>{esc(x)}</li>' for x in r['good']); off = ''.join(f'<li>{esc(x)}</li>' for x in r['off'])
    t = r['terms']; nm = r['name'].lower(); sz = r['size_m']
    extra = '<script type="importmap">{"imports":{"three":"/simulations/vendor/three.module.js"}}</script>'
    return HEAD.format(title=f'{r["name"]} · Models', extra=extra) + topbar(f'<a href="/models">Models</a><span>/</span><span>{esc(r["name"])}</span>') + f'''
<main class="wrap">
  {navigator(recs, r['id'])}
  <article class="card">
    <header class="ch">
      <div><div class="eyebrow">{esc(r['group'])} · {esc(r['subject'])}</div><h1>{esc(r['name'])}</h1></div>
      <div class="headline"><span class="chip {r['status']}">{LABEL[r['status']]}</span><span class="big">{pct(r['outline'])}</span><span class="small">outline match</span></div>
    </header>
    <div class="pair">
      <figure class="pane"><img src="/models/{r['id']}/ref.jpg" alt="Your reference image of the {nm}"><figcaption>Your image</figcaption></figure>
      <figure class="pane viewer" data-src="/models/{r['id']}/model.glb" data-theta="{r['orbit'][0]}" data-phi="{r['orbit'][1]}">
        <div class="stage"><canvas aria-label="Interactive 3D model of the {nm}"></canvas><div class="msg">Loading 3D model…</div></div>
        <figcaption><span>My 3D model · drag to turn, scroll or pinch to zoom</span><span class="btns"><button type="button" class="reset">Reset view</button><button type="button" class="spin" aria-pressed="false">Spin</button></span></figcaption>
      </figure>
    </div>
    <div class="grid3">
      <section class="block">
        <h2>How well it matches</h2>
        <div class="thumbs">
          <figure><img src="/models/{r['id']}/render.jpg" alt="My model rendered from your camera" loading="lazy"><figcaption>My model from your camera</figcaption></figure>
          <figure><img src="/models/{r['id']}/overlay.png" alt="Silhouette overlay" loading="lazy"><figcaption>Overlay: white both · <b class="k-blue">blue</b> yours only · <b class="k-red">red</b> mine only</figcaption></figure>
        </div>
        <div class="bars">{bars}</div>
        <p class="score">Overall loss <b>{r['loss_before']:.3f} → {r['loss_after']:.3f}</b> after two fits (lower is better).</p>
      </section>
      <section class="block">
        <h2>What matches</h2><ul class="ticks good">{good}</ul>
        <h2>What is off</h2><ul class="ticks off">{off}</ul>
      </section>
      <section class="block">
        <h2>What I did</h2>
        <ol class="steps">
          <li><b>Built a {nm} generator.</b> {esc(r['builder'])} Every piece is generated by Python in Blender, then given paper thickness and flat facets.</li>
          <li><b>Cut out your image.</b> I separated the {nm} from the backdrop so its outline can be scored.</li>
          <li><b>Found your camera.</b> I tried several turns and kept the one whose outline matched best.</li>
          <li><b>Fitted the shape.</b> 300 small changes to the dimensions, each kept only if the outline got closer.</li>
          <li><b>Fitted light and paper.</b> 20 rendered rounds tuning light, paper colour and backdrop.</li>
          <li><b>Second pass.</b> Camera held to a sensible range, cream paper and builder fixes, then fitted again.</li>
        </ol>
      </section>
    </div>
    <section class="block details"><h2>Details</h2>
      <dl>
        <dt>Triangles</dt><dd>{r['triangles']:,}</dd>
        <dt>Size</dt><dd>{sz[0]:.2f} × {sz[1]:.2f} × {sz[2]:.2f} m</dd>
        <dt>Download</dt><dd><a href="/models/{r['id']}/model.glb" download="{r['id']}.glb">{r['id']}.glb</a> · source <code>{r['source']}</code> in abbiesworld_ios</dd>
        <dt>Made with</dt><dd>{esc(r['made'])}</dd>
        <dt>Reference</dt><dd>Your upload, used only as the scoring target</dd>
        <dt>Compute</dt><dd>About {r['minutes']} min across two fits, no AI model calls ($0)</dd>
        <dt>Loss terms</dt><dd class="mono">silhouette {t['silhouette']:.3f} · edge {t['edge']:.3f} · SSIM {t['ssim']:.3f} · colour {t['colour']:.3f} · style {t['style']:.3f}</dd>
        <dt>Date</dt><dd>22 Oct 2026</dd>
      </dl>
    </section>
    <nav class="pn"><a href="/models/{prev['id']}">← {esc(prev['name'])}</a><a href="/models">All models</a><a href="/models/{nxt['id']}">{esc(nxt['name'])} →</a></nav>
  </article>
</main>
<script type="module" src="/models/viewer.js?v=1"></script>
</body>
</html>
'''

os.makedirs(OUT, exist_ok=True)
recs = [record(p) for p in cards.PROPS]
for r in recs:
    d = os.path.join(OUT, r['id']); os.makedirs(d, exist_ok=True)
    img = os.path.join(S, 'cards', 'img')
    shutil.copy(os.path.join(img, f"{r['id']}_ref.jpg"), os.path.join(d, 'ref.jpg'))
    shutil.copy(os.path.join(img, f"{r['id']}_render.jpg"), os.path.join(d, 'render.jpg'))
    shutil.copy(os.path.join(img, f"{r['id']}_overlay.png"), os.path.join(d, 'overlay.png'))
    shutil.copy(os.path.join(S, 'site', 'glb', f"{r['id']}.glb"), os.path.join(d, 'model.glb'))
    open(os.path.join(d, 'index.html'), 'w').write(page(r, recs))
open(os.path.join(OUT, 'index.html'), 'w').write(landing(recs))
for f in ('models.css', 'viewer.js'): shutil.copy(os.path.join(HERE, f), os.path.join(OUT, f))
json.dump(dict(updated='2026-10-22', models=[{k: v for k, v in r.items() if k != 'bars'} for r in recs]), open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('wrote', len(recs), 'model pages to', OUT)
