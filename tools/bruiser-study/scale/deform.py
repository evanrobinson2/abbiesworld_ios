"""Edit the hero mesh itself through the learned rings: keep all of Meshy's detail, change it by name, then
make it low-poly.

python3 deform.py --spec spec_demo [--base spec] [--ratio 0.15] [--planar 0] [--tag name] [--shots]

The rings learned from the hero mesh (spec) act as a cage: every hero vertex is tied to the ring of its part at its
height, as an angle and a fraction of that ring's radius at that angle. Edits made with edit.py move and reshape the
rings (spec_demo), and every tied vertex follows, so the face, fingers and tank-top edges ride along. With the
unedited spec the mesh comes back unchanged. Then Decimate brings it to the polygon count asked for (--ratio of the
hero's triangles; --planar N merges faces within N degrees into big flat planes instead), flat shaded, with
materials named by role like figure.py.
"""
import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.dirname(HERE)
sys.path.insert(0, STUDY); sys.path.insert(0, HERE)
import numpy as np  # noqa: E402

import figure  # noqa: E402


def ring_field(part, z):
    """(cx, cy, radii) of a part's rings interpolated at heights z (array); NaN outside the part."""
    rs = part['rings']; zs = np.array([r['z'] for r in rs])
    cx = np.interp(z, zs, [r['cx'] for r in rs])
    cy = np.interp(z, zs, [r['cy'] for r in rs])
    R = np.array([r['r'] for r in rs])
    rad = np.stack([np.interp(z, zs, R[:, i]) for i in range(R.shape[1])], 1)
    return cx, cy, rad


def radius_at(rad, ang):
    """Radius of each row's ring at angle ang (periodic linear interpolation over its points)."""
    n = rad.shape[1]; f = (ang % (2 * math.pi)) / (2 * math.pi) * n
    i0 = np.floor(f).astype(int) % n; i1 = (i0 + 1) % n; t = f - np.floor(f)
    rows = np.arange(len(rad))
    return rad[rows, i0] * (1 - t) + rad[rows, i1] * t


def bind(base, V, dz):
    """For each vertex: the part it belongs to (index), its angle and its radius fraction there."""
    best = np.full(len(V), np.inf); who = np.full(len(V), -1); ang_b = np.zeros(len(V)); frac_b = np.zeros(len(V))
    for k, p in enumerate(base['parts']):
        z = np.clip(V[:, 2], p['rings'][0]['z'] - dz, p['rings'][-1]['z'] + dz)
        inside = (V[:, 2] >= p['rings'][0]['z'] - dz) & (V[:, 2] <= p['rings'][-1]['z'] + dz)
        cx, cy, rad = ring_field(p, z)
        ang = np.arctan2(V[:, 1] - cy, V[:, 0] - cx)
        frac = np.hypot(V[:, 0] - cx, V[:, 1] - cy) / np.maximum(radius_at(rad, ang), 1e-4)
        score = np.where(inside, frac, np.inf)
        take = score < best
        best[take] = score[take]; who[take] = k; ang_b[take] = ang[take]; frac_b[take] = frac[take]
    return who, ang_b, frac_b


def pose(edit, who, ang, frac, V, dz):
    out = V.copy()
    for k, p in enumerate(edit['parts']):
        sel = who == k
        if not sel.any():
            continue
        z = np.clip(V[sel, 2], p['rings'][0]['z'] - dz, p['rings'][-1]['z'] + dz)
        cx, cy, rad = ring_field(p, z)
        r = radius_at(rad, ang[sel]) * frac[sel]
        out[sel, 0] = cx + r * np.cos(ang[sel]); out[sel, 1] = cy + r * np.sin(ang[sel])
    return out


