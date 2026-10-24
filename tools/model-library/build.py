#!/usr/bin/env python3
"""Builds the /models library index: every distinct 3D file in the repo, whether or not it is on the review desk.

  python3 tools/model-library/build.py            (from the repo root; needs tools/model-library/render.mjs thumbnails)

Writes prototypes/ranch-atelier/dist/models/library.json and the small pictures in dist/models/library/t/<key>.webp.
Files are matched by content hash, so a model copied to five folders counts once. The review-desk manifest
(dist/models/manifest.json) wins for the models it lists. Run render.mjs first (see README.md) for the pictures.
"""
import hashlib, json, os, re, subprocess, sys, collections
from PIL import Image

ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
DIST = 'prototypes/ranch-atelier/dist'
os.chdir(ROOT)
THUMBS = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/thumbs'

files = [l for l in subprocess.check_output(['git', 'ls-files'], text=True).splitlines() if re.search(r'\.(glb|gltf)$', l, re.I)]
objs = [l for l in subprocess.check_output(['git', 'ls-files'], text=True).splitlines() if re.search(r'\.(obj|stl|fbx|3mf)$', l, re.I)]
by_hash = collections.defaultdict(list)
for f in files:
    by_hash[hashlib.md5(open(f, 'rb').read()).hexdigest()].append(f)

# ---- names: any {id, name} record in the repo's catalogues ----
NAMES = {}
def walk(o):
    if isinstance(o, dict):
        i, n = o.get('id'), o.get('name') or o.get('label')
        if isinstance(i, str) and isinstance(n, str) and len(i) < 40: NAMES.setdefault(i, n)
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in subprocess.check_output(['git', 'ls-files', DIST + '/'], text=True).splitlines():
    if f.endswith('.json') and 'sandbox2-runtime' not in f and os.path.getsize(f) < 3e6 and not f.endswith('models/manifest.json'):
        try: walk(json.load(open(f)))
        except Exception: pass

manifest = json.load(open(f'{DIST}/models/manifest.json'))['models']
mf_by_hash = {}
for m in manifest:
    g = m['urls']['glb']
    p = DIST + g if g.startswith('/') else g
    if os.path.exists(p): mf_by_hash[hashlib.md5(open(p, 'rb').read()).hexdigest()] = m

# ---- collections: (path regex) -> (study / collection, place, source) ----
RULES = [
    (r'^tools/meshy-heroes/', 'Moon heroes (Meshy)', 'Moon base', 'Meshy'),
    (r'^studies/moon-mission/', 'Moon heroes (Meshy)', 'Moon base', 'Meshy'),
    (r'^tools/aurora-mk2/|^studies/spaceships/', 'Spaceship Aurora', 'Space', 'Meshy'),
    (r'^tools/bruiser-study/', 'Bruiser study', 'Characters', 'Meshy'),
    (r'^tools/midjourney/outputs/character-studio|^tools/character-studio/|^studies/character-studio/', 'Character Studio', 'Characters', 'Meshy'),
    (r'^tools/midjourney/', 'Character Studio', 'Characters', 'Meshy'),
    (r'^tools/moon-base-kit/', 'Moon base kit', 'Moon base', 'Blender'),
    (r'^tools/moon-remaster/|^moon/|^simulations/moon/', 'Moon', 'Moon base', 'Blender'),
    (r'^tools/paper-warrior/|^tools/paper-helmet/|^tools/roman-kit/|^review/paper|^greek-|^fritigern/', 'Roman and Greek warrior', 'Rome', 'Blender'),
    (r'^tools/paper-body/|^studies/bodies|^tools/figure-practice/|^studies/shaders|^tools/turnaround-hero/|^studies/turnaround-hero|^studies/brute-fight|^tools/brute-fight', 'Bodies and mannequins', 'Characters', 'Blender'),
    (r'^tools/stl-pilot/', 'Free sources (Printables)', 'Town', 'Printables'),
    (r'^tools/model-challenge/', 'Model challenge', 'Ranch', 'Blender'),
    (r'^tools/ranch-rebuild/|^ranch-kits/|^garden-assets|^asset-studies|^prototypes/', 'Ranch rebuild', 'Ranch', 'Blender'),
    (r'^models/cafe-', 'Cafe', 'Cafe', 'Blender'),
    (r'^models/ranch-', 'Ranch tiles', 'Ranch', 'Blender'),
    (r'^simulations/city/', 'Town and city kit', 'Winchester', 'Catalogue'),
    (r'^simulations/starship/', 'Starship kit', 'Space', 'Catalogue'),
    (r'^simulations/assets/backpack|^studies/charms|^backpack', 'Backpack charms', 'Backpack', 'Midjourney + Blender'),
    (r'^simulations/regional|^woodland-assets|^tile-game-assets|^proportion-study', 'Tile game kit', 'Woodland', 'Catalogue'),
    (r'^simulation-assets', 'Ranch buildings and workers', 'Ranch', 'Blender'),
    (r'^sets-media|^domestic-assets', 'Home and market sets', 'Home', 'Catalogue'),
    (r'^coastal-assets', 'Coast and estuary', 'Coast', 'Catalogue'),
    (r'^survival-gear', 'Zombie survival gear', 'Wasteland', 'Blender'),
    (r'^gateway-art-lab', 'Gateway art lab (AI model comparison)', 'Ranch', 'AI written code'),
    (r'^night-assets', 'Night scenes', 'Town', 'Catalogue'),
    (r'^castle-assets', 'Castles', 'Castle', 'Catalogue'),
    (r'^sandbox2-runtime/', 'Sandbox copies', 'Ranch', 'Blender'),
    (r'^animation-study', 'Animation library', 'Characters', 'Blender'),
    (r'^invention-test|^survivor', 'Loose models', 'Ranch', 'Blender'),
]
def classify(p):
    for rx, col, place, src in RULES:
        if re.search(rx, p): return col, place, src
    return 'Other', 'Ranch', 'Blender'

