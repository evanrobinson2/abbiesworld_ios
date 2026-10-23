import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 60

    def material(name, color, roughness, metallic=0.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, 1)
        p.inputs["Roughness"].default_value = roughness
        p.inputs["Metallic"].default_value = metallic
        return m

    woods = [
        material("Timber honey brown", (0.29, 0.145, 0.063), 0.8),
        material("Timber weathered gold", (0.37, 0.205, 0.097), 0.83),
        material("Timber dark end grain", (0.225, 0.112, 0.047), 0.86)
    ]
    zinc = material("Quiet galvanized zinc", (0.43, 0.49, 0.50), 0.57, 0.72)
    iron = material("Dark galvanized hardware", (0.17, 0.20, 0.20), 0.57, 0.75)
    watermat = material("Still blue green water", (0.055, 0.205, 0.205), 0.19, 0.22)
    wear = material("Subtle exposed timber grain", (0.43, 0.277, 0.138), 0.91)

    def mesh(name, verts, faces, mat, bevel=0):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        me.materials.append(mat)
        if bevel:
            mod = ob.modifiers.new("Economical worked edges", 'BEVEL')
            mod.width = bevel
            mod.segments = 1
            mod = ob.modifiers.new("Weighted corner normals", 'WEIGHTED_NORMAL')
            mod.keep_sharp = True
        return ob

    def box(name, loc, size, mat, bevel=0.003):
        x, y, z = [s / 2 for s in size]
        verts = [(a*x, b*y, c*z) for c in (-1, 1)
                 for b in (-1, 1) for a in (-1, 1)]
        faces = [(0,2,3,1),(4,5,7,6),(0,1,5,4),
                 (2,6,7,3),(0,4,6,2),(1,3,7,5)]
        ob = mesh(name, verts, faces, mat, bevel)
        ob.location = loc
        return ob

    def beam(name, a, b, width, depth, mat):
        a, b = Vector(a), Vector(b)
        ob = box(name, (a+b)/2, (width, depth, (b-a).length), mat)
        ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
        return ob

    def cylinder(name, center, radius, depth, axis, mat, sides=12):
        q = Vector(axis).normalized().to_track_quat('Z', 'Y')
        verts = []
        for h in (-depth/2, depth/2):
            for i in range(sides):
                angle = i * math.tau / sides
                v = q @ Vector((radius*math.cos(angle), radius*math.sin(angle), h))
                verts.append(tuple(v + Vector(center)))
        faces = [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))]
        faces += [(i, (i+1)%sides, (i+1)%sides+sides, i+sides)
                  for i in range(sides)]
        return mesh(name, verts, faces, mat)

    for x in (-0.67, 0.67):
        for y in (-0.225, 0.225):
            box("Square timber leg", (x,y,0.175), (0.115,0.115,0.35), woods[2], 0.006)
        box("Transverse basin bearer", (x,0,0.236), (0.15,0.635,0.085), woods[0], 0.005)
        box("Lower cross rail", (x,0,0.075), (0.085,0.49,0.07), woods[1])

    for y in (-0.225, 0.225):
        beam("Diagonal long frame brace", (-0.64,y,0.07), (-0.18,y,0.255),
             0.067, 0.052, woods[1])
        beam("Diagonal long frame brace", (0.64,y,0.07), (0.18,y,0.255),
             0.067, 0.052, woods[0])
        for x in (-0.65, 0.65):
            cylinder("Leg carriage bolt", (x,y+math.copysign(0.06,y),0.117),
                     0.012,0.008,(0,1,0),iron)

    box("Solid timber basin bottom", (0,0,0.265), (1.69,0.57,0.055), woods[2])

    def outer(z):
        t = (z-0.285)/0.365
        return 0.84+0.06*t, 0.29+0.06*t

    for row in range(3):
        lo = 0.285 + row*0.121
        hi = min(0.646, lo+0.119)
        xl, yl = outer(lo)
        xh, yh = outer(hi)
        for s in (-1, 1):
            verts = [(-xl,s*yl,lo),(xl,s*yl,lo),
                     (xh,s*yh,hi),(-xh,s*yh,hi),
                     (-xl,s*(yl-0.072),lo),(xl,s*(yl-0.072),lo),
                     (xh,s*(yh-0.072),hi),(-xh,s*(yh-0.072),hi)]
            faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),
                     (3,2,6,7),(0,3,7,4),(1,5,6,2)]
            ob = mesh("Long side timber course", verts, faces,
                      woods[(row+(s==1))%3], 0.002)
            if s == -1:
                for p in ob.data.polygons:
                    p.flip()
            verts = [(s*xl,-yl,lo),(s*xl,yl,lo),(s*xh,yh,hi),(s*xh,-yh,hi),
                     (s*(xl-.075),-yl,lo),(s*(xl-.075),yl,lo),
                     (s*(xh-.075),yh,hi),(s*(xh-.075),-yh,hi)]
            ob = mesh("Fitted end timber course", verts, faces, woods[(row+1)%3], 0.002)
            if s == 1:
                for p in ob.data.polygons:
                    p.flip()

    # Closed metal shell around an open cavity, with a folded protective lip.
    rings = [(0.75,0.20,0.295),(0.81,0.26,0.637),
             (0.90,0.35,0.65),(0.90,0.35,0.638),
             (0.821,0.271,0.627),(0.761,0.211,0.282)]
    verts = []
    for x,y,z in rings:
        verts.extend([(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)])
    faces = [(0,1,2,3)]
    for r in range(len(rings)-1):
        for i in range(4):
            j = (i+1)%4
            faces.append((4*r+i,4*(r+1)+i,4*(r+1)+j,4*r+j))
    faces.append((23,22,21,20))
    mesh("Folded galvanized liner and protective lip", verts, faces, zinc, 0.0015)

    for x in (-0.69, 0.69):
        for s in (-1, 1):
            beam("Taper-following retaining strap", (x,s*.294,.29),
                 (x,s*.351,.637), .043,.008,iron)
            for z in (0.345,0.466,0.588):
                _,y = outer(z)
                cylinder("Round strap washer", (x,s*(y+.007),z),
                         .015,.003,(0,1,0),zinc)
                cylinder("Hexagonal strap bolt", (x,s*(y+.011),z),
                         .009,.007,(0,1,0),iron,6)

    for s in (-1,1):
        for y in (-0.205,0.205):
            for z in (0.345,0.588):
                x,_ = outer(z)
                cylinder("End joint washer", (s*(x+.003),y,z),
                         .014,.003,(1,0,0),zinc)
                cylinder("End joint hex bolt", (s*(x+.008),y,z),
                         .009,.008,(1,0,0),iron,6)

    for s in (-1,1):
        for i in range(10):
            z = random.uniform(.315,.615)
            x = random.uniform(-.54,.48)
            length = random.uniform(.06,.20)
            _,y = outer(z)
            dy = .06/.365
            verts = [(x,s*(y+.001),z),
                     (x+length,s*(y+dy*.001+.001),z+.001),
                     (x+length*.86,s*(y+dy*.002+.001),z+.002),
                     (x+.025,s*(y+dy*.001+.001),z+.001)]
            face = (0,1,2,3) if s == -1 else (3,2,1,0)
            mesh("Quiet timber wear streak", verts, [face], wear)

    wx,wy,chamfer = .797,.247,.012
    points = [(-wx+chamfer,-wy),(wx-chamfer,-wy),(wx,-wy+chamfer),
              (wx,wy-chamfer),(wx-chamfer,wy),(-wx+chamfer,wy),
              (-wx,wy-chamfer),(-wx,-wy+chamfer)]
    water = mesh("Water full to empty", [(x,y,0) for x,y in points],
                 [tuple(range(8))], watermat)

    # Sample the drain explicitly: no Action.fcurves access is required.
    # The surface stays within the narrowing cavity, then passes beneath its floor.
    for frame in range(1,61):
        t = (frame-1)/59
        water.location.z = .587 + (.289-.587)*t
        water.scale = (1-.065*t, 1-.21*t, 1)
        water.keyframe_insert(data_path="location", frame=frame, group="Water level")
        water.keyframe_insert(data_path="scale", frame=frame, group="Water level")
    water.animation_data.action.name = "water_state"
    scene.frame_set(1)

    return {
        "animationRanges": {"water_state": [1,60]},
        "notes": "Hollow 1.8 m timber trough with continuous metal liner, grounded braced legs and bolted straps. Low-cost single-segment timber bevels and unbeveled small hardware keep geometry under 5000 triangles. Separate water drains inside the tapered cavity and is completely concealed beneath the opaque metal floor at frame 60."
    }