"""Loss v3: the old loss becomes a gate; a checklist and order-swapped pairwise votes decide.

Why: in the helmet study all four Opus critic rounds were rejected by the scalar loss (out/critic_C3.json),
although they fixed things the scalar is blind to (thin crest card, inside-out brow ledge, closed eye slot).
The research note docs/oracle/llm-3d-modeling.md explains the design; in short:
  gate      silhouette and landmark error may not get worse than base by more than GATE_REL (or GATE_ABS)
  checklist Opus writes yes/no checks from the reference once (ref/checklist.json); a cheap model answers them
            for each candidate from shaded, normal and flat part-colour renders (CADCodeVerify, BlenderWorld)
  vote      reference | A | B, asked in both orders; only swap-consistent verdicts count (de-biased VLM judge)
  extra     measured, not yet weighted: developability (paper can't stretch: mean angle defect at interior
            vertices of the unthickened plates), and a 3-band toon comparison of render and reference
Accept a candidate if it passes the gate and wins the consistent votes; on a tied or inconsistent vote,
accept if it passes more checklist items.

usage: python lossv3.py checklist            (Opus writes ref/checklist.json, once)
       python lossv3.py replay [--judge haiku] [--k 2]
"""
import os, sys, json, copy, math, re, uuid, time, argparse, random, subprocess
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import bpy
import fit, helmet, hloss

HERE = fit.HERE; OUT = os.path.join(HERE, 'out', 'v3'); REF = fit.REF
N = 384
GATE_REL, GATE_ABS = 0.05, 0.01
PART_COLORS = {'dome': (0.85, 0.2, 0.2), 'brow': (0.95, 0.75, 0.1), 'shell': (0.3, 0.6, 0.9), 'cheek_r': (0.2, 0.75, 0.3),
               'cheek_l': (0.1, 0.45, 0.2), 'neck': (0.6, 0.3, 0.8), 'crest': (0.95, 0.5, 0.15), 'ridge': (0.95, 0.5, 0.15), 'boss': (0.9, 0.9, 0.9)}

# ----------------------------------------------------------------- renders
def emission_override(parts, kind):
    for ob in parts:
        m = bpy.data.materials.new(f'{kind}_{ob.name}'); m.use_nodes = True; nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
        if kind == 'normal':
            geo = nt.nodes.new('ShaderNodeNewGeometry'); vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY_ADD'
            vm.inputs[1].default_value = (0.5, 0.5, 0.5); vm.inputs[2].default_value = (0.5, 0.5, 0.5)
            nt.links.new(geo.outputs['Normal'], vm.inputs[0]); nt.links.new(vm.outputs[0], em.inputs['Color'])
        else:
            c = next((v for k, v in PART_COLORS.items() if ob.name.startswith(k)), (0.5, 0.5, 0.5))
            em.inputs['Color'].default_value = (*c, 1)
        nt.links.new(em.outputs[0], out.inputs['Surface'])
        ob.data.materials.clear(); ob.data.materials.append(m)

def flat_render(path, parts, kind):
    sc = bpy.context.scene
    for ob in list(sc.objects):
        if ob.type == 'MESH' and ob not in parts: ob.hide_render = True
    emission_override(parts, kind)
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0
    if sc.world: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    sc.render.film_transparent = True
    helmet.render(path, N, N, 4)
    im = Image.open(path).convert('RGBA'); bg = Image.new('RGBA', im.size, (40, 40, 40, 255)); bg.alpha_composite(im)
    bg.convert('RGB').save(path)

def developability(p, mode, filt):
    """Mean |angle defect| (radians) at interior vertices of the plates before thickening. A folded sheet keeps
    every interior angle sum at 2*pi; crumple noise and stretched blends do not."""
    real = helmet.thicken; helmet.thicken = lambda *a, **k: None
    try: parts = helmet.setup(p, mode, filt, 64, 64, with_stage=False)
    finally: helmet.thicken = real
    tot, area = 0.0, 0.0
    for ob in parts:
        me = ob.data; me.calc_loop_triangles()
        co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        tri = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('vertices', tri); tri = tri.reshape(-1, 3)
        if not len(tri): continue
        ang = np.zeros(len(co)); va = np.zeros(len(co))
        for i in range(3):
            a, b, c = co[tri[:, i]], co[tri[:, (i + 1) % 3]], co[tri[:, (i + 2) % 3]]
            u, v = b - a, c - a
            cos = (u * v).sum(1) / (np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1) + 1e-12)
            np.add.at(ang, tri[:, i], np.arccos(np.clip(cos, -1, 1)))
        ar = 0.5 * np.linalg.norm(np.cross(co[tri[:, 1]] - co[tri[:, 0]], co[tri[:, 2]] - co[tri[:, 0]]), axis=1)
        for i in range(3): np.add.at(va, tri[:, i], ar / 3)
        e = np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1)
        uniq, cnt = np.unique(e, axis=0, return_counts=True)
        boundary = np.zeros(len(co), bool); boundary[uniq[cnt == 1].ravel()] = True
        inner = ~boundary & (va > 0)
        tot += (np.abs(2 * math.pi - ang[inner]) * va[inner]).sum(); area += va[inner].sum()
    return float(tot / max(area, 1e-9))