TYPES = [
    ('Character', r'character|hero|suit|tee\b|astronaut|man\b|woman|figure|body|mannequin|fighter|chibi|clay|bruiser|foreman|worker|doctor|scientist|girl|boy|abbie|ani\b|cs-\d'),
    ('Animal', r'cow|horse|goat|chicken|dog|cat\b|bub|sheep|pig|bird|animal|tardigrade|fish|bee\b'),
    ('Vehicle', r'car\b|car-|truck|tractor|buggy|suv|ship|rocket|aurora|boat|cart|bus\b|van\b|racer|sedan|pickup|kart|wheel'),
    ('Plant', r'tree|plant|flower|fern|bush|bramble|clover|borage|goldenrod|sunflower|hollyhock|marigold|coneflower|hazel|elder|maple|birch|apple|herb|crop|garden|moss|grass|reed|leaf'),
    ('Building', r'barn|shelter|house|home|coop|store|shop|castle|tower|dome|hut|cabin|wall|roof|bunker|lighthouse|building|bakery|school|garage|door|arch|hall|library|cafe-room|foundation|frame'),
    ('Armour and wear', r'helmet|cuirass|greave|pauldron|shield|belt|sandal|gladius|armou?r|spear|boot|hat\b|glove|backpack|pack\b|jacket|mask'),
    ('Charm', r'charm|key\b|floppy|coin|heart|moon-?cheese|star\b'),
    ('Terrain and tile', r'tile|terrain|ground|path|stone|rock|boulder|edging|meteor|hex|floor|carpet|cliff|hill|mountain|crater|pan\b'),
    ('Furniture', r'bench|table|chair|stool|bed\b|shelf|counter|bar-|beanbag|couch|sofa|desk|cabinet|rack|crate|barrel|bucket|jar|pot\b|lamp|booth|stage|box|chest|bin\b|sign|fence'),
    ('Machine and tech', r'computer|terminal|boombox|crt|battery|machine|radio|screen|pod\b|bulkhead|panel|generator|antenna|robot|drone|console|register|blender|jukebox|disco|laser|dj'),
]
def kind(text):
    t = text.lower()
    for name, rx in TYPES:
        if re.search(rx, t): return name
    return 'Prop'