def main():
    import bpy
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', default='spec'); ap.add_argument('--base', default='spec')
    ap.add_argument('--ratio', type=float, default=0.15); ap.add_argument('--planar', type=float, default=0)
    ap.add_argument('--tag', default=None); ap.add_argument('--shots', action='store_true')
    ap.add_argument('--res', type=int, default=384)
    a = ap.parse_args()
    base = json.load(open(os.path.join(HERE, a.base, 'spec.json')))
    edit = json.load(open(os.path.join(HERE, a.spec, 'spec.json')))
    tag = a.tag or f'cage_{a.spec}_r{a.ratio:g}' + (f'_p{a.planar:g}' if a.planar else '')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    hero_path = os.path.join(HERE, base['source'])
    bpy.ops.import_scene.gltf(filepath=hero_path)
    o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
    o.data.transform(o.matrix_world); o.matrix_world = o.matrix_world.__class__.Identity(4)
    if o.parent:
        o.parent = None
    # Meshy splits vertices along texture seams; weld them so decimation can't open cracks
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    V = np.array([v.co[:] for v in o.data.vertices])
    who, ang, frac = bind(base, V, base['dz'])
    P = pose(edit, who, ang, frac, V, base['dz'])
    for v, p in zip(o.data.vertices, P):
        v.co = p
    o.data.update()
    # simplify: fewer, bigger planes
    m = o.modifiers.new('decimate', 'DECIMATE')
    if a.planar:
        m.decimate_type = 'DISSOLVE'; m.angle_limit = math.radians(a.planar)
    else:
        m.ratio = a.ratio
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=m.name)
    # materials by role, as figure.py names them
    import bkit as k
    import kit
    o.data.materials.clear()
    order = ['Skin', 'TankTop', 'Shorts']
    for nm in order:
        o.data.materials.append(kit._material({'Skin': k.SKIN, 'TankTop': k.TANK_TOP, 'Shorts': k.SHORTS}[nm]))
    parts = edit['parts']
    for f in o.data.polygons:
        f.use_smooth = False
        c = f.center
        # nearest part by height band and x, enough to pick a role
        pn = 'torso'
        for p in parts:
            if p['z0'] - 0.01 <= c.z <= p['z1'] + 0.01 and p['name'] != 'torso':
                cx, cy, rad = ring_field(p, np.array([c.z]))
                if not np.isnan(cx[0]) and math.hypot(c.x - cx[0], c.y - cy[0]) < np.nanmax(rad) * 1.15:
                    pn = p['name']; break
        f.material_index = order.index(figure.role(pn, c.z, c.x, c.y, -0.0))
    o.name = 'bruiser'
    out = os.path.join(HERE, 'out', tag); os.makedirs(out, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'model.glb'), export_format='GLB', use_selection=True)
    info = dict(tag=tag, spec=a.spec, base=a.base, ratio=a.ratio, planar=a.planar, faces=len(o.data.polygons),
                bound=int((who >= 0).sum()), unbound=int((who < 0).sum()))
    if a.shots:
        hero_turn = edit.get('picture_turn', 0.0)
        im = figure.sheet(tag, [o], hero_path, hero_turn, a.res, picture=edit.get('picture', 'ref/bruiser.png'))
        info['iou_vs_hero'] = dict(figure.SCORES); info['iou_mean'] = round(float(np.mean(list(figure.SCORES.values()))), 4)
        from PIL import ImageDraw
        ImageDraw.Draw(im).text((8, a.res + 24), 'IoU vs hero ' + ' '.join(f'{k} {v:.3f}' for k, v in figure.SCORES.items()), fill=(20, 20, 20))
        im.save(os.path.join(out, 'shots.png'))
        shots = os.path.join(HERE, 'shots'); n = len([f for f in os.listdir(shots) if f.endswith('.png')])
        im.save(os.path.join(shots, f'{n:03d}_{tag}.png')); info['shot'] = f'shots/{n:03d}_{tag}.png'
    json.dump(info, open(os.path.join(out, 'info.json'), 'w'), indent=1)
    print(json.dumps(info))


if __name__ == '__main__':
    main()
