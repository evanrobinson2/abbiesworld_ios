"""balance-whimsical (BA-0031, style B): a toy-contraption beam balance.

python build.py  ->  balance-whimsical.glb next to this file.
Z up, metres, origin at the centre of the footprint on the ground, front faces -Y.
Moving parts (frames 1-120 @ 24 fps, one seamless clip):
  beam        seesaws on the hub: a kick, tips one way, then the other, settles back to its rest lean.
  pan_left    teacup stack; its location is keyed to the beam's left hang point every frame, no rotation,
  pan_right   so both pans always hang plumb. A little lag bounce rides on the springy cords.
              The wavy arms' cradles sit a few cm below each pan's lowest swing (asserted after keying).
  bell        wiggles on its spring above the hub, rung by the beam.
"""
import math, os
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'balance-whimsical.glb')

P = dict(
    # proportions follow the hero: H ~ 1.0 m, W ~ 0.78 m; base 3% H thick, neck ~15% H, platform underside at 20% H
    # thin flat turned teal base plate (about 45% of the width across)
    base_r=0.18, base_h=0.03, neck_z=(0.03, 0.20),
    # thin shallow wooden dish platform, about 70% of the beam's length across
    plat_r=0.23, plat_under_z=0.20, plat_h=0.04,
    # taller turned spindle above the platform
    spindle_z=(0.285, 0.56), collar_z=0.36,
    # lazy-S arms from under the platform rim up to cradles under each pan
    arm_start=0.19, cradle_l=(-0.27, 0.38), cradle_r=(0.27, 0.40), cradle_rad=0.05, arm_r=0.016,
    # rod, bead and hub (pivot at ~75% H)
    rod_r=0.008, bead_z=0.655, bead_r=0.024, pivot_z=0.75, hub_r=0.045, hub_t=0.04,
    # bell (~85% H) on a red spring, hung from a crook on the finial pin
    bell_spring_z=(0.79, 0.83), bell_hang=(0.034, 0, 0.875), bell_r=0.028, bell_h=0.045, pin_top=0.975,
    # beam
    beam_l=(-0.31, 0.255), beam_h=0.024, beam_d=0.022, arrow_len=0.095, arrow_w=0.085,
    hang_x=0.27, hang_dz=-0.016,
    # left pan: chunky stack (teal saucer, red bowl, tilted cream teacup) on a spring and spreader bar
    lpan_drop=0.28, saucer_r=0.13, saucer_h=0.026, bowl_r=0.10, bowl_h=0.075, cup_r=0.078, cup_h=0.074, cup_tilt=17,
    # right pan: mustard bowl on a coiled spring cord
    rpan_drop=0.25, rbowl_r=0.095, rbowl_h=0.052,
    # motion
    rest_deg=-3.0, kick_deg=13.0, decay=3.2, cycles=2.6, start_f=8,
    min_gap=0.02,
)

COL = dict(  # sRGB, sampled from hero.png lit faces, pushed toward bright toy colours
    Teal=(78, 168, 170), TealLight=(132, 196, 200), Red=(205, 62, 58), Cream=(240, 224, 196),
    Mustard=(226, 168, 62), Wood=(176, 120, 72), WoodDark=(130, 86, 50), Brass=(190, 150, 70),
    Wire=(176, 110, 52),
)


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


MATS = {}


def make_mats():
    for name, rgb in COL.items():
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*[lin(x) for x in rgb], 1)
        b.inputs['Roughness'].default_value = 0.55 if name == 'Brass' else 0.8
        if name == 'Brass':
            b.inputs['Metallic'].default_value = 0.6
        MATS[name] = m