STAGE = re.compile(r'(armature|_glb\.glb|/basic_animations/|running|walking|_rigged|remesh|/variants/|-(foundation|frame|planned|roof|ready|growing|ripe|sprout)\b|_rules\b|\bsym\b|_sym\b|-aligned|/aligned)', re.I)

def pretty(p, hit):
    base = os.path.splitext(os.path.basename(p))[0]
    parts = p.split('/')
    if base in ('model', 'scene', 'mesh') or re.fullmatch(r'[A-Z]{1,3}-?\d{1,4}', base) and False:
        base = parts[-2]
    stem = base
    if '/variants/' in p and len(parts) > 3:
        parent = re.sub(r'-charming$', '', parts[-3]).replace('-', ' ')
        return parent.capitalize() + ' \u00b7 ' + re.sub(r'[_\-]+', ' ', base).capitalize()
    for k in (stem, parts[-2] if len(parts) > 1 else ''):
        if k in NAMES: return NAMES[k]
    s = re.sub(r'^claude-sonnet-5\.5--', 'AI lab ', stem)
    s = re.sub(r'[_\-\.]+', ' ', s).strip()
    s = re.sub(r'\bglb\b', '', s, flags=re.I).strip()
    return s[:1].upper() + s[1:]

def sort_key(p):
    return (0 if '/models/' in p else 1 if 'sandbox2' not in p and p.startswith(DIST) else 2, len(p))

out = []
for h, paths in by_hash.items():
    p = sorted(paths, key=sort_key)[0]
    rel = p[len(DIST) + 1:] if p.startswith(DIST + '/') else p
    served = p.startswith(DIST + '/') and not p.startswith(DIST + '/tools')
    m = mf_by_hash.get(h)
    col, place, src = classify(rel)
    if m:
        g = m.get('group', '')
        col = {'Café · low poly': 'Cafe', 'Ranch tile · normal': 'Ranch tiles', 'Ranch tile · charming': 'Ranch tiles (charming)', 'Free sources · Printables': 'Free sources (Printables)', 'Roman parts': 'Roman and Greek warrior', 'Paper warrior · props': 'Roman and Greek warrior', 'Paper figures': 'Bodies and mannequins', 'Moon remaster': 'Moon', "Grace's basement": "Grace's basement"}.get(g, g.split(' · ')[0])
        place = {'Cafe': 'Cafe', 'Ranch tiles': 'Ranch', 'Ranch tiles (charming)': 'Ranch', 'Free sources (Printables)': 'Town', 'Moon': 'Moon base', "Grace's basement": 'Basement', 'Roman and Greek warrior': 'Rome'}.get(col, place)
        src = 'Printables' if (m.get('source') or {}).get('site') == 'Printables' else 'Blender'
        if g.startswith('Model challenge'): col, place = 'Model challenge', 'Ranch'
    name = (m or {}).get('name') or pretty(rel, h)
    stage = bool(STAGE.search('/' + rel)) and not m
    if rel.startswith('sandbox2-runtime/') and not m: stage = False
    size = os.path.getsize(p)
    key = h[:12]
    e = {
        'key': key, 'name': name, 'collection': col, 'place': place, 'source': src,
        'type': kind(name + ' ' + rel), 'bytes': size,
        'level': 'stage' if stage else 'model',
        'status': 'reviewed' if m else 'unreviewed',
        'glb': ('/' + rel) if served else None,
        'file': p, 'copies': len(paths),
    }
    if m:
        e['id'] = m['id']; e['ref'] = m['urls'].get('ref'); e['verdict'] = m.get('status')
        e['source_info'] = (m.get('source') or {}).get('url')
    if os.path.exists(f'{THUMBS}/{key}.png'):
        e['thumb'] = f'/models/library/t/{key}.webp'
    out.append(e)

