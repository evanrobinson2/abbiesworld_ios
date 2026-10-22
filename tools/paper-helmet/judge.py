"""Final judge: render each variant at 768 px, 48 samples, same camera, score with the full helmet loss.
usage: python judge.py name[:mode] ...   ->  out/final_<name>.png, out/final_<name>_score.json"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fit, helmet
for arg in sys.argv[1:]:
    name, mode = (arg.split(':') + ['grammar'])[:2]
    p = json.load(open(os.path.join(fit.OUT, f'params_{name}.json')))
    t = fit.evaluate(p, mode, 'render', n=768, samples=48, path=os.path.join(fit.OUT, f'final_{name}.png'))
    json.dump(t, open(os.path.join(fit.OUT, f'final_{name}_score.json'), 'w'), indent=1)
    print(name, mode, round(t['total'], 4), {k: round(v, 3) for k, v in t.items() if k in fit.hloss.W})
