"""The fixed stage for AW-STUDY-0021: one camera matched to the reference, one light rig, one renderer.

World: Z up, metres, the bruiser stands with his feet on z = 0, centred on x = 0, facing -Y (toward the camera).
He is 2.0 m tall (crown at z = 2.0). The camera is level, 85 mm, 5.18 m in front, so on the plane y = 0
one metre is 467 reference pixels, the ground line sits at pixel row 987 and the crown at row 53.

Every arm renders through this file, so before/after views are always the same camera.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref', 'bruiser.png')
REF_MASK = os.path.join(HERE, 'ref', 'mask.png')

IMG = 1024                 # reference size in pixels
PX_PER_M = 467.0           # at y = 0
GROUND_ROW = 987.0         # pixel row of z = 0
CENTRE_COL = 516.0         # pixel column of x = 0
LENS, SENSOR = 85.0, 36.0
F_PX = LENS / SENSOR * IMG
DIST = F_PX / PX_PER_M     # camera distance to the plane y = 0
CAM_Z = 1.2
SHIFT_Y = (GROUND_ROW - IMG / 2 - PX_PER_M * CAM_Z) / IMG
SHIFT_X = -(CENTRE_COL - IMG / 2) / IMG


def px_to_world(col, row, y=0.0):
    """Reference pixel (col, row) -> world (x, z) on the plane at depth y (default the figure's mid plane)."""
    d = DIST + y
    x = (col - IMG / 2 + SHIFT_X * IMG) * d / F_PX
    z = CAM_Z - (row - IMG / 2 - SHIFT_Y * IMG) * d / F_PX
    return x, z


def world_to_px(x, z, y=0.0):
    d = DIST + y
    return IMG / 2 - SHIFT_X * IMG + x * F_PX / d, IMG / 2 + SHIFT_Y * IMG - (z - CAM_Z) * F_PX / d


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def setup(res=512, samples=16):
    """Camera, lights, floor shadow catcher and render settings. Call after the figure is built."""
    import bpy
    sc = bpy.context.scene
    cam_data = bpy.data.cameras.new('StudyCamera')
    cam_data.lens = LENS; cam_data.sensor_width = SENSOR; cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.shift_x = SHIFT_X; cam_data.shift_y = SHIFT_Y; cam_data.clip_end = 100
    cam = bpy.data.objects.new('StudyCamera', cam_data); sc.collection.objects.link(cam)
    cam.location = (0, -DIST, CAM_Z); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam

    # Key from the front right and above (the floor shadow falls to the left), soft fill, grey studio world.
    key = bpy.data.lights.new('Key', 'SUN'); key.energy = 1.5; key.angle = math.radians(25)
    ko = bpy.data.objects.new('Key', key); sc.collection.objects.link(ko)
    ko.rotation_euler = (math.radians(28), 0, math.radians(40))
    fill = bpy.data.lights.new('Fill', 'SUN'); fill.energy = 0.5; fill.angle = math.radians(40)
    fo = bpy.data.objects.new('Fill', fill); sc.collection.objects.link(fo)
    fo.rotation_euler = (math.radians(70), 0, math.radians(-40))
    world = bpy.data.worlds.new('Studio'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*[srgb_to_lin(c) for c in (134, 136, 128)], 1); bg.inputs['Strength'].default_value = 0.55

    me = bpy.data.meshes.new('Floor'); s = 8
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    floor = bpy.data.objects.new('Floor', me); sc.collection.objects.link(floor); floor.is_shadow_catcher = True

    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_denoising = False; sc.cycles.max_bounces = 3
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    return cam, floor


def backdrop(res):
    """The reference backdrop with the figure painted out (per-row colour from the image margins)."""
    from PIL import Image
    im = np.asarray(Image.open(REF).convert('RGB').resize((res, res), Image.LANCZOS)).astype(float)
    k = max(1, res * 120 // IMG)
    row = np.median(np.concatenate([im[:, :k], im[:, -k:]], 1), 1)
    return np.repeat(row[:, None, :], res, 1) / 255.0
