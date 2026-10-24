#!/usr/bin/env python3
"""Build the 2,000-slot list: 1,000 concepts x 2 styles (charming, upgrade).

Drops concepts the library already covers (name match against the library corpus), numbers the rest AW-0001..,
assigns size class, triangle budget, batch (50 per batch) and writes slots.json and slots.csv.
Usage: build_list.py <corpus.json> <outdir>
"""
import csv, json, re, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from candidates import PACKS

STOP = {'a', 'the', 'of', 'and', 'with', 'small', 'big', 'large', 'tall', 'section', 'set', 'model', 'charming', 'whimsical', 'upgrade'}
SYN = {'cup': 'mug', 'cafe': 'coffee'}
def toks(s):
    w = re.findall(r'[a-z]+', s.lower())
    w = [x[:-1] if x.endswith('s') and len(x) > 3 else x for x in w]
    return frozenset(SYN.get(x, x) for x in w if x not in STOP)

BUDGET = {  # triangles per model, hero view in iso + first person (Evan 08:02Z: low-poly parts, hero level)
    'prop': (300, 1500), 'plant': (400, 2000), 'animal': (1500, 5000), 'character': (2500, 7000),
    'vehicle': (1500, 6000), 'building': (3000, 12000), 'kit': (150, 800),
}
SIZE_M = {'prop': 'object at true scale', 'plant': 'true height', 'animal': 'true size, toy-scaled 1.15x',
          'character': 'child 1.1 m, adult 1.7 m', 'vehicle': 'toy-scaled 0.8x', 'building': 'true size', 'kit': '2 m grid'}

def main(corpus_path, out):
    corpus = [toks(n) for n in json.load(open(corpus_path))]
    corpus = [c for c in corpus if c]
    kept, covered, seen = [], [], set()
    for key, title, need, cls, names in PACKS:
        for n in [x.strip() for x in names.split(',') if x.strip()]:
            t = toks(n)
            if t in seen:
                continue
            seen.add(t)
            hit = next((c for c in corpus if t and (c == t or (len(t) >= 2 and t <= c and len(c) <= len(t) + 1))), None)
            row = dict(pack=key, pack_title=title, needed_for=need, cls=cls, name=n)
            (covered if hit else kept).append(row)
    # trim evenly: lower a per-pack cap until 1,000 remain, so no pack (world effects, coast, carnival) is cut off at the tail
    cap = 60
    while sum(1 for _ in range(1)) and sum(min(n, cap) for n in [sum(1 for r in kept if r['pack'] == p[0]) for p in PACKS]) > 1000:
        cap -= 1
    cap += 1  # the loop stops just under 1,000; the next cap overshoots and the tail is trimmed
    count = {}
    trimmed = []
    for r in kept:
        count[r['pack']] = count.get(r['pack'], 0) + 1
        if count[r['pack']] <= cap:
            trimmed.append(r)
    kept = trimmed[:1000]
    for i, r in enumerate(kept, 1):
        r['id'] = f'AW-{i:04d}'
    # batch 1 is the 50-concept pilot: a spread across every class, one per pack first, so quality is tested on the hard cases too
    quota = {'prop': 15, 'plant': 6, 'animal': 8, 'character': 5, 'vehicle': 5, 'building': 5, 'kit': 6}
    pilot = []
    for cls, q in quota.items():
        pool = [r for r in kept if r['cls'] == cls]
        pilot += [pool[int(k * len(pool) / q)] for k in range(q)]  # evenly spaced, so the pilot spans packs and kinds
    ids = {p['id'] for p in pilot}
    rest = [r for r in kept if r['id'] not in ids]
    for r in pilot:
        r['batch'] = 1
    for n, r in enumerate(rest):
        r['batch'] = 2 + n // 50
    for r in kept:
        lo, hi = BUDGET[r['cls']]
        r['tri_target'] = lo
        r['tri_max'] = hi
        r['scale'] = SIZE_M[r['cls']]
        r['styles'] = ['charming', 'upgrade']
        r['file_charming'] = f"{r['id']}-charming.glb"
        r['file_upgrade'] = f"{r['id']}-upgrade.glb"
    json.dump({'concepts': len(kept), 'models': len(kept) * 2, 'already_in_library_skipped': len(covered),
               'skipped_names': [c['name'] for c in covered], 'slots': kept}, open(f'{out}/slots.json', 'w'), indent=1)
    with open(f'{out}/slots.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['id', 'batch', 'pack', 'class', 'name', 'needed_for', 'tri_target', 'tri_max', 'scale'])
        for r in kept:
            w.writerow([r['id'], r['batch'], r['pack'], r['cls'], r['name'], r['needed_for'], r['tri_target'], r['tri_max'], r['scale']])
    print(len(kept) + len(covered), 'candidates;', len(covered), 'already covered;', len(kept), 'concepts =', len(kept) * 2, 'models')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
