"""Dress the warrior in the separately fitted props, as a drop-in for build.build_figure.

install(props_dir) swaps build.build_figure for a version that builds the body, removes the parts the props replace
(shoulder flaps, leg bands, sash), and snaps each prop onto its socket, sized to wrap the body mesh (same rules as
compose.py). p['kit'] holds per-prop size multipliers so a fit can tune how each piece sits. Everything that calls
build.setup or build.build_figure (mv_fit, mv_render) then sees the dressed figure.
"""
import os, json, math
import numpy as np
from mathutils import Vector as V, Matrix
import bpy
import build, props

REPLACED = ('shoulder_guards', 'bands', 'sash')
KIT0 = dict(cuirass=dict(w=1.0, d=1.0, h=1.0, z=0.0), belt=dict(w=1.0, z=0.0), pauldron=dict(s=1.0, drop=0.0, out=0.0),
            greave=dict(s=1.0, len=1.0), sandal=dict(s=1.0))
_orig = build.build_figure
_shapes = {}

def kit_groups():
    g = []
    for prop, d in KIT0.items():
        for k in d:
            g.append((f'kit.{prop}.{k}', 0.02 if k in ('z', 'drop', 'out') else 0.05))
    return g

def install(props_dir, fitname='fit.json'):
    for n in props.BUILDERS:
        _shapes[n] = json.load(open(os.path.join(props_dir, n, fitname)))['shape']
    build.build_figure = dressed

def _recentre(ob):
    a = np.array([v.co[:] for v in ob.data.vertices]); lo, hi = a.min(0), a.max(0); c = (lo + hi) / 2
    ob.data.transform(Matrix.Translation(V((-c[0], -c[1], -lo[2])))); return hi - lo

def _align(src, dst):
    return V(src).normalized().rotation_difference(V(dst).normalized()).to_matrix().to_4x4()

def _scale3(x, y, z):
    return Matrix.Diagonal(V((x, y, z, 1.0)))

def dressed(p, level=1, with_stage=True):
    parts = _orig(p, level, with_stage)
    K = {k: dict(v, **p.get('kit', {}).get(k, {})) for k, v in KIT0.items()}
    J = lambda n: build.J(p, n); R = lambda n: p['radii'][n]
    f = p['fig']
    FIG = Matrix.Translation(V((f['x'], f['y'], 0))) @ Matrix.Rotation(math.radians(f['yaw']), 4, 'Z') @ Matrix.Scale(f['scale'], 4)
    keep = []
    for ob in parts:
        if ob.name in REPLACED: bpy.data.objects.remove(ob, do_unlink=True)
        else: keep.append(ob)
    mat = keep[0].data.materials[0] if keep[0].data.materials else None
    FI = FIG.inverted()
    BV = np.array([(FI @ v.co)[:] for v in keep[0].data.vertices])

    def slab(z0, z1, xmax=1e9):
        m = (BV[:, 2] > z0) & (BV[:, 2] < z1) & (np.abs(BV[:, 0]) < xmax); return BV[m]

    def limb_radius(a, b, q=92, rmax=0.2):
        a, b = np.array(a[:]), np.array(b[:]); d = b - a; L = np.linalg.norm(d); d /= L
        t = (BV - a) @ d; m = (t > 0.15 * L) & (t < 0.85 * L)
        r = np.linalg.norm((BV[m] - a) - np.outer(t[m], d), axis=1); r = r[r < rmax]
        return float(np.percentile(r, q)) if len(r) else 0.06

    out = []
    def place(ob, M):
        ob.data.transform(M); ob.data.transform(FIG)
        for poly in ob.data.polygons: poly.use_smooth = False
        if mat: ob.data.materials.clear(); ob.data.materials.append(mat)
        out.append(ob)

    k = K['cuirass']; (cu,) = props.cuirass(_shapes['cuirass']); size = _recentre(cu)
    z0, z1 = J('pelvis').z + 0.07 + k['z'], J('neck').z - 0.03
    T = slab(z0, z1, xmax=abs(J('l_shoulder').x - J('r_shoulder').x) / 2 + 0.02)
    lo, hi = np.percentile(T, 2, axis=0), np.percentile(T, 98, axis=0)
    w, d = ((hi[0] - lo[0]) * 1.12 + 0.02) * k['w'], ((hi[1] - lo[1]) * 1.12 + 0.02) * k['d']
    place(cu, Matrix.Translation(V(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, z0))) @ _scale3(w / size[0], d / size[1], (z1 - z0) * k['h'] / size[2]))

    k = K['belt']; (bt,) = props.belt(_shapes['belt']); size = _recentre(bt)
    pel = J('pelvis'); Wb = slab(pel.z + 0.03, pel.z + 0.09, xmax=0.3)
    lo, hi = np.percentile(Wb, 2, axis=0), np.percentile(Wb, 98, axis=0)
    place(bt, Matrix.Translation(V(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, pel.z + 0.05 + k['z'])))
          @ _scale3(((hi[0] - lo[0]) * 1.1 + 0.01) * k['w'] / size[0], ((hi[1] - lo[1]) * 1.1 + 0.01) * k['w'] / size[1], 1.4))

    k = K['pauldron']
    for ob in props.pauldron_pair(_shapes['pauldrons']):
        side = 'r' if ob.name.endswith('_r') else 'l'; sgn = -1 if side == 'r' else 1
        size = _recentre(ob)
        sh = J(f'{side}_shoulder'); arm = (J(f'{side}_elbow') - sh).normalized()
        ra = limb_radius(sh, J(f'{side}_elbow'), q=80, rmax=0.11)
        s = (ra * 2 * 1.6) * k['s'] / max(size[0], size[1])
        tilt = _align((0, 0, 1), (V((0, 0, 1)) * 2 + V((arm.x, arm.y, 0))).normalized())
        top = V((0, 0, size[2] * s))
        place(ob, Matrix.Translation(sh + V((sgn * k['out'], 0, ra * 1.25 - k['drop'])) - tilt @ top) @ tilt @ Matrix.Scale(s, 4))

    k = K['greave']
    for ob in props.greave_pair(_shapes['greaves']):
        side = 'r' if ob.name.endswith('_r') else 'l'
        size = _recentre(ob)
        an, kn = J(f'{side}_ankle'), J(f'{side}_knee'); shin = kn - an
        sxy = (limb_radius(an, kn) * 2 * 1.18) * k['s'] / min(size[0], size[1])
        place(ob, Matrix.Translation(an + shin.normalized() * 0.05) @ _align((0, 0, 1), shin) @ _scale3(sxy, sxy, shin.length * 0.82 * k['len'] / size[2]))

    k = K['sandal']
    for ob in props.sandal_pair(_shapes['sandals']):
        side = 'r' if ob.name.endswith('_r') else 'l'
        size = _recentre(ob)
        an, toe = J(f'{side}_ankle'), J(f'{side}_toe'); dv = V((toe.x - an.x, toe.y - an.y, 0))
        s = (dv.length + R(f'{side}_ankle') * 2.5) * 1.15 * k['s'] / size[1]
        mid = an + dv * 0.45
        place(ob, Matrix.Translation(V((mid.x, mid.y, 0.0))) @ Matrix.Rotation(-math.atan2(dv.x, -dv.y), 4, 'Z') @ Matrix.Scale(s, 4))
    return keep + out
