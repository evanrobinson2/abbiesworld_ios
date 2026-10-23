"""The modeling kit every bruiser job builds with: the Roman-kit helpers plus the study's stage maths.

A chunk recipe is runs/<arm>/<chunk>.py with one function:

    def build(k):
        ...make meshes with k.loft / k.tube / k.box / k.mesh / k.plate ...

Everything the function creates belongs to that chunk. Materials (named by what they are, clay grey like the
reference): k.SKIN, k.TANK_TOP, k.SHORTS. Conventions: Z up, metres, feet on z = 0, facing -Y, crown at z = 2.0.
k.px(col, row) turns a reference pixel into world (x, z) on the figure's mid plane, so you can place geometry
straight from the picture; k.px_y(col, row, y) does the same for a point at depth y (negative is toward camera).
Flat shading only (low-poly facets, like the reference).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roman-kit'))
sys.path.insert(0, HERE)

from kit import (TAU, mat, mesh, loft, ring, plate, tube, box, solidify, bevel, place, jitter)  # noqa: E402,F401
import stage  # noqa: E402
import numpy as np  # noqa: E402,F401

SKIN = mat('Skin', (158, 157, 154), 0.75)
TANK_TOP = mat('TankTop', (150, 150, 150), 0.85)
SHORTS = mat('Shorts', (146, 146, 146), 0.85)


def px(col, row):
    return stage.px_to_world(col, row, 0.0)


def px_y(col, row, y):
    return stage.px_to_world(col, row, y)


def mirror_x(o, name=None):
    """A mirrored copy across x = 0 (for symmetric parts); returns the new object."""
    import bpy
    c = o.copy(); c.data = o.data.copy(); c.name = name or (o.name + '_mirror')
    bpy.context.scene.collection.objects.link(c)
    for v in c.data.vertices:
        v.co.x = -v.co.x
    c.location.x = -c.location.x
    c.data.flip_normals()
    return c
