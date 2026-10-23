"""Builds the low-poly padlock (AW-STUDY-0053): the marker drawn on the board where a locked charm or tile unlocks.
Game-ready: ~300 triangles, flat shaded, three named parts, materials named by role ('metal gold', 'metal steel',
'keyhole dark'). Usage: python3 tools/charms/padlock.py  -> prototypes/ranch-atelier/dist/models/padlock/padlock.glb
Units: metres-ish, base of the body at y=0, 1.0 tall overall."""
import json, struct, math, numpy as np, pathlib

def box(w, h, d, cx, cy, cz, ch=0.06):
    # chamfered box: 24 verts of an inset top/bottom ring, built from 8 corner-cut faces via simple hull of two rects
    pts = []
    for y, s in ((cy - h/2, 1), (cy - h/2 + ch, 0), (cy + h/2 - ch, 0), (cy + h/2, 1)):
        i = ch if s else 0
        for sx, sz in ((-1,-1),(1,-1),(1,1),(-1,1)):
            pts.append((cx + sx*(w/2 - i), y, cz + sz*(d/2 - i)))
    tris = []
    for r in range(3):
        for k in range(4):
            a, b = r*4 + k, r*4 + (k+1) % 4
            c, e = a + 4, b + 4
            tris += [(a, e, b), (a, c, e)] if True else []
    tris += [(12, 13, 14), (12, 14, 15), (0, 2, 1), (0, 3, 2)]
    return np.array(pts, float), tris

def shackle(cx, cy, cz, R, r, seg=8, sides=6, arc=math.pi):
    pts, tris = [], []
    for i in range(seg + 1):
        t = math.pi*0 + arc * i / seg
        ctr = np.array([cx + R*math.cos(t), cy + R*math.sin(t), cz])
        radial = np.array([math.cos(t), math.sin(t), 0.0]); z = np.array([0, 0, 1.0])
        for j in range(sides):
            p = 2*math.pi*j/sides
            pts.append(ctr + r*(math.cos(p)*radial + math.sin(p)*z))
    for i in range(seg):
        for j in range(sides):
            a = i*sides + j; b = i*sides + (j+1) % sides
            tris += [(a, b, a+sides), (b, b+sides, a+sides)]
    # legs: straight cylinders down from both ends of the arch
    for sx in (-1, 1):
        base = len(pts)
        for lvl in (cy, cy - 0.16):
            for j in range(sides):
                p = 2*math.pi*j/sides
                pts.append((cx + sx*R + r*math.cos(p), lvl, cz + r*math.sin(p)))
        for j in range(sides):
            a = base + j; b = base + (j+1) % sides
            tris += [(a, a+sides, b), (b, a+sides, b+sides)]
    return np.array(pts, float), tris

def keyhole(cx, cy, z, r=0.055):
    pts, tris = [(cx, cy, z)], []
    ring = [(cx + r*math.cos(2*math.pi*i/8), cy + r*math.sin(2*math.pi*i/8), z) for i in range(8)]
    pts += ring + [(cx - .022, cy - r, z), (cx + .022, cy - r, z), (cx + .03, cy - r*2.4, z), (cx - .03, cy - r*2.4, z)]
    for i in range(8): tris.append((0, 1 + i, 1 + (i+1) % 8))
    tris += [(9, 10, 11), (9, 11, 12)]
    return np.array(pts, float), tris

parts = []
bp, bt = box(.62, .46, .26, 0, .23, 0); parts.append(('padlock body', 'metal gold', bp, bt))
sp, st = shackle(0, .46, 0, .2, .04); parts.append(('padlock shackle', 'metal steel', sp, st))
kp, kt = keyhole(0, .25, .1305); parts.append(('padlock keyhole', 'keyhole dark', kp, kt))
mats = {'metal gold': [0.97, 0.76, 0.24, 1.0, 0.55, 0.32], 'metal steel': [0.72, 0.76, 0.82, 1.0, 0.7, 0.35], 'keyhole dark': [0.1, 0.08, 0.1, 1.0, 0.0, 0.8]}
# flat shading: unweld
buf = bytearray(); views = []; accs = []; meshes = []; nodes = []
def add(data, target=None):
    off = len(buf); buf.extend(data)
    while len(buf) % 4: buf.append(0)
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data), **({'target': target} if target else {})}); return len(views) - 1
for name, mat, P, T in parts:
    V, N = [], []
    for a, b, c in T:
        p0, p1, p2 = P[a], P[b], P[c]; n = np.cross(p1 - p0, p2 - p0); l = np.linalg.norm(n)
        if l < 1e-9: continue
        n /= l
        for p in (p0, p1, p2): V.append(p); N.append(n)
    V = np.array(V, np.float32); N = np.array(N, np.float32)
    pv = add(V.tobytes(), 34962); nv = add(N.tobytes(), 34962)
    accs.append({'bufferView': pv, 'componentType': 5126, 'count': len(V), 'type': 'VEC3', 'min': V.min(0).tolist(), 'max': V.max(0).tolist()})
    accs.append({'bufferView': nv, 'componentType': 5126, 'count': len(N), 'type': 'VEC3'})
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': len(accs) - 2, 'NORMAL': len(accs) - 1}, 'material': list(mats).index(mat)}]})
    nodes.append({'name': name, 'mesh': len(meshes) - 1})
gltf = {'asset': {'version': '2.0', 'generator': 'tools/charms/padlock.py'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': meshes,
        'materials': [{'name': k, 'pbrMetallicRoughness': {'baseColorFactor': v[:4], 'metallicFactor': v[4], 'roughnessFactor': v[5]}} for k, v in mats.items()],
        'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
js = json.dumps(gltf, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = pathlib.Path(__file__).resolve().parents[2] / 'prototypes/ranch-atelier/dist/models/padlock/padlock.glb'
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(buf), 0x004E4942) + bytes(buf)
out.write_bytes(glb); print(out, len(glb), 'bytes', sum(a['count'] for a in accs if a['type'] == 'VEC3') // 6, 'triangles')
