"""Learn a figure spec from a hero mesh (Meshy): mesh -> named parts as stacks of rings -> spec.json + spec.md.

python3 learn.py [--src ../meshy/canonical/meshy_canonical.glb] [--dz 0.02] [--sides 12] [--out spec]

The hero mesh must already sit in the study frame, square to the camera (facing -Y, feet on z = 0, 2.0 m tall):
`FIXED_TURN=0 python3 align_meshy.py meshy/bruiser_meshy.glb` gives that. Every dz of height the mesh is cut by a
horizontal plane; each separate piece of the cut (torso, arm, leg, finger) becomes a ring of `sides` points, its
radius at each angle read from the cut. Pieces are tracked up the body into chains, and chains are named by where they
sit (leg_R, leg_L, arm_R, arm_L, torso, hand pieces). His right is -x.

spec.json is the recipe: figure.py builds Blender geometry from it at any fidelity. spec.md says the same thing in
words (heights, widths, depths per part) so a person or a model can read it and ask for changes by name.
"""
import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import numpy as np  # noqa: E402


def load_tris(path):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.view_layer.update()
    tris = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        me = o.data; me.calc_loop_triangles()
        co = np.array([tuple(o.matrix_world @ v.co) for v in me.vertices])
        idx = np.array([t.vertices[:] for t in me.loop_triangles])
        tris.append(co[idx])
    return np.concatenate(tris)


def cut_segments(tris, z):
    """Line segments where triangles cross the plane z, as (m, 2, 2) arrays of (x, y) end points."""
    zs = tris[..., 2]
    hit = (zs.min(1) < z) & (zs.max(1) > z)
    segs = []
    for t in tris[hit]:
        pts = []
        for i in range(3):
            a, b = t[i], t[(i + 1) % 3]
            if (a[2] - z) * (b[2] - z) < 0:
                f = (z - a[2]) / (b[2] - a[2]); pts.append(a[:2] + f * (b[:2] - a[:2]))
        if len(pts) == 2:
            segs.append(pts)
    return np.array(segs)


def pieces(segs, link=0.012):
    """Group cut segments into separate closed pieces (segments that touch belong together)."""
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    from scipy.spatial import cKDTree
    if len(segs) == 0:
        return []
    ends = segs.reshape(-1, 2)
    pairs = cKDTree(ends).query_pairs(link, output_type='ndarray')
    n = len(segs)
    rows = np.r_[pairs[:, 0] // 2, np.arange(n)]; cols = np.r_[pairs[:, 1] // 2, np.arange(n)]
    k, lab = connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)))
    return [ends.reshape(-1, 2, 2)[lab == i].reshape(-1, 2) for i in range(k)]


def ring_of(pts, sides):
    """A star-shaped ring around the piece's centre: at each of `sides` angles, the farthest cut point near it."""
    c = pts.mean(0); d = pts - c
    ang = np.arctan2(d[:, 1], d[:, 0]); rad = np.hypot(d[:, 0], d[:, 1])
    a = np.arange(sides) * 2 * math.pi / sides
    r = np.full(sides, np.nan)
    half = math.pi / sides
    for i, ai in enumerate(a):
        sel = np.abs((ang - ai + math.pi) % (2 * math.pi) - math.pi) <= half
        if sel.any():
            r[i] = rad[sel].max()
    if np.isnan(r).all():
        return None
    good = ~np.isnan(r)
    r = np.interp(a, a[good], r[good], period=2 * math.pi)
    return dict(cx=float(c[0]), cy=float(c[1]), r=[round(float(v), 4) for v in r])


def track(slices, max_jump=0.07):
    """Link pieces slice to slice (nearest centre) into chains; a chain ends where its piece merges or vanishes."""
    chains, open_ = [], []
    for z, rings in slices:
        used, nxt = set(), []
        for ch in open_:
            last = ch['rings'][-1]
            best, bd = None, max_jump
            for j, rg in enumerate(rings):
                if j in used:
                    continue
                dd = math.hypot(rg['cx'] - last['cx'], rg['cy'] - last['cy'])
                if dd < bd:
                    best, bd = j, dd
            if best is None:
                chains.append(ch)
            else:
                used.add(best); ch['rings'].append(dict(rings[best], z=round(z, 4))); nxt.append(ch)
        for j, rg in enumerate(rings):
            if j not in used:
                nxt.append(dict(rings=[dict(rg, z=round(z, 4))]))
        open_ = nxt
    return chains + open_


