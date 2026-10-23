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

    def material(name, color, roughness=0.65, metallic=0.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bs = m.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (*color, 1.0)
        bs.inputs["Roughness"].default_value = roughness
        bs.inputs["Metallic"].default_value = metallic
        return m

    honey = material("Honey pine", (0.48, 0.255, 0.105))
    honey_light = material("Sunlit pine", (0.58, 0.335, 0.15))
    honey_dark = material("Mellow pine", (0.405, 0.205, 0.078))
    timber = material("Oiled structural oak", (0.205, 0.098, 0.041))
    trim = material("Warm pale heartwood", (0.72, 0.52, 0.285))
    teal = material("Deep teal roof enamel", (0.027, 0.235, 0.225), 0.39, 0.28)
    seam_mat = material("Teal folded edges", (0.047, 0.315, 0.29), 0.36, 0.30)
    iron = material("Forged iron", (0.055, 0.067, 0.063), 0.52, 0.65)
    brass = material("Aged hardware", (0.34, 0.225, 0.09), 0.43, 0.65)
    straw = material("Dry straw", (0.66, 0.47, 0.17), 0.88)
    grain = material("Wood grain", (0.315, 0.157, 0.065), 0.86)
    siding_mats = [honey, honey_light, honey, honey_dark, honey_light]
    bevel_candidates = []

    def mesh_obj(name, vertices, faces, mat, bevel=0.0, economical=False):
        mesh = bpy.data.meshes.new(name + " mesh")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
        ob = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(ob)
        if mat:
            mesh.materials.append(mat)
        if bevel:
            mod = ob.modifiers.new("Small worked edges", 'BEVEL')
            mod.width = bevel
            mod.segments = 1
            if economical:
                bevel_candidates.append(ob)
        return ob

    def box(name, location, dimensions, mat, bevel=0.005, economical=False):
        x, y, z = [v * 0.5 for v in dimensions]
        verts = [(-x,-y,-z), (x,-y,-z), (x,y,-z), (-x,y,-z),
                 (-x,-y,z), (x,-y,z), (x,y,z), (-x,y,z)]
        faces = [(0,3,2,1), (4,5,6,7), (0,1,5,4),
                 (1,2,6,5), (2,3,7,6), (3,0,4,7)]
        ob = mesh_obj(name, verts, faces, mat, bevel, economical)
        ob.location = location
        return ob

    def beam(name, a, b, width, depth, mat, bevel=0.004):
        a, b = Vector(a), Vector(b)
        ob = box(name, (a+b)*0.5, (width, depth, (b-a).length), mat, bevel)
        ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
        return ob

    def cylinder(name, center, radius, depth, mat, direction=(0,0,1), sides=8):
        verts = []
        for z in (-depth*0.5, depth*0.5):
            verts.extend([(radius*math.cos(i*2*math.pi/sides),
                           radius*math.sin(i*2*math.pi/sides), z)
                          for i in range(sides)])
        faces = [tuple(range(sides-1,-1,-1)), tuple(range(sides,2*sides))]
        faces += [(i, (i+1)%sides, (i+1)%sides+sides, i+sides)
                  for i in range(sides)]
        ob = mesh_obj(name, verts, faces, mat)
        ob.location = center
        ob.rotation_euler = Vector(direction).to_track_quat('Z', 'Y').to_euler()
        for p in ob.data.polygons:
            if len(p.vertices) == 4:
                p.use_smooth = True
        return ob

    def nail(center, direction, radius=0.008):
        return cylinder("Square-cut nail head", center, radius, 0.005, iron, direction, 6)

    def extrude_xz(name, polygon, y0, y1, mat, bevel=0.003, economical=False):
        n = len(polygon)
        vertices = [(x,y0,z) for x,z in polygon] + [(x,y1,z) for x,z in polygon]
        faces = [tuple(range(n)), tuple(range(2*n-1,n-1,-1))]
        faces += [(i, n+i, n+(i+1)%n, (i+1)%n) for i in range(n)]
        return mesh_obj(name, vertices, faces, mat, bevel, economical)

    def slope_slab(name, x0, x1, ya, yb, za, zb, thickness, mat, bevel=0.003):
        verts = [(x0,ya,za), (x1,ya,za), (x1,yb,zb), (x0,yb,zb),
                 (x0,ya,za-thickness), (x1,ya,za-thickness),
                 (x1,yb,zb-thickness), (x0,yb,zb-thickness)]
        faces = [(0,1,2,3), (7,6,5,4), (0,4,5,1),
                 (1,5,6,2), (2,6,7,3), (3,7,4,0)]
        return mesh_obj(name, verts, faces, mat, bevel)

    def remaining_segments(low, high, cuts):
        segs = [(low, high)]
        for c0,c1 in cuts:
            nxt = []
            for a,b in segs:
                if c1 <= a or c0 >= b:
                    nxt.append((a,b))
                else:
                    if c0 > a:
                        nxt.append((a,c0))
                    if c1 < b:
                        nxt.append((c1,b))
            segs = nxt
        return segs

    # Raised, jointed undercarriage. All four feet actually reach the ground.
    for x in (-0.95, 0.95):
        for y in (-0.80, 0.80):
            box("Short oak foundation post", (x,y,0.325), (0.145,0.145,0.65), timber, 0.008)
            box("Post foot ferrule", (x,y,0.053), (0.151,0.151,0.080), iron, 0.003)
            cylinder("Post peg", (x,y-0.076,0.39), 0.018, 0.009, trim, (0,-1,0), 8)
    for y in (-0.88,0.88):
        box("Floor rim crossbeam", (0,y,0.505), (2.18,0.13,0.17), timber, 0.007)
    for x in (-1.015,1.015):
        box("Floor rim sidebeam", (x,0,0.505), (0.13,1.84,0.17), timber, 0.007)
    for y in (-0.40,0.40):
        box("Underfloor joist", (0,y,0.515), (2.00,0.075,0.13), timber, 0.004)
    for x in (-0.95,0.95):
        for y, sign in ((-0.80,1),(0.80,-1)):
            beam("Underfloor knee brace", (x,y,0.23),
                 (x,y+sign*0.28,0.48), 0.065,0.075,honey_dark)
    for i in range(11):
        x = -1.065 + (i+0.5)*2.13/11
        box("Individual floorboard", (x,0,0.591),
            (2.13/11-0.004,1.91,0.070), siding_mats[i%5], 0.003, True)

    levels = [0.62,0.805,0.99,1.175,1.36,1.545,1.73,1.915]

    # Front wall is built around two genuine openings; no backing panel.
    for i in range(len(levels)-1):
        z0,z1 = levels[i],levels[i+1]
        cuts = []
        if z0 < 1.175:
            cuts.append((-0.78,-0.28))
        if z0 < 1.73:
            cuts.append((0.14,0.90))
        for j,(a,b) in enumerate(remaining_segments(-1.07,1.07,cuts)):
            box("Front siding course %02d piece %d"%(i,j),
                ((a+b)/2,-0.94,(z0+z1)/2),
                (b-a-0.003,0.065,z1-z0-0.005), siding_mats[(i+j)%5],0.003,True)

    # Rear wall opens into the projecting nesting cabinet.
    for i in range(len(levels)-1):
        z0,z1 = levels[i],levels[i+1]
        cuts = [(-0.62,0.62)] if z0 >= 0.805 and z1 <= 1.175 else []
        for j,(a,b) in enumerate(remaining_segments(-1.07,1.07,cuts)):
            box("Rear siding course %02d piece %d"%(i,j),
                ((a+b)/2,0.94,(z0+z1)/2),
                (b-a-0.003,0.065,z1-z0-0.005), siding_mats[(i+j+1)%5],0.003,True)

    # Long side ventilation openings remain open behind individual louvers.
    for side in (-1,1):
        for i in range(len(levels)-1):
            z0,z1 = levels[i],levels[i+1]
            cuts = [(-0.52,0.52)] if z0 >= 1.36 and z1 <= 1.73 else []
            for j,(a,b) in enumerate(remaining_segments(-0.94,0.94,cuts)):
                box(("Left" if side < 0 else "Right")+" siding %d.%d"%(i,j),
                    (side*1.07,(a+b)/2,(z0+z1)/2),
                    (0.065,b-a-0.003,z1-z0-0.005),
                    siding_mats[(i+j+side)%5],0.003,True)

    # Exposed corner timbers and continuous eave plates.
    for x in (-1.035,1.035):
        for y in (-0.955,0.955):
            box("Corner upright", (x,y,1.268), (0.105,0.105,1.355), timber,0.006)
    for y in (-0.975,0.975):
        box("Gable tie beam", (0,y,1.885), (2.20,0.105,0.10), timber,0.005)
    for x in (-1.085,1.085):
        box("Long wall top plate", (x,0,1.89), (0.11,1.96,0.105), timber,0.005)
        box("Long wall bottom rail", (x,0,0.663), (0.085,1.91,0.080), timber,0.004)
    for y in (-1.009,1.009):
        for side in (-1,1):
            beam("Pegged corner wind brace", (side*0.99,y,1.65),
                 (side*0.76,y,1.86), 0.063,0.046,trim)
            cylinder("Brace wooden pin", (side*0.965,y+(-0.025 if y<0 else 0.025),1.68),
                     0.011,0.007,timber,(0,1,0),8)

    # Individually shaped gable boards, with actual rectangular vent holes.
    xs = [-1.07,-0.89,-0.71,-0.53,-0.34,-0.17,0,0.17,0.34,0.53,0.71,0.89,1.07]
    for rear in (False,True):
        y0,y1 = ((0.91,0.975) if rear else (-0.975,-0.91))
        for i in range(len(xs)-1):
            a,b = xs[i]+0.002,xs[i+1]-0.002
            ta,tb = 2.50-0.48*abs(a),2.50-0.48*abs(b)
            mat = siding_mats[(i+int(rear))%5]
            if a >= -0.34 and b <= 0.34:
                extrude_xz("Gable below open vent",
                           [(a,1.915),(b,1.915),(b,2.015),(a,2.015)],
                           y0,y1,mat,0.002,True)
                extrude_xz("Gable above open vent",
                           [(a,2.225),(b,2.225),(b,tb),(a,ta)],
                           y0,y1,mat,0.002,True)
            else:
                extrude_xz("Shaped gable board",
                           [(a,1.915),(b,1.915),(b,tb),(a,ta)],
                           y0,y1,mat,0.002,True)
        yy = 0.995 if rear else -0.995
        for x in (-0.365,0.365):
            box("Gable vent jamb", (x,yy,2.12), (0.045,0.055,0.265),trim,0.003)
        for z in (1.998,2.242):
            box("Gable vent lintel", (0,yy,z), (0.775,0.055,0.043),trim,0.003)
        for z in (2.052,2.117,2.182):
            slat = box("Shaded gable louver", (0,yy,z), (0.68,0.095,0.022),timber,0.002)
            slat.rotation_euler[0] = math.radians(24 if rear else -24)

    # Vented side windows, fitted with slanted wooden rain louvers and mesh.
    for side in (-1,1):
        xx = side*1.115
        for y in (-0.555,0.555):
            box("Vent side casing", (xx,y,1.545), (0.065,0.065,0.445),trim,0.004)
        for z in (1.335,1.755):
            box("Vent horizontal casing", (xx,0,z), (0.065,1.175,0.065),trim,0.004)
        for z in (1.405,1.49,1.575,1.66):
            slat = box("Angled ventilation blade", (side*1.105,0,z),
                       (0.147,1.045,0.024),honey_dark,0.003)
            slat.rotation_euler[1] = side*math.radians(27)
        for y in (-0.42,-0.28,-0.14,0,0.14,0.28,0.42):
            cylinder("Vent mesh vertical wire", (side*1.058,y,1.545),
                     0.0025,0.355,iron,(0,0,1),4)
        for z in (1.40,1.49,1.58,1.67):
            cylinder("Vent mesh horizontal wire", (side*1.058,0,z),
                     0.0025,1.02,iron,(0,1,0),4)
        # A little projecting cap adds a strong shadow and sheds water.
        hood = box("Vent rain hood", (side*1.145,0,1.80),
                   (0.22,1.23,0.035),teal,0.004)
        hood.rotation_euler[1] = side*math.radians(12)

    # Thick metal roof halves, folded standing seams, ridge and timber fascia.
    for side in (-1,1):
        polygon = [(0,2.56),(side*1.25,1.96),
                   (side*1.25,1.905),(0,2.505)]
        extrude_xz("Solid teal roof half",polygon,-1.15,1.15,teal,0.007)
        for y in (-0.99,-0.66,-0.33,0,0.33,0.66,0.99):
            beam("Raised standing seam", (side*0.045,y,2.547),
                 (side*1.248,y,1.973),0.018,0.018,seam_mat,0.002)
            nail((side*1.18,y,2.002), (side*0.433,0,0.902),0.007)
        for y in (-1.151,1.151):
            beam("Gable raking fascia", (0,y,2.515),
                 (side*1.263,y,1.91),0.085,0.070,trim,0.005)
        box("Eave edge fold", (side*1.255,0,1.939),
            (0.035,2.335,0.060),seam_mat,0.004)
    extrude_xz("Folded continuous ridge cap",
               [(-0.135,2.505),(0,2.586),(0.135,2.505),
                (0.135,2.486),(0,2.566),(-0.135,2.486)],
               -1.18,1.18,seam_mat,0.003)

    # Full-size keeper access door: separate leaf, framed opening, Z bracing.
    for i in range(5):
        a = 0.158+i*0.142
        box("Access door plank", (a+0.069,-0.991,1.183),
            (0.137,0.060,1.065),siding_mats[(i+1)%5],0.003,True)
    for x in (0.105,0.935):
        box("Access door jamb", (x,-1.008,1.195), (0.070,0.095,1.20),trim,0.004)
    box("Access door header", (0.52,-1.008,1.765), (0.90,0.095,0.075),trim,0.004)
    box("Access door threshold", (0.52,-1.020,0.632), (0.85,0.15,0.055),timber,0.004)
    for z in (0.766,1.598):
        box("Door brace rail", (0.512,-1.037,z), (0.68,0.040,0.072),trim,0.004)
    beam("Door compression diagonal", (0.813,-1.039,0.79),
         (0.218,-1.039,1.575),0.070,0.040,trim,0.003)
    for z in (0.81,1.56):
        box("Strap hinge", (0.816,-1.067,z), (0.21,0.018,0.040),iron,0.004)
        cylinder("Hinge knuckle", (0.921,-1.073,z),0.018,0.094,iron,(0,0,1),8)
        for x in (0.744,0.842):
            nail((x,-1.080,z),(0,-1,0),0.009)
    box("Latch keeper plate", (0.203,-1.068,1.20), (0.055,0.020,0.12),iron,0.004)
    box("Lift latch", (0.273,-1.088,1.218), (0.19,0.026,0.027),brass,0.006)
    cylinder("Latch pivot", (0.330,-1.106,1.218),0.012,0.012,iron,(0,-1,0),8)
    for x in (0.249,0.30):
        box("Door pull standoff", (x,-1.081,1.085),(0.018,0.05,0.018),iron,0.003)
    beam("Door pull grip", (0.249,-1.108,1.085),(0.30,-1.108,1.085),
         0.015,0.018,iron,0.003)

    # Chicken pop-hole and the raised sliding shutter on real guide rails.
    box("Pop-hole threshold", (-0.53,-1.010,0.628), (0.62,0.19,0.055),trim,0.004)
    for x in (-0.814,-0.246):
        box("Pop-hole guide shadow channel", (x,-0.996,1.215),
            (0.065,0.055,1.16),timber,0.003)
        box("Raised shutter guide", (x,-1.036,1.215),
            (0.034,0.045,1.16),trim,0.003)
    box("Pop-hole lintel", (-0.53,-1.010,1.195), (0.56,0.060,0.047),trim,0.003)
    for i in range(3):
        box("Raised sliding hatch board",(-0.768+(i+0.5)*0.158,-1.018,1.478),
            (0.154,0.045,0.525),honey_dark if i==1 else honey,0.003,True)
    for z in (1.255,1.70):
        box("Pop shutter crossbatten",(-0.531,-1.052,z),
            (0.471,0.028,0.045),trim,0.003)
    box("Hatch upper travel stop",(-0.53,-1.025,1.80),
        (0.64,0.080,0.045),timber,0.004)
    for x in (-0.58,-0.48):
        box("Shutter handle foot",(x,-1.078,1.29),(0.018,0.035,0.018),iron,0.002)
    beam("Shutter lifting handle",(-0.58,-1.10,1.29),(-0.48,-1.10,1.29),
         0.014,0.018,iron,0.002)
    box("Shutter holding pin",(-0.814,-1.066,1.24),(0.08,0.021,0.018),brass,0.002)

    # Connected ramp, about a 27-degree rise, with continuous load-bearing boards.
    top_y, bottom_y = -1.01,-2.10
    top_z, bottom_z = 0.641,0.055
    def ramp_z(y):
        return top_z + (y-top_y)*(bottom_z-top_z)/(bottom_y-top_y)
    for i in range(3):
        x0 = -0.81+i*(0.56/3)
        slope_slab("Ramp longitudinal deck plank",x0+0.002,x0+0.56/3-0.002,
                   top_y,bottom_y,top_z,bottom_z,0.044,siding_mats[i],0.003)
    for x0 in (-0.837,-0.253):
        slope_slab("Ramp low side curb",x0,x0+0.030,
                   top_y,bottom_y,top_z+0.029,bottom_z+0.029,
                   0.065,timber,0.004)
    ramp_normal = Vector((0,-(top_z-bottom_z)/(top_y-bottom_y),1)).normalized()
    for i in range(8):
        y = top_y-0.085-i*0.133
        ya,yb = y+0.023,y-0.023
        slope_slab("Ramp traction cleat",-.812,-.248,ya,yb,
                   ramp_z(ya)+0.027,ramp_z(yb)+0.027,0.028,trim,0.004)
        if i%2 == 0:
            for x in (-0.765,-0.295):
                nail((x,y,ramp_z(y)+0.031),ramp_normal,0.0065)
    for x in (-0.75,-0.31):
        box("Ramp upper attachment strap",(x,-1.024,0.649),
            (0.04,0.14,0.012),iron,0.002)
        nail((x,-0.989,0.658),(0,0,1),0.008)

    # Rear three-compartment nest box, attached through the rear wall.
    box("Nest cabinet bottom",(0,1.105,0.816),(1.38,0.38,0.068),timber,0.004)
    for x in (-0.665,0.665):
        verts = [(x-0.027,0.94,0.83),(x+0.027,0.94,0.83),
                 (x+0.027,1.285,0.83),(x-0.027,1.285,0.83),
                 (x-0.027,0.94,1.315),(x+0.027,0.94,1.315),
                 (x+0.027,1.285,1.17),(x-0.027,1.285,1.17)]
        mesh_obj("Sloping nest cabinet cheek",verts,
                 [(0,3,2,1),(4,5,6,7),(0,1,5,4),
                  (1,2,6,5),(2,3,7,6),(3,0,4,7)],honey_light,0.004)
    for i in range(2):
        box("Nest cabinet rear board",(0,1.277,0.925+i*0.165),
            (1.31,0.055,0.16),siding_mats[i],0.003,True)
    for x in (-0.65,0.65):
        box("Nest box corner trim",(x,1.31,1.009),(0.065,0.045,0.365),trim,0.004)
    box("Nest box lower rail",(0,1.311,0.857),(1.36,0.045,0.055),trim,0.003)
    for x in (-0.218,0.218):
        box("Internal nest divider",(x,1.102,1.012),(0.025,0.29,0.32),honey_dark,0.002)
    slope_slab("Hinged nest lid",-0.738,0.738,0.925,1.337,
               1.355,1.194,0.045,teal,0.006)
    beam("Nest lid rear folded drip",(-0.747,1.34,1.178),(0.747,1.34,1.178),
         0.035,0.030,seam_mat,0.003)
    for x in (-0.45,0.45):
        hinge = box("Nest lid strap hinge",(x,0.995,1.335),
                    (0.064,0.155,0.012),iron,0.003)
        hinge.rotation_euler[0] = math.radians(-21.35)
        cylinder("Nest lid hinge barrel",(x,0.967,1.351),0.014,0.092,iron,(1,0,0),8)
    box("Nest lid hasp",(0,1.343,1.142),(0.065,0.018,0.115),iron,0.004)
    cylinder("Nest lid latch stud",(0,1.36,1.118),0.014,0.025,brass,(0,1,0),8)
    for x in (-0.51,0.51):
        beam("Nest box supporting bracket",(x,0.984,0.66),(x,1.22,0.795),
             0.065,0.065,timber,0.004)

    # Real interior: flooring, roost, supports, and a little loose nesting straw.
    cylinder("Interior roosting perch",(0,0.43,1.00),0.035,1.73,trim,(1,0,0),10)
    for x in (-0.78,0.78):
        beam("Roost upright",(x,0.43,0.63),(x,0.43,0.985),0.047,0.047,timber,0.003)
    for i in range(42):
        compartment = i%3
        x = -0.435+compartment*0.435+random.uniform(-0.15,0.15)
        y = random.uniform(0.99,1.23)
        length = random.uniform(0.045,0.13)
        angle = random.uniform(0,2*math.pi)
        dx,dy = math.cos(angle)*length/2,math.sin(angle)*length/2
        beam("Nest straw",(x-dx,y-dy,0.857),(x+dx,y+dy,0.860),
             0.004,0.003,straw,0)
    for i in range(14):
        x = random.uniform(-0.73,-0.33)
        y = random.uniform(-0.87,-0.55)
        a = random.uniform(0,math.pi)
        length = random.uniform(0.045,0.095)
        beam("Straw just inside entrance",(x,y,0.631),
             (x+math.cos(a)*length,y+math.sin(a)*length,0.632),
             0.003,0.0025,straw,0)

    # Carefully located fasteners and restrained geometric grain marks.
    for side in (-1,1):
        for i in (0,1,2,3,6):
            z = (levels[i]+levels[i+1])/2
            for y in (-0.805,0.805):
                nail((side*1.106,y,z),(side,0,0),0.007)
        for i in (0,1,2,3,6):
            z = levels[i]+0.052
            y = random.uniform(-0.5,0.13)
            length = random.uniform(0.23,0.45)
            xx = side*1.1035
            mesh_obj("Subtle tapered side wood grain",
                     [(xx,y-length/2,z),(xx,y-length*.28,z+0.004),
                      (xx,y+length/2,z+0.002),(xx,y+length*.17,z-0.003)],
                     [(0,1,2,3)],grain)
    for y,normal in ((-1.014,(0,-1,0)),(1.014,(0,1,0))):
        for x in (-1.035,1.035):
            for z in (0.72,1.78):
                cylinder("Corner carriage bolt",(x,y,z),0.012,0.008,brass,normal,8)

    # Keep the evaluated export comfortably within the triangle allowance.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    total = 0
    costs = {}
    for ob in scene.objects:
        if ob.type != 'MESH':
            continue
        ev = ob.evaluated_get(depsgraph)
        me = ev.to_mesh()
        count = sum(len(p.vertices)-2 for p in me.polygons)
        total += count
        if ob in bevel_candidates:
            base = sum(len(p.vertices)-2 for p in ob.data.polygons)
            costs[ob] = count-base
        ev.to_mesh_clear()
    if total > 11750:
        for ob in reversed(bevel_candidates):
            if total <= 11750:
                break
            for mod in list(ob.modifiers):
                if mod.type == 'BEVEL':
                    ob.modifiers.remove(mod)
            total -= costs.get(ob,0)

    return {
        "notes": "Static ranch coop. Main roof is 2.5 m wide by 2.3 m deep; peak is 2.586 m. Connected ramp and rear nest cabinet give an overall depth of approximately 3.44 m. Genuine pop-hole, framed keeper door, open shaded louver ventilation, raised plank floor, interior perch, and hinged three-bay nesting cabinet."
    }