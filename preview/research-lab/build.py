"""Reads the studies list out of studies/index.html and writes studies.json for the lab (run from repo root)."""
import re, json
src = open('prototypes/ranch-atelier/dist/studies/index.html', encoding='utf8').read()
Q = r"'((?:[^'\\]|\\.)*)'"
out, seen = [], set()
for line in src.splitlines():
    if not re.match(r"\s*\{id:'", line): continue
    def f(k):
        m = re.search(r"\b" + k + ":" + Q, line)
        return m.group(1).replace("\\'", "'").replace("\\u2019", "’") if m else ''
    n = f('n')
    key = f('id')
    if not n or key in seen: continue
    seen.add(key)
    out.append({'id': key, 't': f('t'), 's': f('s'), 'src': f('src'), 'img': f('img'), 'g': f('g'), 'n': n, 'st': f('st'), 'why': f('why'), 'at': f('at')})
out.sort(key=lambda e: e['n'])
json.dump(out, open('preview/research-lab/studies.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'studies', sorted({e['g'] for e in out}))
