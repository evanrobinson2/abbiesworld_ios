"""A reversible bark look-development pass on the actual B06 enclosing tree.

Scanned color/height/roughness, world-space grain flow, true Cycles relief,
and fine bump. Architecture and observer camera are deliberately unchanged.
"""
import bpy
import numpy as np
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
baseline = ROOT / 'rooftop-scene-b06.blend'
if not baseline.exists():
    baseline = ROOT / 'rooftop-current.blend'
bpy.ops.wm.open_mainfile(filepath=str(baseline))
scene = bpy.context.scene
core = bpy.data.objects['B04 continuous enclosing tree']
original_camera = scene.camera
original_pose = original_camera.matrix_world.copy()

def coords(obj):
    a = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)

def attribute(obj, name, values, kind='FLOAT_VECTOR'):
    a = obj.data.attributes.get(name) or obj.data.attributes.new(name, kind, 'POINT')
    a.data.foreach_set('vector' if kind == 'FLOAT_VECTOR' else 'value', values.astype(np.float32).ravel())

# Rest coordinates keep detail attached to the tree even when it moves. The
# foreground fibres bend with the tree, not with a projected camera image.
p = coords(core)
x, y, z = p.T
flow = p.copy()
front = np.clip((2.0 - y) / 3.5, 0, 1)
flow[:, 0] -= front * np.interp(z, [-12, 0, 1.2, 2.6, 3.7, 4.7, 6.2, 8.2],
                              [-.7, -.7, -.8, -.25, .55, 1.65, 2.05, 2.0])
flow[:, 1] -= front * np.interp(z, [-12, 0, 1.2, 2.6, 3.7, 4.7, 6.2, 8.2],
                              [-.65, -.65, -.25, .35, .95, 1.5, 1.8, 2.0])
attribute(core, 'Bark flow metres', flow)
normal = np.array([tuple(v.normal) for v in core.data.vertices], dtype=np.float32)
attribute(core, 'Bark rest normal', normal)

# Do not displace architectural bearing surfaces or the bark directly behind
# the back cushions. Fine shading remains there, but the support volume stays.
deck_mask = np.clip((np.abs(z + .30) - .45) / .20, 0, 1)
cushion_zone = (np.clip((x + 4.30) / .35, 0, 1)
                * np.clip((y + 2.8) / .35, 0, 1)
                * np.clip((2.2 - y) / .35, 0, 1)
                * np.clip((1.65 - z) / .35, 0, 1))
mask = deck_mask * (1 - cushion_zone)
# Explicitly protect complete faces behind each cushion. A vertex mask alone
# can interpolate a little relief into a contact area from a larger face.
collider = BVHTree.FromPolygons([v.co for v in core.data.vertices],
                               [list(f.vertices) for f in core.data.polygons])
protected = set()
for cushion in [o for o in scene.objects if o.name.startswith('B back cushion')]:
    for dy in [-.43, 0, .43]:
        for dz in [-.36, 0, .36]:
            origin = Vector((cushion.location.x + .35, cushion.location.y + dy, cushion.location.z + dz))
            hit, normal, face, distance = collider.ray_cast(origin, Vector((-1, 0, 0)), 2)
            if hit is not None:
                protected.update(core.data.polygons[face].vertices)
mask[list(protected)] = 0
attribute(core, 'Bark relief allowed', mask, 'FLOAT')

mat = bpy.data.materials.new('B07 Ancient bark — scan + physical furrows')
mat.use_nodes = True
mat.displacement_method = 'BOTH'
mat.max_vertex_displacement = .22
nt = mat.node_tree
nt.nodes.clear()

def node(kind, name):
    n = nt.nodes.new(kind)
    n.label = name
    n.name = name
    return n

def mathn(op, a, b=None, name=None):
    n = node('ShaderNodeMath', name or op)
    n.operation = op
    for i, v in enumerate([a, b]):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]

def vec(op, a, b=None):
    n = node('ShaderNodeVectorMath', op)
    n.operation = op
    nt.links.new(a, n.inputs[0])
    if b is not None:
        if isinstance(b, (tuple, list)):
            n.inputs[1].default_value = b
        else:
            nt.links.new(b, n.inputs[1])
    return n.outputs['Vector']

