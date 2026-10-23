import bpy, bmesh, math, random
from math import sin, cos, pi

def build():
    random.seed(42)
    sc = bpy.context.scene
    sc.render.fps = 24
    sc.frame_start, sc.frame_end = 1, 79

    def mat(n, c, r=0.6):
        m = bpy.data.materials.new(n)
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = c
        b.inputs["Roughness"].default_value = r
        return m
    M = {
        'skin': mat('skin', (0.75, 0.5, 0.36, 1), .6),
        'shirt': mat('shirt', (0.85, 0.75, 0.55, 1), .8),
        'red': mat('red', (0.75, 0.15, 0.12, 1), .7),
        'leather': mat('leather', (0.35, 0.08, 0.08, 1), .5),
        'pants': mat('pants', (0.06, 0.08, 0.17, 1), .8),
        'boot': mat('boot', (0.05, 0.04, 0.04, 1), .45),
        'hair': mat('hair', (0.08, 0.05, 0.04, 1), .5),
        'white': mat('white', (0.9, 0.9, 0.88, 1), .4),
        'metal': mat('metal', (0.6, 0.6, 0.6, 1), .3),
    }

    arm_data = bpy.data.armatures.new("Rig")
    rig = bpy.data.objects.new("ForemanRig", arm_data)
    sc.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    bones = {}
    def bone(n, h, t, par=None):
        b = arm_data.edit_bones.new(n)
        b.head, b.tail = h, t
        if par: b.parent = bones[par]
        bones[n] = b
    bone('hips', (0, 0, .9), (0, 0, 1.05))
    bone('spine', (0, 0, 1.05), (0, 0, 1.5), 'hips')
    bone('head', (0, 0, 1.5), (0, 0, 1.88), 'spine')
    for s, x in (('L', .31), ('R', -.31)):
        bone('uarm' + s, (x, 0, 1.46), (x, 0, 1.2), 'spine')
        bone('farm' + s, (x, 0, 1.2), (x, 0, .93), 'uarm' + s)
        bone('hand' + s, (x, 0, .93), (x, 0, .78), 'farm' + s)
        hx = x / 3.1
        bone('thigh' + s, (hx, 0, .92), (hx, 0, .5), 'hips')
        bone('shin' + s, (hx, 0, .5), (hx, 0, .09), 'thigh' + s)
        bone('foot' + s, (hx, 0, .09), (hx, -.15, .04), 'shin' + s)
    bpy.ops.object.mode_set(mode='OBJECT')

    def mk(name, v, f, m, b, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(v, [], f)
        me.update()
        o = bpy.data.objects.new(name, me)
        sc.collection.objects.link(o)
        o.data.materials.append(M[m])
        if smooth:
            for p in me.polygons: p.use_smooth = True
        o.vertex_groups.new(name=b).add(list(range(len(v))), 1.0, 'REPLACE')
        o.parent = rig
        md = o.modifiers.new('Arm', 'ARMATURE')
        md.object = rig
        return o

    def loft(name, rings, m, b, n=12, axis='z', off=0.0, smooth=True):
        v, f = [], []
        for (cx, cy, cz, ra, rb) in rings:
            for i in range(n):
                a = 2 * pi * i / n + off
                if axis == 'z':
                    v.append((cx + ra * cos(a), cy + rb * sin(a), cz))
                else:
                    v.append((cx + ra * cos(a), cy, cz + rb * sin(a)))
        k = len(rings)
        for r in range(k - 1):
            for i in range(n):
                j = (i + 1) % n
                f.append((r * n + i, r * n + j, (r + 1) * n + j, (r + 1) * n + i))
        f.append(tuple(reversed(range(n))))
        f.append(tuple(range((k - 1) * n, k * n)))
        return mk(name, v, f, m, b, smooth)

    def box(name, c, s, m, b):
        x, y, z = c
        sx, sy, sz = s
        return loft(name, [(x, y, z - sz / 2, sx * .707, sy * .707), (x, y, z + sz / 2, sx * .707, sy * .707)], m, b, 4, 'z', pi / 4, False)

    # pelvis & belt
    loft('pelvis', [(0, 0, .84, .19, .12), (0, 0, .95, .2, .13), (0, 0, 1.07, .185, .12)], 'pants', 'hips')
    loft('belt', [(0, 0, 1.04, .192, .127), (0, 0, 1.1, .192, .127)], 'leather', 'hips')
    box('buckle', (0, -.128, 1.07), (.05, .015, .05), 'metal', 'hips')
    # torso
    loft('torso', [(0, 0, 1.08, .175, .115), (0, 0, 1.22, .21, .13), (0, 0, 1.38, .26, .145),
                   (0, 0, 1.48, .27, .13), (0, 0, 1.53, .15, .1)], 'shirt', 'spine')
    for s, x in (('L', .1), ('R', -.1)):
        box('susp' + s, (x * 1.15, -.125, 1.33), (.035, .03, .38), 'leather', 'spine')
        box('pouch' + s, (x * 1.2, -.14, 1.2), (.06, .04, .1), 'leather', 'spine')
    loft('neckerchief', [(0, 0, 1.5, .1, .09), (0, 0, 1.58, .085, .08)], 'red', 'spine')
    v = [(-.045, -.1, 1.52), (.045, -.1, 1.52), (.06, -.13, 1.3), (0, -.14, 1.22), (-.06, -.13, 1.3)]
    mk('tie', v, [(0, 1, 2, 3, 4)], 'red', 'spine', False)
    # head
    loft('neck', [(0, 0, 1.52, .07, .07), (0, 0, 1.62, .065, .068)], 'skin', 'head')
    loft('head', [(0, 0, 1.60, .055, .065), (0, 0, 1.64, .085, .09), (0, 0, 1.72, .102, .108),
                  (0, 0, 1.80, .095, .1), (0, 0, 1.85, .05, .06)], 'skin', 'head')
    box('nose', (0, -.115, 1.7), (.035, .05, .09), 'skin', 'head')
    box('chin', (0, -.085, 1.62), (.08, .04, .04), 'skin', 'head')
    box('brow', (0, -.095, 1.765), (.19, .035, .03), 'skin', 'head')
    for s, x in (('L', .04), ('R', -.04)):
        box('eye' + s, (x, -.103, 1.74), (.03, .01, .015), 'white', 'head')
        box('pupil' + s, (x, -.109, 1.74), (.013, .006, .013), 'hair', 'head')
        box('ear' + s, (x * 2.6, 0, 1.71), (.02, .035, .06), 'skin', 'head')
        box('browhair' + s, (x, -.108, 1.775), (.08, .012, .015), 'hair', 'head')
    loft('hair', [(0, .02, 1.74, .108, .115), (0, .01, 1.82, .105, .112), (0, 0, 1.87, .07, .08), (0, -.01, 1.89, .02, .03)], 'hair', 'head')
    box('quiff', (0, -.07, 1.86), (.14, .1, .06), 'hair', 'head')
    # arms
    for s, x in (('L', .31), ('R', -.31)):
        sg = 1 if x > 0 else -1
        loft('sleeve' + s, [(x, 0, 1.5, .085, .09), (x + sg * .02, 0, 1.4, .095, .1), (x + sg * .01, 0, 1.25, .085, .09), (x, 0, 1.19, .1, .105)], 'shirt', 'uarm' + s)
        loft('forearm' + s, [(x, 0, 1.2, .065, .06), (x, 0, 1.08, .068, .06), (x, 0, .95, .05, .045)], 'skin', 'farm' + s)
        box('palm' + s, (x, 0, .87, ), (.085, .05, .085), 'skin', 'hand' + s)
        for i in range(4):
            fx = x + (i - 1.5) * .02
            box('fing%s%d' % (s, i), (fx, -.04, .83 - (i == 3) * .01), (.019, .04, .06), 'skin', 'hand' + s)
        box('thumb' + s, (x - sg * .05, -.03, .88), (.022, .03, .06), 'skin', 'hand' + s)
    # legs
    for s, x in (('L', .1), ('R', -.1)):
        loft('thigh' + s, [(x, 0, .95, .105, .115), (x, 0, .75, .09, .1), (x, 0, .5, .072, .078)], 'pants', 'thigh' + s)
        loft('shin' + s, [(x, 0, .5, .07, .075), (x, 0, .3, .062, .065), (x, 0, .12, .075, .08)], 'pants', 'shin' + s)
        loft('shaft' + s, [(x, 0, .08, .08, .085), (x, 0, .2, .082, .088)], 'boot', 'shin' + s)
        loft('boot' + s, [(x, .06, .075, .075, .06), (x, -.03, .08, .08, .065), (x, -.14, .065, .075, .05), (x, -.22, .04, .06, .03)],
             'boot', 'foot' + s, 10, 'y')
        box('heel' + s, (x, .06, .02), (.08, .09, .04), 'boot', 'foot' + s)

    # animation
    bpy.ops.object.mode_set(mode='POSE')
    P = rig.pose.bones
    for p in P: p.rotation_mode = 'XYZ'
    def key(n, fr, ang):
        P[n].rotation_euler = (ang, 0, 0)
        P[n].keyframe_insert('rotation_euler', frame=fr)
    for fr in range(1, 26, 3):
        ph = 2 * pi * (fr - 1) / 24
        for s, o in (('L', 0), ('R', pi)):
            key('thigh' + s, fr, .5 * sin(ph + o))
            key('shin' + s, fr, max(0, -sin(ph + o + .8)) * .9)
            key('foot' + s, fr, .2 * sin(ph + o + 1))
            key('uarm' + s, fr, -.4 * sin(ph + o))
            key('farm' + s, fr, -.3 - .2 * sin(ph + o))
        key('spine', fr, .03)
        P['hips'].location = (0, 0, .02 * abs(cos(ph)))
        P['hips'].keyframe_insert('location', frame=fr)
        key('hips', fr, 0)
        key('head', fr, 0)
    for fr in range(31, 80, 6):
        ph = 2 * pi * (fr - 31) / 48
        for s in 'LR':
            key('thigh' + s, fr, 0); key('shin' + s, fr, 0); key('foot' + s, fr, 0)
            key('uarm' + s, fr, .04 * sin(ph)); key('farm' + s, fr, -.12 - .03 * sin(ph))
        key('spine', fr, .02 * sin(ph))
        key('head', fr, -.015 * sin(ph))
        key('hips', fr, 0)
        P['hips'].location = (0, 0, 0)
        P['hips'].keyframe_insert('location', frame=fr)
    sc.frame_set(1)
    bpy.ops.object.mode_set(mode='OBJECT')
    return {"animationRanges": {"walk": [1, 25], "idle": [31, 79]},
            "notes": "Lofted custom meshes, rigid-weighted to an armature; walk and idle keyed on bones."}