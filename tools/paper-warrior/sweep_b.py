"""Experiment B: sweep the papercraft grammar on fixed geometry and log loss v2."""
import sys, os, json, itertools, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run2, opt
base = json.load(open(sys.argv[1])); tag = sys.argv[2]
os.makedirs(f'out/v2/{tag}', exist_ok=True)
res = []
grid = list(itertools.product([0.022, 0.03], [0.08, 0.16], [20, 40], [0.12, 0.25]))
for i, (edge, cr, k, fold) in enumerate(grid):
    p = copy.deepcopy(base)
    pc = p['papercraft']; pc['skin'].update(edge=edge, crumple=cr); pc['plates'].update(k=k, fold=fold)
    t = run2.evaluate(p, f'out/v2/{tag}/g{i:02d}', level=2, samples=24)
    row = dict(i=i, edge=edge, crumple=cr, k=k, fold=fold, **{x: t[x] for x in ('total', 'style', 'parts_ssim', 'ssim', 'sil')})
    res.append(row); print(json.dumps(row), flush=True)
    opt.log(dict(iter=opt.next_iter(), stage=f'{tag}-grammar-sweep', reviser='grid', kind='eval', accepted=False, **{x: t[x] for x in t if isinstance(t[x], float)}))
json.dump(res, open(f'out/v2/{tag}/sweep.json', 'w'), indent=1)
