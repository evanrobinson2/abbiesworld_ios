"""Round 2 of progressive contouring: parts first.

Carving alone cannot split an arm that touches the body in every view. So a skeleton (joint pixels read from the
front and side views, the same landmarks as the anatomy check) splits the carved volume: every voxel goes to its
nearest bone, scaled by that bone's thickness. Each part is then contoured on its own (horizontal slices, each piece
cut to a superellipse that keeps its silhouette and drops the corners no view saw), smoothed along its length so the
slices don't band, and the parts are joined and re-meshed into one skin with big flat facets.

python3 parts.py --stage ../bruiser-study --skeleton ../turnaround-hero/skeleton.json --view ... --out DIR [--faces 2500]
"""
import argparse
import json
import math
import os

import numpy as np
from scipy import ndimage

import contour as C


def world(st, front_px, side_px):
    """Joint from its front pixel (col, row) and side pixel column: world (x, y, z). Side view is turned -90."""
    x, z = st.px_to_world(*front_px)
    y, _ = st.px_to_world(side_px, front_px[1])
    return np.array([x, y, z])


def seg_dist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def split(vol, g, bones):
    X, Y, Z = g.points()
    P = np.stack([X[vol], Y[vol], Z[vol]], 1)
    D = np.stack([seg_dist(P, b['a'], b['b']) / b['r'] for b in bones], 1)
    lab = np.full(vol.shape, -1, int); lab[vol] = D.argmin(1)
    return lab


DEPTH = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'torso-depth.json')))
_DZ = np.array(DEPTH['z_frac_depth_over_width'])


def depth_ratio(zf):
    """Torso depth over width learned from the Bruiser's Meshy body. Above the armpits Meshy's torso piece includes
    the arms, so there the ratio is held at the chest value."""
    ok = _DZ[(_DZ[:, 0] > 0.45) & (_DZ[:, 0] < 0.66)]
    return float(np.interp(min(zf, 0.66), ok[:, 0], ok[:, 1]))