def name_chains(chains):
    """Name chains by where they sit. His right is -x."""
    out = []
    for ch in chains:
        zs = [r['z'] for r in ch['rings']]; xs = [r['cx'] for r in ch['rings']]
        z0, z1, xm = min(zs), max(zs), float(np.mean(xs))
        side = 'R' if xm < 0 else 'L'
        size = max(max(r['r']) for r in ch['rings'])
        if len(ch['rings']) < 2 or size < 0.004:
            continue
        if z1 > 1.85:
            nm = 'torso'
        elif z0 < 0.05:
            nm = f'leg_{side}'
        elif abs(xm) > 0.22 and z1 > 1.2:
            nm = f'arm_{side}'
        elif abs(xm) > 0.22:
            nm = f'hand_{side}'
        else:
            nm = 'piece'
        out.append(dict(name=nm, z0=z0, z1=z1, rings=ch['rings']))
    counts = {}
    for c in sorted(out, key=lambda c: -len(c['rings'])):
        k = c['name']; counts[k] = counts.get(k, 0) + 1
        if counts[k] > 1:
            c['name'] = f'{k}_{counts[k]}'
    return out


def words(spec):
    """spec.md: the same figure in words, per part, at a few heights."""
    lines = [f"# {spec['title']}", '', spec['note'], '',
             f"Height {spec['height']:.2f} m. Cut every {spec['dz'] * 100:.0f} cm, {spec['sides']} points per ring. "
             'Width is across the body (x), depth is front to back (y); his right is -x, his front is -y.', '']
    for p in spec['parts']:
        if p['name'].startswith('piece'):
            continue
        lines.append(f"## {p['name']} (z {p['z0']:.2f} to {p['z1']:.2f} m, {len(p['rings'])} rings)")
        rs = p['rings']; idx = sorted(set(np.linspace(0, len(rs) - 1, min(6, len(rs))).round().astype(int)))
        for i in idx:
            r = rs[i]; a = np.arange(spec['sides']) * 2 * math.pi / spec['sides']; rr = np.array(r['r'])
            x = r['cx'] + rr * np.cos(a); y = r['cy'] + rr * np.sin(a)
            lines.append(f"- z {r['z']:.2f}: width {x.max() - x.min():.3f}, depth {y.max() - y.min():.3f}, "
                         f"centre x {r['cx']:+.3f} y {r['cy']:+.3f}")
        lines.append('')
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.path.join(HERE, '..', 'meshy', 'canonical', 'meshy_canonical.glb'))
    ap.add_argument('--dz', type=float, default=0.02)
    ap.add_argument('--sides', type=int, default=32)
    ap.add_argument('--out', default='spec')
    a = ap.parse_args()
    tris = load_tris(a.src)
    top = float(tris[..., 2].max())
    cuts = [(float(z), [p for p in pieces(cut_segments(tris, z)) if len(p) >= 6]) for z in np.arange(a.dz / 2, top, a.dz)]
    def run(split=None):
        slices = []
        for z, ps in cuts:
            if split and z > split['z']:
                # above the armpits, the arms' deltoids are fused to the chest in the cut: split them off at the
                # x where each arm's top ring had its inner edge, so the arms carry on up to the shoulder top
                ps2 = []
                for p in ps:
                    for sel in (p[:, 0] < split['R'], (p[:, 0] >= split['R']) & (p[:, 0] <= split['L']), p[:, 0] > split['L']):
                        if sel.sum() >= 6:
                            ps2.append(p[sel])
                ps = ps2
            rings = [ring_of(p, a.sides) for p in ps]
            slices.append((z, [r for r in rings if r]))
        return name_chains(track(slices))
    parts = run()
    arms = {p['name'][-1]: p for p in parts if p['name'] in ('arm_R', 'arm_L')}
    if len(arms) == 2:
        def inner(p, side):
            r = p['rings'][-1]; rr = np.array(r['r']); ang = np.arange(len(rr)) * 2 * math.pi / len(rr)
            x = r['cx'] + rr * np.cos(ang)
            return float(x.max() if side == 'R' else x.min())
        split = dict(z=min(arms['R']['z1'], arms['L']['z1']), R=inner(arms['R'], 'R'), L=inner(arms['L'], 'L'))
        parts = run(split)
    spec = dict(title='Bruiser, learned from the Meshy hero mesh', source=os.path.relpath(a.src, HERE),
                note='Each part is a stack of horizontal rings read from the hero mesh. Edit by name with edit.py; '
                     'build with figure.py.', height=top, dz=a.dz, sides=a.sides, parts=parts)
    out = os.path.join(HERE, a.out); os.makedirs(out, exist_ok=True)
    json.dump(spec, open(os.path.join(out, 'spec.json'), 'w'), indent=0)
    open(os.path.join(out, 'spec.md'), 'w').write(words(spec))
    print(json.dumps({p['name']: [round(p['z0'], 2), round(p['z1'], 2), len(p['rings'])] for p in parts}))


if __name__ == '__main__':
    main()