# ---- models that exist only on unmerged branches: listed with a picture, kept where they are ----
# Their files are pulled out of git into BRANCH_DIR (so render.mjs can draw them); nothing is added to main.
BRANCH_DIR = sys.argv[2] if len(sys.argv) > 2 else '/tmp/claude-0/branchfiles'
os.makedirs(BRANCH_DIR, exist_ok=True)
main_blobs = set(l.split()[2] for l in subprocess.check_output(['git', 'ls-tree', '-r', 'origin/main'], text=True).splitlines() if l.split('\t')[1].lower().endswith(('.glb', '.gltf')))
branches = [b for b in subprocess.check_output(['git', 'branch', '-r'], text=True).split() if b.startswith('origin/') and '->' not in b and b != 'origin/main']
seen_blob, found = set(), {}
for b in sorted(branches, key=lambda b: (b != 'origin/UE5', b)):
    for l in subprocess.check_output(['git', 'ls-tree', '-r', b], text=True).splitlines():
        meta, path = l.split('\t', 1)
        blob = meta.split()[2]
        if path.lower().endswith(('.glb', '.gltf')) and blob not in main_blobs and blob not in seen_blob:
            seen_blob.add(blob); found[blob] = (b, path)
branch_items, hashes_seen = [], set(h for h in by_hash)
for blob, (b, path) in found.items():
    data = subprocess.check_output(['git', 'cat-file', 'blob', blob])
    h = hashlib.md5(data).hexdigest()
    if h in hashes_seen: continue
    hashes_seen.add(h)
    fn = f'{BRANCH_DIR}/{h[:12]}.glb'
    if not os.path.exists(fn): open(fn, 'wb').write(data)
    col, place, src = classify(path.replace(DIST + '/', ''))
    if path.startswith('UE5/'):
        sub = path.split('/')
        col = 'Unreal intake (UE5 branch)'
        place = next((x for x in ('Papercraft', 'HalloweenCandyland', 'Christmas', 'Terrain', 'MoonBase') if x in sub), 'Bunker' if 'Enemy' in path else 'Town')
        place = {'HalloweenCandyland': 'Halloween', 'MoonBase': 'Moon base', 'Papercraft': 'Papercraft', 'Christmas': 'Christmas'}.get(place, place)
        src = 'Meshy' if re.search(r'remesh|meshy', path, re.I) else 'Blender'
    elif path.startswith('experiments/'):
        col, place, src = 'Rooftop experiments', 'Town', 'Meshy'
    nm = pretty(path, h)
    it = {'key': h[:12], 'name': nm, 'collection': col, 'place': place, 'source': src, 'type': kind(nm + ' ' + path), 'bytes': len(data),
        'level': 'stage' if STAGE.search('/' + path) and not path.startswith('UE5/') else 'model', 'status': 'branch', 'glb': None, 'file': path,
        'branch': b.replace('origin/', ''), 'copies': 1}
    if os.path.exists(f'{THUMBS}/{h[:12]}.png'): it['thumb'] = f'/models/library/t/{h[:12]}.webp'
    branch_items.append(it)
out += branch_items

# a mannequin copied into five studies, or a robot in sandbox copies, is one model; nothing else is merged.
os.makedirs(f'{DIST}/models/library/t', exist_ok=True)
for e in out:
    src = f'{THUMBS}/{e["key"]}.png'
    dst = f'{DIST}/models/library/t/{e["key"]}.webp'
    if os.path.exists(src) and not os.path.exists(dst):
        im = Image.open(src).convert('RGB').crop((0, 6, 256, 256)).resize((224, 219))
        im.save(dst, 'WEBP', quality=72, method=6)
out.sort(key=lambda e: (e['collection'], e['level'] != 'model', e['name'].lower()))
c = collections.Counter
summary = {
    'files_in_repo': len(files), 'distinct': len(out), 'models': sum(e['level'] == 'model' for e in out),
    'stages': sum(e['level'] == 'stage' for e in out), 'on_desk': sum(e['status'] == 'reviewed' for e in out), 'in_main': len(out) - len(branch_items),
    'on_branches_only': len(branch_items), 'not_served': sum(e['glb'] is None for e in out), 'other_formats_not_listed': len(objs),
    'by_collection': c(e['collection'] for e in out), 'by_source': c(e['source'] for e in out), 'by_type': c(e['type'] for e in out),
}
json.dump({'version': 1, 'updated': subprocess.check_output(['date', '-u', '+%Y-%m-%dT%H:%MZ'], text=True).strip(), 'summary': summary, 'items': out},
          open(f'{DIST}/models/library.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(json.dumps(summary, indent=1))
