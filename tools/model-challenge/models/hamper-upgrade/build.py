"""Lidded reed hamper (BA-0023), style A upgrade. `python build.py` writes hamper-upgrade.glb.
Z up, metres, origin at footprint centre on the ground, long (latch) face toward -Y.
The weave is real geometry: every weft strand is a strip whose depth alternates over/under at each stake,
offset by one stake on the next row, so the faceted light reads as a basket weave."""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

P = dict(
    L=0.70, D=0.33, H=0.31, taper=0.010,          # body at the rim; the base is `taper` narrower per side
    stake=0.05, row=0.015, gap=0.0035, amp=0.0045, lid_stake=0.05, lid_row=0.02, # weave: stake pitch, strand height, gap, over/under depth
    base_r=0.019, rim_r=0.018,                      # rolled base and body rim
    lid_over=0.016, lid_z0=0.312, lid_band_r=0.024, lid_band_radii=(0.031, 0.022, 0.019), lid_bands=3, lid_top_r=0.012, lid_dome=0.006,
    handle_w=0.15, handle_out=0.068, handle_up=0.12, handle_z=0.255, rope_r=0.0145,
    latch_len=0.17, toggle_z=0.17,
    wrap=0.07,                                      # spacing of the wrap ridges on the body rim and lowest lid band
    open_deg=72, frames=(1, 18, 44, 76, 102, 120),
)
# linear RGB. Reed = honey wicker #B9763F; ReedShade ~12% darker; rims a little darker than the reed
C = dict(Reed=(0.485, 0.181, 0.050), ReedShade=(0.366, 0.138, 0.038), ReedDark=(0.20, 0.07, 0.018),
         RimReed=(0.392, 0.138, 0.034), RimShade=(0.31, 0.107, 0.026), Rope=(0.33, 0.12, 0.03), Toggle=(0.16, 0.06, 0.016))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hamper-upgrade.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
MATS = {}
for k, c in C.items():
    m = bpy.data.materials.new(k); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = 0.82
    MATS[k] = m


