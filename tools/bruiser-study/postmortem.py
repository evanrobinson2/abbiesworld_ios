"""Where did each build differ from the Meshy body? Region by region, in centimetres.

python3 postmortem.py A B C D1 D2 D3 E F G   -> postmortem/regions.json, postmortem/regions.md

Every arm's assembled model (runs/<arm>/out/all/model.glb, built square to the camera) and the Meshy body
(meshy/canonical/meshy_canonical.glb, also square) sit in the same frame. Each Meshy vertex is named by body region
(the learned rings in scale/spec give its part; scale/edit.py's REGIONS give the band), and for each region we read:
  - gap: mean distance from Meshy's surface to the nearest point of ours (cm): how far off the shape is
  - signed: + where ours sticks out past Meshy, - where ours falls short (cm), along Meshy's normal
  - width / depth: our region's x and y extent minus Meshy's (cm)
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, 'scale'))
import numpy as np  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402

import deform  # noqa: E402
from edit import REGIONS  # noqa: E402

BANDS = ['head', 'neck', 'chest', 'belly', 'hips', 'deltoid', 'upper arm', 'forearm', 'hand', 'thigh', 'shin', 'foot']


def load(path, weld=True, stature=None):
    """Vertices, normals and dense surface samples of a GLB, in world space."""
    import bpy
    import bmesh
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    bm = bmesh.new()
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.name.lower().startswith('floor'):
            continue
        me = o.data.copy(); me.transform(o.matrix_world)
        bm.from_mesh(me)
    if weld:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    V = np.array([v.co[:] for v in bm.verts]); N = np.array([v.normal[:] for v in bm.verts])
    # surface samples: triangle centres plus vertices, so big flat faces are covered too
    T = np.array([[l.vert.co[:] for l in t] for t in bm.calc_loop_triangles()])
    bm.free()
    if stature:   # a build made at another scale (R5 is 1.77 m): stand it at Meshy's height so shape, not size, is compared
        k = stature / V[:, 2].max(); V = V * k; T = T * k
    S = np.concatenate([V, T.mean(1), (T[:, 0] + T[:, 1]) / 2, (T[:, 1] + T[:, 2]) / 2, (T[:, 2] + T[:, 0]) / 2])
    return V, N, S


def glb(arm):
    """An arm's model: G is the cage on Meshy, R5 the round-5 MPFB fit (recipe/brute1), else runs/<arm>."""
    return {'G': os.path.join(HERE, 'scale', 'out', 'cage_identity_r0.1_welded', 'model.glb'),
            'R5': os.path.join(HERE, 'recipe', 'brute1', 'out', 'model.glb')}.get(
        arm, os.path.join(HERE, 'runs', arm, 'out', 'all', 'model.glb'))


def region_of(spec, V):
    """Body-region name for each Meshy vertex (part from the rings, band from the height)."""
    who, _, _ = deform.bind(spec, V, spec['dz'])
    names = np.array(['' for _ in V], dtype=object)
    for i, (p, z) in enumerate(zip(who, V[:, 2])):
        part = spec['parts'][p]['name'] if p >= 0 else ''
        base = 'torso' if part == 'torso' else 'arm' if part.startswith(('arm', 'hand')) else 'leg' if part.startswith('leg') else ''
        side = '' if base == 'torso' else ('R' if V[i, 0] < 0 else 'L')
        for b in BANDS:
            rb, z0, z1 = REGIONS[b]
            if rb == base and z0 <= z < z1:
                names[i] = b + (f' {side}' if side else ''); break
    return names


