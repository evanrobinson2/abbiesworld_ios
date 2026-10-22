"""Opus critic rounds on a helmet variant: it sees reference | render | overlay and proposes parameter edits; keep if loss drops.
usage: python critic.py in_name out_name --rounds 4 --model opus"""
import os, sys, json, argparse, subprocess, time, copy, re, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import fit, helmet, hloss

HERE = fit.HERE; OUT = fit.OUT
SYSTEM = """You are the critic in a 3D reconstruction loop for a papercraft helmet. A procedural Blender model is driven by JSON parameters.
You see the reference, the current render from the same camera, and a silhouette overlay (blue = reference has helmet, model doesn't; red = model has extra).
Work coarse to fine: proportions and big shapes first (dome height, forehead plate, crest mass and curl, cheek guard shape, face opening), then style.
Change one idea per round (3-8 related edits). Edits that raised the loss were rejected; learn from them.
Answer with ONE JSON object and nothing after it:
{"diagnosis": "<two sentences on the biggest mismatches>", "edits": [{"path": "<dot.path>", "value": <new absolute value>, "why": "<short>"}]}"""

def compose(render, out, n=384):
    m_t, _ = fit.target(n)
    p = json.load(open(os.path.join(OUT, '_critic_params.json')))
    parts = helmet.setup(p, 'grammar', None, n, n, with_stage=False); m_r = helmet.silhouette(parts, n, n)
    ov = np.zeros((n, n, 3), np.uint8); ov[m_t & m_r] = 235; ov[m_t & ~m_r] = (60, 140, 255); ov[m_r & ~m_t] = (255, 90, 60)
    ims = [Image.open(os.path.join(fit.REF, 'target.png')).convert('RGB').resize((n, n)), Image.open(render).convert('RGB').resize((n, n)), Image.fromarray(ov)]
    c = Image.new('RGB', (n * 3, n + 22), (20, 20, 20)); d = ImageDraw.Draw(c)
    for i, (im, lab) in enumerate(zip(ims, ['REFERENCE', 'CURRENT RENDER', 'OVERLAY blue=missing red=extra'])):
        c.paste(im, (i * n, 22)); d.text((i * n + 6, 5), lab, fill=(230, 230, 230))
    c.save(out)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out')
    ap.add_argument('--rounds', type=int, default=4); ap.add_argument('--model', default='opus'); ap.add_argument('--variant', default='C')
    a = ap.parse_args()
    p = json.load(open(os.path.join(OUT, f'params_{a.inp}.json')))
    render = os.path.join(OUT, '_critic_render.png')
    best = fit.evaluate(p, 'grammar', 'render', path=render); bl = best['total']
    hist, cost = [], 0.0
    for r in range(a.rounds):
        json.dump(p, open(os.path.join(OUT, '_critic_params.json'), 'w'))
        img = os.path.join(OUT, f'_critic_round{r}.png'); compose(render, img)
        view = {k: p[k] for k in ('shape', 'grammar', 'place')}
        prompt = (f"Read the image {img} (reference | current render | overlay) and the guide {os.path.join(HERE, 'schema.md')}.\n"
                  f"Current loss {bl:.4f}; terms: " + json.dumps({k: round(float(v), 4) for k, v in best.items() if k in hloss.W or k.startswith('iou_')}) +
                  "\nParameters:\n" + json.dumps(view) + "\nHistory of your earlier rounds:\n" + json.dumps(hist))
        cmd = ['claude', '-p', prompt, '--model', a.model, '--output-format', 'json', '--no-session-persistence', '--session-id', str(uuid.uuid4()),
               '--system-prompt', SYSTEM, '--allowedTools', 'Read', '--disallowedTools', 'Bash', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'Agent', '--add-dir', HERE]
        t0 = time.time(); res = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        try:
            j = json.loads(res.stdout); cost += j.get('total_cost_usd', 0); txt = j['result']
            obj = json.loads(re.search(r'\{.*\}', txt, re.S).group(0))
        except Exception as ex:
            print('round', r, 'parse failed', ex, res.stdout[:300], res.stderr[:300]); continue
        q = copy.deepcopy(p); applied = []
        for e in obj.get('edits', []):
            try:
                v = e['value']
                if e['path'] in fit.INTS: v = int(round(v))
                fit.setp(q, e['path'], v); applied.append(e)
            except Exception: pass
        try:
            t = fit.evaluate(q, 'grammar', 'render', path=os.path.join(OUT, '_critic_try.png'))
        except Exception as ex:
            print('eval failed', ex); continue
        acc = t['total'] < bl
        fit.log(dict(variant=a.variant, stage=f'{a.variant}3 {a.model} critic', speed='render', kind='eval', accepted=acc, changed=[e['path'] for e in applied],
                     diagnosis=obj.get('diagnosis'), secs=round(time.time() - t0, 1), t=time.time(), **t))
        hist.append(dict(round=r, diagnosis=obj.get('diagnosis'), edits=applied, loss_before=round(bl, 4), loss_after=round(t['total'], 4), kept=acc))
        print('round', r, round(bl, 4), '->', round(t['total'], 4), 'kept' if acc else 'rejected', '|', obj.get('diagnosis'), flush=True)
        if acc:
            p, best, bl = q, t, t['total']; os.replace(os.path.join(OUT, '_critic_try.png'), render)
    json.dump(p, open(os.path.join(OUT, f'params_{a.out}.json'), 'w'), indent=1)
    json.dump(dict(model=a.model, cost_usd=round(cost, 3), rounds=hist), open(os.path.join(OUT, f'critic_{a.out}.json'), 'w'), indent=1)
    print('cost', round(cost, 3))

if __name__ == '__main__':
    main()
