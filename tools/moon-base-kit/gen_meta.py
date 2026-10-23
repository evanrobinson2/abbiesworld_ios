"""Writes provenance.json and notes.json for each asset (round 1, round 2 when the brief says so). Keeps rounds already recorded; run after a rebuild."""
import ast, json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
q = {e['id']: e for e in json.load(open(os.path.join(HERE, 'mj_queue.json')))['queue']}
for slug in sorted(os.listdir(os.path.join(HERE, 'assets'))):
    d = os.path.join(HERE, 'assets', slug)
    if not os.path.exists(os.path.join(d, 'stats.json')):
        continue
    st = json.load(open(os.path.join(d, 'stats.json')))
    for v in ('hero', 'fps'):  # keep renders as JPEG in the repo
        p = os.path.join(d, 'r', v + '.png')
        if os.path.exists(p):
            Image.open(p).convert('RGB').save(p[:-4] + '.jpg', quality=88)
            os.remove(p)
    doc = ' '.join((ast.get_docstring(ast.parse(open(os.path.join(d, 'build.py')).read())) or '').split())
    prov = {'asset': slug, 'id': st['id'], 'study': 'AW-STUDY-0031',
            'request': 'Evan 2026-10-23 10:03Z "intensely upgraded" low poly FPS assets for moon base; 10:04Z "propose 200 assets and draw 20"',
            'style_reference': ['trek.zip outputs/images/moonbase.png', 'trek.zip outputs/images/abbie at the base.png',
                                'Faceted Hero direction https://claude.ai/artifact/JV5ALAFxhkEcvQubse1joa'],
            'concept': None, 'midjourney': {'status': 'queued: Mac offline 2026-10-23 10:06Z', 'prompt': q.get(st['id'], {}).get('prompt')},
            'built_with': 'Blender Python (bpy 5.2.3) recipe build.py + bkit.py; Cycles bake of procedural role surfaces'}
    pp = os.path.join(d, 'provenance.json')
    if os.path.exists(pp):
        old = json.load(open(pp))
        if old.get('concept'):
            prov['concept'], prov['midjourney'] = old['concept'], old['midjourney']
    json.dump(prov, open(pp, 'w'), indent=1)
    np_ = os.path.join(d, 'notes.json')
    notes = json.load(open(np_)) if os.path.exists(np_) else {'asset': slug, 'name': st['name'], 'brief': doc, 'rounds': []}
    notes['brief'] = doc
    if not any(r['n'] == 1 for r in notes['rounds']):
        notes['rounds'].append({'n': 1, 'date': '2026-10-23', 't': 'First build from the pack style and the Faceted Hero rules, no Midjourney pick yet.'})
    if 'Round 2' in doc and not any(r['n'] == 2 for r in notes['rounds']):
        notes['rounds'].append({'n': 2, 'date': '2026-10-23', 'from': 'concept.jpg (the Midjourney pick)',
                                't': 'Rebuilt against the Midjourney pick: chunky off-white modules held by dark bumper frames '
                                     '(bkit.module), warm orange windows (bkit.window), darker ground. Round 1 kept in round1/.'})
    notes['stats'] = st
    json.dump(notes, open(np_, 'w'), indent=1)
print('ok')