class Part:
    """Accumulates bmesh geometry with per-face materials, then becomes one object."""

    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.mats = []

    def mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def lathe(self, prof, mat, seg=12, at=(0, 0, 0), cap_top=True, cap_bot=True, rot=None):
        """prof: list of (r, z) bottom to top."""
        bm = self.bm; idx = self.mi(mat); rings = []
        for r, z in prof:
            ring = []
            for i in range(seg):
                a = 2 * math.pi * i / seg
                v = Vector((r * math.cos(a), r * math.sin(a), z))
                if rot: v = rot @ v
                ring.append(bm.verts.new(v + Vector(at)))
            rings.append(ring)
        for r0, r1 in zip(rings, rings[1:]):
            for i in range(seg):
                f = bm.faces.new((r0[i], r0[(i + 1) % seg], r1[(i + 1) % seg], r1[i])); f.material_index = idx; f.smooth = False
        if cap_bot and prof[0][0] > 1e-5:
            f = bm.faces.new(list(reversed(rings[0]))); f.material_index = idx
        if cap_top and prof[-1][0] > 1e-5:
            f = bm.faces.new(rings[-1]); f.material_index = idx
        return rings

    def tube(self, pts, r, mat, sides=4, cap=True):
        bm = self.bm; idx = self.mi(mat); pts = [Vector(p) for p in pts]; rings = []
        rr = r if isinstance(r, (list, tuple)) else [r] * len(pts)
        prev_n = None
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            n = prev_n if prev_n is not None else (Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)))
            u = (n - t * n.dot(t)).normalized(); w = t.cross(u); prev_n = u
            rings.append([bm.verts.new(p + rr[i] * (math.cos(2 * math.pi * k / sides) * u + math.sin(2 * math.pi * k / sides) * w)) for k in range(sides)])
        for r0, r1 in zip(rings, rings[1:]):
            for k in range(sides):
                f = bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k])); f.material_index = idx
        if cap and sides > 2:
            bm.faces.new(list(reversed(rings[0]))).material_index = idx; bm.faces.new(rings[-1]).material_index = idx

    def helix(self, z0, z1, r, turns, mat, wire=0.0035, at=(0, 0, 0), per_turn=6):
        n = int(turns * per_turn) + 1
        pts = [(at[0] + r * math.cos(2 * math.pi * turns * i / (n - 1)), at[1] + r * math.sin(2 * math.pi * turns * i / (n - 1)),
                at[2] + z0 + (z1 - z0) * i / (n - 1)) for i in range(n)]
        self.tube(pts, wire, mat, sides=3, cap=False)

    def box(self, c, s, mat, rot=None):
        idx = self.mi(mat)
        g = bmesh.ops.create_cube(self.bm, size=1.0)
        for v in g['verts']:
            v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
            if rot: v.co = rot @ v.co
            v.co += Vector(c)
        for f in {f for v in g['verts'] for f in v.link_faces}:
            f.material_index = idx

    def prism(self, pts2d, y0, y1, mat):
        """Extrude an XZ polygon between y0 and y1."""
        bm = self.bm; idx = self.mi(mat)
        a = [bm.verts.new((x, y0, z)) for x, z in pts2d]; b = [bm.verts.new((x, y1, z)) for x, z in pts2d]
        bm.faces.new(a).material_index = idx; bm.faces.new(list(reversed(b))).material_index = idx
        n = len(pts2d)
        for i in range(n):
            bm.faces.new((a[(i + 1) % n], a[i], b[i], b[(i + 1) % n])).material_index = idx

    def build(self, loc=(0, 0, 0)):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for m in self.mats:
            me.materials.append(MATS[m])
        o = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(o)
        o.location = loc
        return o


