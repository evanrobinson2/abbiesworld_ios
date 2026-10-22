"""Compose the warrior from parts: the hybrid body plus the separately fitted props, each snapped to its socket.
usage: python compose.py warrior_params.json PROPS_DIR OUTDIR [fit file name, default fit.json]
Each prop is rebuilt from its fitted shape, re-centred in its own frame, then scaled and oriented to the body's joints.
Writes composed.png (reference camera), views.png (four turns), one GLB per prop (origin at its socket), composed.glb
and compose.json (sockets, transforms, hashes).
"""
import sys, os, json, math, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import numpy as np
from mathutils import Vector as V, Matrix
import build, props, paper

wp = json.load(open(sys.argv[1])); pdir = sys.argv[2]; od = sys.argv[3]; fitname = sys.argv[4] if len(sys.argv) > 4 else 'fit.json'
os.makedirs(od, exist_ok=True)
W = H = 1024
J = lambda n: build.J(wp, n)
R = lambda n: wp['radii'][n]

def bbox(ob):
    a = np.array([v.co[:] for v in ob.data.vertices]); return a.min(0), a.max(0)

def recentre(ob):
    """Move the object so its footprint centre is at the origin and its lowest point at z=0."""
    lo, hi = bbox(ob); c = (lo + hi) / 2
    ob.data.transform(Matrix.Translation(V((-c[0], -c[1], -lo[2]))))
    return hi - lo

def align(src, dst):
    """Rotation taking unit vector src to dst."""
    return V(src).normalized().rotation_difference(V(dst).normalized()).to_matrix().to_4x4()

def scale3(sx, sy, sz):
    return Matrix.Diagonal(V((sx, sy, sz, 1.0)))

# ------------------------------------------------------------------ the body, minus the parts the props replace
parts = build.setup(wp, level=2, W=W, H=H, with_stage=True)
fig = wp['fig']
FIG = Matrix.Translation(V((fig['x'], fig['y'], 0))) @ Matrix.Rotation(math.radians(fig['yaw']), 4, 'Z') @ Matrix.Scale(fig['scale'], 4)
REPLACED = {'shoulder_guards': 'pauldrons', 'bands': 'greaves and sandals'}
keep = []
for ob in parts:
    if ob.name in REPLACED: bpy.data.objects.remove(ob, do_unlink=True)
    else: keep.append(ob)
mat = keep[0].data.materials[0]
# body vertices back in figure-local space, so props can be sized to wrap the actual mesh, not the joint radii
_FI = FIG.inverted()
BV = np.array([(_FI @ v.co)[:] for v in keep[0].data.vertices])

def slab(z0, z1, xmax=1e9):
    m = (BV[:, 2] > z0) & (BV[:, 2] < z1) & (np.abs(BV[:, 0]) < xmax)
    return BV[m]

def limb_radius(a, b, q=92, rmax=0.2):
    """Radius of the body mesh around segment a-b (a high percentile of the perpendicular distance)."""
    a, b = np.array(a[:]), np.array(b[:]); d = b - a; L = np.linalg.norm(d); d /= L
    t = (BV - a) @ d; m = (t > 0.15 * L) & (t < 0.85 * L)
    perp = (BV[m] - a) - np.outer(t[m], d)
    r = np.linalg.norm(perp, axis=1); r = r[r < rmax]
    return float(np.percentile(r, q)) if len(r) else 0.06

def load_prop(name):
    p = json.load(open(os.path.join(pdir, name, fitname)))
    return props.BUILDERS[name](p['shape']), p

placed = []   # (object, socket name, socket location in figure space, local transform)

def place(ob, socket, M):
    ob.data.transform(M)
    ob.data.transform(FIG)
    for poly in ob.data.polygons: poly.use_smooth = False
    ob.data.materials.clear(); ob.data.materials.append(mat)
    placed.append((ob, socket, FIG @ M.to_translation()))

# cuirass: from just above the skirt's waistband to the base of the neck, as wide as the shoulders
(cu,), _ = load_prop('cuirass')
size = recentre(cu)
z0, z1 = J('pelvis').z + 0.07, J('neck').z - 0.03
T = slab(z0, z1, xmax=abs(J('l_shoulder').x - J('r_shoulder').x) / 2 + 0.02)
lo_, hi_ = np.percentile(T, 2, axis=0), np.percentile(T, 98, axis=0)
width, depth = (hi_[0] - lo_[0]) * 1.12 + 0.02, (hi_[1] - lo_[1]) * 1.12 + 0.02
c = V(((lo_[0] + hi_[0]) / 2, (lo_[1] + hi_[1]) / 2, 0))
place(cu, 'chest', Matrix.Translation(V((c.x, c.y, z0))) @ scale3(width / size[0], depth / size[1], (z1 - z0) / size[2]))

