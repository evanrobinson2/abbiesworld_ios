"""Piecemeal kit: split the warrior into a body with named sockets plus separate parts, each authored relative to its socket.
usage: python kit.py params.json OUTDIR
Writes body.glb (with socket_* empties), one GLB per part (origin = its socket), sockets.json, and an exploded-view render.
"""
import sys, os, json, math, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector as V, Matrix
import build

p = json.load(open(sys.argv[1])); od = sys.argv[2]; os.makedirs(od, exist_ok=True)
LEVEL = 1
PART_SOCKET = {'body': None, 'skirt': 'waist', 'shoulder_guards': 'chest', 'bands': 'pelvis', 'helmet': 'head', 'shield': 'l_hand', 'sash': 'chest'}
SOCKETS = {'head': 'head', 'chest': 'chest', 'waist': 'pelvis', 'pelvis': 'pelvis', 'l_hand': 'l_hand', 'r_hand': 'r_hand',
           'l_shoulder': 'l_shoulder', 'r_shoulder': 'r_shoulder', 'back': 'chest', 'l_foot': 'l_ankle', 'r_foot': 'r_ankle'}

def fig_matrix():
    f = p['fig']
    return Matrix.Translation(V((f['x'], f['y'], 0))) @ Matrix.Rotation(math.radians(f['yaw']), 4, 'Z')

parts = build.setup(p, level=LEVEL, W=768, H=768, with_stage=True)
M = fig_matrix()
sockets = {}
for name, joint in SOCKETS.items():
    loc = M @ build.J(p, joint)
    if name == 'back': loc = M @ (build.J(p, joint) + V((0, 0.16, 0)))
    sockets[name] = dict(joint=joint, location=[round(x, 4) for x in loc], yaw_deg=p['fig']['yaw'])

def sha(path): return hashlib.sha256(open(path, 'rb').read()).hexdigest()

manifest = dict(schemaVersion=1, character='romanPaperWarrior', style='papercraft-v1' if p.get('papercraft') else 'plain', sockets=sockets, parts=[])
for ob in parts:
    sock = PART_SOCKET.get(ob.name)
    origin = V(sockets[sock]['location']) if sock else V((0, 0, 0))
    ob.data.transform(Matrix.Translation(-origin)); ob.location = origin
    if sock is None:
        for sname, s in sockets.items():
            e = bpy.data.objects.new('socket_' + sname, None); e.empty_display_type = 'ARROWS'; e.empty_display_size = 0.08
            bpy.context.scene.collection.objects.link(e); e.location = V(s['location']); e.parent = ob
            e.matrix_parent_inverse = ob.matrix_world.inverted()
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    for c in ob.children: c.select_set(True)
    bpy.context.view_layer.objects.active = ob
    path = os.path.join(od, f'{ob.name}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True)
    ob.data.calc_loop_triangles()
    manifest['parts'].append(dict(part=ob.name, socket=sock, file=os.path.basename(path), triangles=len(ob.data.loop_triangles), sha256=sha(path)))

# exploded view: push each part away from the body along its socket direction
centre = V((0, 0, 1.0))
for ob in parts:
    sock = PART_SOCKET.get(ob.name)
    if not sock: continue
    d = (ob.location - centre); d.z *= 0.6
    ob.location = ob.location + (d.normalized() if d.length > 1e-4 else V((0, 0, 1))) * 0.35
build.render(os.path.join(od, 'exploded.png'), 768, 768, samples=32)
json.dump(manifest, open(os.path.join(od, 'kit.json'), 'w'), indent=1)
print(json.dumps([(x['part'], x['socket'], x['triangles']) for x in manifest['parts']]))