def toon_bands(rgb, mask, k=3):
    g = rgb.mean(-1); v = g[mask]
    if len(v) < 10: return np.zeros_like(g, int)
    q = np.quantile(v, np.linspace(0, 1, k + 1)[1:-1])
    return np.digitize(g, q)

def toon_term(rgb_r, m_r, rgb_t, m_t):
    """Share of the union mask where the 3-band posterized render and reference disagree."""
    br, bt = toon_bands(rgb_r, m_r), toon_bands(rgb_t, m_t)
    u = m_r | m_t
    br = np.where(m_r, br, -1); bt = np.where(m_t, bt, -1)
    return float((br[u] != bt[u]).mean())

def evaluate(name, p, mode='grammar', filt=None):
    """Old loss terms plus the measured extras, and four renders: shaded, normal, part colours."""
    os.makedirs(OUT, exist_ok=True)
    m_t, rgb_t = fit.target(N)
    kp_ref = json.load(open(os.path.join(REF, 'landmarks.json')))
    parts = helmet.setup(p, mode, filt, N, N, with_stage=True)
    m_r = helmet.silhouette(parts, N, N); kp = helmet.project_landmarks(N, N)
    shaded = os.path.join(OUT, f'{name}_shaded.png'); helmet.render(shaded, N, N, 12)
    rgb_r = hloss.load_rgb(shaded, N)
    t = hloss.score(m_r, m_t, rgb_r, rgb_t, kp=kp, kp_ref=kp_ref)
    t['toon'] = toon_term(rgb_r, m_r, rgb_t, m_t)
    flat_render(os.path.join(OUT, f'{name}_normal.png'), parts, 'normal')
    parts = helmet.setup(p, mode, filt, N, N, with_stage=True)
    flat_render(os.path.join(OUT, f'{name}_parts.png'), parts, 'parts')
    t['develop'] = developability(p, mode, filt)
    return {k: (float(v) if isinstance(v, (int, float, np.floating)) else v) for k, v in t.items()}

# ----------------------------------------------------------------- model calls
def ask(prompt, model, system, image_dir):
    cmd = ['claude', '-p', prompt, '--model', model, '--output-format', 'json', '--no-session-persistence', '--session-id', str(uuid.uuid4()),
           '--system-prompt', system, '--allowedTools', 'Read', '--disallowedTools', 'Bash', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'Agent',
           '--add-dir', image_dir]
    for attempt in range(2):
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        try:
            j = json.loads(res.stdout)
            return json.loads(re.search(r'\{.*\}', j['result'], re.S).group(0)), j.get('total_cost_usd', 0.0)
        except Exception:
            time.sleep(2)
    return None, 0.0

def panel(paths, labels, out, n=320):
    c = Image.new('RGB', (n * len(paths), n + 22), (20, 20, 20)); d = ImageDraw.Draw(c)
    for i, (pth, lab) in enumerate(zip(paths, labels)):
        c.paste(Image.open(pth).convert('RGB').resize((n, n)), (i * n, 22)); d.text((i * n + 6, 5), lab, fill=(235, 235, 235))
    c.save(out); return out

CHECK_SYS = """You write acceptance checks for a 3D reconstruction of a papercraft helmet from one reference image.
Each check must be a yes/no statement that is TRUE of the reference and that a judge can answer by looking at a render
of a candidate model from the same camera (shaded, surface-normal and flat part-colour images will be available).
Cover, in this order: big proportions and silhouette, each named part (crest, dome, brow/forehead plate, eye opening,
cheek guards, neck guard, bosses), depth cues a silhouette cannot see (thickness, overhang, recess), and papercraft
construction (flat planes, straight creases, hemmed edges, fanned blades). 14 to 18 checks, each one idea.
Answer with ONE JSON object: {"checks": [{"id": "c1", "part": "<part>", "check": "<statement>"}]}"""

def write_checklist(model='opus'):
    ref = os.path.join(REF, 'target.png')
    obj, cost = ask(f'Read the reference image {ref}. Write the checks.', model, CHECK_SYS, REF)
    json.dump(dict(model=model, cost_usd=round(cost, 3), **obj), open(os.path.join(REF, 'checklist.json'), 'w'), indent=1)
    print(json.dumps(obj, indent=1), '\ncost', cost)

