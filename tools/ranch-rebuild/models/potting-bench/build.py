"""potting-bench: a low, wide rustic oak potting bench. A thick 4-board plank top on four chunky splayed legs with
an apron and low stretchers, two back posts carrying a raised back shelf (with a back rail above and a rail under
it), three terracotta pots on the shelf (the right one with a succulent), and a terracotta seed tray and a trowel on
the top.

usage: python build.py      writes potting-bench.glb (a prop: no variants, no animation)

Z up, metres, origin at the footprint centre on the ground, front faces -Y. All shape numbers live in P.
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    TOP_L=1.50,          # top length (X), incl. the overhanging ends
    TOP_D=0.56,          # top depth (Y)
    TOP_Z=0.75,          # top surface height
    TOP_T=0.09,         # plank thickness (chunky)
    BOARDS=4,            # boards across the depth, running along X
    GAP=0.014,           # gap between boards
    BOARD_JIT=0.025,     # ragged board ends (overhang varies per board)
    APRON_H=0.13,        # apron under the top
    APRON_T=0.06,
    LEG=0.11,           # leg section
    LEG_TOP=(0.49, 0.20),   # leg top centre |x|, |y| (under the top)
    LEG_FOOT=(0.66, 0.29),  # leg foot centre |x|, |y| (splayed)
    STRETCH_Z=0.20,      # stretcher centre height
    STRETCH=(0.075, 0.065),  # stretcher section (height, thickness)
    POST_X=(-0.53, 0.38),    # back posts (hero: left near the end, right ~3/4 across)
    POST_Y=0.235,
    POST=0.085,
    POST_TOP=1.15,
    SHELF_X=(-0.61, 0.51),   # shelf board span
    SHELF_Y=(0.10, 0.30),
    SHELF_Z=1.05,        # shelf top
    SHELF_T=0.045,
    BACKRAIL_Z=(1.03, 1.13),  # back rail behind the shelf
    RAIL_Z=(0.87, 0.945),      # rail under the shelf
    POTS=[(-0.34, 0.20, 0.110, 0.17), (-0.08, 0.21, 0.080, 0.095), (0.21, 0.21, 0.105, 0.16)],  # x, y, top radius, height
    TRAY=(0.35, 0.06, 0.46, 0.28, 0.06),  # centre x, y, size x, size y, height
    TRAY_CELLS=(6, 4),
    TROWEL=(-0.22, -0.07, -18.0),  # blade tip-to-handle centre x, y, yaw deg
    BEVEL=0.010,
)

COL = {  # sRGB, sampled from the hero (lit faces)
    'Timber_Oak': (160, 106, 56), 'Plank_Oak': (178, 120, 66), 'Clay_Terracotta': (196, 92, 48),
    'Soil_Dark': (82, 52, 32), 'Leaf_Green': (92, 132, 66), 'Metal_Iron': (112, 100, 88), 'Timber_Handle': (166, 98, 58),
}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.6 if name.startswith('Metal') else 0.85
        if name.startswith('Metal'):
            b.inputs['Metallic'].default_value = 0.5
        MATS[name] = m
    return MATS[name]


class Part:
    """Collects solids into one bmesh, becomes one object with one material."""
    def __init__(self, name, material, bevel=0.0):
        self.name, self.material, self.bevel = name, material, bevel
        self.bm = bmesh.new()

    def hexa(self, corners, bevel=None):
        """8 corners: bottom 4 (ccw from above) then top 4."""
        vs = [self.bm.verts.new(c) for c in corners]
        faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        fs = [self.bm.faces.new([vs[i] for i in f]) for f in faces]
        b = self.bevel if bevel is None else bevel
        if b > 0:
            edges = list({e for f in fs for e in f.edges})
            bmesh.ops.bevel(self.bm, geom=edges + vs, offset=b, segments=1, affect='EDGES', profile=0.5)
        return vs

    def box(self, c, s, rz=0.0, bevel=None):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        R = Matrix.Rotation(math.radians(rz), 3, 'Z')
        pts = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
               (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
        return self.hexa([Vector(c) + R @ Vector(p) for p in pts], bevel)

    def beam(self, a, b, w, h, bevel=None):
        """A square-ish beam from point a to point b (w across, h up)."""
        a, b = Vector(a), Vector(b); d = (b - a).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((0, 1, 0))
        side = d.cross(up).normalized(); up2 = side.cross(d).normalized()
        sw, uh = side * w / 2, up2 * h / 2
        q = [-sw - uh, sw - uh, sw + uh, -sw + uh]
        return self.hexa([a + v for v in q] + [b + v for v in q], bevel)

    def lathe(self, prof, n, at=(0, 0, 0), cap=True):
        """Revolve [(r, z), ...] around Z; caps the first ring if r > 0."""
        at = Vector(at); rings = []
        for r, z in prof:
            rings.append([self.bm.verts.new(at + Vector((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z)))
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

    def done(self):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me); self.bm.free()
        for p in me.polygons:
            p.use_smooth = False
        o = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(o)
        me.materials.append(mat(self.material))
        return o


def build():
    random.seed(7)
    p = P; B = p['BEVEL']
    tz = p['TOP_Z']; tb = tz - p['TOP_T']

    # --- top: 4 thick boards along X with gaps and ragged overhanging ends
    top = Part('top', 'Plank_Oak', B)
    n = p['BOARDS']; bw = (p['TOP_D'] - (n - 1) * p['GAP']) / n
    for i in range(n):
        y = -p['TOP_D'] / 2 + bw / 2 + i * (bw + p['GAP'])
        l0 = -p['TOP_L'] / 2 + random.uniform(-1, 1) * p['BOARD_JIT']; l1 = p['TOP_L'] / 2 + random.uniform(-1, 1) * p['BOARD_JIT']
        dz = random.uniform(-0.006, 0.004)
        top.box(((l0 + l1) / 2, y, tb + p['TOP_T'] / 2 + dz), (l1 - l0, bw, p['TOP_T']), rz=random.uniform(-0.6, 0.6))
    top.done()

    # --- frame: legs, apron, stretchers, back posts, shelf rails
    fr = Part('frame', 'Timber_Oak', B)
    L = p['LEG']; (tx, ty), (fx, fy) = p['LEG_TOP'], p['LEG_FOOT']
    legs = {}
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = Vector((sx * tx, sy * ty, tb)); b = Vector((sx * fx, sy * fy, 0.0))
            h = L / 2
            fr.hexa([b + Vector(v) for v in ((-h, -h, 0), (h, -h, 0), (h, h, 0), (-h, h, 0))] +
                    [a + Vector(v) for v in ((-h, -h, 0), (h, -h, 0), (h, h, 0), (-h, h, 0))])
            legs[(sx, sy)] = (a, b)

    def leg_at(sx, sy, z):
        a, b = legs[(sx, sy)]; t = z / a.z
        return b.lerp(a, t)
    # apron: front, back and the two ends, just under the top, set in from the board edges
    az = tb - p['APRON_H'] / 2; at = p['APRON_T']
    for sy in (-1, 1):
        fr.box((0, sy * (p['TOP_D'] / 2 - 0.012 - at / 2), az), (2 * tx + L + 0.02, at, p['APRON_H']))
    for sx in (-1, 1):
        fr.box((sx * (tx + L / 2 - at / 2), 0, az), (at, 2 * ty, p['APRON_H']))
    # low stretchers: front (long) and both sides
    sz = p['STRETCH_Z']; sh, st = p['STRETCH']
    a = leg_at(-1, -1, sz); b = leg_at(1, -1, sz)
    fr.beam(a + Vector((0, 0.01, 0)), b + Vector((0, 0.01, 0)), st, sh)
    for sx in (-1, 1):
        a = leg_at(sx, -1, sz - 0.02); b = leg_at(sx, 1, sz - 0.02)
        fr.beam(a, b, st, sh)
    # back posts standing on the top
    py = p['POST_Y']; pp = p['POST']
    for x in p['POST_X']:
        fr.box((x, py, (tz + p['POST_TOP']) / 2), (pp, pp, p['POST_TOP'] - tz))
    x0, x1 = p['POST_X']
    rz0, rz1 = p['RAIL_Z']
    fr.box(((x0 + x1) / 2, py - 0.01, (rz0 + rz1) / 2), (x1 - x0 + 0.06, 0.05, rz1 - rz0))
    bz0, bz1 = p['BACKRAIL_Z']
    fr.box(((p['SHELF_X'][0] + x1) / 2 + 0.01, py + pp / 2 + 0.02, (bz0 + bz1) / 2),
           (x1 - p['SHELF_X'][0] + 0.06, 0.045, bz1 - bz0), rz=-0.5)
    fr.done()

    shelf = Part('shelf', 'Plank_Oak', B)
    sx0, sx1 = p['SHELF_X']; sy0, sy1 = p['SHELF_Y']; sz1 = p['SHELF_Z']
    shelf.box(((sx0 + sx1) / 2, (sy0 + sy1) / 2, sz1 - p['SHELF_T'] / 2), (sx1 - sx0, sy1 - sy0, p['SHELF_T']), rz=0.4)
    shelf.done()

    # --- pots on the shelf: tapered with a rolled rim, open top
    pots = Part('pots', 'Clay_Terracotta'); soil = Part('soil', 'Soil_Dark'); leaf = Part('succulent', 'Leaf_Green')
    for i, (x, y, r, h) in enumerate(p['POTS']):
        rb = r * 0.72; rim = h * 0.26; z0 = sz1
        prof = [(rb, 0), (r * 0.94, h - rim), (r * 1.06, h - rim), (r * 1.06, h), (r * 0.90, h), (r * 0.86, h - rim * 0.4)]
        if i == 2:
            prof.append((r * 0.84, h - rim * 0.5))
        else:
            prof += [(rb * 0.90, h * 0.25)]
        pots.lathe(prof, 12, (x, y, z0))
        if i == 2:  # soil and a succulent rosette
            soil.lathe([(r * 0.85, h - rim * 0.5)], 12, (x, y, z0))
            c = Vector((x, y, z0 + h - rim * 0.5))
            for k in range(7):
                ang = 2 * math.pi * k / 7 + 0.3; tilt = 0.55 if k % 2 else 0.95
                ln = 0.075 if k % 2 else 0.06
                d = Vector((math.cos(ang) * math.sin(tilt), math.sin(ang) * math.sin(tilt), math.cos(tilt)))
                tip = c + d * ln; side = d.cross(Vector((0, 0, 1))).normalized() * 0.014
                mid = c + d * ln * 0.45; up = d.cross(side).normalized() * 0.008
                vs = [leaf.bm.verts.new(v) for v in (c, mid + side, mid + up, mid - side, mid - up, tip)]
                for f in ((0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1), (5, 2, 1), (5, 3, 2), (5, 4, 3), (5, 1, 4)):
                    leaf.bm.faces.new([vs[j] for j in f])
            leaf.box((x, y, z0 + h + 0.005), (0.02, 0.02, 0.06), bevel=0)
        else:  # a darker inside floor reads as an empty pot
            soil.lathe([(rb * 0.90, h * 0.25 + 0.002)], 12, (x, y, z0))
    pots.done(); leaf.done()

    # --- seed tray with dark soil cells
    cx, cy, w, d, hh = p['TRAY']
    tray = Part('seed_tray', 'Clay_Terracotta')
    wall = 0.022
    tray.box((cx, cy, tz + 0.012), (w - 0.02, d - 0.02, 0.024), bevel=0)
    for sy in (-1, 1):
        tray.box((cx, cy + sy * (d / 2 - wall / 2), tz + hh / 2), (w, wall, hh), bevel=0.004)
    for sx in (-1, 1):
        tray.box((cx + sx * (w / 2 - wall / 2), cy, tz + hh / 2), (wall, d - 2 * wall, hh), bevel=0.004)
    nx, ny = p['TRAY_CELLS']; iw, idp = w - 2 * wall, d - 2 * wall
    for i in range(1, nx):
        tray.box((cx - iw / 2 + i * iw / nx, cy, tz + hh - 0.004), (0.01, idp, 0.012), bevel=0)
    for j in range(1, ny):
        tray.box((cx, cy - idp / 2 + j * idp / ny, tz + hh - 0.004), (iw, 0.01, 0.012), bevel=0)
    tray.done()
    soil.box((cx, cy, tz + hh - 0.012), (iw, idp, 0.02), bevel=0)
    soil.done()

    # --- trowel: iron blade (pointed, slightly dished) and a wooden handle
    tx_, ty_, yaw = p['TROWEL']; R = Matrix.Rotation(math.radians(yaw), 3, 'Z') @ Matrix.Diagonal((1.4, 1.4, 1.0)); o = Vector((tx_, ty_, tz))
    bl = Part('trowel_blade', 'Metal_Iron')
    outline = [(-0.13, 0), (-0.06, 0.045), (0.03, 0.04), (0.04, 0.0), (0.03, -0.04), (-0.06, -0.045)]
    lo = [bl.bm.verts.new(o + R @ Vector((x, y, 0.004))) for x, y in outline]
    hi = [bl.bm.verts.new(o + R @ Vector((x, y, 0.014 + (0.006 if abs(y) > 0.03 else 0)))) for x, y in outline]
    bl.bm.faces.new(list(reversed(lo))); bl.bm.faces.new(hi)
    for i in range(len(outline)):
        j = (i + 1) % len(outline); bl.bm.faces.new([lo[i], lo[j], hi[j], hi[i]])
    bl.beam(o + R @ Vector((0.03, 0, 0.012)), o + R @ Vector((0.08, 0, 0.022)), 0.014, 0.012, bevel=0)
    bl.done()
    hd = Part('trowel_handle', 'Timber_Handle')
    a = o + R @ Vector((0.08, 0, 0.022)); b = o + R @ Vector((0.24, 0, 0.024))
    d_ = (b - a).normalized(); q = d_.to_track_quat('Z', 'Y').to_matrix()
    base = hd.bm
    prof = [(0.016, 0.0), (0.020, 0.03), (0.021, 0.13), (0.016, 0.16)]
    rings = []
    for r, z in prof:
        rings.append([base.verts.new(a + q @ Vector((r * math.cos(2 * math.pi * i / 8), r * math.sin(2 * math.pi * i / 8), z))) for i in range(8)])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(8):
            j = (i + 1) % 8; base.faces.new([r0[i], r0[j], r1[j], r1[i]])
    base.faces.new(list(reversed(rings[0]))); base.faces.new(rings[-1])
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
    path = os.path.join(HERE, 'potting-bench.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris())


if __name__ == '__main__':
    main()
