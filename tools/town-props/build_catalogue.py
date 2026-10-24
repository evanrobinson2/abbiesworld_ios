#!/usr/bin/env python3
"""Role-tag the model library for the Winchester decorator (simulations/abbietown/library-props.mjs).

Reads prototypes/ranch-atelier/dist/models/library.json (the models library thread's index), keeps only models that are
served, light (<260 KB), outdoor-sensible and PG, tags each with the roles it can play in town, and writes
prototypes/ranch-atelier/dist/simulations/abbietown/props-catalogue.json. Re-run it when the library grows.
Coded names (RC 017, NS08, BA0021) were tagged by looking at their contact sheets; named models are tagged by keyword.
"""
import json, os, re, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', '..'); DIST = os.path.join(ROOT, 'prototypes/ranch-atelier/dist')
lib = json.load(open(DIST + '/models/library.json'))['items']

# [roles, size in metres along the longest side] for coded models, tagged from their contact sheets
CODED = {
 'NS03': (['street'], 11), 'NS04': (['street', 'shop'], 4), 'NS05': (['street', 'yard'], 3.2), 'NS08': (['street', 'park'], 6.2), 'NS09': (['road'], 8.5), 'NS10': (['street', 'shop'], 3.6),
 'RC 017': (['street'], 9), 'RC 022': (['street', 'park'], 10), 'RC 023': (['street', 'park'], 6), 'RC 024': (['park', 'street'], 7), 'RC 025': (['shop', 'street'], 5), 'RC 026': (['park'], 9),
 'RC 027': (['street'], 8), 'RC 030': (['shop', 'street'], 4.5), 'RC 029': (['street'], 5),
 'BA 0001': (['shop'], 8), 'BA 0002': (['shop'], 8), 'BA 0011': (['shop', 'yard'], 5), 'BA 0013': (['shop'], 4), 'BA 0014': (['shop'], 4), 'BA 0019': (['shop'], 4.2), 'BA 0020': (['shop'], 4.4),
 'BA 0021': (['shop', 'yard'], 1.6), 'BA 0022': (['shop', 'yard'], 2), 'BA 0023': (['shop', 'yard'], 2.4), 'BA 0025': (['shop', 'yard'], 2), 'BA 0028': (['shop'], 3), 'BA 0034': (['shop', 'yard'], 2.4),
 'BA 0048': (['shop'], 3), 'BA 0050': (['shop'], 4), 'BA 0051': (['shop', 'yard'], 2.2), 'BA 0069': (['shop'], 5), 'BA 0031': (['shop'], 3.6), 'BA 0062': (['park'], 7), 'BA 0065': (['park'], 5.5),
 'BA 0079': (['yard', 'park'], 4.2), 'BA 0063': (['garden'], 4), 'BA 0058': (['yard'], 4), 'BA 0064': (['water'], 9), 'BA 0074': (['water', 'garden'], 7), 'BA 0066': (['shop', 'yard'], 3.2), 'BA 0061': (['yard'], 3),
}
# keyword rules for named models: (regex on the name, roles, size)
RULES = [
 (r'bench', ['street', 'park'], 6), (r'picnic', ['park', 'yard'], 7.5), (r'lamp', ['street'], 10), (r'mailbox', ['street', 'yard'], 3),
 (r'sedan|toddler car|wedge toy car|toy racer|pickup', ['road'], 8), (r'tractor', ['farm'], 8), (r'wheelbarrow', ['yard', 'farm'], 4),
 (r'chicken coop', ['farm', 'yard'], 6), (r'chicken', ['farm'], 1.6), (r'goat|horse|sheep|shepherd dog|cat$', ['farm'], 4), (r'water trough|\btrough', ['farm'], 5),
 (r'hay bale|log pile|crate stack|stump|beehive|compost|rain barrel', ['yard', 'farm'], 3), (r'fresh-cut hardwood log|timber stack|trestle', ['yard', 'farm'], 4),
 (r'potting bench', ['yard', 'garden'], 4.6), (r'stone edging|garden edge', ['garden', 'yard'], 5), (r'watering pot|garden water jar', ['garden', 'yard'], 1.8), (r'garden hoe', ['garden'], 2.4),
 (r'raised planting|kitchen garden|crop patch|flax|strawberry|herbs|thyme|broad bean|bunchberry|sunflower|trellis', ['garden'], 4),
 (r'orchard tree|quince|olive tree|beech|pine tree|^birch|^oak|^fir|tree wooden|tree faceted', ['park', 'yard'], 9), (r'^bush', ['yard', 'garden'], 3), (r'boulder', ['yard', 'park', 'water'], 3),
 (r'garden tender|garden draw well|rest shelter', ['garden', 'yard'], 4.5), (r'sea-holly|eelgrass|reed clump|bladderwrack', ['water'], 3),
 (r'rowing boat', ['water'], 8), (r'quay edge|oar support|mooring anchor|mast step|fish drying frame|net|salt storage|seaweed', ['water'], 5),
 (r'market jar|selling table|selling tray|vendor sitting stool', ['shop'], 2.4), (r'fuel storage|seed jar|root storage|drying rack|curing rack', ['yard'], 3),
 (r'^pink door|portholes|giant sundae|cream topper', ['shop'], 4),
]
BAD = re.compile(r'armou?r|helmet|sword|gladius|shield|spear|pauldron|greave|cuirass|sandal|belt|zombie|survivor|suv|weapon|gun|knife|moon|lunar|space|sci-?fi|ship|reactor|airlock|astronaut|hull|worker|handworker|inspector|· (idle|work|carr)|^(abbie|ani|alexis|daddy|jeff|mommy|marley)|laborator|medical|scrubber|headlamp|workbench|bow-drilling|mineral|shaving|dining|porthole|treasure|potion|lighthouse|padlock|kiln|hearth|roman|wall$|ceiling|floor|stars|disco|neon|beanbag|window|stage|dance|bone|skull|dead', re.I)
SKIP_CODED = re.compile(r'^NS02$')  # a toy pistol: never in town

out, seen = [], set()
for i in lib:
    glb = (i.get('glb') or '').split('?')[0]
    if not glb or i['level'] != 'model' or i['bytes'] > 260000 or not os.path.exists(DIST + glb): continue
    n = i['name']
    if SKIP_CODED.match(n) or (BAD.search(n) and n not in CODED): continue
    code = n if n in CODED else n.replace('BA', 'BA ') if re.match(r'BA\d', n) else n
    spec = CODED.get(code) or CODED.get(n)
    if not spec:
        if re.match(r'^(RC|NS|BA|GF)[ -]?\d', n) or 'GF-' in n: continue
        spec = next(((r, s) for rx, r, s in RULES if re.search(rx, n, re.I)), None)
    if not spec: continue
    roles, size = spec
    key = (re.sub(r'[ ·]*(carried|empty|full|partial|a|b)$', '', n.lower()), glb)
    if glb in seen: continue
    seen.add(glb)
    if sum(1 for o in out if o['name'] == n) >= 2: continue  # at most two variants of the same named model
    out.append({'id': i['key'], 'name': n, 'glb': glb, 'roles': roles, 'size': size, 'kb': i['bytes'] // 1000, 'from': i['place']})
json.dump(out, open(DIST + '/simulations/abbietown/props-catalogue.json', 'w'), indent=1, ensure_ascii=False)
import collections
c = collections.Counter(r for o in out for r in o['roles'])
print(len(out), 'models;', dict(c))
