"""potting-bench-charming: the storybook-toy twin of models/potting-bench. A chubby, soft-edged honey-oak bench: a
thick 3-board top with fat rounded edges, a drawer with a big round knob in the front apron, four stout splayed legs
with flared feet tied by an H-stretcher, two leaning back posts with rounded heads carrying an arched back rail and a
tipped pot shelf (three pots, the right one sprouting), a big leafy pot on the top's back corner, a chunky seed tray
with soil cups and a fat-handled trowel.

Same conventions, objects and materials as the normal bench (so it drops in for it): Z up, metres, origin at the
footprint centre on the ground, front (the drawer side) faces -Y; outer bounds kept at the normal bench's
width/depth ratio (about 2.2). New object: drawer (Timber_Oak); no new materials.

usage: python build.py      writes potting-bench-charming.glb (a prop: no variants, no animation)
All shape numbers live in P.
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    TOP_L=1.40,          # top length (X)
    TOP_D=0.63,          # top depth (Y)
    TOP_Z=0.80,          # top surface height
    TOP_T=0.13,          # chubby slab thickness
    BOARDS=3,            # boards across the depth, running along X
    GAP=0.012,
    BOARD_JIT=0.03,      # ragged board ends
    TOP_BEVEL=(0.040, 2),  # soft rounded board edges (offset, segments)
    APRON_H=0.12,
    APRON_T=0.06,
    LEG=(0.125, 0.155),  # leg section at the top, at the (flared) foot
    LEG_TOP=(0.46, 0.20),   # leg top centre |x|, |y|
    LEG_FOOT=(0.56, 0.24),  # leg foot centre |x|, |y| (splayed)
    STRETCH_Z=0.24,      # side stretcher centre height
    STRETCH=(0.095, 0.085),  # stretcher section (height, thickness)
    MID_Z=0.27,          # long middle stretcher of the H
    DRAWER=(0.62, 0.15, 0.0),  # drawer front width, height, how far it stands proud of the apron
    KNOB=0.11,          # knob size
    POST_X=(-0.56, 0.30),     # off-centre as in the hero: the big pot stands right of the right post
    POST_Y=0.21,
    POST=0.15,
    POST_TOP=1.29,
    POST_LEAN=(-3.5, 2.0),   # deg about Y: the playful tilt (left post leans out, right one leans in)
    SHELF_Y=(0.03, 0.25),
    SHELF_Z=(0.99, 1.015),    # shelf top at the left and the right end (a little tipped)
    SHELF_T=0.05,
    ARCH_Z=(1.16, 1.23),     # back rail centre at the ends and the crown
    ARCH=(0.075, 0.11),      # back rail thickness, height
    ARCH_OVER=0.06,          # rail ends stick out past the posts
    POTS=[(-0.37, 0.14, 0.085, 0.13), (-0.15, 0.14, 0.095, 0.145), (0.09, 0.14, 0.11, 0.16)],  # x, y, top r, h
    BIG_POT=(0.52, 0.11, 0.135, 0.19),
    TRAY=(0.16, -0.05, 0.50, 0.30, 0.065),  # centre x, y, size x, size y, height
    TRAY_CELLS=(5, 3),
    TROWEL=(-0.30, -0.13, -14.0),  # blade root x, y, yaw deg
    BEVEL=0.022,                   # default soft chamfer on the frame
)

COL = {  # sRGB, sampled from the charming hero (lit faces): lighter honey oak than the normal bench
    'Timber_Oak': (188, 118, 62), 'Plank_Oak': (204, 138, 78), 'Clay_Terracotta': (190, 80, 36),
    'Soil_Dark': (92, 50, 26), 'Leaf_Green': (128, 156, 64), 'Metal_Iron': (160, 146, 132), 'Timber_Handle': (184, 102, 56),
}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.55 if name.startswith('Metal') else 0.8
        if name.startswith('Metal'):
            b.inputs['Metallic'].default_value = 0.5
        MATS[name] = m
    return MATS[name]


class Part:
    """Collects solids into one bmesh, becomes one object with one material."""
    def __init__(self, name, material, bevel=0.0, seg=1):
        self.name, self.material, self.bevel, self.seg = name, material, bevel, seg
        self.bm = bmesh.new()

    def hexa(self, corners, bevel=None, seg=None):
        """8 corners: bottom 4 (ccw from above) then top 4."""
        vs = [self.bm.verts.new(c) for c in corners]
        faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        fs = [self.bm.faces.new([vs[i] for i in f]) for f in faces]
        b = self.bevel if bevel is None else bevel
        if b > 0:
            edges = list({e for f in fs for e in f.edges})
            bmesh.ops.bevel(self.bm, geom=edges + vs, offset=b, segments=self.seg if seg is None else seg,
                            affect='EDGES', profile=0.5, clamp_overlap=True)
        return vs

    def box(self, c, s, rz=0.0, ry=0.0, bevel=None, seg=None):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        R = Matrix.Rotation(math.radians(rz), 3, 'Z') @ Matrix.Rotation(math.radians(ry), 3, 'Y')
        pts = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
               (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
        return self.hexa([Vector(c) + R @ Vector(p) for p in pts], bevel, seg)

    def beam(self, a, b, w, h, bevel=None, seg=None, w1=None, h1=None):
        """A beam from point a to point b (w across, h up), optionally tapering to w1 x h1 at b."""
        a, b = Vector(a), Vector(b); d = (b - a).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((0, 1, 0))
        side = d.cross(up).normalized(); up2 = side.cross(d).normalized()
        q0 = [(-side * w - up2 * h) / 2, (side * w - up2 * h) / 2, (side * w + up2 * h) / 2, (-side * w + up2 * h) / 2]
        w1 = w if w1 is None else w1; h1 = h if h1 is None else h1
        q1 = [(-side * w1 - up2 * h1) / 2, (side * w1 - up2 * h1) / 2, (side * w1 + up2 * h1) / 2, (-side * w1 + up2 * h1) / 2]
        return self.hexa([a + v for v in q0] + [b + v for v in q1], bevel, seg)

    def lathe(self, prof, n, at=(0, 0, 0), cap=True, M=None):
        """Revolve [(r, z), ...] around Z (then M, a 3x3 tilt); caps the first ring if r > 0."""
        at = Vector(at); rings = []; M = Matrix.Identity(3) if M is None else M
        for r, z in prof:
            rings.append([self.bm.verts.new(at + M @ Vector((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z)))
                          for i in range(n)])
        for r0, r1 in zip(rings, rings[1:]):
            for i in range(n):
                j = (i + 1) % n
                self.bm.faces.new([r0[i], r0[j], r1[j], r1[i]])
        if len(prof) == 1:
            self.bm.faces.new(rings[0]); return
        if cap and prof[0][0] > 0:
            self.bm.faces.new(list(reversed(rings[0])))
        if cap and prof[-1][0] > 0 and prof[-1][1] != prof[0][1]:
            self.bm.faces.new(rings[-1])

    def leaf(self, c, d, ln, wd, th=0.012):
        """A chubby leaf: a flattened double pyramid from c along d."""
        d = d.normalized(); side = d.cross(Vector((0, 0, 1)))
        side = (side if side.length > 1e-4 else Vector((1, 0, 0))).normalized()
        up = side.cross(d).normalized()
        mid = c + d * ln * 0.5
        mid = c + d * ln * 0.6   # widest past the middle: a round paddle, not a spike
        pts = (c, mid + side * wd / 2, mid + up * th, mid - side * wd / 2, mid - up * th, c + d * ln)
        vs = [self.bm.verts.new(v) for v in pts]
        for f in ((0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1), (5, 2, 1), (5, 3, 2), (5, 4, 3), (5, 1, 4)):
            self.bm.faces.new([vs[j] for j in f])

    def done(self):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me); self.bm.free()
        for p in me.polygons:
            p.use_smooth = False
        o = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(o)
        me.materials.append(mat(self.material))
        return o


def pot_profile(r, h, filled):
    """Tapered pot with a fat rolled rim; open (dark floor) or filled to under the rim."""
    rb = r * 0.74; rim = h * 0.28
    prof = [(rb, 0), (r * 0.95, h - rim), (r * 1.10, h - rim), (r * 1.12, h), (r * 0.92, h), (r * 0.88, h - rim * 0.45)]
    return prof + ([(r * 0.86, h - rim * 0.55)] if filled else [(rb * 0.92, h * 0.28)])


def build():
    random.seed(11)
    p = P; B = p['BEVEL']
    tz = p['TOP_Z']; tb = tz - p['TOP_T']

    # --- top: 3 fat boards along X with soft rounded edges and ragged ends
    top = Part('top', 'Plank_Oak', *p['TOP_BEVEL'])
    n = p['BOARDS']; bw = (p['TOP_D'] - (n - 1) * p['GAP']) / n
    for i in range(n):
        y = -p['TOP_D'] / 2 + bw / 2 + i * (bw + p['GAP'])
        l0 = -p['TOP_L'] / 2 + random.uniform(-1, 1) * p['BOARD_JIT']; l1 = p['TOP_L'] / 2 + random.uniform(-1, 1) * p['BOARD_JIT']
        dz = random.uniform(-0.008, 0.006)
        top.box(((l0 + l1) / 2, y, tb + p['TOP_T'] / 2 + dz), (l1 - l0, bw, p['TOP_T']), rz=random.uniform(-0.8, 0.8))
    top.done()

    # --- frame: legs, apron, H-stretcher, back posts, arched back rail
    fr = Part('frame', 'Timber_Oak', B)
    (L0, L1) = p['LEG']; (tx, ty), (fx, fy) = p['LEG_TOP'], p['LEG_FOOT']
    legs = {}
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = Vector((sx * tx, sy * ty, tb + 0.02)); b = Vector((sx * fx, sy * fy, 0.0))
            fr.hexa([b + Vector(v) * L1 / 2 for v in ((-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0))] +
                    [a + Vector(v) * L0 / 2 for v in ((-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0))], bevel=0.03, seg=1)
            legs[(sx, sy)] = (a, b)

    def leg_at(sx, sy, z):
        a, b = legs[(sx, sy)]; return b.lerp(a, z / a.z)
    az = tb - p['APRON_H'] / 2; at = p['APRON_T']
    for sy in (-1, 1):   # front and back aprons (the ends are hidden by the legs and the top's overhang)
        fr.box((0, sy * (p['TOP_D'] / 2 - 0.03 - at / 2), az), (2 * tx + L0, at, p['APRON_H']))
    sh, st = p['STRETCH']
    mids = []
    for sx in (-1, 1):
        a = leg_at(sx, -1, p['STRETCH_Z']); b = leg_at(sx, 1, p['STRETCH_Z'])
        fr.beam(a + Vector((0, -0.03, 0)), b + Vector((0, 0.03, 0)), st, sh)
        mids.append((a + b) / 2 + Vector((0, 0, p['MID_Z'] - p['STRETCH_Z'])))
    fr.beam(mids[0] + Vector((-0.02, 0, 0)), mids[1] + Vector((0.02, 0, 0)), st, sh)
    # back posts standing on the top, leaning a little, with fat rounded heads
    py = p['POST_Y']; pp = p['POST']; heads = []
    for x, lean in zip(p['POST_X'], p['POST_LEAN']):
        Ry = Matrix.Rotation(math.radians(lean), 3, 'Y')
        base = Vector((x, py, tz - 0.02)); tip = base + Ry @ Vector((0, 0, p['POST_TOP'] - tz + 0.02))
        fr.beam(base, tip - Ry @ Vector((0, 0, 0.0)), pp, pp, bevel=0.045, seg=2)
        heads.append(lambda z, base=base, Ry=Ry: base + Ry @ Vector((0, 0, z - base.z)))
    # arched back rail: a bowed beam in 4 pieces, ends sticking out past the posts
    z0, z1 = p['ARCH_Z']; ow = p['ARCH_OVER']
    xa = p['POST_X'][0] - ow; xb = p['POST_X'][1] + ow
    ys = py + 0.03
    pts = [Vector((xa + (xb - xa) * k / 6, ys, z0 + (z1 - z0) * math.sin(math.pi * k / 6) + 0.01 * (k / 6 - 0.5))) for k in range(7)]
    th, hh_ = p['ARCH']; rings = []
    for k, c in enumerate(pts):   # one continuous swept bar: a ring of 4 verts at each point, normal in the XZ plane
        t = (pts[min(k + 1, 6)] - pts[max(k - 1, 0)]).normalized(); nrm = Vector((-t.z, 0, t.x)); yv = Vector((0, 1, 0))
        rings.append([fr.bm.verts.new(c + yv * sy_ * th / 2 + nrm * sz_ * hh_ / 2) for sy_, sz_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4; fr.bm.faces.new([r0[i], r0[j], r1[j], r1[i]])
    fr.bm.faces.new(list(reversed(rings[0]))); fr.bm.faces.new(rings[-1])
    fr.done()

    # --- drawer: proud front panel with a big round knob
    dw = Part('drawer', 'Timber_Oak', 0.02)
    dW, dH, dP = p['DRAWER']; front = -(p['TOP_D'] / 2 - 0.03) - dP
    dz = tb - dH / 2 + 0.01
    dw.box((0.06, front + 0.035, dz), (dW, 0.07, dH), rz=0.6)
    k = p['KNOB']
    dw.lathe([(0.0001, 0), (k * 0.34, 0.002), (k * 0.36, k * 0.2), (k * 0.6, k * 0.32), (k * 0.45, k * 0.5), (0.0001, k * 0.54)], 6,
             (0.06, front + 0.004, dz), cap=False, M=Matrix.Rotation(math.radians(90), 3, 'X'))
    dw.done()

    # --- shelf: a plank between the posts, tipped a touch
    shelf = Part('shelf', 'Plank_Oak', 0.02)
    sx0, sx1 = p['POST_X'][0] - 0.03, p['POST_X'][1] + 0.03; sy0, sy1 = p['SHELF_Y']; zl, zr = p['SHELF_Z']
    tilt = math.degrees(math.atan2(zr - zl, sx1 - sx0))
    shelf.box(((sx0 + sx1) / 2, (sy0 + sy1) / 2, (zl + zr) / 2 - p['SHELF_T'] / 2), (sx1 - sx0, sy1 - sy0, p['SHELF_T']), ry=-tilt, rz=0.5)
    shelf.done()

    def shelf_z(x):
        return zl + (zr - zl) * (x - sx0) / (sx1 - sx0)

    # --- pots: three on the shelf (the right one sprouting), a big leafy one on the top
    pots = Part('pots', 'Clay_Terracotta'); soil = Part('soil', 'Soil_Dark'); leaf = Part('succulent', 'Leaf_Green')
    Rtilt = Matrix.Rotation(math.radians(-tilt), 3, 'Y')
    for i, (x, y, r, h) in enumerate(p['POTS']):
        filled = i == 2; z0 = shelf_z(x) - 0.004
        pots.lathe(pot_profile(r, h, filled), 8, (x, y, z0), M=Rtilt)
        if filled:
            soil.lathe([(r * 0.86, h - h * 0.28 * 0.55)], 8, (x, y, z0), M=Rtilt)
            c = Vector((x, y, z0 + h * 0.86))
            leaf.beam(c, c + Vector((0.01, 0, 0.15)), 0.016, 0.016, bevel=0)
            for kk in range(5):
                ang = 2 * math.pi * kk / 5 + 0.4; tl = 0.7 if kk % 2 else 1.0
                d = Vector((math.cos(ang) * math.sin(tl), math.sin(ang) * math.sin(tl), math.cos(tl)))
                leaf.leaf(c + Vector((0, 0, 0.07 + 0.03 * (kk % 2))), d, 0.13, 0.07)
        else:
            soil.lathe([(r * 0.74 * 0.92, h * 0.28 + 0.002)], 8, (x, y, z0), M=Rtilt)
    bx, by, br, bh = p['BIG_POT']
    pots.lathe(pot_profile(br, bh, True), 9, (bx, by, tz - 0.004))
    soil.lathe([(br * 0.86, bh - bh * 0.28 * 0.55)], 9, (bx, by, tz - 0.004))
    c = Vector((bx, by, tz + bh * 0.85))
    leaf.beam(c, c + Vector((0, 0.01, 0.17)), 0.018, 0.018, bevel=0)
    for kk in range(7):
        ang = 2 * math.pi * kk / 7 + 0.2; tl = [0.95, 1.2, 0.55][kk % 3]; ln = [0.20, 0.18, 0.16][kk % 3]
        d = Vector((math.cos(ang) * math.sin(tl), math.sin(ang) * math.sin(tl), math.cos(tl)))
        leaf.leaf(c + Vector((0, 0, 0.04 + 0.04 * (kk % 3))), d, ln, 0.085)

    # --- seed tray: a fat rounded clay tray with soil cups
    cx, cy, w, d, hh = p['TRAY']
    tray = Part('seed_tray', 'Clay_Terracotta', 0.018)
    tray.box((cx, cy, tz + hh / 2), (w, d, hh), rz=2.0)   # one soft slab; the soil cups sit in its top
    wall = 0.045; R2 = Matrix.Rotation(math.radians(2.0), 3, 'Z'); cc = Vector((cx, cy, 0))
    tray.done()
    nx, ny = p['TRAY_CELLS']; iw, idp = w - 2 * wall, d - 2 * wall
    for i in range(nx):
        for j in range(ny):
            q = cc + R2 @ Vector((-iw / 2 + (i + 0.5) * iw / nx, -idp / 2 + (j + 0.5) * idp / ny, 0))
            soil.lathe([(0.026, tz + hh + 0.002)], 6, (q.x, q.y, 0))
    soil.done(); leaf.done(); pots.done()

    # --- trowel: a broad iron blade and a fat turned handle with a collar
    tx_, ty_, yaw = p['TROWEL']; R = Matrix.Rotation(math.radians(yaw), 3, 'Z'); o = Vector((tx_, ty_, tz))
    bl = Part('trowel_blade', 'Metal_Iron')
    outline = [(0.0, 0.03), (0.06, 0.065), (0.22, 0.0), (0.06, -0.065), (0.0, -0.03)]
    lo = [bl.bm.verts.new(o + R @ Vector((x, y, 0.004))) for x, y in outline]
    hi = [bl.bm.verts.new(o + R @ Vector((x, y, 0.016 + (0.006 if abs(y) > 0.05 else 0)))) for x, y in outline]
    bl.bm.faces.new(list(reversed(lo))); bl.bm.faces.new(hi)
    for i in range(len(outline)):
        j = (i + 1) % len(outline); bl.bm.faces.new([lo[i], lo[j], hi[j], hi[i]])
    bl.beam(o + R @ Vector((-0.06, 0, 0.035)), o + R @ Vector((0.02, 0, 0.012)), 0.018, 0.014, bevel=0)
    bl.done()
    hd = Part('trowel_handle', 'Timber_Handle')
    a = o + R @ Vector((-0.06, 0, 0.04)); b = o + R @ Vector((-0.30, 0, 0.045))
    q = (b - a).normalized().to_track_quat('Z', 'Y').to_matrix()
    hd.lathe([(0.026, 0.0), (0.036, 0.045), (0.028, 0.055), (0.040, 0.08), (0.042, 0.20), (0.0001, 0.25)], 7, a, M=q)
    hd.done()


def tris():
    n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            o.data.calc_loop_triangles(); n += len(o.data.loop_triangles)
    return n


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
    path = os.path.join(HERE, 'potting-bench-charming.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    import numpy as np
    A = np.concatenate([np.array([v.co[:] for v in o.data.vertices]) for o in bpy.context.scene.objects if o.type == 'MESH'])
    print('bounds', A.min(0).round(3), A.max(0).round(3), 'ratio %.2f' % (np.ptp(A[:, 0]) / np.ptp(A[:, 1])))
    print('triangles', tris())


if __name__ == '__main__':
    main()
