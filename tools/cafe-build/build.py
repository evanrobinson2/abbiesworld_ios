"""Build café assets: `python build.py [id ...] [--no-render] [--samples N]`, or `python build.py --list`.

For each asset it rebuilds from nothing, weighs every part, exports
  prototypes/ranch-atelier/dist/models/cafe-<id>/model.glb   (the game/viewer file, extras carry physics and joints)
  prototypes/ranch-atelier/dist/models/cafe-<id>/render.jpg  (3/4 Cycles preview)
and writes the asset's record (intent, real-world spec, parts, masses, joints, triangles) to assets/<id>/meta.json.
"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, render
import assets_backbar  # noqa: F401  (registers builders)
for m in ('assets_room', 'assets_party', 'assets_bar'):  # noqa
    try:
        __import__(m)
    except ModuleNotFoundError:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SITE = os.path.join(REPO, 'prototypes', 'ranch-atelier', 'dist', 'models')

def record(a, root, total, com, parts):
    lo, hi = kit.bounds(root)
    joints, rows = [], []
    for ob in [root] + list(root.children_recursive):
        if 'joint' in ob.keys():
            joints.append(dict(part=ob.name, **json.loads(ob['joint'])))
        if ob.type == 'MESH':
            p = json.loads(ob['physics'])
            rows.append(dict(part=ob.name, material=p['material'], mass_kg=p['mass_kg'], made=p['made']))
    return dict(id=a['id'], name=a['name'], group=a['group'], tier=a['tier'], intent=a['doc'], real=a['real'], moving=a['moving'],
                reference=a['ref'], size_m=[round(hi[i] - lo[i], 3) for i in range(3)], triangles=kit.tris(root),
                mass_kg=round(total, 3), centre_of_mass=[round(c, 3) for c in com], materials=kit.materials_used(root),
                joints=joints, parts=sorted(rows, key=lambda r: -r['mass_kg']), built=time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()))

def build(id, do_render=True, samples=32):
    a = kit.ASSETS[id]
    kit.reset()
    root = a['fn']()
    total, com, parts = kit.weigh(root)
    out = os.path.join(SITE, f'cafe-{id.replace("_", "-")}')
    kit.export(root, os.path.join(out, 'model.glb'))
    rec = record(a, root, total, com, parts)
    d = os.path.join(HERE, 'assets', id); os.makedirs(d, exist_ok=True)
    json.dump(rec, open(os.path.join(d, 'meta.json'), 'w'), indent=1)
    print(f"{id}: {rec['triangles']} tris, {rec['mass_kg']} kg, {rec['size_m']} m, {len(rec['joints'])} joints")
    if do_render:
        png = os.path.join(out, 'render.png')
        render.hero(root, png, samples=samples, **a.get('cam', {}))
        from PIL import Image
        Image.open(png).convert('RGB').save(os.path.join(out, 'render.jpg'), quality=88); os.remove(png)
    return rec

if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    if '--list' in sys.argv:
        for k, a in kit.ASSETS.items():
            print(k, '|', a['group'], '|', a['tier'])
        sys.exit()
    samples = int(sys.argv[sys.argv.index('--samples') + 1]) if '--samples' in sys.argv else 32
    if '--samples' in sys.argv:
        args = [x for x in args if x != str(samples)]
    for id in (args or list(kit.ASSETS)):
        build(id, '--no-render' not in sys.argv, samples)
