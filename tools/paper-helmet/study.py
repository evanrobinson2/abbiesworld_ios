"""The three competing helmet experiments, from the same starting numbers and the same camera.

0  shared start: multi-start pose fit (8 yaw hypotheses, silhouette only), because a silhouette alone
   can't tell front from back or left from right.
A  geometry-first: fit shape + crest to silhouette and part crops with smooth geometry, fit the light,
   THEN apply the generic paper filter (decimate + crumple, the full-warrior approach) and tune it.
B  procedural grammar: keep the template proportions (no shape fitting, only pose), and tune only the
   grammar rules and the light against the full loss.
C  hybrid: A's fitted geometry rebuilt with B's grammar, then grammar, light and shape tuned together.

usage: python study.py [stage ...]   (stages: start A B C; default all). Params land in out/params_<stage>.json
"""
import os, sys, json, copy, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fit

OUT = fit.OUT
def save(p, name): json.dump(p, open(os.path.join(OUT, f'params_{name}.json'), 'w'), indent=1)
def load(name): return json.load(open(os.path.join(OUT, f'params_{name}.json')))

def stage_start():
    p = json.load(open(os.path.join(fit.HERE, 'params_init.json')))
    p['filter'] = {'on': 0, 'edge': 0.14, 'crumple': 0.12}
    save(p, 'init')
    hyps = []
    for i, y in enumerate([-130, -90, -50, -20, 20, 50, 90, 130]):
        q = copy.deepcopy(p); q['place']['yaw'] = y
        q, t = fit.es(q, 'smooth', ['place', 'camera'], 80, 'start', f'yaw{y}', seed=i)
        print('yaw start', y, '->', round(q['place']['yaw'], 1), round(t['total'], 4), flush=True)
        hyps.append((t['total'], q))
    # The silhouette can't tell a helmet seen from the front from one seen from behind (the first run picked
    # the back view). So the silhouette only proposes: the 4 best hypotheses are re-judged with a full render.
    hyps.sort(key=lambda h: h[0])
    best = None
    for s, q in hyps[:4]:
        t = fit.evaluate(q, 'grammar', 'render', path=os.path.join(OUT, f'_hyp_{int(q["place"]["yaw"])}.png'))
        fit.log(dict(variant='start', stage='render re-judge', speed='render', kind='eval', accepted=False, yaw=q['place']['yaw'], **t))
        print('re-judge yaw', round(q['place']['yaw'], 1), 'sil', round(s, 4), 'render', round(t['total'], 4), flush=True)
        if best is None or t['total'] < best[0]: best = (t['total'], q)
    # one shared light fit, so no variant wins just by owning better lighting
    q, t = fit.es(best[1], 'grammar', ['light'], 30, 'start', 'shared light', speed='render', seed=9)
    save(q, 'start')

def stage_A():
    p = load('start')
    p, t = fit.es(p, 'smooth', ['place', 'shape', 'crest'], 500, 'A', 'A1 geometry fit (silhouette + parts)', seed=10); print('A1', t['total'], flush=True)
    p, t = fit.es(p, 'smooth', ['shape', 'crest'], 250, 'A', 'A1b geometry polish', seed=11); print('A1b', t['total'], flush=True)
    save(p, 'A_geom')
    p, t = fit.es(p, 'smooth', ['light'], 25, 'A', 'A2 light (smooth)', speed='render', seed=12); print('A2', t['total'], flush=True)
    p['filter']['on'] = 1
    p, t = fit.es(p, 'smooth', ['filter'], 30, 'A', 'A3 generic paper filter', speed='render', seed=13); print('A3', t['total'], flush=True)
    save(p, 'A')

def stage_B():
    p = load('start')
    p, t = fit.es(p, 'grammar', ['place'], 120, 'B', 'B1 pose only', seed=20); print('B1', t['total'], flush=True)
    p, t = fit.es(p, 'grammar', ['grammar', 'light'], 70, 'B', 'B2 grammar + light', speed='render', seed=21); print('B2', t['total'], flush=True)
    save(p, 'B')

def stage_C():
    p = load('A_geom'); b = load('B')
    p['grammar'] = copy.deepcopy(b['grammar']); p['light'] = copy.deepcopy(b['light'])  # B's rules on A's geometry
    p['filter']['on'] = 0
    p, t = fit.es(p, 'grammar', ['grammar', 'light'], 40, 'C', 'C1 grammar on fitted geometry', speed='render', seed=30); print('C1', t['total'], flush=True)
    p, t = fit.es(p, 'grammar', ['shape', 'crest', 'grammar'], 60, 'C', 'C2 joint shape + grammar', speed='render', seed=31); print('C2', t['total'], flush=True)
    save(p, 'C')

def stage_R():
    """Round 3, hybrid with the style rules as hard constraints, starting from the Opus critic's rejected edits."""
    p = load('C_eye')
    p, t = fit.es(p, 'grammar', ['place', 'shape', 'crest'], 400, 'C', 'C4 rules as constraints: geometry', seed=40, rules=True); print('C4a', t['total'], flush=True)
    p, t = fit.es(p, 'grammar', ['grammar', 'light', 'crest'], 40, 'C', 'C4 rules as constraints: render', speed='render', seed=41, rules=True); print('C4b', t['total'], flush=True)
    save(p, 'C_rules')

if __name__ == '__main__':
    for s in (sys.argv[1:] or ['start', 'A', 'B', 'C']):
        t0 = time.time(); globals()['stage_' + s](); print('stage', s, round(time.time() - t0), 's', flush=True)