def obj(name, verts, faces, mat, parent=None, mats=None, fmat=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    for k in (mats or [mat]):
        me.materials.append(MATS[k])
    if fmat:
        for p, i in zip(me.polygons, fmat):
            p.material_index = i
    if parent:
        o.parent = parent
    return o


def weave_panel(origin, u, v, n, width, height, phase, verts, faces, fm, mi=0, shade=4, stake=None, row=None, gap=None):
    """Weft strands on a flat panel. origin = lower-left corner, u along the panel, v up, n outward.
    Each strand is one quad tall (thin wicker, so twice the rows fit the budget); its depth alternates per stake."""
    u, v, n = Vector(u), Vector(v), Vector(n)
    cells = max(2, round(width / (stake or P['stake']))); rows = max(1, round(height / (row or P['row'])))
    rh = height / rows
    for r in range(rows):
        g = P['gap'] if gap is None else gap
        z0 = r * rh + g / 2; z1 = (r + 1) * rh - g / 2
        base = len(verts)
        for i in range(cells + 1):
            x = width * i / cells
            s = 1 if (i + r + phase) % 2 == 0 else -1
            d = P['amp'] * (1.5 + s)                      # over = 2.5a out, under = 0.5a out
            for zz, dd in ((z0, d * 0.85), (z1, d)):         # top edge proud of the bottom: a little bevel light
                verts.append(tuple(Vector(origin) + u * x + v * zz + n * dd))
        for i in range(cells):
            a = base + i * 2; b = a + 2
            k = shade if (i + r + phase) % 2 else mi        # the strand dives behind the next stake: shade it
            faces.append((a, b, b + 1, a + 1)); fm.append(k)
    return cells


def box(verts, faces, fm, lo, hi, mi, top_shrink=0.0, open_top=False):
    b = len(verts); (x0, y0, z0), (x1, y1, z1) = lo, hi; s = top_shrink
    verts += [(x0 + s, y0 + s, z0), (x1 - s, y0 + s, z0), (x1 - s, y1 - s, z0), (x0 + s, y1 - s, z0),
              (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        if open_top and f == (4, 5, 6, 7):
            continue
        faces.append(tuple(b + i for i in f)); fm.append(mi)


def rrect(cx, cy, hx, hy, rad, z, seg=2, step=0.0):
    """Closed rounded-rectangle path (list of Vectors), seg extra points per corner;
    step > 0 also subdivides the straight runs (used for the wrapped-rim ridges)."""
    pts = []
    for (sx, sy, a0) in ((1, -1, -90), (1, 1, 0), (-1, 1, 90), (-1, -1, 180)):
        c = Vector((cx + sx * (hx - rad), cy + sy * (hy - rad), z))
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg); pts.append(c + Vector((math.cos(a), math.sin(a), 0)) * rad)
    if step <= 0:
        return pts
    out = []
    for i, p in enumerate(pts):
        q = pts[(i + 1) % len(pts)]; n = max(1, round((q - p).length / step))
        out += [p.lerp(q, k / n) for k in range(n)]
    return out


def rope_radii(n, r):
    """Fat strand bulges with tight pinches between them: with a twisting profile this reads as laid rope."""
    return [r * (1.0 if i % 2 == 0 else 0.68) for i in range(n)]


def ridged(path, r, low=0.84):
    return [r * (1.0 if i % 2 == 0 else low) for i in range(len(path))]


def sweep(path, r, sides, closed, verts, faces, fm, mi, twist=0.0, squash=1.0, radii=None, seg_mi=None):
    """Tube along a polyline. twist rotates the profile per point (rope / wrapped-rim facets)."""
    n = len(path); base = len(verts)
    for i, p in enumerate(path):
        t = (path[(i + 1) % n] - path[i - 1]) if closed else (path[min(i + 1, n - 1)] - path[max(i - 1, 0)])
        t.normalize()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        a = t.cross(up).normalized(); b = t.cross(a).normalized()
        rr = radii[i] if radii else r
        for k in range(sides):
            ang = 2 * math.pi * k / sides + twist * i
            verts.append(tuple(p + a * math.cos(ang) * rr + b * math.sin(ang) * rr * squash))
    segs = n if closed else n - 1
    for i in range(segs):
        j = (i + 1) % n
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((base + i * sides + k, base + i * sides + k2, base + j * sides + k2, base + j * sides + k))
            fm.append(seg_mi[i] if seg_mi else mi)
    if not closed:
        for e in (0, n - 1):
            ring = [base + e * sides + k for k in range(sides)]
            faces.append(tuple(ring if e else ring[::-1])); fm.append(mi)


# ------------------------------------------------------------------ body (one mesh: it never moves apart)
L, D, H, tp = P['L'], P['D'], P['H'], P['taper']
V, F, FM = [], [], []                       # material slots: 0 Reed, 1 ReedDark, 2 RimReed
z_lo = P['base_r'] * 1.6; wh = H - z_lo - P['rim_r'] * 0.6
# dark inner core shows through the gaps between strands (tapered box)
box(V, F, FM, (-L / 2 + 0.006, -D / 2 + 0.006, 0.0), (L / 2 - 0.006, D / 2 - 0.006, H), 1, top_shrink=tp, open_top=True)


def face_frame(side):
    """lower-left origin, u, v (tilted for the taper), n for each of the four faces."""
    hx, hy = L / 2 - 0.006, D / 2 - 0.006
    if side == 'front':
        return (-hx + tp, -hy + tp, z_lo), (1, 0, 0), (0, -tp / H, 1), (0, -1, 0), 2 * (hx - tp)
    if side == 'back':
        return (hx - tp, hy - tp, z_lo), (-1, 0, 0), (0, tp / H, 1), (0, 1, 0), 2 * (hx - tp)
    if side == 'right':
        return (hx - tp, -hy + tp, z_lo), (0, 1, 0), (tp / H, 0, 1), (1, 0, 0), 2 * (hy - tp)
    return (-hx + tp, hy - tp, z_lo), (0, -1, 0), (-tp / H, 0, 1), (-1, 0, 0), 2 * (hy - tp)


for ph, s in enumerate(('front', 'right', 'back', 'left')):
    o, u, v, n, w = face_frame(s)
    weave_panel(o, u, v, n, w, wh, ph, V, F, FM, 0)
# corner posts (thick upright canes that bind the panels) as 4-sided tubes
for sx in (-1, 1):
    for sy in (-1, 1):
        path = [Vector((sx * (L / 2 - tp - 0.004), sy * (D / 2 - tp - 0.004), 0.01)), Vector((sx * (L / 2 - 0.004), sy * (D / 2 - 0.004), H))]
        sweep(path, 0.011, 4, False, V, F, FM, 2, twist=0)
# rolled base and rim: 6-sided tubes whose profile twists per point, so they read as wrapped
sweep(rrect(0, 0, L / 2 - tp + 0.008, D / 2 - tp + 0.008, 0.035, P['base_r'], 2), P['base_r'], 6, True, V, F, FM, 2, squash=0.9)
sweep(rrect(0, 0, L / 2 + 0.004, D / 2 + 0.004, 0.03, H - P['rim_r'] * 0.3, 2), P['rim_r'], 6, True, V, F, FM, 2)
# toggle peg on the front, under the latch loop
tz = P['toggle_z']; sweep([Vector((-0.04, -D / 2 - 0.004, tz)), Vector((0, -D / 2 - 0.01, tz + 0.004)), Vector((0.04, -D / 2 - 0.004, tz))], 0.011, 6, False, V, F, FM, 3)
body = obj('basket_body', V, F, None, mats=['Reed', 'ReedDark', 'RimReed', 'Toggle', 'ReedShade'], fmat=FM)

# ------------------------------------------------------------------ rope handles on both ends
for sx, nm in ((1, 'handle_right'), (-1, 'handle_left')):
    V, F, FM = [], [], []
    path = []
    N = 18
    for i in range(N + 1):
        t = math.pi * i / N
        path.append(Vector((sx * (L / 2 + 0.008 + P['handle_out'] * math.sin(t)), P['handle_w'] / 2 * math.cos(t),
                            P['handle_z'] + P['handle_up'] * math.sin(t))))
    sweep(path, P['rope_r'], 6, False, V, F, FM, 0, twist=0.7, radii=rope_radii(N + 1, P['rope_r']))
    # knotted ends where the rope passes through the weave
    for y in (P['handle_w'] / 2, -P['handle_w'] / 2):
        c = Vector((sx * (L / 2 + 0.006), y, P['handle_z']))
        sweep([c + Vector((0, 0, -0.016)), c + Vector((sx * 0.012, 0, 0)), c + Vector((0, 0, 0.016))], 0.014, 5, False, V, F, FM, 0)
    obj(nm, V, F, 'Rope', parent=body)

# ------------------------------------------------------------------ lid (pivots on its back edge)
lo = P['lid_over']; lx, ly = L / 2 + lo, D / 2 + lo
hinge = Vector((0, D / 2 + 0.004, P['lid_z0']))
lid = bpy.data.objects.new('lid', None); sc.collection.objects.link(lid); lid.location = hinge
lid.empty_display_size = 0.05
V, F, FM = [], [], []                      # 0 Reed, 1 ReedDark, 2 RimReed, 3 Rope
br = P['lid_band_r']; z = 0.0; rprev = None
for b, r in enumerate(P['lid_band_radii']):
    last = b == len(P['lid_band_radii']) - 1
    ins = (0.008, 0.016, 0.03)[b]       # fat bottom roll overhangs the body; the upper bands step in (rounded shoulder)
    z = r * 0.95 if rprev is None else z + (r + rprev) * 0.8
    rprev = r
    pth = [p - hinge for p in rrect(0, 0, lx - ins, ly - ins, 0.05, P['lid_z0'] + z, 3, step=P['wrap'] if b == 0 else 0)]
    wrapped = b == 0                     # lowest band: alternating wraps (ridge + shade) read as bound cane
    sweep(pth, r, 6, True, V, F, FM, 2, squash=0.9, radii=ridged(pth, r) if wrapped else None,
          seg_mi=[2 if i % 2 else 5 for i in range(len(pth))] if wrapped else None)
top_z = P['lid_z0'] + z + br * 0.3
# lid top: core plate + over/under strands running along X
box(V, F, FM, (-lx + 0.035 - hinge.x, -ly + 0.035 - hinge.y, P['lid_z0'] + 0.01 - hinge.z), (lx - 0.035 - hinge.x, ly - 0.035 - hinge.y, top_z - 0.0068 - hinge.z), 4)   # plate in the under-shade, so gaps read as fine lines
o = Vector((-lx + 0.03, -ly + 0.03, top_z - 0.008)) - hinge
weave_panel(o, (1, 0, 0), (0, 1, 0), (0, 0, 1), 2 * lx - 0.06, 2 * ly - 0.06, 1, V, F, FM, 0, stake=P['lid_stake'], row=P['lid_row'], gap=0.002)
# gentle dome: lift the top strands toward the middle
for i, p in enumerate(V):
    w = Vector(p) + hinge
    if w.z > top_z - 0.0085 or abs(w.z - (top_z - 0.0068)) < 1e-4:
        f = (1 - (w.x / lx) ** 2) * (1 - (w.y / ly) ** 2)
        V[i] = (p[0], p[1], p[2] + P['lid_dome'] * max(0, f))
sweep([p - hinge for p in rrect(0, 0, lx - 0.03, ly - 0.03, 0.04, top_z + 0.002, 3)], P["lid_top_r"], 6, True, V, F, FM, 2, twist=0.0)
# rope lashings at the hinge (two wraps binding lid band to body rim)
for x in (-0.2, 0.2):
    c = Vector((x, D / 2 + 0.01, P['lid_z0'] - 0.004)) - hinge
    ring = [c + Vector((0, 0.022 * math.cos(a), 0.022 * math.sin(a))) for a in [2 * math.pi * k / 6 for k in range(6)]]
    sweep(ring, 0.006, 4, True, V, F, FM, 3)
lid_mesh = obj('lid_shell', V, F, None, parent=lid, mats=['Reed', 'ReedDark', 'RimReed', 'Rope', 'ReedShade', 'RimShade'], fmat=FM)

# latch: a rope loop hanging from the lid front over the toggle
V, F, FM = [], [], []
fy = -ly - 0.008; zt = P['lid_z0'] + br; zb = P['toggle_z'] - 0.02
path = []
N = 14
for i in range(N + 1):
    t = 2 * math.pi * i / N
    path.append(Vector((0.026 * math.sin(t), fy + 0.006 * (1 - math.cos(t)) - 0.004 * (1 - math.cos(t / 2)),
                        zt - (zt - zb) * (1 - math.cos(t)) / 2)))
knot = Vector((0, fy - 0.006, zt + 0.004))       # the loop swings from the knot tied to the lid band
lr = 0.0105
sweep([p - knot for p in path[:-1]], lr, 6, True, V, F, FM, 0, twist=0.7, radii=rope_radii(N, lr))
c = Vector((0, 0, 0))                             # top knot binding the loop to the lid band
sweep([c + Vector((-0.02, 0.004, -0.004)), c + Vector((0, -0.012, 0.006)), c + Vector((0.02, 0.004, -0.004))], 0.015, 6, False, V, F, FM, 0)
# lower knot: a fat coil where the loop's two legs are tied, under the toggle
kz = Vector((0, fy - 0.004, zb - 0.004)) - knot
coil = [kz + Vector((0.017 * math.cos(a), -0.008 * math.sin(a) - 0.004, 0.012 * math.sin(a))) for a in [2 * math.pi * k / 7 for k in range(7)]]
sweep(coil, 0.0105, 5, True, V, F, FM, 0)
# hanging tail, tapering, with a slight kick to one side
tail = [kz + Vector((0.006 * math.sin(i * 0.7), -0.006 + 0.0015 * i, -0.012 - 0.015 * i)) for i in range(7)]
sweep(tail, lr, 6, False, V, F, FM, 0, twist=0.7, radii=[lr * (1.0 - 0.07 * i) * (1.0 if i % 2 == 0 else 0.72) for i in range(7)])
latch = bpy.data.objects.new('latch_pivot', None); sc.collection.objects.link(latch)
latch.parent = lid; latch.location = knot - hinge; latch.empty_display_size = 0.02
obj('latch_loop', V, F, 'Rope', parent=latch)

# ------------------------------------------------------------------ animation: lift, hold, close (loop)
sc.render.fps = 24; sc.frame_start, sc.frame_end = P['frames'][0], P['frames'][-1]
a = -math.radians(P['open_deg'])
f0, f1, f2, f3, f4, f5 = P['frames']
# lid: rest, lift on the hinge, hold, close, a tiny bounce as it lands, rest (first = last: seamless loop)
for f, ang in ((f0, 0), (f1, 0), (f2, a), (f3, a), (f4, 0), (f4 + 5, a * 0.04), (f4 + 10, 0), (f5, 0)):
    lid.rotation_euler = (ang, 0, 0); lid.keyframe_insert('rotation_euler', index=0, frame=f)
# latch loop: lags behind the lid, swings past plumb and settles hanging down, then drops back over the toggle
for f, ang in ((f0, 0), (f1, 0), (f2 - 6, -a * 0.6), (f2 + 4, -a * 1.0), (f2 + 12, -a * 0.82), (f3, -a * 0.88),
               (f4, 0), (f5, 0)):
    latch.rotation_euler = (ang, 0, 0); latch.keyframe_insert('rotation_euler', index=0, frame=f)

# flat shading everywhere (low-poly facets carry the weave)
for ob in sc.objects:
    if ob.type == 'MESH':
        for p in ob.data.polygons:
            p.use_smooth = False

tris = 0
for ob in sc.objects:
    if ob.type == 'MESH':
        ob.data.calc_loop_triangles(); tris += len(ob.data.loop_triangles); print(ob.name, len(ob.data.loop_triangles))
print('triangles', tris)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                          export_animation_mode='SCENE', export_apply=True,
                          export_anim_scene_split_object=False)   # one clip for lid + latch, not one per object