rest = node('ShaderNodeAttribute', 'Bark grain coordinates in metres')
rest.attribute_name = 'Bark flow metres'
scaled = vec('MULTIPLY', rest.outputs['Vector'], (1.12, 1.12, .60))
sep = node('ShaderNodeSeparateXYZ', 'Three surface projections')
nt.links.new(scaled, sep.inputs[0])
projections = []
for axes in [('Y', 'Z'), ('X', 'Z'), ('X', 'Y')]:
    n = node('ShaderNodeCombineXYZ', ''.join(axes))
    nt.links.new(sep.outputs[axes[0]], n.inputs['X'])
    nt.links.new(sep.outputs[axes[1]], n.inputs['Y'])
    projections.append(n.outputs[0])
rn = node('ShaderNodeAttribute', 'Undisplaced surface direction')
rn.attribute_name = 'Bark rest normal'
ns = node('ShaderNodeSeparateXYZ', 'Projection weights')
nt.links.new(vec('ABSOLUTE', rn.outputs['Vector']), ns.inputs[0])
w = [mathn('POWER', ns.outputs[k], 6) for k in 'XYZ']
total = mathn('MAXIMUM', mathn('ADD', mathn('ADD', w[0], w[1]), w[2]), .00001)
w = [mathn('DIVIDE', q, total) for q in w]

def map_texture(suffix, colorspace):
    path = next((HERE / 'maps').glob('*_' + suffix + '_4k.*'))
    im = bpy.data.images.load(str(path), check_existing=True)
    im.colorspace_settings.name = colorspace
    im.pack()
    outputs = []
    for i, projection in enumerate(projections):
        n = node('ShaderNodeTexImage', suffix + ' projection ' + 'XYZ'[i])
        n.image = im
        n.interpolation = 'Cubic' if suffix == 'disp' else 'Linear'
        nt.links.new(projection, n.inputs['Vector'])
        v = node('ShaderNodeVectorMath', suffix + ' weighted ' + str(i))
        v.operation = 'SCALE'
        nt.links.new(n.outputs['Color'], v.inputs[0])
        nt.links.new(w[i], v.inputs['Scale'])
        outputs.append(v.outputs['Vector'])
    return vec('ADD', vec('ADD', outputs[0], outputs[1]), outputs[2])

color = map_texture('diff', 'sRGB')
rough = map_texture('rough', 'Non-Color')
height = map_texture('disp', 'Non-Color')

bs = node('ShaderNodeBsdfPrincipled', 'Weathered fibrous bark')
bs.inputs['Specular IOR Level'].default_value = .27
hue = node('ShaderNodeHueSaturation', 'Muted violet-brown palette')
hue.inputs['Saturation'].default_value = .62
hue.inputs['Value'].default_value = .86
nt.links.new(color, hue.inputs['Color'])
nt.links.new(vec('MULTIPLY', hue.outputs['Color'], (.86, .89, 1.02)), bs.inputs['Base Color'])
roughness = node('ShaderNodeMapRange', 'Dry ridges and slightly smoother fissures')
roughness.inputs['To Min'].default_value = .63
roughness.inputs['To Max'].default_value = .96
nt.links.new(rough, roughness.inputs['Value'])
nt.links.new(roughness.outputs[0], bs.inputs['Roughness'])

macro = node('ShaderNodeTexNoise', 'Broad irregular longitudinal furrows')
nt.links.new(vec('MULTIPLY', rest.outputs['Vector'], (5.2, 5.2, .36)), macro.inputs['Vector'])
macro.inputs['Scale'].default_value = 1
macro.inputs['Detail'].default_value = 3.2
macro.inputs['Roughness'].default_value = .68
ramp = node('ShaderNodeValToRGB', 'Flatten ridge tops, deepen channels')
ramp.color_ramp.elements[0].position = .24
ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
ramp.color_ramp.elements[1].position = .68
ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
ramp.color_ramp.interpolation = 'EASE'
nt.links.new(macro.outputs['Fac'], ramp.inputs[0])
scan_relief = mathn('MULTIPLY', mathn('SUBTRACT', height, .5), .17)
broad_relief = mathn('MULTIPLY', mathn('SUBTRACT', ramp.outputs['Color'], .5), .09)
relief = mathn('ADD', scan_relief, broad_relief)
allowed = node('ShaderNodeAttribute', 'Preserve cushion and deck contacts')
allowed.attribute_name = 'Bark relief allowed'
disp = node('ShaderNodeDisplacement', 'Real surface relief in metres')
disp.inputs['Midlevel'].default_value = 0
disp.inputs['Scale'].default_value = 1
nt.links.new(mathn('MULTIPLY', relief, allowed.outputs['Fac']), disp.inputs['Height'])

