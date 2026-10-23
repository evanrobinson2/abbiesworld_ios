"""The brute move set, keyed on build.py's skeleton.

Every pose is a dict of bone -> (rx, ry, rz) in degrees, about the armature's own axes (Z up, the brute faces -Y,
his right is -X), applied at the bone as if its parent were still at rest, plus 'loc' for the hips (metres, armature
axes). Reading the numbers: +rx tips anything pointing up forward and swings anything hanging down back, so an arm
raised forward is a negative rx and a knee bend (shin swinging back) is positive. +rz turns the front toward his
left. +ry tips up-pointing bones toward his left, and swings his right arm out (left arm out is -ry).

Orthodox stance: left side leads, the left fist jabs, the right (rear) fist throws heavy and uppercut.
MOVES carries game data next to each clip: when the blow lands, its reach and which reaction it causes.
"""
import copy
import math
import os

FPS = 30

STANCE = {
    'loc': (0, 0, -0.07),
    'hips': (0, 0, -18), 'spine': (4, 0, -4), 'chest': (6, 0, -6), 'neck': (0, 0, 8), 'head': (8, 0, 14),
    'thigh_L': (-22, -6, 0), 'shin_L': (18, 0, 0), 'foot_L': (4, 0, 12),
    'thigh_R': (14, 8, 0), 'shin_R': (22, 0, 0), 'foot_R': (-30, 0, 12),
    'clavicle_L': (0, 0, 0), 'clavicle_R': (0, 0, 0),
    'upperarm_L': (-48, -22, 26), 'forearm_L': (-100, 0, 0), 'hand_L': (0, 0, 0),
    'upperarm_R': (-36, 26, 10), 'forearm_R': (-112, 0, 0), 'hand_R': (0, 0, 0),
}


def P(base=None, **add):
    """A pose: base (default the stance) plus these deltas. loc adds too."""
    p = copy.deepcopy(STANCE if base is None else base)
    for k, v in add.items():
        p[k] = tuple(a + b for a, b in zip(p.get(k, (0, 0, 0)), v))
    return p


def S(base=None, **put):
    """A pose: base with these bones set outright."""
    p = copy.deepcopy(STANCE if base is None else base)
    p.update(put)
    return p


G = STANCE
BLOCK = S(P(loc=(0, 0.02, -0.04), chest=(8, 0, 4), head=(12, 0, -6)),
          upperarm_L=(-80, -6, 34), forearm_L=(-118, 0, 0), upperarm_R=(-78, 8, -22), forearm_R=(-122, 0, 0))
CROUCH = P(loc=(0, 0, -0.17), thigh_L=(-32, 0, 0), shin_L=(48, 0, 0), foot_L=(-16, 0, 0),
           thigh_R=(-28, 0, 0), shin_R=(48, 0, 0), foot_R=(-20, 0, 0), chest=(10, 0, 0))
TUCK = P(loc=(0, 0, 0.5), thigh_L=(-58, 0, 0), shin_L=(92, 0, 0), thigh_R=(-46, 0, 0), shin_R=(96, 0, 0),
         upperarm_L=(-10, 0, 0), upperarm_R=(-10, 0, 0))
DOWN = S(P(loc=(0, 0.25, -0.72)), hips=(-86, 0, 6), spine=(0, 0, 0), chest=(0, 0, 0), neck=(-8, 0, 0), head=(-6, 0, 22),
         thigh_L=(-12, -14, 0), shin_L=(24, 0, 0), foot_L=(20, 0, 0), thigh_R=(-30, 10, 0), shin_R=(40, 0, 0), foot_R=(20, 0, 0),
         upperarm_L=(-150, -40, 0), forearm_L=(-30, 0, 0), upperarm_R=(-140, 46, 0), forearm_R=(-40, 0, 0))

