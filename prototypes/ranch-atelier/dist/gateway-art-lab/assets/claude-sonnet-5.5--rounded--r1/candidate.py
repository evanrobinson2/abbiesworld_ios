import bpy, bmesh, math, random
from mathutils import Vector

def build():
    random.seed(42)
    def mat(n, c, r=0.6):
        m = bpy.data.materials.new(n); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = c
        b.inputs["Roughness"].default_value = r
        return m
    M = {k: mat(k, c) for k, c in dict(skin=(0.75,0.52,0.38,1), shirt=(0.8,0.52,0.14,1),
        pants=(0.25,0.3,0.38,1), boot=(0.25,0.15,0.09,1), hair=(0.12,0.07,0.05,1),
        eye=(0.02,0.02,0.02,1)).items()}

    arm = bpy.data.armatures.new("Rig")
    rig = bpy.data.objects.new("Rig", arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(n, h, t, p=None):
        b = arm.edit_bones.new(n); b.head = h; b.tail = t
        if p: b.parent = arm.edit_bones[p]
    bone("hips", (0,0,.9), (0,0,1.05))
    bone("spine", (0,0,1.05), (0,0,1.35), "hips")
    bone("head", (0,0,1.35), (0,0,1.65), "spine")
    for s, x in (("L", .2), ("R", -.2)):
        bone("arm"+s, (x,0,1.38), (x,0,1.1), "spine")
        bone("leg"+s, (x/2,0,.9), (x/2,0,.1), "hips")
    bpy.ops.object.mode_set(mode='OBJECT')

    def part(name, kind, loc, sc, m, bonename, rot=(0,0,0)):
        if kind == 'cyl':
            bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=1, depth=1, location=loc, rotation=rot)
        else:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1, location=loc, rotation=rot)
        o = bpy.context.active_object
        o.name = name; o.scale = sc
        bpy.ops.object.transform_apply(scale=True)
        bpy.ops.object.shade_smooth()
        o.data.materials.append(M[m])
        o.parent = rig
        vg = o.vertex_groups.new(name=bonename)
        vg.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        mod = o.modifiers.new("Arm", 'ARMATURE'); mod.object = rig
        return o

    part("Body_Neck", 'cyl', (0,0,1.43), (.05,.05,.12), 'skin', "spine")
    part("Head", 'sph', (0,0,1.55), (.11,.12,.14), 'skin', "head")
    part("Hair", 'sph', (0,.015,1.6), (.125,.135,.115), 'hair', "head")
    part("Nose", 'sph', (0,-.12,1.54), (.015,.02,.02), 'skin', "head")
    for x in (.04, -.04):
        part("Eye", 'sph', (x,-.11,1.57), (.012,.008,.016), 'eye', "head")
    part("Clothing_Shirt", 'sph', (0,0,1.17), (.17,.11,.25), 'shirt', "spine")
    part("Clothing_Pants_Hips", 'sph', (0,0,.95), (.17,.11,.14), 'pants', "hips")
    for s, x in (("L", .2), ("R", -.2)):
        part("Clothing_Sleeve"+s, 'cyl', (x*1.05,0,1.3), (.055,.055,.09), 'shirt', "arm"+s)
        part("Arm"+s, 'cyl', (x*1.1,0,1.15), (.04,.04,.14), 'skin', "arm"+s)
        part("Hand"+s, 'sph', (x*1.1,0,.97), (.04,.025,.055), 'skin', "arm"+s)
        part("Thumb"+s, 'sph', (x*1.1-(.035 if x>0 else -.035),-.015,.98), (.015,.015,.03), 'skin', "arm"+s)
        part("Clothing_Trouser"+s, 'cyl', (x/2,0,.5), (.075,.075,.4), 'pants', "leg"+s)
        part("Clothing_Boot"+s, 'sph', (x/2,-.04,.07), (.07,.13,.07), 'boot', "leg"+s)

    bpy.context.scene.render.fps = 24
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    P = rig.pose.bones
    for p in P: p.rotation_mode = 'XYZ'
    def key(f, v):
        for n, a in v.items():
            P[n].rotation_euler = (a, 0, 0)
            P[n].keyframe_insert("rotation_euler", frame=f)
    for f in (1, 7, 13, 19, 25):
        k = math.sin((f-1)/24*2*math.pi)*.5
        key(f, dict(legL=k, legR=-k, armL=-k*.8, armR=k*.8, hips=0, spine=0, head=0))
    for f in (31, 55, 79):
        k = .03 if f == 55 else 0
        key(f, dict(legL=0, legR=0, armL=k, armR=-k, hips=0, spine=k, head=-k))
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.scene.frame_set(1)
    return {"animationRanges": {"walk": [1, 25], "idle": [31, 79]},
            "notes": "Armature-driven rounded character; separate Clothing_* meshes for outfit variants."}