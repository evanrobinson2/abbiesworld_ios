"""Judge with loss v2 at LOD2, 512 px, 48 samples. usage: judge2.py out.json name=params ..."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run2
res = {}; d = os.path.join(os.path.dirname(sys.argv[1]), 'judge2'); os.makedirs(d, exist_ok=True)
for a in sys.argv[2:]:
    n, path = a.split('=', 1)
    res[n] = run2.evaluate(json.load(open(path)), os.path.join(d, n), level=2, samples=48)
    print(n, json.dumps({k: round(v, 4) for k, v in res[n].items()}), flush=True)
json.dump(res, open(sys.argv[1], 'w'), indent=1)