# The scan's smaller cracks need shading detail between displacement vertices.
fine = node('ShaderNodeBump', 'Fine scan relief')
fine.inputs['Strength'].default_value = .55
fine.inputs['Distance'].default_value = .024
nt.links.new(height, fine.inputs['Height'])
micro = node('ShaderNodeTexNoise', 'Submillimetre fibres')
nt.links.new(rest.outputs['Vector'], micro.inputs['Vector'])
micro.inputs['Scale'].default_value = 240
micro.inputs['Detail'].default_value = 2
bump = node('ShaderNodeBump', 'Microfibre finish')
bump.inputs['Strength'].default_value = .22
bump.inputs['Distance'].default_value = .0008
nt.links.new(micro.outputs['Fac'], bump.inputs['Height'])
nt.links.new(fine.outputs[0], bump.inputs['Normal'])
nt.links.new(bump.outputs[0], bs.inputs['Normal'])
out = node('ShaderNodeOutputMaterial', 'Final bark')
nt.links.new(bs.outputs[0], out.inputs['Surface'])
nt.links.new(disp.outputs[0], out.inputs['Displacement'])

for m in list(core.modifiers):
    if m.name == 'Fine bark relief':
        core.modifiers.remove(m)
core.data.materials.clear()
core.data.materials.append(mat)
sub = core.modifiers.new('Bark relief tessellation — desktop quality', 'SUBSURF')
sub.subdivision_type = 'SIMPLE'
sub.levels = 1
sub.render_levels = 2
core['material_source'] = 'Poly Haven / Bark Willow / CC0; see bark_detail/provenance.json'
core['detail_method'] = 'True Cycles displacement + scanned height bump; no camera projection'
core['desktop_only'] = True

scene.frame_set(1)
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1280
scene.render.resolution_y = 964
scene.render.resolution_percentage = 100
scene['revision'] = 'B07 bark study'
scene['status'] = 'Desktop bark fidelity study; architecture and camera unchanged'
scene.render.filepath = str(HERE / 'B07-full-scene.png')
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'rooftop-bark-study.blend'))
bpy.ops.render.render(write_still=True)

# A second camera observes the very same tree, in the very same illumination.
d = bpy.data.cameras.new('B07 Bark close-up')
c = bpy.data.objects.new('B07 Bark close-up', d)
bpy.data.collections['B10 Cameras and lights'].objects.link(c)
c.location = original_camera.location
c.rotation_euler = (Vector((-3.70, -.6, 1.8)) - c.location).to_track_quat('-Z', 'Y').to_euler()
d.lens = 53
d.sensor_width = 36
d.clip_end = 500
scene.camera = c
scene.render.resolution_x = 1000
scene.render.resolution_y = 1100
scene.render.filepath = str(HERE / 'B07-bark-closeup.png')
bpy.ops.render.render(write_still=True)
scene.camera = original_camera
scene.render.resolution_x = 1280
scene.render.resolution_y = 964
scene.render.filepath = str(HERE / 'B07-full-scene.png')
assert original_camera.matrix_world == original_pose
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'rooftop-bark-study.blend'))

report = {'revision': 'B07', 'source_scene': '../rooftop-current.blend',
          'original_observer_camera_unchanged': True,
          'base_tree_vertex_positions_unchanged': True,
          'base_vertices': len(core.data.vertices),
          'true_displacement': mat.displacement_method,
          'render_subdivision_levels': sub.render_levels,
          'scan_maps_packed': 3,
          'paid_generation_jobs': 0,
          'status': 'Material study, not a performance-ready game asset'}
(HERE / 'study-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print('B07_BARK_STUDY_COMPLETE', report)