def main():
    arms = sys.argv[1:] or ['A', 'B', 'C', 'D1', 'D2', 'D3', 'E', 'F', 'G']
    spec = json.load(open(os.path.join(HERE, 'scale', 'spec', 'spec.json')))
    MV, MN, _ = load(os.path.join(HERE, 'meshy', 'canonical', 'meshy_canonical.glb'))
    names = region_of(spec, MV)
    regs = [r for r in dict.fromkeys(names) if r]
    out = {}
    for arm in arms:
        path = glb(arm)
        if not os.path.exists(path):
            continue
        _, _, S = load(path, weld=False, stature=2.0 if arm == 'R5' else None)
        d, j = cKDTree(S).query(MV)
        signed = np.einsum('ij,ij->i', S[j] - MV, MN)
        # ours -> Meshy too, so extra bulk where Meshy has none (a fat belly, a crotch lump) also counts
        d2, j2 = cKDTree(MV).query(S)
        sgn2 = np.einsum('ij,ij->i', S - MV[j2], MN[j2])
        r = {}
        for reg in regs:
            m = names == reg
            r[reg] = dict(gap=round(float(d[m].mean() * 100), 1), p90=round(float(np.percentile(d[m], 90) * 100), 1),
                          signed=round(float(signed[m].mean() * 100), 1))
        r['_all'] = dict(gap=round(float(d.mean() * 100), 2), extra=round(float(np.mean(np.clip(sgn2, 0, None)) * 100), 2),
                         chamfer=round(float((d.mean() + d2.mean()) / 2 * 100), 2))
        out[arm] = r
        print(arm, r['_all'])
    os.makedirs(os.path.join(HERE, 'postmortem'), exist_ok=True)
    json.dump(dict(note=__doc__.strip(), regions=regs, arms=out), open(os.path.join(HERE, 'postmortem', 'regions.json'), 'w'), indent=1)



def facing():
    """Is the shortfall in width (faces pointing sideways) or depth (faces pointing front/back)?"""
    spec = json.load(open(os.path.join(HERE, 'scale', 'spec', 'spec.json')))
    MV, MN, _ = load(os.path.join(HERE, 'meshy', 'canonical', 'meshy_canonical.glb'))
    side = np.abs(MN[:, 0]) > np.abs(MN[:, 1]) + 0.2
    deep = np.abs(MN[:, 1]) > np.abs(MN[:, 0]) + 0.2
    res = {}
    for arm in sys.argv[2:]:
        _, _, S = load(glb(arm), weld=False, stature=2.0 if arm == 'R5' else None)
        _, j = cKDTree(S).query(MV)
        s = np.einsum('ij,ij->i', S[j] - MV, MN)
        res[arm] = dict(width=round(float(s[side].mean() * 100), 1), depth=round(float(s[deep].mean() * 100), 1))
        print(arm, res[arm])
    json.dump(res, open(os.path.join(HERE, 'postmortem', 'facing.json'), 'w'), indent=1)



def heatmap(arms):
    """Meshy's body painted by how far each build is from it: blue = ours falls short, red = ours sticks out."""
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MV, MN, _ = load(os.path.join(HERE, 'meshy', 'canonical', 'meshy_canonical.glb'))
    fig, axs = plt.subplots(1, 2 * len(arms), figsize=(3.0 * len(arms), 3.4), facecolor='white', sharey=True)
    for k, arm in enumerate(arms):
        _, _, S = load(glb(arm), weld=False, stature=2.0 if arm == 'R5' else None)
        _, j = cKDTree(S).query(MV)
        s = np.einsum('ij,ij->i', S[j] - MV, MN) * 100
        for v, (a, b, front) in enumerate([(0, 2, True), (1, 2, False)]):
            ax = axs[2 * k + v]
            # draw the near side last so it covers the far side
            o = np.argsort(-MV[:, 1]) if front else np.argsort(MV[:, 0])
            ax.scatter(MV[o, a] * (1 if front else -1), MV[o, b], c=s[o], cmap='RdBu_r',
                       vmin=-6, vmax=6, s=1.4, linewidths=0)
            ax.set_xlim(-0.75, 0.75); ax.set_aspect('equal'); ax.axis('off')
            ax.set_title(f'{arm} {"front" if front else "side"}', fontsize=10)
    fig.subplots_adjust(wspace=0, left=0, right=1, top=0.9, bottom=0.08)
    fig.text(0.5, 0.01, 'blue = ours falls short of Meshy, red = ours sticks out (±6 cm)', ha='center', fontsize=9)
    out = os.path.join(HERE, 'postmortem', 'heatmap.png')
    fig.savefig(out, dpi=150, bbox_inches='tight'); print(out)


if __name__ == '__main__':
    {'facing': facing, 'heatmap': lambda: heatmap(sys.argv[2:])}.get(sys.argv[1] if sys.argv[1:] else '', main)()