# belt: hoop round the waist, sitting on the top edge of the skirt
(bt,), _ = load_prop('belt')
size = recentre(bt)
pel = J('pelvis'); Wb = slab(pel.z + 0.03, pel.z + 0.09, xmax=0.3)
lo_, hi_ = np.percentile(Wb, 2, axis=0), np.percentile(Wb, 98, axis=0)
place(bt, 'waist', Matrix.Translation(V(((lo_[0] + hi_[0]) / 2, (lo_[1] + hi_[1]) / 2, pel.z + 0.05))) @ scale3(((hi_[0] - lo_[0]) * 1.1 + 0.01) / size[0], ((hi_[1] - lo_[1]) * 1.1 + 0.01) / size[1], 1.4))

# pauldrons: one cap per shoulder, crown just above the joint, flaring down the arm
obs, _ = load_prop('pauldrons')
for ob in obs:
    side = 'r' if ob.name.endswith('_r') else 'l'
    size = recentre(ob)
    sh = J(f'{side}_shoulder'); arm = (J(f'{side}_elbow') - sh).normalized()
    ra = limb_radius(sh, J(f'{side}_elbow'), q=80, rmax=0.11)
    s = (ra * 2 * 1.6) / max(size[0], size[1])
    # cap points up; tilt it a third of the way toward the arm direction, then drop its crown onto the shoulder
    tilt = align((0, 0, 1), (V((0, 0, 1)) * 2 + V((arm.x, arm.y, 0)) * 1).normalized())
    top = V((0, 0, size[2] * s))
    place(ob, f'{side}_shoulder', Matrix.Translation(sh + V((0, 0, ra * 1.25)) - tilt @ top) @ tilt @ Matrix.Scale(s, 4))

# greaves: one shell per shin, axis from ankle to knee
obs, _ = load_prop('greaves')
for ob in obs:
    side = 'r' if ob.name.endswith('_r') else 'l'
    size = recentre(ob)
    an, kn = J(f'{side}_ankle'), J(f'{side}_knee')
    shin = kn - an; L = shin.length
    sxy = (limb_radius(an, kn) * 2 * 1.18) / min(size[0], size[1])
    Rm = align((0, 0, 1), shin)
    place(ob, f'{side}_shin', Matrix.Translation(an + shin.normalized() * 0.05) @ Rm @ scale3(sxy, sxy, L * 0.82 / size[2]))

# sandals: sole flat on the ground under each foot, toe pointing along ankle -> toe
obs, _ = load_prop('sandals')
for ob in obs:
    side = 'r' if ob.name.endswith('_r') else 'l'
    size = recentre(ob)
    an, toe = J(f'{side}_ankle'), J(f'{side}_toe')
    d = V((toe.x - an.x, toe.y - an.y, 0))
    foot_len = (d.length + R(f'{side}_ankle') * 2.5) * 1.15
    s = foot_len / size[1]
    yaw = math.atan2(d.x, -d.y)          # local toe direction is -Y
    mid = an + d * 0.45
    place(ob, f'{side}_foot', Matrix.Translation(V((mid.x, mid.y, 0.0))) @ Matrix.Rotation(-yaw, 4, 'Z') @ Matrix.Scale(s, 4))

allobs = keep + [o for o, _, _ in placed]
build.render(os.path.join(od, 'composed.png'), W, H, samples=64)
m = build.silhouette(wp, allobs, 512, 512)
from PIL import Image
Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(od, 'composed_sil.png'))

# four turns around the figure, same light
cam = bpy.context.scene.camera; base = cam.matrix_world.copy()
tgt = V((fig['x'], fig['y'], 1.0))
tiles = []
for k, a in enumerate((0, 90, 180, 270)):
    Rz = Matrix.Translation(tgt) @ Matrix.Rotation(math.radians(a), 4, 'Z') @ Matrix.Translation(-tgt)
    cam.matrix_world = Rz @ base
    pth = os.path.join(od, f'turn_{a:03d}.png'); build.render(pth, 640, 640, samples=32); tiles.append(pth)
cam.matrix_world = base
sheet = Image.new('RGB', (640 * 4, 640))
for i, t in enumerate(tiles): sheet.paste(Image.open(t).convert('RGB'), (640 * i, 0))
sheet.save(os.path.join(od, 'views.jpg'), quality=88)

# exports: each prop with its origin at its socket, plus the composed figure
def sha(path): return hashlib.sha256(open(path, 'rb').read()).hexdigest()
def export(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True)
man = dict(schemaVersion=1, character='romanPaperWarrior', composedFrom=os.path.basename(sys.argv[1]), replaced=REPLACED, props=[])
cp = os.path.join(od, 'composed.glb'); export(allobs, cp)
for ob, sock, loc in placed:
    ob.data.transform(Matrix.Translation(-loc)); ob.location = loc
    path = os.path.join(od, f'{ob.name}.glb'); export([ob], path)
    ob.data.calc_loop_triangles()
    man['props'].append(dict(part=ob.name, socket=sock, location=[round(x, 4) for x in loc], file=os.path.basename(path), triangles=len(ob.data.loop_triangles), sha256=sha(path)))
man['composed'] = dict(file='composed.glb', sha256=sha(cp))
json.dump(man, open(os.path.join(od, 'compose.json'), 'w'), indent=1)
print(json.dumps([(x['part'], x['socket'], x['triangles']) for x in man['props']]))
