"""Score many parameter sets under one fixed setting so results are comparable.
usage: python judge.py out/judge.json name=path.json [name=path.json ...]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run
out = sys.argv[1]
res = {}
d = os.path.join(os.path.dirname(out), 'judge'); os.makedirs(d, exist_ok=True)
for arg in sys.argv[2:]:
    name, path = arg.split('=', 1)
    p = json.load(open(path))
    t = run.evaluate(p, os.path.join(d, name), render_px=512, level=1, samples=32)
    res[name] = t
    print(name, json.dumps(t), flush=True)
json.dump(res, open(out, 'w'), indent=1)