ANSWER_SYS = """You check a candidate 3D model against a reference image. The image shows, left to right: REFERENCE,
CANDIDATE shaded render (same camera), CANDIDATE surface normals (colour = facing direction, shows true geometry),
CANDIDATE flat part colours (crest orange, dome red, brow yellow, lower shell blue, cheek guards green, neck guard purple).
For each check, say whether it is true of the CANDIDATE. Judge the candidate, not the reference. Be strict: partly true is false.
Answer with ONE JSON object: {"answers": {"<id>": true|false}}"""

def answer_checklist(name, model, reps=3):
    """Majority over reps independent answers; single answers swing by 3-5 items on identical images."""
    runs = [answer_once(name, model) for _ in range(reps)]
    ids = runs[0][0].keys()
    return {i: sum(r[0][i] for r in runs) * 2 > reps for i in ids}, sum(c for _, c in runs)

def answer_once(name, model):
    checks = json.load(open(os.path.join(REF, 'checklist.json')))['checks']
    img = panel([os.path.join(REF, 'target.png')] + [os.path.join(OUT, f'{name}_{k}.png') for k in ('shaded', 'normal', 'parts')],
                ['REFERENCE', 'CANDIDATE', 'CANDIDATE NORMALS', 'CANDIDATE PARTS'], os.path.join(OUT, f'{name}_check_panel.png'))
    obj, cost = ask(f'Read the image {img}. Checks:\n' + json.dumps([{k: c[k] for k in ('id', 'check')} for c in checks]), model, ANSWER_SYS, OUT)
    ans = (obj or {}).get('answers', {})
    return {c['id']: bool(ans.get(c['id'], False)) for c in checks}, cost

VOTE_SYS = """You compare two candidate 3D models of a papercraft helmet with a reference image. The image shows a top row:
REFERENCE, and a bottom row: candidate A shaded, candidate A normals, candidate B shaded, candidate B normals (same camera).
Decide which candidate is closer to the REFERENCE as the same object: overall shape and proportions first, then each part
(crest, brow, eye opening, cheek and neck guards), then papercraft construction. Ignore small lighting differences.
If you cannot see a difference that matters, say "same"; do not break ties arbitrarily.
Answer with ONE JSON object: {"reason": "<one sentence>", "winner": "A"|"B"|"same"}"""

def vote_panel(a, b, out, n=256):
    c = Image.new('RGB', (n * 4, n * 2 + 44), (20, 20, 20)); d = ImageDraw.Draw(c)
    c.paste(Image.open(os.path.join(REF, 'target.png')).convert('RGB').resize((n, n)), (int(1.5 * n), 22)); d.text((int(1.5 * n) + 6, 5), 'REFERENCE', fill=(235, 235, 235))
    for i, (nm, kind, lab) in enumerate([(a, 'shaded', 'A'), (a, 'normal', 'A normals'), (b, 'shaded', 'B'), (b, 'normal', 'B normals')]):
        c.paste(Image.open(os.path.join(OUT, f'{nm}_{kind}.png')).convert('RGB').resize((n, n)), (i * n, n + 44)); d.text((i * n + 6, n + 27), lab, fill=(235, 235, 235))
    c.save(out); return out

def vote(cur, cand, model, k):
    """k votes in each order. A pair counts only if both orders agree (cand, cur or same)."""
    jobs = []
    for j in range(k):
        jobs.append((vote_panel(cur, cand, os.path.join(OUT, f'vote_{cur}_{cand}_{j}_ab.png')), 'B'))
        jobs.append((vote_panel(cand, cur, os.path.join(OUT, f'vote_{cur}_{cand}_{j}_ba.png')), 'A'))
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda jb: ask(f'Read the image {jb[0]}.', model, VOTE_SYS, OUT), jobs))
    cost = sum(c for _, c in res)
    def who(r, side):
        w = (r or {}).get('winner')
        return 'same' if w not in ('A', 'B') else ('cand' if w == side else 'cur')
    said = [who(r, side) for (r, _), (_, side) in zip(res, jobs)]
    pairs = [(said[2 * j], said[2 * j + 1]) for j in range(k)]
    agreed = [x for x, y in pairs if x == y]
    return dict(for_cand=agreed.count('cand'), for_cur=agreed.count('cur'), same=agreed.count('same'), flips=k - len(agreed),
                raw=said, reasons=[(r or {}).get('reason') for r, _ in res]), cost

def gate(cur_t, cand_t):
    ok = all(cand_t[k] <= cur_t[k] * (1 + GATE_REL) + GATE_ABS for k in ('sil', 'kp'))
    return ok

def decide(g, v, d_check):
    if not g: return False, 'gate'
    if v['for_cand'] != v['for_cur']: return v['for_cand'] > v['for_cur'], 'vote'
    return d_check >= 2, 'checklist'