def contour_part(m, g, n, torso=False, stature=2.0):
    out = np.zeros_like(m)
    for k in range(m.shape[2]):
        for p in C.pieces(m[:, :, k]):
            q = C.superellipse_cut(p, g, n) if n else p
            if torso and q.any():
                # in the side view the hanging arms hide the belly: cap the depth from the back, by the learned ratio
                xi, yi = np.nonzero(q); W = xi.max() - xi.min() + 1
                D = int(round(depth_ratio(g.zs[k] / stature) * W)); y1 = yi.max()
                q[:, : max(0, y1 - D + 1)] = False
            out[:, :, k] |= q if q.any() else p
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stage', required=True); ap.add_argument('--skeleton', required=True)
    ap.add_argument('--view', action='append', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--slack', type=int, default=2); ap.add_argument('--faces', type=int, default=2500)
    ap.add_argument('--smooth', type=float, default=1.3)
    ap.add_argument('--sides', type=int, default=8)
    a = ap.parse_args()
    st = C.load_stage(a.stage)
    views = []
    for v in a.view:
        name, turn, path = v.split(':', 2); views.append((name, float(turn), path))
    sk = json.load(open(a.skeleton))
    J = {k: world(st, v['front'], v['side']) for k, v in sk['joints'].items()}
    bones = [dict(name=b[0], a=J[b[1]], b=J[b[2]], r=b[3], n=b[4]) for b in sk['bones']]
    os.makedirs(a.out, exist_ok=True)
    g = C.Grid(0.01)
    hull = C.carve(st, g, views, a.slack)
    lab = split(hull, g, bones)
    field = np.zeros(hull.shape, float); report = []
    for i, b in enumerate(bones):
        m = lab == i
        if not m.any():
            continue
        c = contour_part(m, g, b['n'], torso=b['name'] in ('torso', 'chest'))
        f = ndimage.gaussian_filter(c.astype(float), a.smooth)       # smooth along the part: no slice banding
        field = np.maximum(field, f)
        report.append(dict(part=b['name'], voxels=int(m.sum()), kept=round(float(c.sum() / max(m.sum(), 1)), 3)))
    vol = field > 0.5
    by_bone = {}
    for i, b in enumerate(bones):
        by_bone[b['name']] = (ndimage.gaussian_filter(contour_part(lab == i, g, b['n'], torso=b['name'] in ('torso', 'chest')).astype(float), a.smooth) > 0.5)
    groups = {gname: np.any([by_bone[n] for n in names if n in by_bone], 0) for gname, names in GROUPS.items()}
    spec = to_spec(groups, g, 'Turnaround Hero, progressive contouring (no Meshy)')
    json.dump(spec, open(os.path.join(a.out, 'spec.json'), 'w'), indent=0)
    lp_faces = build_lowpoly(spec, os.path.join(a.out, 'lowpoly.glb'), sides=a.sides)
    scores = {name: round(C.iou(C.silhouette(st, g, vol, turn), C.load_mask(path, 512, 0)), 4) for name, turn, path in views}
    faces = C.remesh(vol, g, os.path.join(a.out, 'body.glb'), target_faces=a.faces)
    res = dict(views=scores, faces=faces, lowpoly_faces=lp_faces, parts=report, joints={k: [round(float(t), 3) for t in v] for k, v in J.items()})
    json.dump(res, open(os.path.join(a.out, 'result.json'), 'w'), indent=1)
    print(json.dumps(dict(views=scores, faces=faces, lowpoly_faces=lp_faces)))



GROUPS = {'torso': ('neck', 'torso', 'chest'), 'head': ('head',),
          'arm_R': ('upperarm_R', 'forearm_R'), 'hand_R': ('hand_R',), 'arm_L': ('upperarm_L', 'forearm_L'), 'hand_L': ('hand_L',),
          'leg_R': ('thigh_R', 'shin_R'), 'leg_L': ('thigh_L', 'shin_L'), 'foot_R': ('foot_R',), 'foot_L': ('foot_L',)}


def to_spec(parts_vol, g, title, sides=32):
    """Each contoured part as a stack of rings (the learn.py spec format), so figure.py lofts it at any fidelity and
    edit.py can change it by body words."""
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bruiser-study', 'scale'))
    from learn import ring_of
    parts = []
    for name, m in parts_vol.items():
        rings = []
        for k in range(1, m.shape[2], 2):                       # every 2 cm, like the Meshy spec
            ps = C.pieces(m[:, :, k])
            if not ps:
                continue
            p = max(ps, key=lambda q: q.sum())
            if p.sum() < 4:
                continue
            edge = p & ~ndimage.binary_erosion(p)
            xi, yi = np.nonzero(edge)
            r = ring_of(np.c_[g.xs[xi], g.ys[yi]], sides)
            if r:
                rings.append(dict(r, z=round(float(g.zs[k]), 4)))
        if len(rings) >= 2:
            parts.append(dict(name=name, z0=rings[0]['z'], z1=rings[-1]['z'], rings=rings))
    return dict(title=title, source='contour', picture_turn=0.0, note='Rings read from the contoured parts (no Meshy).',
                height=float(max(p['z1'] for p in parts)), dz=0.02, sides=sides, parts=parts)


def build_lowpoly(spec, out_glb, sides=8, step=2, briefs=(0.93, 1.13)):
    """Loft the spec with the Bruiser scale builder; everything grey clay, the briefs a slightly darker clay."""
    import sys
    import bpy
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bruiser-study', 'scale'))
    import figure as F
    F.SHORTS_Z = briefs
    F.role = lambda part, z, x, y, cy: 'Shorts' if (briefs[0] < z < briefs[1] and not part.startswith(('arm', 'hand'))) else 'Skin'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = F.build(spec, sides, step, 2, 0.0)
    for mat in bpy.data.materials:
        bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat.use_nodes else None
        if bsdf:
            g = 0.30 if 'hort' in mat.name else 0.36
            bsdf.inputs['Base Color'].default_value = (g, g, g * 0.97, 1)
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=True)
    return sum(len(o.data.polygons) for o in objs)


if __name__ == '__main__':
    main()
