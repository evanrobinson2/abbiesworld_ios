import bpy
import bmesh
import math
import random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 60

    def material(name, color, roughness, metallic=0.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*color, 1.0)
        p.inputs['Roughness'].default_value = roughness
        p.inputs['Metallic'].default_value = metallic
        m.diffuse_color = (*color, 1.0)
        return m

    wood = material('Timber - warm weathered oak', (0.34, 0.19, 0.085), 0.79)
    honey = material('Timber - lighter boards and rubbed edges', (0.395, 0.231, 0.112), 0.77)
    darkwood = material('Timber - darker heartwood', (0.278, 0.145, 0.064), 0.83)
    grainmat = material('Timber - quiet grain and knots', (0.226, 0.111, 0.045), 0.86)
    zinc = material('Galvanized lining and folded rim', (0.49, 0.55, 0.55), 0.46, 0.72)
    iron = material('Aged iron retaining bands', (0.115, 0.143, 0.145), 0.53, 0.72)
    steel = material('Zinc plated bolt heads', (0.51, 0.55, 0.53), 0.34, 0.79)
    watermat = material('Water - subdued green blue', (0.037, 0.184, 0.163), 0.17, 0.08)
    wp = watermat.node_tree.nodes.get('Principled BSDF')
    wp.inputs['Transmission Weight'].default_value = 0.32
    wp.inputs['IOR'].default_value = 1.333

    timber_collection = bpy.data.collections.new('Timber basin and trestles')
    metal_collection = bpy.data.collections.new('Metal lining and hardware')
    water_collection = bpy.data.collections.new('Animated water')
    scene.collection.children.link(timber_collection)
    scene.collection.children.link(metal_collection)
    scene.collection.children.link(water_collection)

    def mesh_object(name, verts, faces, mat, collection=timber_collection,
                    bevel=0.0, recalc=True, smooth=False):
        mesh = bpy.data.meshes.new(name + ' mesh')
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        if recalc:
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            bm.to_mesh(mesh)
            bm.free()
            mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        mesh.materials.append(mat)
        for poly in mesh.polygons:
            poly.use_smooth = smooth
        if bevel:
            mod = obj.modifiers.new('Small worn construction edges', 'BEVEL')
            mod.width = bevel
            mod.segments = 1
            mod.affect = 'EDGES'
        return obj

    cube_faces = [
        (0, 3, 2, 1), (4, 5, 6, 7),
        (0, 1, 5, 4), (1, 2, 6, 5),
        (2, 3, 7, 6), (3, 0, 4, 7)
    ]

    def box(name, center, dimensions, mat, bevel=0.002,
            collection=timber_collection):
        x, y, z = (v * 0.5 for v in dimensions)
        c = Vector(center)
        verts = [tuple(c + Vector(v)) for v in
                 [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
                  (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]]
        return mesh_object(name, verts, cube_faces, mat, collection, bevel)

    def beam(name, p0, p1, width, depth, mat):
        p0, p1 = Vector(p0), Vector(p1)
        direction = (p1 - p0).normalized()
        u = direction.cross(Vector((0, 0, 1)))
        if u.length < 0.01:
            u = direction.cross(Vector((0, 1, 0)))
        u.normalize()
        v = direction.cross(u).normalized()
        verts = []
        for p in (p0, p1):
            for a, b in [(-1,-1),(1,-1),(1,1),(-1,1)]:
                verts.append(tuple(p + u * a * width / 2 + v * b * depth / 2))
        return mesh_object(name, verts, cube_faces, mat, bevel=0.003)

    def outer(z):
        t = (z - 0.245) / 0.395
        return 0.795 + 0.105*t, 0.245 + 0.105*t

    # Twelve substantial miter-ended planks form the wooden, open vessel.
    courses = [(0.274, 0.394), (0.3955, 0.5165), (0.518, 0.640)]
    board_mats = [darkwood, wood, honey]
    for side in (-1, 1):
        for row, (lo, hi) in enumerate(courses):
            verts = []
            for z in (lo, hi):
                ox, oy = outer(z)
                ix, iy = ox - 0.045, oy - 0.045
                verts += [(-ox, side*oy, z), (ox, side*oy, z),
                          (ix, side*iy, z), (-ix, side*iy, z)]
            mesh_object('Long wall %s plank %d' % (side, row+1),
                        verts, cube_faces, board_mats[row], bevel=0.0014)
        for row, (lo, hi) in enumerate(courses):
            verts = []
            for z in (lo, hi):
                ox, oy = outer(z)
                ix, iy = ox - 0.045, oy - 0.045
                verts += [(side*ox, -oy, z), (side*ox, oy, z),
                          (side*ix, iy, z), (side*ix, -iy, z)]
            mesh_object('End wall %s plank %d' % (side, row+1),
                        verts, cube_faces, [wood, honey, wood][row], bevel=0.0014)

    for i in range(4):
        box('Underside floor plank %d' % (i+1),
            (0, (i-1.5)*0.122, 0.2595),
            (1.60, 0.122, 0.041), [wood, darkwood, honey, wood][i], 0.0015)

    # Actual hollow sheet-metal pan: outer underside, outer walls, folded
    # upper edge, inner walls, and an interior floor.
    def outline(a, b, c, z):
        return [(-a+c,-b,z), (a-c,-b,z), (a,-b+c,z), (a,b-c,z),
                (a-c,b,z), (-a+c,b,z), (-a,b-c,z), (-a,-b+c,z)]

    liner_rings = [
        outline(0.762, 0.212, 0.018, 0.282),
        outline(0.855, 0.305, 0.018, 0.638),
        outline(0.851, 0.301, 0.018, 0.639),
        outline(0.759, 0.209, 0.018, 0.290)
    ]
    verts = [v for ring in liner_rings for v in ring]
    faces = [tuple(reversed(range(8)))]
    for r in range(3):
        for i in range(8):
            j = (i+1) % 8
            faces.append((r*8+i, r*8+j, (r+1)*8+j, (r+1)*8+i))
    faces.append(tuple(range(24, 32)))
    mesh_object('Continuous hollow galvanized liner', verts, faces, zinc,
                metal_collection)

    # Broad, softly edged folded lip covers the timber end grain.
    rim_rings = [
        outline(0.900, 0.350, 0.004, 0.641),
        outline(0.900, 0.350, 0.004, 0.650),
        outline(0.849, 0.299, 0.018, 0.650),
        outline(0.849, 0.299, 0.018, 0.641)
    ]
    verts = [v for ring in rim_rings for v in ring]
    faces = []
    for r in range(4):
        nxt = (r+1) % 4
        for i in range(8):
            j = (i+1) % 8
            faces.append((r*8+i, r*8+j, nxt*8+j, nxt*8+i))
    mesh_object('Folded metal rim with open center', verts, faces, zinc,
                metal_collection, bevel=0.0008)

    # Grounded, splayed trestle legs, transverse ties and longitudinal bracing.
    for sx in (-1, 1):
        x = sx*0.59
        for sy in (-1, 1):
            verts = []
            for z, cy in [(0.0, sy*0.255), (0.259, sy*0.180)]:
                verts += [(x-0.050, cy-0.046, z),
                          (x+0.050, cy-0.046, z),
                          (x+0.050, cy+0.046, z),
                          (x-0.050, cy+0.046, z)]
            mesh_object('Splayed foot %s %s' % (sx, sy), verts,
                        cube_faces, wood, bevel=0.004)
            beam('Diagonal knee brace %s %s' % (sx, sy),
                 (x, sy*0.224, 0.109),
                 (sx*0.285, sy*0.205, 0.240), 0.044, 0.045, honey)
        box('Transverse saddle bearer %s' % sx, (x, 0, 0.222),
            (0.125, 0.620, 0.076), darkwood, 0.003)
        box('Lower trestle tie %s' % sx, (x, 0, 0.104),
            (0.075, 0.510, 0.056), wood, 0.0025)
    box('Longitudinal lower stretcher', (0, 0, 0.104),
        (1.29, 0.073, 0.067), darkwood, 0.003)

    # Steel bands follow the taper instead of floating off vertical walls.
    wall_slope = 0.105 / 0.395
    def side_normal(sign):
        return Vector((0, sign, -wall_slope)).normalized()

    for sign in (-1, 1):
        for x in (-0.695, 0.695):
            verts = []
            for z in (0.277, 0.641):
                oy = outer(z)[1]
                verts += [(x-0.019, sign*(oy+0.001), z),
                          (x+0.019, sign*(oy+0.001), z),
                          (x+0.019, sign*(oy+0.0045), z),
                          (x-0.019, sign*(oy+0.0045), z)]
            mesh_object('Tapered retaining strap %.2f %s' % (x, sign),
                        verts, cube_faces, iron, metal_collection, 0.0007)

    def cylinder(name, base, normal, radius, depth, count, mat):
        n = Vector(normal).normalized()
        axis = Vector((0, 0, 1))
        if abs(n.dot(axis)) > 0.95:
            axis = Vector((0, 1, 0))
        u = n.cross(axis).normalized()
        v = n.cross(u)
        base = Vector(base)
        verts = []
        for h in (0.0, depth):
            for i in range(count):
                angle = 2*math.pi*i/count
                verts.append(tuple(base + n*h +
                                   radius*(u*math.cos(angle)+v*math.sin(angle))))
        faces = [tuple(reversed(range(count))), tuple(range(count, 2*count))]
        for i in range(count):
            j = (i+1) % count
            faces.append((i, j, count+j, count+i))
        return mesh_object(name, verts, faces, mat, metal_collection)

    def bolt(name, position, normal):
        n = Vector(normal).normalized()
        p = Vector(position)
        cylinder(name+' washer', p, n, 0.012, 0.0018, 8, steel)
        cylinder(name+' hex head', p+n*0.0018, n, 0.0074, 0.005, 6, steel)

    for sign in (-1, 1):
        for x in (-0.695, 0.695):
            for z in (0.319, 0.454, 0.588):
                bolt('Band bolt', (x, sign*(outer(z)[1]+0.005), z),
                     side_normal(sign))
        for y in (-0.178, 0.178):
            for z in (0.330, 0.579):
                normal = Vector((sign, 0, -wall_slope)).normalized()
                bolt('End board fastening', (sign*(outer(z)[0]+0.0008), y, z),
                     normal)
        for x in (-0.59, 0.59):
            bolt('Bearer end bolt', (x, sign*0.311, 0.222), (0, sign, 0))
            bolt('Lower tie bolt', (x, sign*0.256, 0.104), (0, sign, 0))

    # Fine, tapered grain is geometry, so its appearance survives GLB export.
    def grain_ribbon(name, sign, x0, x1, z, width, mat):
        verts = []
        steps = 7
        phase = random.uniform(0, math.pi*2)
        for i in range(steps+1):
            t = i/steps
            x = x0+(x1-x0)*t
            center_z = z + 0.0013*math.sin(t*7+phase)
            half = width*math.sin(math.pi*t)*0.5 + 0.00004
            for zz in (center_z-half, center_z+half):
                verts.append((x, sign*(outer(zz)[1]+0.00075), zz))
        faces = []
        for i in range(steps):
            f = (2*i, 2*i+2, 2*i+3, 2*i+1)
            faces.append(f if sign < 0 else tuple(reversed(f)))
        mesh_object(name, verts, faces, mat, recalc=False)

    for sign in (-1, 1):
        for row, (lo, hi) in enumerate(courses):
            for j in range(3):
                z = lo + (hi-lo)*(0.22+0.27*j) + random.uniform(-0.006, 0.006)
                x0 = random.uniform(-0.64, -0.35)
                x1 = random.uniform(0.29, 0.63)
                grain_ribbon('Subtle flowing wood grain', sign, x0, x1,
                             z, random.uniform(0.0006, 0.00115), grainmat)
            for j in range(2):
                grain_ribbon('Small rubbed timber streak', sign,
                             random.uniform(-0.63, -0.22),
                             random.uniform(0.14, 0.61),
                             lo+(hi-lo)*(0.33+0.32*j),
                             0.00065, honey)

    def knot(sign, x, z):
        verts, faces = [], []
        count = 12
        for scale in (1.0, 0.74, 0.38):
            for i in range(count):
                a = 2*math.pi*i/count
                xx = x + math.cos(a)*0.023*scale
                zz = z + math.sin(a)*0.0055*scale
                verts.append((xx, sign*(outer(zz)[1]+0.0010), zz))
        for i in range(count):
            j = (i+1) % count
            faces.append((i, j, count+j, count+i))
        faces.append(tuple(range(2*count, 3*count)))
        mesh_object('Small natural timber knot', verts, faces, grainmat,
                    recalc=False)
    knot(-1, -0.36, 0.452)
    knot(-1, 0.36, 0.569)
    knot(1, 0.24, 0.332)
    knot(1, -0.29, 0.572)

    # A separate, gently rippled surface. Its footprint shrinks with the
    # tapered interior while the level drops; at frame 60 it is concealed
    # immediately below the real metal floor.
    a, b, corner = 0.8355, 0.2855, 0.020
    corners = outline(a, b, corner, 0.0)
    subdivisions = [10, 1, 4, 1, 10, 1, 4, 1]
    perimeter = []
    for i in range(8):
        p = Vector(corners[i])
        q = Vector(corners[(i+1) % 8])
        for j in range(subdivisions[i]):
            perimeter.append(p.lerp(q, j/subdivisions[i]))
    n = len(perimeter)
    verts = []
    fractions = [1.0, 0.78, 0.54, 0.30, 0.10]
    for f in fractions:
        for p in perimeter:
            x, y = p.x*f, p.y*f
            wave = (math.sin(x*22+y*13)*0.00065 +
                    math.sin(x*9-y*31)*0.00035)*(1-f)
            verts.append((x, y, wave))
    verts.append((0, 0, 0))
    faces = []
    for ring in range(len(fractions)-1):
        for i in range(n):
            j = (i+1) % n
            faces.append((ring*n+i, ring*n+j, (ring+1)*n+j, (ring+1)*n+i))
    center = len(verts)-1
    for i in range(n):
        faces.append(((len(fractions)-1)*n+i,
                      (len(fractions)-1)*n+(i+1)%n, center))
    water = mesh_object('Water level - full to empty', verts, faces, watermat,
                        water_collection, recalc=False, smooth=True)
    water.location = (0, 0, 0.588)
    water.scale = (1, 1, 1)
    water.keyframe_insert(data_path='location', frame=1, group='Water level')
    water.keyframe_insert(data_path='scale', frame=1, group='Water level')
    water.location.z = 0.286
    water.scale = (0.755/a, 0.205/b, 1)
    water.keyframe_insert(data_path='location', frame=60, group='Water level')
    water.keyframe_insert(data_path='scale', frame=60, group='Water level')
    if water.animation_data and water.animation_data.action:
        water.animation_data.action.name = 'water_state'
    scene.frame_set(1)

    return {
        "animationRanges": {"water_state": [1, 60]},
        "notes": "1.8 x 0.7 x 0.65 m timber trough, genuinely hollow galvanized pan, grounded braced trestles. water_state: full at frame 1, empty at 60; the separate water surface lowers and narrows inside the tapered pan, finishing below its floor."
    }