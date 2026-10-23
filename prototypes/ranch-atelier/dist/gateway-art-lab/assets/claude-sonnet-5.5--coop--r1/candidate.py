import bpy
import bmesh
import math
import random
from mathutils import Matrix, Euler


def build():
    random.seed(42)
    B = {}
    MATS = {}

    def mk(name, col, rough, metal=0.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes.get("Principled BSDF")
        b.inputs["Base Color"].default_value = (col[0], col[1], col[2], 1)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metal
        MATS[name] = m
        B[name] = bmesh.new()

    mk("wa", (0.58, 0.38, 0.21), 0.8)
    mk("wb", (0.48, 0.31, 0.17), 0.85)
    mk("wc", (0.40, 0.26, 0.15), 0.85)
    mk("wd", (0.27, 0.17, 0.10), 0.9)
    mk("cream", (0.86, 0.80, 0.66), 0.7)
    mk("teal", (0.08, 0.50, 0.52), 0.55)
    mk("tealD", (0.05, 0.36, 0.39), 0.55)
    mk("metal", (0.10, 0.10, 0.11), 0.45, 0.8)
    mk("stone", (0.46, 0.44, 0.40), 0.95)

    def cube(c, s, m, rot=(0, 0, 0)):
        mat = Matrix.Translation(c) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((s[0], s[1], s[2], 1))
        bmesh.ops.create_cube(B[m], size=1.0, matrix=mat)

    def bx(p0, p1, m):
        lo = [min(p0[i], p1[i]) for i in range(3)]
        hi = [max(p0[i], p1[i]) for i in range(3)]
        cube(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2),
             (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), m)

    def planks(axis, fin, fout, u0, u1, vb, vt, holes, mats, pw=0.15):
        n = max(1, round((u1 - u0) / pw))
        w = (u1 - u0) / n
        sg = 1 if fout > fin else -1
        for i in range(n):
            a = u0 + i * w + 0.003
            b = u0 + (i + 1) * w - 0.003
            mt = random.choice(mats)
            fo = fout + sg * random.uniform(0, 0.006)
            top = vt((a + b) / 2) if callable(vt) else vt
            br = {a, b}
            for h in holes:
                for k in (h[0], h[1]):
                    if a < k < b:
                        br.add(k)
            br = sorted(br)
            for p, q in zip(br[:-1], br[1:]):
                mid = (p + q) / 2
                segs = [(vb, top)]
                for h in holes:
                    if h[0] <= mid <= h[1]:
                        new = []
                        for s0, s1 in segs:
                            if h[2] > s0:
                                new.append((s0, min(s1, h[2])))
                            if h[3] < s1:
                                new.append((max(s0, h[3]), s1))
                        segs = new
                for s0, s1 in segs:
                    if s1 - s0 > 0.01:
                        if axis == "y":
                            bx((p, fin, s0), (q, fo, s1), mt)
                        else:
                            bx((fin, p, s0), (fo, q, s1), mt)

    def trim(axis, f, sgn, u0, u1, v0, v1, w=0.05, th=0.025, m="cream"):
        for (a0, a1, b0, b1) in ((u0 - w, u0, v0 - w, v1 + w), (u1, u1 + w, v0 - w, v1 + w),
                                 (u0, u1, v1, v1 + w), (u0, u1, v0 - w, v0)):
            if axis == "y":
                bx((a0, f, b0), (a1, f + sgn * th, b1), m)
            else:
                bx((f, a0, b0), (f + sgn * th, a1, b1), m)

    def louvers(axis, f, sgn, u0, u1, v0, v1, m="wd"):
        um = (u0 + u1) / 2
        cnt = max(2, int((v1 - v0) / 0.05))
        for k in range(cnt):
            v = v0 + 0.025 + k * (v1 - v0 - 0.05) / (cnt - 1)
            if axis == "y":
                cube((um, f, v), (u1 - u0 + 0.02, 0.08, 0.02), m, rot=(-0.6 * sgn, 0, 0))
            else:
                cube((f, um, v), (0.08, u1 - u0 + 0.02, 0.02), m, rot=(0, 0.6 * sgn, 0))

    WALLS = ["wa", "wb", "wc"]
    ZW = 1.82

    # ---- foundation, posts, floor
    for x in (-1.0, 0.0, 1.0):
        for y in (-0.8, 0.8):
            bx((x - 0.1, y - 0.1, 0), (x + 0.1, y + 0.1, 0.06), "stone")
            bx((x - 0.05, y - 0.05, 0.06), (x + 0.05, y + 0.05, 0.4), "wd")
    for y in (-0.8, 0.8):
        bx((-1.08, y - 0.04, 0.38), (1.08, y + 0.04, 0.5), "wc")
        for x, r in ((-0.5, -0.785), (0.5, 0.785)):
            cube((x, y, 0.27), (0.5, 0.04, 0.04), "wd", rot=(0, r, 0))
    for x in (-1.0, 0.0, 1.0):
        bx((x - 0.04, -0.84, 0.40), (x + 0.04, 0.84, 0.5), "wc")
    for i in range(9):
        y0 = -0.88 + i * 0.196
        bx((-1.1, y0 + 0.003, 0.5), (1.1, y0 + 0.193, 0.56), random.choice(["wb", "wc"]))

    # ---- frame
    for sx in (-1, 1):
        for sy in (-1, 1):
            bx((sx * 0.95 - 0.06, sy * 0.81 - 0.06, 0.5), (sx * 0.95 + 0.06 + sx * 0.06, sy * 0.81 + 0.06, ZW), "wd")
    for sy in (-1, 1):
        bx((-1.08, sy * 0.75, 1.76), (1.08, sy * 0.89, 1.84), "wd")
    # sill rim boards
    bx((-1.08, -0.89, 0.5), (1.08, -0.85, 0.58), "wd")
    bx((-1.08, 0.85, 0.5), (1.08, 0.89, 0.58), "wd")
    bx((-1.09, -0.85, 0.5), (-1.05, 0.85, 0.58), "wd")
    bx((1.05, -0.85, 0.5), (1.09, 0.85, 0.58), "wd")

    # ---- walls
    gable = lambda u: ZW + 0.53 * (1 - abs(u) / 0.85) - 0.005
    planks("y", -0.77, -0.85, -0.97, 0.97, 0.58, ZW,
           [(0.55, 0.9, 0.6, 1.1), (-0.85, -0.25, 0.62, 1.55)], WALLS)
    planks("y", 0.77, 0.85, -0.97, 0.97, 0.58, ZW, [(-0.5, 0.5, 1.4, 1.65)], WALLS)
    planks("x", 0.97, 1.05, -0.85, 0.85, 0.58, gable,
           [(-0.16, 0.16, 1.9, 2.1), (-0.3, 0.3, 0.75, 1.12)], WALLS)
    planks("x", -0.97, -1.05, -0.85, 0.85, 0.58, gable, [(-0.16, 0.16, 1.9, 2.1)], WALLS)

    # ---- entry opening trim and slide guides
    trim("y", -0.85, -1, 0.55, 0.9, 0.6, 1.1)
    bx((0.55, -0.87, 1.1), (0.9, -0.89, 1.14), "wd")
    # ---- access door
    trim("y", -0.85, -1, -0.85, -0.25, 0.62, 1.55)
    for i in range(4):
        x0 = -0.85 + i * 0.15
        bx((x0 + 0.004, -0.84, 0.62), (x0 + 0.146, -0.79, 1.55), random.choice(WALLS))
    bx((-0.85, -0.875, 0.7), (-0.25, -0.845, 0.78), "wd")
    bx((-0.85, -0.875, 1.38), (-0.25, -0.845, 1.46), "wd")
    cube((-0.55, -0.86, 1.085), (0.84, 0.03, 0.07), "wd", rot=(0, -0.93, 0))
    bx((-0.86, -0.89, 0.82), (-0.55, -0.87, 0.86), "metal")
    bx((-0.86, -0.89, 1.30), (-0.55, -0.87, 1.34), "metal")
    bx((-0.37, -0.89, 1.0), (-0.34, -0.87, 1.22), "metal")
    bx((-0.42, -0.9, 1.1), (-0.30, -0.88, 1.13), "metal")

    # ---- ventilation
    trim("y", 0.85, 1, -0.5, 0.5, 1.4, 1.65)
    louvers("y", 0.81, 1, -0.5, 0.5, 1.4, 1.65)
    for k in range(-4, 5):
        bx((k * 0.11 - 0.005, 0.775, 1.4), (k * 0.11 + 0.005, 0.785, 1.65), "metal")
    for sx in (1, -1):
        trim("x", sx * 1.05, sx, -0.16, 0.16, 1.9, 2.1, w=0.04, th=0.02)
        louvers("x", sx * 1.01, sx, -0.16, 0.16, 1.9, 2.1)

    # ---- nest box with hinged lid on +x side
    trim("x", 1.05, 1, -0.3, 0.3, 0.75, 1.12)
    bx((1.05, -0.33, 0.69), (1.42, 0.33, 0.73), "wc")
    for s in (-1, 1):
        bx((1.05, s * 0.35 - 0.02, 0.69), (1.44, s * 0.35 + 0.02, 1.1), "wb")
        cube((1.21, s * 0.3, 0.58), (0.42, 0.04, 0.04), "wd", rot=(0, -0.78, 0))
    bx((1.40, -0.35, 0.69), (1.44, 0.35, 0.95), "wa")
    cube((1.27, 0, 1.14), (0.52, 0.8, 0.04), "teal", rot=(0, 0.18, 0))
    bx((1.0, -0.2, 1.12), (1.06, 0.2, 1.16), "metal")

    # ---- roof
    a = math.atan(0.53 / 0.85)
    ca, sa = math.cos(a), math.sin(a)
    zr = 2.37
    for s in (-1, 1):
        cube((0, s * 0.55, zr - 0.55 * math.tan(a)), (2.62, 1.3, 0.06), "teal", rot=(-s * a, 0, 0))
        for k in range(6):
            d = 0.2 + k * 0.2
            cy = s * d * ca - s * (-sa) * 0.0
            nrm = (0, -s * sa * (-1) * (-1), ca)
            cube((0, s * (d * ca + 0.04 * sa), zr - d * sa + 0.04 * ca), (2.62, 0.035, 0.03), "tealD", rot=(-s * a, 0, 0))
        for sx in (-1, 1):
            cube((sx * 1.3, s * 0.55, zr - 0.55 * math.tan(a) - 0.035), (0.04, 1.3, 0.1), "cream", rot=(-s * a, 0, 0))
        bx((-1.31, s * 1.1 - 0.015, 1.62), (1.31, s * 1.1 + 0.015, 1.74), "tealD") if False else None
        cube((0, s * 1.1, zr - 1.1 * math.tan(a) - 0.04), (2.62, 0.03, 0.1), "tealD")
        for k in range(9):
            x = -1.1 + k * 0.275
            cube((x, s * 0.97, zr - 0.97 * math.tan(a) - 0.075), (0.06, 0.3, 0.06), "wd", rot=(-s * a, 0, 0))
    cube((0, 0, 2.4), (2.66, 0.12, 0.12), "tealD", rot=(math.pi / 4, 0, 0))

    # ---- ramp
    th = math.atan2(0.49, 1.12)
    L = math.hypot(0.49, 1.12)
    st, ct = math.sin(th), math.cos(th)
    My, Mz = -1.44, 0.335
    for x in (0.5, 0.95):
        cube((x, My + 0.04 * st, Mz - 0.04 * ct), (0.05, L, 0.08), "wc", rot=(th, 0, 0))
        bx((x - 0.025, -1.5, 0), (x + 0.025, -1.45, 0.27), "wd")
    for k in range(9):
        s = -L / 2 + 0.07 + k * (L - 0.14) / 8
        cube((0.725, My + s * ct - 0.0125 * st, Mz + s * st + 0.0125 * ct), (0.52, 0.1, 0.025),
             "wa" if k % 2 else "wb", rot=(th, 0, 0))
    bx((0.42, -2.12, 0), (1.03, -1.93, 0.06), "stone")

    # ---- build objects
    for name, bm in B.items():
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new(name + "_mesh")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(MATS[name])
        ob = bpy.data.objects.new("Coop_" + name, me)
        bpy.context.scene.collection.objects.link(ob)

    return {"notes": "Static ranch chicken coop: raised on posts, plank walls with real pop-door opening, "
                     "slatted ramp (~24 deg), framed access door, louvered vents, nest box with hinged lid, "
                     "teal pitched roof with thickness, overhang, ridge cap and rafter tails. Front faces -Y."}