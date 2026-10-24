"""Writes preview/people-roster/index.html: every People model in the library, split by pass, detail and where it lives."""
import json, collections, html, os
lib = json.load(open('prototypes/ranch-atelier/dist/models/library.json'))['items']
P = [i for i in lib if i['type'] == 'People' and i['level'] == 'model']
BASE = 'https://abbies.world/models'
def link(**q): return BASE + '?' + '&'.join(f'{k}={v.replace(" ", "%20")}' for k, v in q.items())
def tbl(rows, head):
    return '<table><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</table>'
groups = collections.OrderedDict()
for i in sorted(P, key=lambda i: (i['collection'], i['name'].lower())): groups.setdefault(i['collection'], []).append(i)
def names(l):
    c = collections.Counter(i['name'] for i in l)
    return ', '.join(html.escape(n) + (f' ×{k}' if k > 1 else '') for n, k in c.items())
cnt = lambda f: sum(1 for i in P if f(i))
out = ['<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>All the people models</title><style>',
':root{--bg:#f6f1e8;--ink:#2a2622;--card:#fffdf8;--line:#e6dccb;--acc:#d9507a;--mut:#7a7068}@media(prefers-color-scheme:dark){:root{--bg:#1b1815;--ink:#f1e9dc;--card:#252019;--line:#3a332a;--acc:#ff7aa2;--mut:#a39a8e}}',
'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,system-ui,sans-serif}main{max-width:960px;margin:0 auto;padding:20px 16px 60px}h2{margin:30px 0 6px}a{color:var(--acc)}.mut{color:var(--mut)}',
'table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;font-size:14px}th,td{padding:7px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:8px 0}',
'</style></head><body><main>',
f'<p class=mut>Drafted</p><h1>All the people models ({len(P)} whole figures)</h1>',
f'<p>Every figure in the library: Blender builds, Meshy figures and AI-written code, including the ones that live only in a study folder or only on an unmerged branch. Animation clips and build stages are left out. Open them in the model library, already filtered: <a href="{link(type="People")}">all people</a>.</p>']
out.append('<h2>By pass and detail</h2>')
rows = []
for ps in ('Original', 'Upgrade'):
    for d in ('Low poly (under 10k)', 'Medium (10k to 50k)', 'High (over 50k)', 'Unknown'):
        n = cnt(lambda i: i['pass'] == ps and i['detail'] == d)
        if n: rows.append([ps, d, n, f'<a href="{link(type="People", **{"pass": ps}, detail=d)}">open</a>'])
out.append(tbl(rows, ['Pass', 'Detail', 'Figures', 'Filtered link']))
out.append('<p class=mut>Pass comes from the file or model name (upgrade, charming, whimsical, later rounds). Detail comes from the real triangle count in the file.</p>')
out.append('<h2>By where it lives</h2>')
rows = [[h, cnt(lambda i, h=h: i['home'] == h), f'<a href="{link(type="People", home=h)}">open</a>'] for h in ('Game site files', 'Study folder', 'Branch only', 'Tools and experiments') if cnt(lambda i, h=h: i['home'] == h)]
out.append(tbl(rows, ['Lives in', 'Figures', 'Filtered link']))
out.append('<h2>By source</h2>')
rows = [[s, n, f'<a href="{link(type="People", source=s)}">open</a>'] for s, n in collections.Counter(i['source'] for i in P).most_common()]
out.append(tbl(rows, ['Source', 'Figures', 'Filtered link']))
out.append('<h2>The roster</h2>')
for col, l in groups.items():
    up = [i for i in l if i['pass'] == 'Upgrade']
    out.append(f'<div class=box><b>{html.escape(col)}</b> · {len(l)} figures · {len(up)} upgrade pass · <a href="{link(type="People", study=col)}">open</a><br>{names(l)}</div>')
out.append('<h2>Not in the repo</h2><p>The 46 asset-factory models on Evan\'s PC (ChatGPT scene-generator output) are not in the library yet. Any Meshy figures that never left Meshy are also absent. Both are waiting on a copy into the repo.</p></main></body></html>')
os.makedirs('preview/people-roster', exist_ok=True)
open('preview/people-roster/index.html', 'w').write('\n'.join(out))
print(len(P))
