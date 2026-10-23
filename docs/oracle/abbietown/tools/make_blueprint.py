# AW-STUDY-0042: the seven-hex blueprint proposal, drawn from the real public data (land.json, square.json).
# Shapes only: water, roads, rail, contours, building outlines around the square. No owners, addresses or parcel ids.
# Run: python3 -I make_blueprint.py  (writes docs/oracle/abbietown/BLUEPRINT.html)
import json, base64, struct, math, pathlib, html
import numpy as np
here = pathlib.Path(__file__).resolve().parent.parent
sim = here.parent.parent.parent / 'prototypes/ranch-atelier/dist/simulations/abbietown'
land = json.load(open(sim / 'land.json')); square = json.load(open(sim / 'square.json'))
nx, ny, cell = land['nx'], land['ny'], land['cell']
raw = base64.b64decode(land['h']); H = np.array(struct.unpack('<%dh' % (len(raw) // 2), raw), dtype=float).reshape(ny, nx)
H = H * (land['stats']['hmax'] / H.max())
S = 760.0; C = (4376.0, 2020.0); R3 = math.sqrt(3)
hexes = [('H1', 'centre', C)] + [(n, 'outer-%d' % b, (C[0] + math.sin(math.radians(b)) * S * R3, C[1] + math.cos(math.radians(b)) * S * R3)) for n, b in [('H2', 180), ('H3', 120), ('H4', 240), ('H5', 300), ('H6', 0), ('H7', 60)]]
def inhex(x, y, c): dx, dy = abs(x - c[0]), abs(y - c[1]); return dy <= S * R3 / 2 and dx <= S - dy / R3
def hexpoly(c): return [(c[0] + S * math.cos(math.radians(a)), c[1] + S * math.sin(math.radians(a))) for a in range(0, 360, 60)]
def seg_contours(level, step=2):
    g = H[::step, ::step]; cs = cell * step; out = []
    for j in range(g.shape[0] - 1):
        for i in range(g.shape[1] - 1):
            v = [g[j, i], g[j, i + 1], g[j + 1, i + 1], g[j + 1, i]]
            if not (min(v) < level <= max(v)): continue
            pts = []
            for a, b, p, q in [(0, 1, (i, j), (i + 1, j)), (1, 2, (i + 1, j), (i + 1, j + 1)), (2, 3, (i + 1, j + 1), (i, j + 1)), (3, 0, (i, j + 1), (i, j))]:
                if (v[a] < level) != (v[b] < level):
                    t = (level - v[a]) / (v[b] - v[a]); pts.append(((p[0] + (q[0] - p[0]) * t + .5) * cs, (p[1] + (q[1] - p[1]) * t + .5) * cs))
            if len(pts) >= 2: out.append((pts[0], pts[1]))
            if len(pts) == 4: out.append((pts[2], pts[3]))
    return out
LEV = list(range(10, 100, 10)); CON = {lv: seg_contours(lv) for lv in LEV}
def hh(x, y): i = min(nx - 1, max(0, int(x / cell))); j = min(ny - 1, max(0, int(y / cell))); return H[j, i]
# --- the places, in the real frame (loose where it is a home) ---
SP = {s['id']: (s['x'], s['y']) for s in [dict(id='cafe', x=4359, y=1906), dict(id='comellas', x=4333, y=1971), dict(id='hoagies', x=4388, y=1996), dict(id='lab', x=4312, y=1925), dict(id='common', x=4376, y=1950), dict(id='muraco', x=4929, y=3186), dict(id='leonard', x=5105, y=3372), dict(id='ginn', x=4302, y=1212), dict(id='horn', x=3026, y=3153), dict(id='home', x=4700, y=3560), dict(id='ani', x=3380, y=2830)]}
def best_in(c, key, r=480):
    b = None
    for j in range(ny):
        for i in range(nx):
            x, y = (i + .5) * cell, (j + .5) * cell
            if inhex(x, y, c) and math.hypot(x - c[0], y - c[1]) < r:
                k = key(x, y)
                if b is None or k > b[0]: b = (k, x, y)
    return b[1], b[2]
hc = {n: c for n, _, c in hexes}
hill5 = best_in(hc['H5'], lambda x, y: hh(x, y) if math.hypot(x - 3050, y - 3100) < 380 else -1, 900)
look3 = best_in(hc['H3'], lambda x, y: hh(x, y), 600)
look7 = best_in(hc['H7'], lambda x, y: hh(x, y), 500)
rail = [p for r in land['rail'] for p in (r if isinstance(r[0], list) else r.get('p', []))] if land['rail'] else []
depot = min(rail, key=lambda p: math.hypot(p[0] - hc['H2'][0], p[1] - hc['H2'][1])) if rail else (hc['H2'][0], hc['H2'][1])
lake3 = max([w for w in land['water'] if 'South Reservoir' in w['n']], key=lambda w: w['a'])['ring']
dock3 = min(lake3, key=lambda p: math.hypot(p[0] - look3[0], p[1] - look3[1]))
lp = [w for w in land['water'] if w['n'] == 'Long Pond']; lp7 = lp[0]['ring'] if lp else None
gb7 = (sum(p[0] for p in lp7) / len(lp7) + 110, sum(p[1] for p in lp7) / len(lp7) + 20) if lp7 else (hc['H7'][0] + 80, hc['H7'][1])
PLAN = {
 'H1': dict(zone='downtown', name='The Square', theme='Church park, Main Street, and four doors', items=[
  ('1', 'Common and church park', SP['common'], 'Real outline of the buildings around the square, from public footprints'), ('2', "Coffee shop (Abbie's after sign-in)", SP['cafe'], 'Door to the café diorama, the cellar key and the basement'), ('3', 'Frozen Hoagies', SP['hoagies'], 'Counter, hot-dog sign, the cold room'), ('4', "Comella's", SP['comellas'], 'The pizza window'), ('5', 'Science lab', SP['lab'], 'The beaker and the cell game'), ('6', 'Mill Pond edge', (4582, 1946), 'Ducks, a bench, the bandstand lawn'), ('7', 'Wedge Pond path', (4311, 2300), "The lane west to Ani's side"), ('8', 'High school (centre of all three zones)', (C[0], C[1]), 'Stands where the three zones meet; no minimap logo, while the three zones each have one')],
  doing='Walk the square, open the café, eat, run the lab, start the Moon Mission at the café curb.', heroes='Church, bandstand, 4 shop fronts, granite-sett Main Street, 60 square-edge buildings from the real footprints', geo='Elevation 4 to 41 m. Wedge Pond (92,000 m2), Mill Pond, Judkins Pond. 1.7 km of main road.'),
 'H2': dict(zone='downtown', name='Depot and River', theme='The railway and the Aberjona', items=[
  ('1', 'Depot and platform', depot, 'Ride the train: the gate to New Nova'), ('2', 'Rail yard and sidings', (hc['H2'][0] - 80, hc['H2'][1] - 200), 'A short train on a siding, signals, a water tower'), ('3', 'Mill by the river', (hc['H2'][0] - 160, hc['H2'][1] + 160), 'Brick mill, footbridge, stepping stones'), ('4', 'Main Street, south end', (4376, 1450), 'Granite setts give way to asphalt')],
  doing='Catch the train, cross the river, skip stones, take the long way back to the square.', heroes='Depot, platform, rails and a short train, mill, footbridge, river banks', geo='Elevation 1 to 60 m. Aberjona River. 1.3 km of main road, the railway.'),
 'H3': dict(zone='downtown', name='Reservoir Hills', theme='The big water and the ridge above it', items=[
  ('1', 'South Reservoir shore and dock', dock3, 'The water showpiece: depth colour, foam, ripples, boats'), ('2', 'Lookout and cairn', look3, 'The highest ground, a flag, the view back to the square'), ('3', 'Trail', ((look3[0] + dock3[0]) / 2, (look3[1] + dock3[1]) / 2), 'Switchbacks through pines and birch')],
  doing='Walk the trail to the lookout, row on the reservoir, find the hidden coin.', heroes='Reservoir shoreline with real outline, dock, rowboats, lookout, 600 trees', geo='Elevation 30 to 81 m. South Reservoir, 320,000 m2. No main road: a quiet hex.'),
 'H4': dict(zone='anis', name='Neighbourhood Streets', theme='The nine house types in three tiers, and a pond path', items=[
  ('1', 'Street of capes and bungalows', (hc['H4'][0] - 150, hc['H4'][1] + 120), 'Modest tier, porches and picket fences'), ('2', 'Street of colonials and farmhouses', (hc['H4'][0] + 120, hc['H4'][1] - 80), 'Family tier, garages, shutters'), ('3', 'Victorian and Tudor row', (hc['H4'][0] + 20, hc['H4'][1] - 300), 'Grand tier: turret, half-timber, walls'), ('4', 'Wedge Pond trail head', (hc['H4'][0] + 520, hc['H4'][1] + 260), 'Path through the trees to the pond')],
  doing='Walk the streets, trick-or-treat, follow the pond trail to the square.', heroes='27 houses from the kit, street furniture, mailboxes, hedges, 3 yard types', geo='Elevation 1 to 62 m. No water in the hex. 1.4 km of main road.'),
 'H5': dict(zone='anis', name="Ani's Pond Side", theme="Ani's cul de sac, her tree house, Horn Pond and Launch", items=[
  ('1', "Ani's cul de sac", SP['ani'], 'Ring road, six houses, her house and tree house (loose placement, no addresses)'), ('2', 'Horn Pond shore and splash pad', (SP['horn'][0] + 120, SP['horn'][1] - 100), 'Dock, splash pad, the hill behind'), ('3', 'Hill, cairn and flag', hill5, 'The Horn Pond hill from the topo data'), ('4', 'Launch', (3760, 2860), 'Pad, gantry, hangar apron, the first stretch of Launch Road')],
  doing="Visit Ani's tree house, splash in the pond, climb the hill, board the rocket.", heroes='Cul de sac, 2 tree houses, splash pad, pond, hill, rocket on its pad', geo='Elevation 9 to 83 m. Winter Pond (61,000 m2) and the rim of Horn Pond.'),
 'H6': dict(zone='abbie', name="Abbie's Yard", theme='The house, the back yard and the tree house', items=[
  ('1', "Abbie's house and back yard", SP['home'], 'Yard, fence, garden, the tree house (loose placement, no addresses)'), ('2', 'Tree house', (SP['home'][0] + 30, SP['home'][1] - 50), 'Ladder, rope bridge, a lookout'), ('3', 'Muraco school door', SP['muraco'], 'The door into the school jump'), ('4', 'Leonard Field', SP['leonard'], 'A green edge with a backstop')],
  doing="Climb the tree house, play in the yard, go in the school door, follow the Launch Road east.", heroes='House, yard, tree house, school front, ball field', geo='Elevation 4 to 54 m. Aberjona Pond. 1.0 km of main road.'),
 'H7': dict(zone='abbie', name='Gingerbread Hill', theme='A muffin shop with a secret behind it', items=[
  ('1', 'Gingerbread House', gb7, 'Carrot cake or birthday cake. The muffin shop.'), ('2', "Daddy's bunker door", (gb7[0] - 20, gb7[1] + 40), 'Vault-style door in the hillside, sealed for now: not built yet'), ('3', 'Long Pond', (hc['H7'][0] - 20, hc['H7'][1] - 120), 'A small pond, reeds, a rowing dock'), ('4', 'Lookout', look7, 'The hill top')],
  doing='Buy a muffin, look at the sealed door, walk the hill.', heroes='Gingerbread House, candy garden, bunker mound and door, pond', geo='Elevation 8 to 83 m. Long Pond (17,000 m2). No main road: the Launch Road ends here.'),
}
ZC = {'downtown': ('#ffb347', 'Downtown'), 'anis': ('#6fe0c0', "Ani's side"), 'abbie': ('#ff8fb5', "Abbie and Daddy's side")}
# --- drawing ---
def svg_map(c, s, pad, clip=None, labels=None, wide=False, title=''):
    x0, y0 = c[0] - pad[0], c[1] + pad[1]; W = pad[0] * 2 * s; Hh = pad[1] * 2 * s
    X = lambda x: round((x - x0) * s, 1); Y = lambda y: round((y0 - y) * s, 1)
    o = ['<svg viewBox="0 0 %d %d" role="img" aria-label="%s" xmlns="http://www.w3.org/2000/svg">' % (W, Hh, html.escape(title))]
    if clip: o.append('<defs><clipPath id="%s"><polygon points="%s"/></clipPath></defs><g clip-path="url(#%s)">' % (clip[0], ' '.join('%s,%s' % (X(x), Y(y)) for x, y in hexpoly(clip[1])), clip[0]))
    else: o.append('<g>')
    o.append('<rect x="0" y="0" width="%d" height="%d" class="paper"/>' % (W, Hh))
    for lv in LEV:
        d = ' '.join('M%s %sL%s %s' % (X(a[0]), Y(a[1]), X(b[0]), Y(b[1])) for a, b in CON[lv] if x0 - 50 < a[0] < x0 + pad[0] * 2 + 50 and y0 - pad[1] * 2 - 50 < a[1] < y0 + 50)
        if d: o.append('<path d="%s" class="%s"/>' % (d, 'cmaj' if lv % 50 == 0 else 'cmin'))
    for w in land['water']:
        if w['a'] < 2500: continue
        r = w['ring']
        if max(p[0] for p in r) < x0 or min(p[0] for p in r) > x0 + pad[0] * 2 or max(p[1] for p in r) < y0 - pad[1] * 2 or min(p[1] for p in r) > y0: continue
        o.append('<polygon points="%s" class="water"/>' % ' '.join('%s,%s' % (X(p[0]), Y(p[1])) for p in r))
    for st in land['streams']:
        p = st['p'] if isinstance(st, dict) else st
        o.append('<polyline points="%s" class="stream"/>' % ' '.join('%s,%s' % (X(a), Y(b)) for a, b in p))
    for r in land['roads']:
        if r['c'] > 4 and not wide: continue
        if r['c'] > 5: continue
        pts = r['p']
        if max(p[0] for p in pts) < x0 or min(p[0] for p in pts) > x0 + pad[0] * 2 or max(p[1] for p in pts) < y0 - pad[1] * 2 or min(p[1] for p in pts) > y0: continue
        o.append('<polyline points="%s" class="road c%d"/>' % (' '.join('%s,%s' % (X(a), Y(b)) for a, b in pts), min(r['c'], 5)))
    for r in land['rail']:
        p = r['p'] if isinstance(r, dict) else r
        o.append('<polyline points="%s" class="rail"/>' % ' '.join('%s,%s' % (X(a), Y(b)) for a, b in p))
    if labels:
        for ext in labels(X, Y): o.append(ext)
    o.append('</g>')
    return '\n'.join(o), X, Y, W, Hh
def square_outline(X, Y):
    out = []
    for b in square['buildings']:
        out.append('<polygon points="%s" class="bld"/>' % ' '.join('%s,%s' % (X(SP['common'][0] + p[0]), Y(SP['common'][1] + p[1])) for p in b['p']))
    return out
def hexes_overlay(X, Y, only=None):
    o = []
    for n, _, c in hexes:
        if only and n != only: continue
        z = PLAN[n]['zone']; o.append('<polygon points="%s" class="hexo z-%s"/>' % (' '.join('%s,%s' % (X(x), Y(y)) for x, y in hexpoly(c)), z))
    return o
# master plan
def master_labels(X, Y):
    o = hexes_overlay(X, Y)
    for n, _, c in hexes:
        z = PLAN[n]['zone']; o.append('<text x="%s" y="%s" class="hexn z-%s">%s</text>' % (X(c[0]), Y(c[1]) - 6, z, n)); o.append('<text x="%s" y="%s" class="hexl">%s</text>' % (X(c[0]), Y(c[1]) + 14, html.escape(PLAN[n]['name'])))
    # the three wedges inside the centre hex
    for b in (330, 90, 210):
        a = math.radians(b); o.append('<line x1="%s" y1="%s" x2="%s" y2="%s" class="wedge"/>' % (X(C[0]), Y(C[1]), X(C[0] + math.sin(a) * S * .9), Y(C[1] + math.cos(a) * S * .9)))
    # the Launch Road
    road = [(3760, 2860), (4000, 3080), (4450, 3300), (4700, 3500), (5000, 3480), (5300, 3250), (gb7[0] - 30, gb7[1] + 30)]
    o.append('<polyline points="%s" class="launch"/>' % ' '.join('%s,%s' % (X(a), Y(b)) for a, b in road))
    for n in PLAN:
        for k, name, p, note in PLAN[n]['items']:
            o.append('<circle cx="%s" cy="%s" r="3.4" class="dot z-%s"/>' % (X(p[0]), Y(p[1]), PLAN[n]['zone']))
    return o
body_master, X, Y, W, Hh = svg_map((C[0], C[1]), .2, (2000, 2050), labels=master_labels, title='Winchester in seven hexes')
cards = []
for n, _, c in hexes:
    P = PLAN[n]; z = P['zone']
    def lab(X, Y, n=n, c=c, P=P):
        o = []
        if n == 'H1': o += square_outline(X, Y)
        o += hexes_overlay(X, Y, n)
        for k, name, p, note in P['items']:
            o.append('<circle cx="%s" cy="%s" r="9" class="pin z-%s"/><text x="%s" y="%s" class="pint">%s</text>' % (X(p[0]), Y(p[1]), z, X(p[0]), Y(p[1]) + 3.6, k))
        return o
    sv, X2, Y2, W2, H2 = svg_map(c, .42, (S + 20, S * R3 / 2 + 20), clip=('cl' + n, c), labels=lab, wide=True, title=n + ' ' + P['name'])
    items = ''.join('<li><b>%s</b> %s<span>%s</span></li>' % (k, html.escape(name), html.escape(note)) for k, name, p, note in P['items'])
    cards.append('<article class="card z-%s" id="%s"><header><span class="hid">%s</span><div><h3>%s</h3><p class="zone">%s &middot; %s</p></div></header><div class="map">%s</div><p class="theme">%s</p><ol class="items">%s</ol><dl><dt>What you do</dt><dd>%s</dd><dt>Hero models</dt><dd>%s</dd><dt>Real ground</dt><dd>%s</dd></dl></article>' % (z, n, n, html.escape(P['name']), ZC[z][1], n, sv, html.escape(P['theme']), items, html.escape(P['doing']), html.escape(P['heroes']), html.escape(P['geo'])))
page = open(here / 'blueprint.template.html').read().replace('/*MASTER*/', body_master + '</svg>').replace('/*CARDS*/', '\n'.join(cards))
(here / 'BLUEPRINT.html').write_text(page)
print('wrote', len(page))
