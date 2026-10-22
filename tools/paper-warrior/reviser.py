"""Imagination-machine loop: render -> score -> a Claude model proposes parameter edits -> keep if loss drops.

The fidelity dial picks the reviser model, its effort, the round count, the build detail and the numeric polish.
usage: python reviser.py --dial low|mid|high --start params.json --tag NAME
"""
import sys, os, json, argparse, subprocess, time, copy, re, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import build, loss, opt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
REF = os.path.join(ROOT, 'ref')

DIALS = {
    'low':  dict(model='haiku',  effort='low',    rounds=6, level=0, px=192, samples=12, max_edits=6,  es_iters=0,   es_groups=''),
    'mid':  dict(model='sonnet', effort='medium', rounds=6, level=1, px=256, samples=16, max_edits=10, es_iters=150, es_groups='pose,shield,radii'),
    'high': dict(model='opus',   effort='high',   rounds=6, level=1, px=256, samples=24, max_edits=16, es_iters=300, es_groups='pose,shield,radii,helmet,skirt'),
}

V2 = """Work coarse to fine. Before any local edit, check the global reading of the image: which way the figure faces (where the face, chest
and toes point), the camera height (do you see the tops of the shoulders and feet?), overall proportions, and where the key light comes from.
A silhouette can match while the figure faces the wrong way, so judge the RENDER against the REFERENCE, not only the overlay.
Change one idea per round (3-6 related edits). Small, isolated edits win; large bundles usually get rejected.
"""

SYSTEM = """You are the reviser in a 3D reconstruction loop. A procedural Blender model is driven by a JSON parameter set.
Each round you see the reference image, the current render from the same camera, and a silhouette overlay, plus the loss history.
Propose parameter edits that make the render match the reference more closely. Reason about anatomy, pose, proportions,
camera, lighting and materials. Edits that raised the loss were rejected; learn from them.
{v2}Answer with ONE JSON object and nothing after it:
{"diagnosis": "<two sentences on the biggest mismatches>", "edits": [{"path": "<dot.path>", "value": <new absolute value>, "why": "<short>"}]}"""

def compose(prefix, out, n=384):
    ims = [Image.open(os.path.join(REF, 'target.png')).convert('RGB').resize((n, n), Image.LANCZOS),
           Image.open(prefix + '_render.png').convert('RGB').resize((n, n), Image.LANCZOS),
           Image.open(prefix + '_sil.png').convert('RGB').resize((n, n), Image.NEAREST)]
    c = Image.new('RGB', (n * 3, n + 22), (20, 20, 20))
    d = ImageDraw.Draw(c)
    for i, (im, label) in enumerate(zip(ims, ['REFERENCE', 'CURRENT RENDER', 'OVERLAY  blue=missing  red=extra'])):
        c.paste(im, (i * n, 22)); d.text((i * n + 6, 5), label, fill=(230, 230, 230))
    c.save(out)

def evaluate(p, prefix, cfg):
    import run
    return run.evaluate(p, prefix, render_px=cfg['px'], level=cfg['level'], samples=cfg['samples'])

def call_claude(prompt, cfg, workdir):
    cmd = ['claude', '-p', prompt, '--model', cfg['model'], '--effort', cfg['effort'], '--output-format', 'json',
           '--no-session-persistence', '--session-id', str(uuid.uuid4()),
           '--system-prompt', SYSTEM.replace('{v2}', V2 if cfg.get('v2') else ''), '--allowedTools', 'Read',
           '--disallowedTools', 'Bash', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'Agent', 'NotebookEdit',
           '--add-dir', ROOT]
    t0 = time.time()
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=workdir, timeout=900)
    secs = time.time() - t0
    try:
        j = json.loads(r.stdout)
    except Exception:
        return None, 0.0, secs, {}, r.stdout[-2000:] + r.stderr[-2000:]
    text = j.get('result', '')
    usage = j.get('usage', {})
    cost = float(j.get('total_cost_usd', 0.0))
    m = None
    for cand in re.findall(r'\{.*\}', text, re.S)[::-1]:
        try:
            m = json.loads(cand); break
        except Exception:
            # try the outermost object starting at each '{'
            pass
    if m is None:
        s = text.find('{'); e = text.rfind('}')
        try: m = json.loads(text[s:e + 1])
        except Exception: m = None
    return m, cost, secs, usage, text

