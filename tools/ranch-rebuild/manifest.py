"""Asset manifest v1 (docs/MODELER_VISION.md, "Durable asset package"): one models/<name>/asset.json per rebuilt asset.

usage: python manifest.py NAME [NAME ...]     (or `all`)

Gathers what the pipeline already records about an asset into one versioned, machine-readable file that travels with
the GLB: identity and purpose, the brief and prompts, Midjourney jobs and picks, the construction recipe, part
hierarchy, units and axes, validation scores and budgets, game exports and lineage. Re-running it bumps the version
only when the GLB changed, and keeps the earlier versions' hashes in `lineage`.
"""
import sys, os, json, hashlib, datetime, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
BUDGET = {'building': 9000, 'animal': 4000, 'tree': 3000, 'prop': 2000, 'supply': 2000, 'plant': 1000}
BUDGET_BY_NAME = {'goat': 3000, 'chicken': 1500, 'tree-standing': 5000}


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def load(p, default=None):
    return json.load(open(p)) if os.path.exists(p) else default


def parts_of(glb):
    """The named part hierarchy and materials, read from the GLB's own JSON chunk (no Blender needed)."""
    b = open(glb, 'rb').read(); n = int.from_bytes(b[12:16], 'little'); g = json.loads(b[20:20 + n])
    nodes, mats = g.get('nodes', []), [m.get('name', '') for m in g.get('materials', [])]
    meshes = g.get('meshes', [])

    def node(i):
        nd = nodes[i]; out = {'name': nd.get('name', f'node{i}')}
        if 'mesh' in nd:
            out['materials'] = sorted({mats[p['material']] for p in meshes[nd['mesh']]['primitives'] if 'material' in p})
        for k in ('translation', 'rotation'):
            if k in nd:
                out['pivot' if k == 'translation' else 'rotation'] = [round(x, 4) for x in nd[k]]
        if nd.get('children'):
            out['children'] = [node(c) for c in nd['children']]
        return out
    roots = g['scenes'][g.get('scene', 0)]['nodes']
    return [node(i) for i in roots], mats


def build(name):
    entry = {p['name']: p for p in load(os.path.join(HERE, 'prompts.json'), []) + load(os.path.join(HERE, 'prompts-charming.json'), [])}[name]
    md = os.path.join(HERE, 'models', name); glb = os.path.join(md, f'{name}.glb')
    mj = load(os.path.join(HERE, 'mj', name, 'provenance.json'), {})
    notes = load(os.path.join(md, 'notes.json'), {})
    stats = load(os.path.join(md, 'r', 'stats.json'), {}); score = load(os.path.join(md, 'r', 'score.json'), {})
    hero = score.get('hero_iou', load(os.path.join(md, 'r', 'hero_check.json'), {}).get('hero_iou'))
    old = load(os.path.join(md, 'asset.json'), {})
    h = sha(glb)
    version = old.get('version', 0) + (0 if old.get('files', {}).get(f'{name}.glb', {}).get('sha256') == h else 1)
    lineage = old.get('lineage', [])
    if old and old.get('files', {}).get(f'{name}.glb', {}).get('sha256') != h:
        lineage.append({'version': old['version'], 'sha256': old['files'][f'{name}.glb']['sha256'], 'date': old.get('updated')})
    hierarchy, materials = parts_of(glb)
    variants = sorted(f[:-4] for f in os.listdir(os.path.join(md, 'variants'))) if os.path.isdir(os.path.join(md, 'variants')) else []
    try:
        import to_game
        t = to_game.TARGETS.get(entry.get('base', name))
    except Exception:
        t = None
    exports = {'runtime': f'{name}.glb', 'variants': {v: f'variants/{v}.glb' for v in variants}}
    if t:
        exports['game'] = ({'kind': 'mesh-list', 'files': [f"prototypes/ranch-atelier/dist/simulation-assets/{os.path.dirname(t[1])}/{os.path.basename(t[1])}-{s}.json" for s in t[2]]}
                           if t[0] == 'mesh' else {'kind': 'glb', 'files': [f'prototypes/ranch-atelier/dist/{t[1]}']})
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    tris = stats.get('triangles'); budget = BUDGET_BY_NAME.get(entry.get('base', name), BUDGET[entry['group']])
    return {
        'schema': 'abbies-world/asset-manifest', 'schemaVersion': 1,
        'id': f"ranch/{name}", 'name': name, 'version': version,
        'created': old.get('created', datetime.date.today().isoformat()), 'updated': datetime.date.today().isoformat(),
        'purpose': {
            'world': "Abbie's World", 'scene': 'Atelier Ranch, Ranch tile', 'role_in_scene': entry['role'],
            'why': "Rebuilt on Evan's request (2026-10-22) to replace the Ranch tile's original model with a crafted one, keeping its game role.",
            'audience': 'children building and playing in a miniature ranch',
            'style': 'charming (storybook toy)' if name.endswith('-charming') else 'normal (upgrade: the same asset, built better)',
        },
        'brief': {'prompt': entry['prompt'], 'art_direction': 'tools/ranch-rebuild/BRIEF.md', 'modeler_brief': 'tools/ranch-rebuild/MODELER.md'},
        'concept': {'tool': mj.get('tool'), 'jobs': mj.get('jobs'), 'files': {k: v.get('sha256') for k, v in mj.get('files', {}).items()},
                    'folder': f'tools/ranch-rebuild/mj/{name}'},
        'construction': {'tool': 'Blender 5.2 (bpy, Python) in the cloud', 'recipe': f'tools/ranch-rebuild/models/{name}/build.py',
                         'by': 'modeler agent, directed by the art director (Claude)', 'rounds': notes.get('rounds', []),
                         'what_was_done': notes.get('what_i_did', []), 'creative_additions': notes.get('creative_additions')},
        'geometry': {'units': 'metres', 'up': 'Z (Blender source); Y in GLB and game', 'front': '-Y (Blender source); +Z in GLB and game',
                     'origin': 'centre of the footprint, on the ground', 'dimensions_m': stats.get('dimensions_m'),
                     'triangles': tris, 'materials': materials, 'parts': hierarchy},
        'states': variants,
        'validation': {'outline_iou': score.get('mean_iou'), 'hero_iou': hero, 'per_view': {k: v.get('iou') for k, v in score.items() if isinstance(v, dict) and 'iou' in v},
                       'triangle_budget': budget, 'within_budget': (tris <= budget) if tris else None,
                       'good': notes.get('good', []), 'off': notes.get('off', [])},
        'exports': exports,
        'files': {f'{name}.glb': {'sha256': h, 'bytes': os.path.getsize(glb)}},
        'source': {'repo': 'evanrobinson2/abbiesworld_ios', 'commit': commit, 'path': f'tools/ranch-rebuild/models/{name}'},
        'rights': 'Original work for Abbie\'s World. Concept art generated on Evan\'s Midjourney account; geometry generated procedurally, no third-party meshes or textures.',
        'change_requests': old.get('change_requests', []),
        'lineage': lineage,
    }


if __name__ == '__main__':
    names = sys.argv[1:]
    if names == ['all']:
        names = sorted(d for d in os.listdir(os.path.join(HERE, 'models')) if os.path.exists(os.path.join(HERE, 'models', d, f'{d}.glb')))
    for n in names:
        m = build(n)
        json.dump(m, open(os.path.join(HERE, 'models', n, 'asset.json'), 'w'), indent=1, ensure_ascii=False)
        print(n, 'v', m['version'], m['geometry']['triangles'], m['validation']['outline_iou'], m['validation']['hero_iou'])