CLIPS = {
    'idle': (True, [(0, G), (0.55, P(loc=(0, 0, -0.025), chest=(3, 0, 0), upperarm_L=(-4, 0, 0), upperarm_R=(-4, 0, 0),
                                     forearm_L=(-4, 0, 0), forearm_R=(-4, 0, 0), head=(2, 0, 0))), (1.1, G)]),
    'walk_fwd': (True, [(0, G), (0.2, P(loc=(0, 0, 0.02), thigh_L=(-16, 0, 0), shin_L=(22, 0, 0), foot_L=(-8, 0, 0))),
                        (0.4, P(loc=(0, 0, -0.02))),
                        (0.6, P(loc=(0, 0, 0.02), thigh_R=(-22, 0, 0), shin_R=(30, 0, 0), foot_R=(10, 0, 0))), (0.8, G)]),
    'walk_back': (True, [(0, G), (0.2, P(loc=(0, 0, 0.02), thigh_R=(-14, 0, 0), shin_R=(28, 0, 0))),
                         (0.4, P(loc=(0, 0, -0.02))),
                         (0.6, P(loc=(0, 0, 0.02), thigh_L=(-18, 0, 0), shin_L=(26, 0, 0), foot_L=(-10, 0, 0))), (0.8, G)]),
    'jump': (False, [(0, G), (0.12, CROUCH), (0.32, TUCK), (0.55, P(TUCK, loc=(0, 0, 0.08))),
                     (0.76, P(CROUCH, loc=(0, 0, 0.04))), (0.95, G)]),
    'block': (False, [(0, G), (0.12, BLOCK), (0.5, BLOCK)]),
    'jab': (False, [(0, G), (0.06, P(upperarm_L=(10, 0, 0), forearm_L=(-6, 0, 0))),
                    (0.15, S(P(loc=(0, -0.07, -0.02), hips=(0, 0, -8), chest=(4, 0, -12), head=(0, 0, 10)),
                             upperarm_L=(-86, -4, 40), forearm_L=(-4, 0, 0))),
                    (0.24, S(P(loc=(0, -0.06, -0.02), hips=(0, 0, -8), chest=(4, 0, -12)), upperarm_L=(-84, -4, 40), forearm_L=(-10, 0, 0))),
                    (0.45, G)]),
    'heavy': (False, [(0, G), (0.18, P(loc=(0, 0.03, -0.03), hips=(0, 0, -14), chest=(0, 0, -16), upperarm_R=(12, 14, 0), forearm_R=(6, 0, 0))),
                      (0.36, S(P(loc=(0, -0.16, -0.06), hips=(0, 0, 26), spine=(4, 0, 8), chest=(6, 0, 18), head=(0, 0, -22),
                                 thigh_L=(-10, 0, 0), shin_L=(6, 0, 0), thigh_R=(14, 0, 0), foot_R=(14, 0, -20)),
                               upperarm_R=(-88, 6, -18), forearm_R=(-8, 0, 0))),
                      (0.52, S(P(loc=(0, -0.14, -0.06), hips=(0, 0, 24), spine=(4, 0, 8), chest=(6, 0, 16), head=(0, 0, -20),
                                 thigh_L=(-10, 0, 0), thigh_R=(14, 0, 0)), upperarm_R=(-84, 6, -16), forearm_R=(-14, 0, 0))),
                      (0.82, G)]),
    'uppercut': (False, [(0, G), (0.16, P(loc=(0, 0, -0.15), chest=(16, 0, -14), thigh_L=(-20, 0, 0), shin_L=(36, 0, 0),
                                          thigh_R=(-14, 0, 0), shin_R=(36, 0, 0), upperarm_R=(44, 0, 0), forearm_R=(14, 0, 0))),
                         (0.38, S(P(loc=(0, -0.08, 0.05), hips=(0, 0, 20), chest=(-20, 0, 20), head=(-10, 0, -16),
                                    foot_R=(26, 0, 0), foot_L=(14, 0, 0)), upperarm_R=(-150, 4, -10), forearm_R=(-64, 0, 0))),
                         (0.52, S(P(loc=(0, -0.06, 0.04), hips=(0, 0, 18), chest=(-18, 0, 18), head=(-8, 0, -14), foot_R=(22, 0, 0)),
                                  upperarm_R=(-152, 4, -10), forearm_R=(-58, 0, 0))),
                         (0.82, G)]),
    'axe': (False, [(0, G), (0.32, S(P(loc=(0, 0.04, 0.03), hips=(0, 0, 16), chest=(-22, 0, 8), head=(-12, 0, -18), foot_L=(12, 0, 0), foot_R=(18, 0, 0)),
                                    upperarm_L=(-168, 10, 0), forearm_L=(-40, 0, 0), upperarm_R=(-168, -10, 0), forearm_R=(-40, 0, 0))),
                    (0.4, S(P(loc=(0, 0.04, 0.04), hips=(0, 0, 16), chest=(-26, 0, 8), head=(-14, 0, -18), foot_L=(14, 0, 0), foot_R=(20, 0, 0)),
                            upperarm_L=(-176, 12, 0), forearm_L=(-46, 0, 0), upperarm_R=(-176, -12, 0), forearm_R=(-46, 0, 0))),
                    (0.58, S(P(loc=(0, -0.12, -0.16), hips=(0, 0, 16), chest=(36, 0, 8), head=(18, 0, -18),
                               thigh_L=(-22, 0, 0), shin_L=(36, 0, 0), thigh_R=(-6, 0, 0), shin_R=(30, 0, 0)),
                             upperarm_L=(-62, 14, 0), forearm_L=(-12, 0, 0), upperarm_R=(-62, -14, 0), forearm_R=(-12, 0, 0))),
                    (0.78, S(P(loc=(0, -0.11, -0.15), hips=(0, 0, 16), chest=(32, 0, 8), head=(14, 0, -18),
                               thigh_L=(-22, 0, 0), shin_L=(36, 0, 0), shin_R=(30, 0, 0)),
                             upperarm_L=(-56, 14, 0), forearm_L=(-14, 0, 0), upperarm_R=(-56, -14, 0), forearm_R=(-14, 0, 0))),
                    (1.12, G)]),
    # reactions
    'hit_jab': (False, [(0, G), (0.07, P(loc=(0, 0.05, 0), neck=(-10, 0, 0), head=(-26, 0, 8), chest=(-6, 0, 0))), (0.18, P(head=(-10, 0, 0))), (0.45, G)]),
    'hit_heavy': (False, [(0, G), (0.1, P(loc=(0, 0.14, 0), hips=(0, 0, 10), chest=(-18, 0, 20), head=(-22, 0, 24),
                                          upperarm_L=(30, -24, 0), upperarm_R=(30, 30, 0), forearm_L=(50, 0, 0), forearm_R=(50, 0, 0),
                                          thigh_R=(16, 0, 0), shin_R=(10, 0, 0))),
                          (0.36, P(loc=(0, 0.1, -0.03), chest=(-6, 0, 8), head=(-6, 0, 8))), (0.72, G)]),
    'hit_uppercut': (False, [(0, G), (0.1, P(loc=(0, 0.06, 0.1), chest=(-26, 0, 0), neck=(-14, 0, 0), head=(-40, 0, 0),
                                             upperarm_L=(30, -16, 0), upperarm_R=(30, 16, 0), forearm_L=(60, 0, 0), forearm_R=(60, 0, 0),
                                             foot_L=(24, 0, 0), foot_R=(24, 0, 0))),
                             (0.4, P(loc=(0, 0.16, 0), chest=(-14, 0, -8), head=(-14, 0, 16), upperarm_L=(30, -20, 0), upperarm_R=(30, 20, 0),
                                     forearm_L=(50, 0, 0), forearm_R=(50, 0, 0), thigh_R=(14, 0, 0))),
                             (0.62, P(loc=(0, 0.1, -0.02), head=(-4, 0, -14))), (0.92, G)]),
    'hit_axe': (False, [(0, G), (0.1, S(P(loc=(0, 0.02, -0.36), chest=(30, 0, 0), head=(26, 0, 0), thigh_L=(-44, 0, 0), shin_L=(78, 0, 0), foot_L=(-30, 0, 0),
                                         thigh_R=(-30, 0, 0), shin_R=(80, 0, 0), foot_R=(-40, 0, 0)),
                                       upperarm_L=(-20, -18, 0), forearm_L=(-24, 0, 0), upperarm_R=(-20, 18, 0), forearm_R=(-24, 0, 0))),
                        (0.42, S(P(loc=(0, 0.02, -0.3), chest=(22, 0, 8), head=(14, 0, 18), thigh_L=(-40, 0, 0), shin_L=(70, 0, 0), foot_L=(-26, 0, 0),
                                   thigh_R=(-26, 0, 0), shin_R=(72, 0, 0), foot_R=(-36, 0, 0)),
                                 upperarm_L=(-20, -18, 0), forearm_L=(-30, 0, 0), upperarm_R=(-20, 18, 0), forearm_R=(-30, 0, 0))),
                        (0.7, P(loc=(0, 0, -0.16), head=(6, 0, -16), chest=(10, 0, -6), thigh_L=(-20, 0, 0), shin_L=(36, 0, 0), thigh_R=(-14, 0, 0), shin_R=(36, 0, 0))),
                        (1.1, G)]),
    'block_hit': (False, [(0, BLOCK), (0.07, P(BLOCK, loc=(0, 0.07, -0.02), chest=(-8, 0, 0), head=(-6, 0, 0))), (0.35, BLOCK)]),
    'block_heavy': (False, [(0, BLOCK), (0.1, P(BLOCK, loc=(0, 0.16, -0.08), chest=(-12, 0, 0), head=(-8, 0, 0), thigh_R=(12, 0, 0), shin_R=(14, 0, 0))),
                            (0.6, BLOCK)]),
    'hurt': (False, [(0, G), (0.08, P(loc=(0, 0.06, -0.02), chest=(20, 0, 10), head=(16, 0, 0), upperarm_L=(10, 0, 0), upperarm_R=(10, 0, 0))), (0.5, G)]),
    'fall': (False, [(0, G), (0.14, P(loc=(0, 0.1, 0.04), chest=(-30, 0, 0), head=(-30, 0, 0), upperarm_L=(-80, -40, 0), upperarm_R=(-80, 40, 0),
                                      forearm_L=(70, 0, 0), forearm_R=(70, 0, 0))),
                     (0.45, S(P(loc=(0, 0.25, -0.1), chest=(-16, 0, 0), head=(-20, 0, 0), thigh_L=(-30, 0, 0), thigh_R=(-24, 0, 0)), hips=(-48, 0, 0),
                              upperarm_L=(-130, -40, 0), forearm_L=(-30, 0, 0), upperarm_R=(-130, 40, 0), forearm_R=(-30, 0, 0))),
                     (0.72, P(DOWN, loc=(0, 0, 0.05))), (0.86, P(DOWN, loc=(0, 0, 0.1), head=(-10, 0, 0))), (1.05, DOWN), (1.3, DOWN)]),
    'getup': (False, [(0, DOWN), (0.4, S(P(loc=(0, 0.12, -0.55)), hips=(-30, 0, 0), spine=(14, 0, 0), chest=(20, 0, 0), head=(10, 0, 0),
                                       thigh_L=(-60, -10, 0), shin_L=(120, 0, 0), foot_L=(-20, 0, 0), thigh_R=(-70, 10, 0), shin_R=(120, 0, 0), foot_R=(-20, 0, 0),
                                       upperarm_L=(10, -20, 0), forearm_L=(-10, 0, 0), upperarm_R=(10, 20, 0), forearm_R=(-10, 0, 0))),
                      (0.85, S(P(loc=(0, 0.04, -0.34)), hips=(0, 0, 0), chest=(30, 0, 0), head=(10, 0, 0),
                               thigh_L=(-70, 0, 0), shin_L=(110, 0, 0), foot_L=(-40, 0, 0), thigh_R=(-64, 0, 0), shin_R=(112, 0, 0), foot_R=(-44, 0, 0),
                               upperarm_L=(-30, -10, 0), forearm_L=(-60, 0, 0), upperarm_R=(-30, 10, 0), forearm_R=(-60, 0, 0))),
                      (1.25, G)]),
    'victory': (True, [(0, P(loc=(0, 0, 0.03))),
                       (0.5, S(P(loc=(0, 0, 0.05), chest=(-8, 0, 6), head=(-12, 0, -8)), upperarm_L=(-6, -86, 0), forearm_L=(0, -96, 0),
                               upperarm_R=(-6, 86, 0), forearm_R=(0, 96, 0))),
                       (1.0, S(P(loc=(0, 0, 0.02), chest=(-8, 0, -12), head=(-12, 0, 10)), upperarm_L=(-6, -82, 0), forearm_L=(0, -104, 0),
                               upperarm_R=(-6, 82, 0), forearm_R=(0, 104, 0))),
                       (1.5, S(P(loc=(0, 0, 0.05), chest=(-8, 0, 12), head=(-12, 0, -10)), upperarm_L=(-6, -86, 0), forearm_L=(0, -96, 0),
                               upperarm_R=(-6, 86, 0), forearm_R=(0, 96, 0))),
                       (2.0, P(loc=(0, 0, 0.03)))]),
}