def apply_edits(p, edits, max_edits):
    q = copy.deepcopy(p)
    applied = []
    for e in (edits or [])[:max_edits]:
        try:
            old = opt.getp(q, e['path'])
            v = e['value']
            if isinstance(old, (int, float)) and not isinstance(v, (int, float)):
                continue
            if isinstance(old, list) and (not isinstance(v, list) or len(v) != len(old)):
                continue
            opt.setp(q, e['path'], v)
            applied.append(dict(path=e['path'], old=old, new=v, why=e.get('why', '')))
        except Exception:
            continue
    return q, applied

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dial', default='low'); ap.add_argument('--start', required=True); ap.add_argument('--tag', required=True)
    ap.add_argument('--rounds', type=int, default=0); ap.add_argument('--v2', action='store_true')
    ap.add_argument('--level', type=int, default=-1)
    a = ap.parse_args()
    cfg = dict(DIALS[a.dial])
    if a.rounds: cfg['rounds'] = a.rounds
    cfg['v2'] = a.v2
    if a.level >= 0: cfg['level'] = a.level
    wd = os.path.join(ROOT, 'out', a.tag); os.makedirs(wd, exist_ok=True)
    schema = open(os.path.join(HERE, 'schema.md')).read()
    p = json.load(open(a.start))
    best = evaluate(p, os.path.join(wd, 'r00'), cfg)
    compose(os.path.join(wd, 'r00'), os.path.join(wd, 'sbs_r00.png'))
    hist = [dict(round=0, accepted=True, loss=best['total'], terms=best, edits=[], cost=0.0)]
    opt.log(dict(iter=opt.next_iter(), stage=a.tag, reviser=cfg['model'], kind='start', accepted=True, cost=0.0, **best))
    total_cost, llm_secs = 0.0, 0.0
    t_start = time.time()
    best_prefix = 'r00'
    for rnd in range(1, cfg['rounds'] + 1):
        recent = json.dumps([{k: h[k] for k in ('round', 'accepted', 'loss', 'edits')} for h in hist[-4:]], indent=0)[:6000]
        prompt = f"""Round {rnd} of {cfg['rounds']}. Read the image {os.path.join(wd, 'sbs_' + best_prefix + '.png')} (reference | current best render | silhouette overlay).

Loss terms for the current best (lower is better): {json.dumps({k: round(v, 4) for k, v in best.items() if k != 'secs'})}
Weights: {json.dumps(loss.WEIGHTS)}. sil = 1 - IoU, cham = outline distance, ssim = 1 - SSIM, edge = 1 - facet-edge correlation, tone = colour error.

{schema}

Current best parameters:
{json.dumps(p)}

Recent rounds (edits tried; accepted=false means they made it worse and were reverted):
{recent}

Propose at most {cfg['max_edits']} edits as absolute new values."""
        m, cost, secs, usage, raw = call_claude(prompt, cfg, wd)
        total_cost += cost; llm_secs += secs
        edits = (m or {}).get('edits', [])
        q, applied = apply_edits(p, edits, cfg['max_edits'])
        pre = f'r{rnd:02d}'
        t = evaluate(q, os.path.join(wd, pre), cfg)
        acc = t['total'] < best['total']
        es_note = None
        if acc:
            p, best, best_prefix = q, t, pre
        if cfg['es_iters']:
            # numeric polish on the silhouette after the model's structural move
            p2, _ = opt.run(copy.deepcopy(p), cfg['es_groups'].split(','), cfg['es_iters'], a.tag + '-es', level=0, seed=rnd, reviser='numeric-es')
            t2 = evaluate(p2, os.path.join(wd, pre + 'es'), cfg)
            es_note = t2['total']
            if t2['total'] < best['total']:
                p, best, best_prefix = p2, t2, pre + 'es'
        compose(os.path.join(wd, best_prefix), os.path.join(wd, 'sbs_' + best_prefix + '.png'))
        h = dict(round=rnd, accepted=acc, loss=t['total'], terms=t, edits=applied, cost=cost, llm_secs=round(secs, 1),
                 diagnosis=(m or {}).get('diagnosis', '' if m else 'PARSE-FAIL: ' + raw[-300:]), usage=usage, es_loss=es_note,
                 best_after=best['total'])
        hist.append(h)
        opt.log(dict(iter=opt.next_iter(), stage=a.tag, reviser=cfg['model'], kind='llm-round', accepted=acc, cost=cost,
                     n_edits=len(applied), **t))
        json.dump(dict(dial=a.dial, cfg=cfg, hist=hist), open(os.path.join(wd, 'history.json'), 'w'), indent=1)
        json.dump(p, open(os.path.join(wd, 'best_params.json'), 'w'), indent=1)
        print(f'round {rnd}: tried {t["total"]:.4f} accepted={acc} best={best["total"]:.4f} cost=${cost:.3f} edits={len(applied)}', flush=True)
    summary = dict(dial=a.dial, cfg=cfg, start_loss=hist[0]['loss'], final_loss=best['total'], final_terms=best,
                   llm_cost_usd=round(total_cost, 4), llm_secs=round(llm_secs, 1), wall_secs=round(time.time() - t_start, 1), best_prefix=best_prefix)
    json.dump(summary, open(os.path.join(wd, 'summary.json'), 'w'), indent=1)
    print(json.dumps(summary))

if __name__ == '__main__':
    main()