# ----------------------------------------------------------------- replay experiment
def candidates():
    base = json.load(open(os.path.join(fit.OUT, 'params_C.json')))
    crit = json.load(open(os.path.join(fit.OUT, 'critic_C3.json')))
    C = {'base': (base, 'grammar', None)}
    for r in crit['rounds']:
        q = copy.deepcopy(base)
        for e in r['edits']:
            v = int(round(e['value'])) if e['path'] in fit.INTS else e['value']; fit.setp(q, e['path'], v)
        C[f'opus{r["round"]}'] = (q, 'grammar', None)
    q = copy.deepcopy(base); q['place']['yaw'] += 180; C['bad_flip'] = (q, 'grammar', None)
    C['bad_crumple'] = (copy.deepcopy(base), 'grammar', {'edge': 0.08, 'crumple': 0.35})
    rng = random.Random(5); q = copy.deepcopy(base)
    for path, step in [s for g in ('shape', 'crest') for s in fit.GROUPS[g]]:
        v = fit.getp(q, path) + rng.gauss(0, 3 * step)
        if path in fit.MINS: v = min(fit.MINS[path][1], max(fit.MINS[path][0], v))
        fit.setp(q, path, v)
    C['bad_noise'] = (q, 'grammar', None)
    q = copy.deepcopy(base); q['shape']['crest']['len'] = 0.2; q['shape']['crest']['w'] = 0.03; C['bad_nocrest'] = (q, 'grammar', None)
    q = copy.deepcopy(base); q['shape']['dome'] = [v * 1.25 for v in q['shape']['dome']]; C['bad_bigdome'] = (q, 'grammar', None)
    return C

# (current, candidate, expected) ; expected None = the question under test
PAIRS = [('base', 'opus0', None), ('base', 'opus1', None), ('base', 'opus2', None), ('base', 'opus3', None), ('base', 'opus4', None),
         ('base', 'bad_flip', False), ('base', 'bad_crumple', False), ('base', 'bad_noise', False), ('base', 'bad_nocrest', False), ('base', 'bad_bigdome', False),
         ('bad_noise', 'base', True), ('bad_crumple', 'base', True), ('bad_nocrest', 'base', True), ('bad_bigdome', 'base', True),
         ('base', 'base', None)]

def replay(judge, k):
    os.makedirs(OUT, exist_ok=True)
    C = candidates(); T = {}
    cache = os.path.join(OUT, 'terms.json')
    if os.path.exists(cache): T = json.load(open(cache))
    for name, (p, mode, filt) in C.items():
        if name in T: continue
        t0 = time.time(); T[name] = evaluate(name, p, mode, filt); print(name, round(T[name]['total'], 4), round(time.time() - t0, 1), 's', flush=True)
    json.dump(T, open(cache, 'w'))
    cost = 0.0
    with ThreadPoolExecutor(6) as ex:
        res = dict(zip(C, ex.map(lambda nm: answer_checklist(nm, judge), C)))
    checks = {nm: a for nm, (a, _) in res.items()}; cost += sum(c for _, c in res.values())
    rows = []
    for cur, cand, exp in PAIRS:
        v, c = vote(cur, cand, judge, k); cost += c
        g = gate(T[cur], T[cand]); dchk = sum(checks[cand].values()) - sum(checks[cur].values())
        acc, why = decide(g, v, dchk)
        old = T[cand]['total'] < T[cur]['total']
        row = dict(cur=cur, cand=cand, expected=exp, old_accept=old, v3_accept=acc, by=why, gate=g, vote=v, checklist_delta=dchk,
                   old_delta=round(T[cand]['total'] - T[cur]['total'], 4),
                   develop_delta=round(T[cand]['develop'] - T[cur]['develop'], 4), toon_delta=round(T[cand]['toon'] - T[cur]['toon'], 4))
        rows.append(row); print(json.dumps({x: row[x] for x in row if x != 'vote'}), 'votes cand/cur/same/flip', v['for_cand'], v['for_cur'], v['same'], v['flips'], flush=True)
    out = dict(judge=judge, k=k, cost_usd=round(cost, 3), terms=T, checklist=checks, pairs=rows)
    json.dump(out, open(os.path.join(OUT, f'replay_{judge}.json'), 'w'), indent=1)
    print('cost', round(cost, 3))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd'); ap.add_argument('--judge', default='haiku'); ap.add_argument('--k', type=int, default=3)
    ap.add_argument('--model', default='opus')
    a = ap.parse_args()
    if a.cmd == 'checklist': write_checklist(a.model)
    elif a.cmd == 'replay': replay(a.judge, a.k)
    elif a.cmd == 'render':
        C = candidates()
        for nm, (p, mode, filt) in C.items(): print(nm, json.dumps({k: round(v, 4) for k, v in evaluate(nm, p, mode, filt).items() if k in ('total', 'sil', 'kp', 'develop', 'toon')}), flush=True)
