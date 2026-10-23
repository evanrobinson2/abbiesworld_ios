"""Progressive contouring and re-meshing: picture views -> carved volume -> rounded contours -> one remeshed low-poly body.

Evan, 2026-10-23: "take the best SWE approach that we had before, mash it up with this [the Meshy learning] and
suggest a more streamlined and reliable approach ... what about progressive contouring and then re-meshing".

  1. Carve     every voxel (1 cm) that falls inside the figure's silhouette in every turnaround view survives.
  2. Contour   cut the carved volume every slice into pieces (torso, arms, legs). Carving leaves square corners where no
               view looked; each piece is rounded by a morphological opening whose radius comes from a learned table.
  3. Progress  torso out and coarse to fine: rounds run at 4, 2, then 1 cm voxels, each round seeded by the last.
  4. Re-mesh   marching cubes on the contoured volume, Blender voxel remesh to fuse it, Decimate (planar) to big facets.
  5. Score     silhouette IoU against every turnaround view (picture only), and, when an answer key exists (Meshy),
               volume IoU against it. The key is never used to build, only to learn the rounding table (`--learn`).

python3 contour.py --stage ../bruiser-study --view front:0:ref/views/mj_front_mask.png ... --out out/bruiser [--key k.glb] [--learn]
Views are TURN:DEGREES:MASK, masks in the stage's picture frame (the study camera), figure turned by DEGREES about z.
"""
import argparse
import importlib.util
import json
import math
import os
import time

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
KINDS = ('torso', 'limb')
BANDS = 20                      # rounding table: 20 height bands x {torso, limb}


