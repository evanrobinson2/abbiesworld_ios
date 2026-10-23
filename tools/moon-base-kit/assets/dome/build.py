"""MK-029 Main dome, upgraded from MR-002. Matched to the Midjourney pick: a 10 m geodesic dome of triangle panels,
mostly off-white hull with a band of dark glass, a few big lower panes glowing warm orange from the living room
inside, all held by a dark gunmetal strut frame. It sits on a chunky ring foundation of framed segments with an
orange stripe and little status lamps, and a framed entrance tunnel with an arched door frame, an inner hatch and two
warm windows. Diegetic: the warm panes dim when everyone is out, and the tunnel lamp goes green when the airlock is
ready."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
import bmesh, bpy

R, SQ, Z0 = 5.0, 0.92, 0.9  # dome radius, vertical squash, dome base height (top of the ring foundation)


def shell(name, faces, mtl, thick, fill):
    """Make one part from a set of dome faces, thickened inward into a closed panel shell."""
    bm = bmesh.new()
    vmap = {}
    for f in faces:
        vs = []
        for v in f:
            key = tuple(round(c, 5) for c in v)
            if key not in vmap:
                vmap[key] = bm.verts.new(v)
            vs.append(vmap[key])
        bm.faces.new(vs)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    md = o.modifiers.new('thick', 'SOLIDIFY')
    md.thickness = thick
    md.offset = -1
    k.apply_mods(o)
    return k._finish(o, mtl, 0, fill=fill)


# geodesic hemisphere: a frequency-2 icosphere, upper half only
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=R, location=(0, 0, 0))
ico = bpy.context.object
tris = []
for p in ico.data.polygons:
    vs = [ico.data.vertices[i].co.copy() for i in p.vertices]
    if min(v.z for v in vs) < -0.05:
        continue
    tris.append([(v.x, v.y, max(v.z, 0) * SQ + Z0) for v in vs])
bpy.data.objects.remove(ico)

hull, glass, warm = [], [], []
for t in tris:
    cx = sum(v[0] for v in t) / 3
    cy = sum(v[1] for v in t) / 3
    cz = (sum(v[2] for v in t) / 3 - Z0) / (R * SQ)
    a = math.atan2(cy, cx)
    if cz < 0.45 and cy < -1.0 and -2.9 < a < -1.75:
        warm.append(t)          # the big lower front panes: the living room glowing
    elif 0.45 < cz < 0.82 and math.sin(3 * a + 0.4) > 0.1:
        glass.append(t)         # the dark glass band
    else:
        hull.append(t)
shell('DomeHull', hull, 'Metal_Hull', 0.12, 0.08)
shell('DomeGlass', glass, 'Glass_Window', 0.06, 1.0)
shell('DomeWarmPanes', warm, 'Window_Warm', 0.06, 1.0)
# the strut frame over every panel edge
frame = shell('DomeFrame', tris, 'Metal_Gunmetal', 0.02, 0.5)
wf = frame.modifiers.new('struts', 'WIREFRAME')
wf.thickness = 0.16
wf.offset = 0.4
k.apply_mods(frame)
k.cyl('DomeFloor', R - 0.2, 0.1, (0, 0, Z0 + 0.02), 'Metal_HullDark', n=24)
k.sphere('LivingGlow', 1.4, (-1.2, -1.6, Z0 + 1.0), 'Window_Warm', seg=10, rings=6, scale=(1, 1, 0.6))

# ring foundation: framed segments, clamps between, an orange stripe
N = 14
for i in range(N):
    a = TAU * (i + 0.5) / N
    if abs(math.atan2(math.sin(a), math.cos(a)) - (-math.pi / 2 + 0.25)) < 0.3:
        continue  # leave room for the tunnel at the front
    x, y = (R + 0.15) * math.cos(a), (R + 0.15) * math.sin(a)
    w = 2 * (R + 0.15) * math.sin(math.pi / N) * 0.9
    k.box(f'RingSegment{i:02d}', (w, 1.0, 0.85), (x, y, 0.45), 'Metal_Hull', bevel=0.12, rot=(0, 0, a + math.pi / 2), fill=0.3)
    k.box(f'RingStripe{i:02d}', (w * 0.96, 0.04, 0.06), (x + 0.51 * math.cos(a), y + 0.51 * math.sin(a), 0.55), 'OrangeBand',
          bevel=0, rot=(0, 0, a + math.pi / 2))
    b = TAU * i / N
    k.box(f'RingClamp{i:02d}', (0.4, 1.15, 0.98), ((R + 0.15) * math.cos(b), (R + 0.15) * math.sin(b), 0.47), 'Metal_Gunmetal',
          bevel=0.1, rot=(0, 0, b + math.pi / 2), fill=0.5)
    if i % 3 == 1:
        k.box(f'RingLamp{i:02d}', (0.14, 0.05, 0.08), (x + 0.52 * math.cos(a), y + 0.52 * math.sin(a), 0.3), 'Lamp_Red',
              bevel=0.01, rot=(0, 0, a + math.pi / 2))

# entrance tunnel at the front (-Y), slightly right of centre like the pick
TX = 1.3
k.cyl('TunnelBody', 1.25, 3.0, (TX, -R - 0.4, 1.35), 'Metal_Hull', rot=(math.pi / 2, 0, 0), n=14, bevel=0.06, fill=0.25)
k.box('TunnelSkid', (2.3, 3.0, 0.5), (TX, -R - 0.4, 0.25), 'Metal_Gunmetal', bevel=0.08)
k.cyl('TunnelMouth', 1.0, 0.3, (TX, -R - 1.82, 1.35), 'Metal_HullDark', rot=(math.pi / 2, 0, 0), n=14)
k.cyl('InnerHatch', 0.6, 0.08, (TX, -R - 1.98, 1.3), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=16, bevel=0.03)
k.cyl('HatchPort', 0.18, 0.04, (TX, -R - 2.03, 1.45), 'Window_Warm', rot=(math.pi / 2, 0, 0), n=10)
k.torus('HatchWheel', 0.22, 0.03, (TX, -R - 2.05, 1.15), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=12, m=6)
k.torus('ArchFrame', 1.3, 0.18, (TX, -R - 1.95, 1.35), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=24, m=6)
for s in (-1, 1):
    k.box(f'ArchLeg{"L" if s < 0 else "R"}', (0.36, 0.4, 1.4), (TX + s * 1.3, -R - 1.95, 0.7), 'Metal_Gunmetal', bevel=0.08)
    k.window(f'TunnelWindow{"L" if s < 0 else "R"}', 0.42, 0.7, (TX + s * 1.22, -R - 0.7, 1.35), face='-X' if s < 0 else '+X', depth=0.12)
k.box('TunnelLamp', (0.4, 0.06, 0.1), (TX, -R - 2.1, 2.82), 'Lamp_Green', bevel=0.02)
k.cyl('AntennaMast', 0.04, 1.6, (R - 0.6, -2.4, 1.7), 'Metal_Steel', n=6)
k.sphere('AntennaTip', 0.07, (R - 0.6, -2.4, 2.55), 'Lamp_Red', seg=8, rings=5)
k.build(HERE, {'id': 'MK-029', 'name': 'Main dome, upgraded', 'pivot': 'dome centre; the tunnel reaches out the front'}, bake_size=2048,
        view=dict(yaw=18, pitch=12), fps_eye=((4.5, -15.0, 1.1), (0.5, -2.0, 2.6)))