# game data: when the blow lands (s), how far it reaches (m, from the attacker's centre), damage, and the reactions
MOVES = {
    'jab': dict(hit=0.15, reach=1.45, damage=6, react='hit_jab', blocked='block_hit', push=0.10),
    'heavy': dict(hit=0.36, reach=1.6, damage=14, react='hit_heavy', blocked='block_heavy', push=0.35),
    'uppercut': dict(hit=0.38, reach=1.3, damage=16, react='hit_uppercut', blocked='block_heavy', push=0.3),
    'axe': dict(hit=0.58, reach=1.4, damage=22, react='hit_axe', blocked='block_heavy', push=0.25, knockdown=True),
}
LOOP = [k for k, (loop, _) in CLIPS.items() if loop]


def author(rig):
    """One Blender action per clip on the rig. Returns {name: action}."""
    import bpy
    from mathutils import Euler, Vector
    rest = {b.name: b.matrix_local.to_quaternion() for b in rig.data.bones}
    rig.animation_data_create()
    out = {}
    for name, (loop, keys) in CLIPS.items():
        act = bpy.data.actions.new(name); act.use_fake_user = True
        rig.animation_data.action = act
        for t, pose in keys:
            fr = 1 + round(t * FPS)
            for pb in rig.pose.bones:
                pb.rotation_mode = 'QUATERNION'
                rx, ry, rz = pose.get(pb.name, (0, 0, 0))
                q = Euler((math.radians(rx), math.radians(ry), math.radians(rz)), 'XYZ').to_quaternion()
                B = rest[pb.name]
                pb.rotation_quaternion = B.inverted() @ q @ B
                pb.keyframe_insert('rotation_quaternion', frame=fr)
                if pb.name == 'hips':
                    pb.location = B.inverted() @ Vector(pose.get('loc', (0, 0, 0)))
                    pb.keyframe_insert('location', frame=fr)
                elif pb.name == 'root':
                    pb.location = (0, 0, 0); pb.keyframe_insert('location', frame=fr)
        out[name] = act
    rig.animation_data.action = None
    return out