def bevel(o, w, seg=1):
    m = o.modifiers.new('Bevel', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(60)


# ---------------------------------------------------------------- parts
def smooth(pts, it=3):
    """Chaikin corner cutting: turns a few control points into a lazy curve, keeping the ends."""
    pts = [Vector(q) for q in pts]
    for _ in range(it):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            out += [a.lerp(b, 0.25), a.lerp(b, 0.75)]
        out.append(pts[-1]); pts = out
    return pts


def build_stand():
    p = P
    # thin, flat turned teal base plate, its own object so it can carry a bevel
    s = Part('base'); br, bh = p['base_r'], p['base_h']
    s.lathe([(br * 0.96, 0), (br, bh * 0.4), (br * 0.92, bh), (0.06, bh + 0.006)], 'Teal', seg=14)
    s.lathe([(0.05, bh + 0.004), (0.05, bh + 0.01), (0.03, bh + 0.012)], 'Red', seg=10, cap_bot=False)
    bo = s.build(); bevel(bo, 0.003)
    s = Part('stand')
    # slender turned wooden neck with a small teal bead
    z0, z1 = p['neck_z']; h = z1 - z0
    s.lathe([(0.016, z0 + 0.01), (0.028, z0 + 0.022), (0.028, z0 + 0.034), (0.016, z0 + 0.046)], 'Teal', seg=8, cap_bot=False, cap_top=False)
    s.lathe([(0.014, z0 + 0.046), (0.024, z0 + h * 0.42), (0.02, z0 + h * 0.6), (0.011, z0 + h * 0.85), (0.02, z1 - 0.004), (0.04, z1)],
            'Wood', seg=8, cap_bot=False, cap_top=False)
    # thin shallow dish platform: teal underside, wood dish top with a lip
    pr, pu, ph = p['plat_r'], p['plat_under_z'], p['plat_h']
    s.lathe([(0.04, pu), (pr * 0.85, pu + ph * 0.25), (pr, pu + ph * 0.45)], 'Teal', seg=16, cap_top=False)
    s.lathe([(pr, pu + ph * 0.45), (pr, pu + ph * 0.85), (pr * 0.96, pu + ph), (pr * 0.9, pu + ph * 0.75), (0.08, pu + ph * 0.75)],
            'Wood', seg=16, cap_bot=False)
    tz = pu + ph * 0.75
    s.lathe([(0.08, tz), (0.08, tz + 0.01), (0.066, tz + 0.012)], 'Red', seg=12, cap_bot=False)
    s.lathe([(0.058, tz + 0.012), (0.05, tz + 0.026), (0.03, tz + 0.042), (0.016, p['spindle_z'][0])], 'Teal', seg=10, cap_bot=False, cap_top=False)
    # taller turned spindle: swells and beads, red collar
    a0, a1 = p['spindle_z']; c = p['collar_z']
    s.lathe([(0.016, a0), (0.024, c - 0.03), (0.02, c - 0.016)], 'Wood', seg=8, cap_bot=False, cap_top=False)
    s.lathe([(0.028, c - 0.016), (0.03, c + 0.014)], 'Red', seg=8)
    s.lathe([(0.018, c + 0.014), (0.028, c + 0.04), (0.018, c + 0.07), (0.03, c + 0.11), (0.032, c + 0.14), (0.02, c + 0.165),
             (0.024, a1 - 0.012), (0.01, a1)], 'Wood', seg=8, cap_bot=False, cap_top=False)
    # rod up through the hub, red bead
    bz, brr = p['bead_z'], p['bead_r']
    s.tube([(0, 0, a1 - 0.005), (0, 0, p['bell_spring_z'][0])], p['rod_r'], 'Wood', sides=5)
    s.lathe([(0.008, bz - brr), (brr * 0.9, bz - brr * 0.5), (brr, bz), (brr * 0.9, bz + brr * 0.5), (0.008, bz + brr)], 'Red', seg=8)
    # lazy-S arms: from under the platform rim, out past it, then up and back in to a cradle under each pan
    st = p['arm_start']
    for (cx, ctop), sx in ((p['cradle_l'], -1), (p['cradle_r'], 1)):
        cx = abs(cx); zt = ctop - 0.03
        ctrl = [(st, pu + 0.008), (pr + 0.03, pu - 0.004), (pr + 0.075, pu + 0.05),
                (cx + 0.05, (pu + zt) / 2 + 0.03), (cx - 0.035, zt - 0.03), (cx, zt)]
        pts = [Vector((sx * q.x, 0, q.z)) for q in smooth([Vector((x, 0, z)) for x, z in ctrl], 2)]
        s.tube(pts, p['arm_r'], 'Wood', sides=5)
        cr = p['cradle_rad']
        s.lathe([(0.017, ctop - 0.032), (0.02, ctop - 0.02), (cr * 0.5, ctop - 0.012), (cr, ctop - 0.002), (cr * 0.85, ctop), (cr * 0.4, ctop - 0.006)],
                'Teal', seg=8, at=(sx * cx, 0, 0))
    # bell spring, finial pin with a mustard knob, and the crook the bell hangs from
    s0, s1 = p['bell_spring_z']
    s.lathe([(0.015, s0 - 0.01), (0.019, s0), (0.008, s0 + 0.004)], 'Red', seg=8)
    s.helix(s0, s1, 0.011, 3, 'Red', wire=0.0028)
    s.lathe([(0.0, s1), (0.012, s1 + 0.006), (0.0, s1 + 0.016)], 'Red', seg=6, cap_bot=False, cap_top=False)
    s.tube([(0, 0, s1), (0, 0, p['pin_top'] - 0.015)], 0.0035, 'Wood', sides=4)
    s.lathe([(0.0, p['pin_top'] - 0.03), (0.009, p['pin_top'] - 0.016), (0.0, p['pin_top'])], 'Mustard', seg=6, cap_bot=False, cap_top=False)
    hx, _, hz = p['bell_hang']
    s.tube([(0, 0, hz - 0.004), (hx * 0.3, 0, hz + 0.012), (hx * 0.75, 0, hz + 0.012), (hx, 0, hz + 0.006)], 0.0035, 'Wood', sides=4)
    return s.build()


def build_beam():
    p = P; s = Part('beam'); x0, x1 = p['beam_l']; h, d = p['beam_h'], p['beam_d']
    # main plank, slightly tapered toward the curl end
    s.prism([(x0 + 0.03, -h * 0.4), (x1, -h / 2), (x1, h / 2), (x0 + 0.03, h * 0.45)], -d / 2, d / 2, 'TealLight')
    # curly scroll on the left end
    cx, cz, r0 = x0 + 0.03, 0.028, 0.028
    curl = [(cx + r0 * (1 - 0.5 * i / 10) * math.cos(math.radians(-90 - 31 * i)), 0,
             cz + r0 * (1 - 0.5 * i / 10) * math.sin(math.radians(-90 - 31 * i))) for i in range(11)]
    s.tube(curl, 0.0095, 'TealLight', sides=4)
    # red collars at the hang points
    for x in (-p['hang_x'], p['hang_x']):
        s.box((x, 0, 0), (0.026, d * 1.5, h * 1.7), 'Red')
    # cheerful arrow flag on the right end (mustard), with a red tail notch block
    a0 = x1 - 0.01; L, W = p['arrow_len'], p['arrow_w']
    s.prism([(a0, -W / 2), (a0 + L, 0.004), (a0, W / 2), (a0 + 0.018, 0)], -0.006, 0.006, 'Mustard')
    # hub: red disc with a mustard boss (front and back)
    s.lathe([(p['hub_r'], -p['hub_t'] / 2), (p['hub_r'], p['hub_t'] / 2)], 'Red', seg=10, rot=Matrix.Rotation(math.pi / 2, 3, 'X'))
    s.lathe([(0.014, -p['hub_t'] / 2 - 0.008), (0.014, p['hub_t'] / 2 + 0.008)], 'Mustard', seg=6, rot=Matrix.Rotation(math.pi / 2, 3, 'X'))
    # finial spike under the hub pointing at the scale (a pointer needle for reading the tilt)
    s.lathe([(0.012, -p['hub_r'] - 0.004), (0.0, -p['hub_r'] - 0.05)], 'Mustard', seg=5, cap_top=False)
    o = s.build((0, 0, p['pivot_z']))
    return o


def cords(s, top, rim_pts, mat='Wire'):
    for q in rim_pts:
        s.tube([top, q], 0.0022, mat, sides=3, cap=False)


def build_pan_left():
    p = P; s = Part('pan_left'); D = p['lpan_drop']
    s.helix(-0.005, -0.06, 0.01, 4, 'Brass', wire=0.0024)
    # chunky teal saucer at the bottom
    sz = -D; sr, sh = p['saucer_r'], p['saucer_h']
    s.lathe([(sr * 0.45, sz), (sr * 0.8, sz + sh * 0.35), (sr, sz + sh * 0.8), (sr * 0.97, sz + sh), (sr * 0.6, sz + sh * 0.85)], 'Teal', seg=14)
    s.lathe([(sr * 0.97, sz + sh), (sr * 0.99, sz + sh + 0.008)], 'Mustard', seg=14, cap_bot=False)
    # red bowl sitting on the saucer
    bz = sz + sh * 0.85; R, Hh = p['bowl_r'], p['bowl_h']
    s.lathe([(R * 0.5, bz), (R * 0.88, bz + Hh * 0.45), (R, bz + Hh), (R * 0.9, bz + Hh), (R * 0.35, bz + Hh * 0.3)], 'Red', seg=12)
    # cream teacup tipped in the bowl, handle side raised so it reads from the 3/4 view
    rot = Matrix.Rotation(math.radians(p['cup_tilt']), 3, 'Y') @ Matrix.Rotation(math.radians(40), 3, 'Z')
    c = Vector((0.015, 0, bz + Hh * 0.75)); cr, ch = p['cup_r'], p['cup_h']
    s.lathe([(cr * 0.5, 0), (cr * 0.85, ch * 0.4), (cr, ch), (cr * 0.9, ch), (cr * 0.4, ch * 0.25)], 'Cream', seg=12, at=c, rot=rot)
    hp = [rot @ Vector((-cr * 0.93 - 0.04 * math.sin(math.pi * i / 6), 0, ch * (0.85 - 0.6 * i / 6))) + c for i in range(7)]
    s.tube(hp, 0.0085, 'Cream', sides=5)
    # a little brass spreader bar under the spring, two straight cords down to the bowl rim (clear of the cup)
    s.box((0, 0, -0.063), (2 * R + 0.012, 0.006, 0.006), 'Brass')
    for sx in (-1, 1):
        s.tube([(sx * R, 0, -0.063), (sx * R, 0, bz + Hh)], 0.0024, 'Wire', sides=3, cap=False)
    return s.build()


def build_pan_right():
    p = P; s = Part('pan_right'); D = p['rpan_drop']
    s.helix(-0.005, -0.11, 0.0095, 5, 'Brass', wire=0.0024)
    s.box((0, 0, -0.114), (0.05, 0.004, 0.004), 'Brass')
    R, Hh = p['rbowl_r'], p['rbowl_h']; bz = -D
    s.lathe([(0.028, bz - 0.022), (0.04, bz - 0.016), (R * 0.45, bz - 0.014), (R * 0.85, bz + Hh * 0.55), (R * 1.08, bz + Hh), (R, bz + Hh + 0.004), (R * 0.4, bz + Hh * 0.35)],
            'Mustard', seg=12)
    top = (0, 0, -0.114)
    cords(s, top, [(R * math.cos(a), R * math.sin(a), bz + Hh) for a in (math.pi * 0.17, math.pi * 0.83, math.pi * 1.5)])
    return s.build()


def build_bell():
    p = P; s = Part('bell'); r, h = p['bell_r'], p['bell_h']
    # origin at the hanging point; bell hangs off a little red loop, lip flares at the bottom
    s.tube([(-0.007, 0, 0.0), (0, 0, 0.008), (0.007, 0, 0.0)], 0.0025, 'Red', sides=3, cap=False)
    s.lathe([(r * 1.05, -h), (r * 0.95, -h * 0.85), (r * 0.62, -h * 0.4), (r * 0.42, -h * 0.08), (0.004, 0)], 'Brass', seg=10)
    s.lathe([(0.008, -h * 1.15), (0.009, -h * 1.05), (0.002, -h * 0.9)], 'Red', seg=6)   # clapper
    return s.build(P['bell_hang'])


# ---------------------------------------------------------------- motion
def tilt_deg(f):
    p = P
    if f <= p['start_f']:
        return p['rest_deg']
    t = (f - p['start_f']) / (120 - p['start_f'])
    osc = p['kick_deg'] * math.exp(-p['decay'] * t) * math.sin(2 * math.pi * p['cycles'] * t)
    fade = 1 - (max(0.0, t - 0.8) / 0.2) ** 2 * (3 - 2 * max(0.0, t - 0.8) / 0.2) if t > 0.8 else 1.0
    return p['rest_deg'] + osc * fade


def animate(beam, pl, pr, bell):
    sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, 120; sc.render.fps = 24
    try:
        bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
    except Exception:
        pass
    piv = Vector((0, 0, P['pivot_z']))
    for f in range(1, 121):
        th = math.radians(tilt_deg(f))
        # beam rotates about Y; positive Y-rotation lifts... we keep the convention that the left (teacup) end sits low at rest
        beam.rotation_euler = (0, th, 0); beam.keyframe_insert('rotation_euler', frame=f)
        R = Matrix.Rotation(th, 3, 'Y')
        # springy cords: a little vertical lag bounce proportional to the beam's angular speed
        vel = (tilt_deg(f + 1) - tilt_deg(f - 1)) if 1 < f < 120 else 0.0
        for o, sx in ((pl, -1), (pr, 1)):
            hp = piv + R @ Vector((sx * P['hang_x'], 0, P['hang_dz']))
            hp.z += 0.0012 * vel * sx
            o.location = hp; o.rotation_euler = (0, 0, 0)
            o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)
        # bell: rung by the beam, plus an idle wiggle with whole cycles over the loop
        u = (f - 1) / 120
        rx = 4.0 * math.sin(2 * math.pi * 3 * u)
        ry = 6.0 * math.sin(2 * math.pi * 4 * u + 0.6) + 0.9 * (tilt_deg(f) - P['rest_deg'])
        bell.rotation_euler = (math.radians(rx), math.radians(ry), 0); bell.keyframe_insert('rotation_euler', frame=f)
    # the pans must clear their cradles at every frame
    dg = bpy.context.evaluated_depsgraph_get()
    for o, (cx, ctop) in ((pl, P['cradle_l']), (pr, P['cradle_r'])):
        low = min(v.co.z for v in o.data.vertices)
        zs = []
        for f in range(1, 121):
            sc.frame_set(f); zs.append(o.matrix_world.translation.z + low)
        gap = min(zs) - ctop
        print('GAP', o.name, round(gap, 4))
        assert gap >= P['min_gap'], (o.name, gap)
    sc.frame_set(1)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    make_mats()
    stand = build_stand(); beam = build_beam(); pl = build_pan_left(); pr = build_pan_right(); bell = build_bell()
    animate(beam, pl, pr, bell)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_anim_scene_split_object=False, export_apply=True)
    dg = bpy.context.evaluated_depsgraph_get(); tris = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); print(o.name, len(m.loop_triangles), len(o.data.polygons)); o.evaluated_get(dg).to_mesh_clear()
    print('TRIS', tris, 'tilt range', min(tilt_deg(f) for f in range(1, 121)), max(tilt_deg(f) for f in range(1, 121)))


if __name__ == '__main__':
    main()