def load_stage(path):
    spec = importlib.util.spec_from_file_location('stage', os.path.join(path, 'stage.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


class Grid:
    def __init__(self, vox, x=(-0.75, 0.75), y=(-0.5, 0.5), z=(0.0, 2.06)):
        self.vox = vox
        self.xs = np.arange(x[0] + vox / 2, x[1], vox)
        self.ys = np.arange(y[0] + vox / 2, y[1], vox)
        self.zs = np.arange(z[0] + vox / 2, z[1], vox)
        self.shape = (len(self.xs), len(self.ys), len(self.zs))

    def points(self):
        X, Y, Z = np.meshgrid(self.xs, self.ys, self.zs, indexing='ij')
        return X, Y, Z


def project(st, X, Y, Z, turn_deg):
    """World points of the figure turned by turn_deg about z -> picture (col, row) in the stage camera."""
    t = math.radians(turn_deg); c, s = math.cos(t), math.sin(t)
    x = X * c - Y * s; y = X * s + Y * c
    d = st.DIST + y
    col = st.IMG / 2 - st.SHIFT_X * st.IMG + x * st.F_PX / d
    row = st.IMG / 2 + st.SHIFT_Y * st.IMG - (Z - st.CAM_Z) * st.F_PX / d
    return col, row


def load_mask(path, size, slack):
    m = np.asarray(Image.open(path).convert('L').resize((size, size), Image.NEAREST)) > 127
    return ndimage.binary_dilation(m, iterations=slack) if slack else m


def carve(st, grid, views, slack):
    X, Y, Z = grid.points()
    keep = np.ones(grid.shape, bool)
    for _, turn, path in views:
        m = load_mask(path, st.IMG, slack)
        col, row = project(st, X, Y, Z, turn)
        ci = np.clip(np.round(col).astype(int), 0, st.IMG - 1); ri = np.clip(np.round(row).astype(int), 0, st.IMG - 1)
        inside = (col >= 0) & (col < st.IMG) & (row >= 0) & (row < st.IMG)
        keep &= inside & m[ri, ci]
    return keep


def silhouette(st, grid, vol, turn, size=512):
    """Where the occupied voxels land in a view (each voxel splatted to its footprint)."""
    X, Y, Z = grid.points()
    col, row = project(st, X[vol], Y[vol], Z[vol], turn)
    k = size / st.IMG; r = max(1, int(math.ceil(grid.vox * st.F_PX / st.DIST * k / 2)))
    img = np.zeros((size, size), bool)
    ci = np.round(col * k).astype(int); ri = np.round(row * k).astype(int)
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            a, b = np.clip(ri + dy, 0, size - 1), np.clip(ci + dx, 0, size - 1)
            img[a, b] = True
    return ndimage.binary_closing(img, iterations=1)


def iou(a, b):
    return float((a & b).sum() / max((a | b).sum(), 1))


def voxelize_glb(path, grid):
    """Solid voxels of the answer-key mesh: dense surface samples mark the shell, then everything not reachable
    from outside is filled."""
    import trimesh
    sc = trimesh.load(path, force='scene')
    mesh = sc.dump(concatenate=True) if hasattr(sc, 'dump') else sc
    V = np.asarray(mesh.vertices); V = np.stack([V[:, 0], -V[:, 2], V[:, 1]], -1)   # glTF Y up -> study Z up
    mesh = trimesh.Trimesh(V, mesh.faces, process=False)
    pts, _ = trimesh.sample.sample_surface(mesh, int(mesh.area / (grid.vox / 3) ** 2))
    shell = np.zeros(grid.shape, bool)
    idx = np.round((pts - [grid.xs[0], grid.ys[0], grid.zs[0]]) / grid.vox).astype(int)
    ok = np.all((idx >= 0) & (idx < grid.shape), 1); idx = idx[ok]
    shell[idx[:, 0], idx[:, 1], idx[:, 2]] = True
    shell = ndimage.binary_dilation(shell, iterations=1)          # close pinholes between samples before filling
    return ndimage.binary_erosion(ndimage.binary_fill_holes(shell), iterations=1)


def align_key(key, hull, grid):
    """Meshy was made from a different picture than the turnaround: slide it (whole voxels, x and y) onto the carve."""
    X, Y, _ = grid.points()
    dx = int(round((X[hull].mean() - X[key].mean()) / grid.vox)); dy = int(round((Y[hull].mean() - Y[key].mean()) / grid.vox))
    return np.roll(np.roll(key, dx, 0), dy, 1)


def disk(r):
    if r <= 0:
        return None
    a = np.arange(-r, r + 1)
    return (a[:, None] ** 2 + a[None, :] ** 2) <= r * r + r * 0.5


def pieces(sl):
    lab, n = ndimage.label(sl)
    return [(lab == i) for i in range(1, n + 1)]


def kind_of(piece, grid, z_frac):
    """Torso is the big middle piece; everything else (arms, legs, hands, head when split) is a limb."""
    xs = np.nonzero(piece)[0]
    xm = grid.xs[xs].mean(); area = piece.sum() * grid.vox ** 2
    return 'torso' if abs(xm) < 0.12 and area > 0.03 and z_frac > 0.45 else 'limb'


def band(z_frac):
    return min(BANDS - 1, max(0, int(z_frac * BANDS)))


SHAPES = [('op', r) for r in (0, 1, 2, 3, 4, 6)] + [('se', n) for n in (2.0, 2.5, 3.0, 4.0)]


def superellipse_cut(p, grid, n):
    """Keep the part of the piece inside the superellipse that touches its bounding box at the four mid-sides:
    the silhouettes stay, the corners no view looked at go (n = 2 is an ellipse, larger n is boxier)."""
    xi, yi = np.nonzero(p)
    cx, cy = (xi.min() + xi.max()) / 2, (yi.min() + yi.max()) / 2
    ax, ay = (xi.max() - xi.min()) / 2 + 0.5, (yi.max() - yi.min()) / 2 + 0.5
    X, Y = np.meshgrid(np.arange(p.shape[0]), np.arange(p.shape[1]), indexing='ij')
    return p & ((np.abs(X - cx) / ax) ** n + (np.abs(Y - cy) / ay) ** n <= 1.0)


def shape(p, grid, sh):
    kind, v = sh
    if kind == 'op':
        r = int(round(v / 100 / grid.vox))
        q = ndimage.binary_opening(p, disk(r)) if r else p
    else:
        q = superellipse_cut(p, grid, v)
    return q if q.any() else p


def contour(vol, grid, table=None, key=None, stature=2.0):
    """Round every piece of every slice. With a key, pick each piece's shape that best matches it and record it."""
    out = np.zeros_like(vol); seen = {}
    for k, z in enumerate(grid.zs):
        zf = z / stature
        for p in pieces(vol[:, :, k]):
            kd = kind_of(p, grid, zf); b = band(zf)
            if key is not None:
                region = ndimage.binary_dilation(p, iterations=2)
                scored = [(iou(shape(p, grid, sh), key[:, :, k] & region), sh) for sh in SHAPES]
                sh = max(scored, key=lambda t: t[0])[1]
                seen.setdefault((kd, b), {}).setdefault(f'{sh[0]}:{sh[1]}', 0)
                seen[(kd, b)][f'{sh[0]}:{sh[1]}'] += int(p.sum())
            else:
                v = (table or {}).get(f'{kd}:{b}', 'op:0'); kind_, val = v.split(':'); sh = (kind_, float(val))
            out[:, :, k] |= shape(p, grid, sh)
    learned = None
    if key is not None:
        learned = {f'{kd}:{b}': max(c.items(), key=lambda t: t[1])[0] for (kd, b), c in seen.items()}
    return out, learned


def progressive(st, views, slack, table, key_path, learn, vox_list=(0.04, 0.02, 0.01)):
    """Coarse to fine: each round carves at a finer voxel, limited to (dilated) last round's body."""
    log, prev, prev_grid = [], None, None
    for vox in vox_list:
        t0 = time.time(); g = Grid(vox)
        hull = carve(st, g, views, slack)
        if prev is not None:
            X, Y, Z = g.points()
            ix = np.clip(((X - prev_grid.xs[0]) / prev_grid.vox).round().astype(int), 0, prev_grid.shape[0] - 1)
            iy = np.clip(((Y - prev_grid.ys[0]) / prev_grid.vox).round().astype(int), 0, prev_grid.shape[1] - 1)
            iz = np.clip(((Z - prev_grid.zs[0]) / prev_grid.vox).round().astype(int), 0, prev_grid.shape[2] - 1)
            hull &= ndimage.binary_dilation(prev, iterations=1)[ix, iy, iz]
        key = align_key(voxelize_glb(key_path, g), hull, g) if key_path else None
        vol, learned = contour(hull, g, table, key if learn else None)
        if learned:
            table = {**(table or {}), **learned}
        row = dict(vox_cm=round(vox * 100), seconds=round(time.time() - t0, 1), voxels=int(vol.sum()))
        if key is not None:
            row.update(hull_vs_key=round(iou(hull, key), 4), contoured_vs_key=round(iou(vol, key), 4))
        log.append(row); print(row, flush=True)
        prev, prev_grid = vol, g
    return prev, prev_grid, table, log


def remesh(vol, grid, out_glb, voxel=0.012, planar_deg=7.0, target_faces=None):
    """Marching cubes -> Blender: voxel remesh (fuses it into one skin), Decimate planar (big flat facets)."""
    from skimage import measure
    import bpy
    pad = np.pad(vol, 2).astype(float)
    pad = ndimage.gaussian_filter(pad, 0.8)
    v, f, _, _ = measure.marching_cubes(pad, 0.5)
    v = (v - 2) * grid.vox + np.array([grid.xs[0], grid.ys[0], grid.zs[0]])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    me = bpy.data.meshes.new('Body'); me.from_pydata(v.tolist(), [], f[:, ::-1].tolist()); me.update()
    ob = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    m = ob.modifiers.new('Remesh', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.adaptivity = 0
    bpy.ops.object.modifier_apply(modifier=m.name)
    m = ob.modifiers.new('Smooth', 'CORRECTIVE_SMOOTH'); m.iterations = 6
    bpy.ops.object.modifier_apply(modifier=m.name)
    m = ob.modifiers.new('Planes', 'DECIMATE')
    if target_faces:
        m.decimate_type = 'COLLAPSE'; m.ratio = min(1.0, target_faces / max(len(ob.data.polygons), 1))
    else:
        m.decimate_type = 'DISSOLVE'; m.angle_limit = math.radians(planar_deg)
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_flat()
    mat = bpy.data.materials.new('Clay'); mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.33, 0.33, 0.32, 1)
    ob.data.materials.append(mat)
    faces = len(ob.data.polygons)
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=False)
    return faces


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stage', required=True)
    ap.add_argument('--view', action='append', default=[])
    ap.add_argument('--synth', help='comma list of turns: draw the views from the key itself (pure method test)')
    ap.add_argument('--out', required=True)
    ap.add_argument('--key'); ap.add_argument('--learn', action='store_true')
    ap.add_argument('--table', default=os.path.join(HERE, 'rounding.json'))
    ap.add_argument('--slack', type=int, default=3)
    ap.add_argument('--planar', type=float, default=7.0)
    ap.add_argument('--faces', type=int)
    a = ap.parse_args()
    st = load_stage(a.stage)
    views = []
    for v in a.view:
        name, turn, path = v.split(':', 2)
        views.append((name, float(turn), path if os.path.isabs(path) else os.path.join(a.stage, path)))
    if a.synth:
        g = Grid(0.01); key = voxelize_glb(a.key, g); os.makedirs(os.path.join(a.out, 'views'), exist_ok=True)
        for t in [float(v) for v in a.synth.split(',')]:
            p = os.path.join(a.out, 'views', f'key_{int(t)}.png')
            Image.fromarray((silhouette(st, g, key, t, st.IMG) * 255).astype(np.uint8)).save(p)
            views.append((f'key{int(t)}', t, p))
    table = None if a.learn or not os.path.exists(a.table) else json.load(open(a.table))['table']
    os.makedirs(a.out, exist_ok=True)
    vol, g, table, log = progressive(st, views, a.slack, table, a.key, a.learn)
    if a.learn:
        json.dump(dict(learned_from=a.key, note='opening radius in cm per kind:height band (20 bands of stature)', table=table),
                  open(a.table, 'w'), indent=1)
    np.save(os.path.join(a.out, 'volume.npy'), np.packbits(vol))
    scores = {}
    for name, turn, path in views:
        m = load_mask(path, 512, 0)
        scores[name] = round(iou(silhouette(st, g, vol, turn), m), 4)
    faces = remesh(vol, g, os.path.join(a.out, 'body.glb'), planar_deg=a.planar, target_faces=a.faces)
    res = dict(views=scores, rounds=log, faces=faces, slack_px=a.slack, planar_deg=a.planar)
    json.dump(res, open(os.path.join(a.out, 'result.json'), 'w'), indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