def sheet(rig, mesh, clips, path, paint, cols=6, size=200):
    """Contact sheet: one row per clip, `cols` evenly spaced frames, three-quarter camera, painted."""
    import bpy
    from PIL import Image, ImageDraw
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
    sc.display.shading.show_shadows = False
    sc.render.resolution_x = size; sc.render.resolution_y = int(size * 1.25); sc.render.film_transparent = False
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 70
    import mathutils
    tgt = mathutils.Vector((0, -0.2, 0.95)); pos = mathutils.Vector((-3.6, -3.0, 1.35))
    cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    names = list(clips)
    W = cols * size; H = len(names) * sc.render.resolution_y
    im = Image.new('RGB', (W + 110, H), (60, 60, 66)); d = ImageDraw.Draw(im)
    tmp = path + '.frame.png'
    for r, nm in enumerate(names):
        act = clips[nm]; rig.animation_data.action = act
        a, b = act.frame_range
        for c in range(cols):
            sc.frame_set(int(round(a + (b - a) * c / (cols - 1))))
            sc.render.filepath = tmp; bpy.ops.render.render(write_still=True)
            im.paste(Image.open(tmp).convert('RGB'), (110 + c * size, r * sc.render.resolution_y))
        d.text((6, r * sc.render.resolution_y + 8), nm, fill=(255, 255, 255))
    rig.animation_data.action = None
    im.save(path, quality=86)
    os.remove(tmp)
