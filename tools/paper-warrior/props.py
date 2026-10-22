"""Piecemeal props in the papercraft grammar. Each prop is authored in body-space metres around its socket,
so the same mesh fits the warrior. Builders share a few construction rules:

  patch(fn, ...)    a surface sheet from a (u, v) -> point function, with an optional raised rim (folded edge)
  hoop(...)         a faceted band around an ellipse, with zig-zag vertical creases and a flared lower edge
  arch(...)         a curved plate bent around an axis (pauldron plates, shoulder guards, straps)
  then paper.facet (scale-aware crumple), solidify (paper thickness), paper material, flat shading.
"""
import bpy, bmesh, math, random, json
import numpy as np
from mathutils import Vector as V, Matrix
import build, paper

# ------------------------------------------------------------------ construction rules
def patch(fn, nu, nv, rim_w=0.0, rim_h=0.0):
    """fn(u, v) -> (point, normal). Rim: the outermost ring of cells becomes a raised folded lip."""
    us = [i / nu for i in range(nu + 1)]; vs = [j / nv for j in range(nv + 1)]
    if rim_w > 0:
        us = sorted(set(us + [rim_w, 1 - rim_w])); vs = sorted(set(vs + [rim_w, 1 - rim_w]))
    verts, faces = [], []
    for v in vs:
        for u in us:
            p, n = fn(u, v)
            border = rim_w > 0 and (u <= rim_w + 1e-9 or u >= 1 - rim_w - 1e-9 or v <= rim_w + 1e-9 or v >= 1 - rim_w - 1e-9)
            verts.append(p + n * (rim_h if border else 0.0))
    W = len(us)
    for j in range(len(vs) - 1):
        for i in range(W - 1):
            a = j * W + i; faces.append((a, a + 1, a + W + 1, a + W))
    return verts, faces

def arch(center, axis, up, radius, a0, a1, width, w0=0.0, nu=10, nv=3, rim_w=0.0, rim_h=0.0, taper=0.0):
    """Plate bent around `axis` through `center`: angle a0..a1 (degrees, 0 = `up`), spanning `width` along the axis."""
    axis = V(axis).normalized(); up = V(up).normalized(); side = up.cross(axis)
    def fn(u, v):
        a = math.radians(a0 + (a1 - a0) * u)
        r = radius * (1 - taper * abs(u - 0.5))
        d = up * math.cos(a) + side * math.sin(a)
        return V(center) + d * r + axis * (w0 + width * (v - 0.5)), d
    return patch(fn, nu, nv, rim_w, rim_h)

def hoop(z0, z1, rx0, ry0, rx1, ry1, n, a0=0.0, a1=360.0, crease=0.0, seed=0):
    rng = random.Random(seed)
    def fn(u, v):
        a = math.radians(a0 + (a1 - a0) * u)
        rx = rx0 + (rx1 - rx0) * v; ry = ry0 + (ry1 - ry0) * v
        k = 1 + crease * (1 if round(u * n) % 2 else -1) * (0.6 + 0.4 * math.sin(7 * u + seed))
        p = V((math.sin(a) * rx * k, -math.cos(a) * ry * k, z0 + (z1 - z0) * v))
        nrm = V((math.sin(a) / rx, -math.cos(a) / ry, 0)).normalized()
        return p, nrm
    return patch(fn, n, 1)

class Acc(build.Acc):
    pass

def finish(name, acc, thick=0.004, edge=0.03, crumple=0.08, seed=0):
    ob = acc.obj(name)
    if thick:
        sol = ob.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = thick; sol.offset = -1; paper._apply(ob)
    if edge:
        paper.facet(ob, edge=edge, crumple=crumple, seed=seed)
    return ob

# ------------------------------------------------------------------ props
def cuirass(s):
    acc = Acc()
    H = s['hoops']; zt = s['hoop_top']
    hh = zt / H
    for i in range(H):
        z0 = i * hh - s['overlap']; z1 = (i + 1) * hh
        w = s['waist'] + (s['chest'] - s['waist']) * (i / max(1, H - 1)) ** 1.3
        flare = s['flare']
        for side, (a0, a1) in enumerate(((-178, 2 + s['lap']), (-2, 178))):
            acc.add(*hoop(z0, z1, w * (1 + flare) * s['rx'], w * (1 + flare) * s['ry'], w * s['rx'], w * s['ry'],
                          s['facets'] // 2, a0, a1, s['crease'], seed=i * 2 + side))
    # chest and back plates with a neck scoop
    top = s['top']; cw = s['chest']
    for front in (True, False):
        for sgn in (-1, 1):
            def fn(u, v, sgn=sgn, front=front):
                a = math.radians((u * 85 + 3) * sgn + (0 if front else 180))
                scoop = s['neck'] * max(0.0, 1 - abs(u) * 1.8) if front else s['neck'] * 0.4 * max(0.0, 1 - abs(u) * 2)
                z = zt - 0.01 + (top - zt - scoop) * v
                bulge = 1 + s['pec'] * math.sin(math.pi * v) * (1 if front else 0.5)
                r = cw * bulge * (1 - 0.18 * v)
                p = V((math.sin(a) * r * s['rx'], -math.cos(a) * r * s['ry'], z))
                return p, V((math.sin(a), -math.cos(a), 0))
            acc.add(*patch(fn, 4, 3, rim_w=0.08, rim_h=0.006))
    # shoulder guards: layered arches over each shoulder, stepping outward
    g = s['guards']
    for sgn in (-1, 1):
        for i in range(g['n']):
            c = V((sgn * (g['x'] + i * g['step']), 0, top - g['drop'] - i * g['step_z']))
            acc.add(*arch(c, (1, 0, 0), (0, 0, 1), g['r'] + i * g['dr'], -g['span'], g['span'], g['w'], 0, nu=8, nv=2, rim_w=0.1, rim_h=0.005))
    return [finish('cuirass', acc, thick=s['thick'], edge=s['edge'], crumple=s['crumple'])]

def pauldron_pair(s):
    obs = []
    for sgn in (-1, 1):
        acc = Acc()
        base = V((sgn * s['sep'] / 2, 0, 0))
        for i, pl in enumerate(s['plates']):
            a0, a1 = pl['a0'] * sgn, pl['a1'] * sgn
            if sgn < 0: a0, a1 = a1, a0
            acc.add(*arch(base + V((0, 0, pl.get('dz', 0))), (0, 1, 0), (0, 0, 1), s['r'] + i * s['dr'], a0, a1, s['len'] * (1 - i * s['shrink']),
                          nu=pl.get('nu', 8), nv=3, rim_w=s['rim_w'], rim_h=s['rim_h'], taper=s['taper']))
        ob = finish(f'pauldron_{"r" if sgn < 0 else "l"}', acc, thick=s['thick'], edge=s['edge'], crumple=s['crumple'], seed=3 + sgn)
        R = Matrix.Rotation(math.radians(s['yaw'] * sgn), 4, 'Z')
        ob.data.transform(Matrix.Translation(base) @ R @ Matrix.Translation(-base))
        obs.append(ob)
    return obs

def belt(s):
    acc = Acc()
    acc.add(*hoop(0, s['h'], s['rx'], s['ry'], s['rx'], s['ry'], s['facets'], 0, 360, 0.0))
    # buckle frame on the front, with the strap tail passing through it
    bw, bh, t = s['buckle_w'], s['buckle_h'], s['buckle_t']
    c = V((0, -s['ry'] - 0.004, s['h'] / 2))
    for (x0, z0, x1, z1) in ((-bw / 2, -bh / 2, bw / 2, -bh / 2 + t), (-bw / 2, bh / 2 - t, bw / 2, bh / 2), (-bw / 2, -bh / 2, -bw / 2 + t, bh / 2), (bw / 2 - t, -bh / 2, bw / 2, bh / 2)):
        q = [c + V((x0, 0, z0)), c + V((x1, 0, z0)), c + V((x1, 0, z1)), c + V((x0, 0, z1))]
        q2 = [x + V((0, -0.006, 0)) for x in q]
        acc.add(q + q2, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])
    def tail(u, v):
        a = math.radians(-5 + u * s['tail'] * 57.3 / s['rx'])
        r = s['rx'] + 0.006
        return V((math.sin(a) * r, -math.cos(a) * (s['ry'] + 0.006), s['h'] * (0.1 + 0.8 * v))), V((math.sin(a), -math.cos(a), 0))
    acc.add(*patch(tail, 6, 1))
    return [finish('belt', acc, thick=s['thick'], edge=s['edge'], crumple=s['crumple'])]

def sandal_pair(s):
    obs = []
    for sgn in (-1, 1):
        acc = Acc()
        L, Wd = s['len'], s['width']
        # sole outline: heel + ball + toe, as a polar-ish shape around the foot centre
        n = 20
        outline = []
        for k in range(n):
            t = 2 * math.pi * k / n
            y = -math.cos(t) * L / 2
            frac = (y / L + 0.5)  # 0 heel .. 1 toe
            w = Wd / 2 * (0.72 + 0.28 * math.sin(math.pi * min(1, frac * 1.25)))
            x = math.sin(t) * w + sgn * 0.012 * frac
            outline.append(V((x, -y, 0)))
        top = [p + V((0, 0, s['sole_h'])) for p in outline]
        lip = [p * 0.94 + V((0, 0, s['sole_h'] + s['lip'])) for p in outline]
        verts = outline + top + lip
        faces = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
        faces += [(n + k, n + (k + 1) % n, 2 * n + (k + 1) % n, 2 * n + k) for k in range(n)]
        faces += [tuple(range(n - 1, -1, -1)), tuple(range(2 * n, 3 * n))]
        acc.add(verts, faces)
        h = s['sole_h']
        # heel loop
        acc.add(*arch(V((0, -L * 0.28, h)), (0, 1, 0), (0, 0, 1), Wd * 0.42, -95, 95, s['strap_w'], nu=10, nv=1))
        # crossing straps over the forefoot
        for i, (yy, ang) in enumerate(s['straps']):
            ax = V((math.sin(math.radians(ang)) * sgn, math.cos(math.radians(ang)), 0))
            acc.add(*arch(V((0, L * yy, h)), ax, (0, 0, 1), Wd * 0.46, -92, 92, s['strap_w'], nu=10, nv=1))
        ob = finish(f'sandal_{"r" if sgn < 0 else "l"}', acc, thick=s['thick'], edge=s['edge'], crumple=s['crumple'], seed=7 + sgn)
        ob.data.transform(Matrix.Translation(V((sgn * s['sep'] / 2, sgn * s['stagger'], 0))) @ Matrix.Rotation(math.radians(s['toe_out'] * sgn), 4, 'Z'))
        obs.append(ob)
    return obs

def greave_pair(s):
    obs = []
    for sgn in (-1, 1):
        acc = Acc()
        def shell(u, v, r0=s['r0'], r1=s['r1'], span=s['span'], back=False):
            a = math.radians(-span / 2 + span * u + (180 if back else 0))
            calf = 1 + s['calf'] * math.sin(math.pi * min(1, v * 1.3))
            r = (r0 + (r1 - r0) * v) * calf
            ztop = s['h'] + s['slant'] * math.sin(a) * sgn
            z = v * ztop
            return V((math.sin(a) * r, -math.cos(a) * r, z)), V((math.sin(a), -math.cos(a), 0))
        acc.add(*patch(shell, 10, 8))
        acc.add(*patch(lambda u, v: shell(u, v, s['r0'] * 0.95, s['r1'] * 0.95, s['back_span'], True), 6, 6))
        ob = finish(f'greave_{"r" if sgn < 0 else "l"}', acc, thick=s['thick'], edge=s['edge'], crumple=s['crumple'], seed=11 + sgn)
        ob.data.transform(Matrix.Translation(V((sgn * s['sep'] / 2, 0, 0.0))) @ Matrix.Rotation(math.radians(s['yaw'] * sgn), 4, 'Z'))
        obs.append(ob)
    return obs

BUILDERS = dict(cuirass=cuirass, pauldrons=pauldron_pair, belt=belt, sandals=sandal_pair, greaves=greave_pair)
SOCKET = dict(cuirass='chest', pauldrons='shoulders', belt='waist', sandals='feet', greaves='shins')

# ------------------------------------------------------------------ stage
def setup(p, W=512, H=512, with_stage=True):
    build.clear_scene()
    objs = BUILDERS[p['prop']](p['shape'])
    f = p['place']
    M = Matrix.Translation(V((f['x'], f['y'], f['z']))) @ Matrix.Rotation(math.radians(f['yaw']), 4, 'Z') @ Matrix.Rotation(math.radians(f.get('tilt', 0)), 4, 'X')
    mat = paper.paper_material(**p['material'])
    for ob in objs:
        ob.data.transform(M)
        for poly in ob.data.polygons: poly.use_smooth = False
        ob.data.materials.clear(); ob.data.materials.append(mat)
    if with_stage:
        q = dict(stage=dict(wall_y=4.0, cyc_r=2.0), look=dict(bg_albedo=p['bg'], view='Standard', exposure=p['exposure']), light=p['light'])
        build.build_stage(q); build.build_lights(q)
    cam = p['cam']
    cd = bpy.data.cameras.new('cam'); cd.lens = cam['focal']; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24
    ob = bpy.data.objects.new('cam', cd); bpy.context.scene.collection.objects.link(ob)
    az, el = math.radians(cam['az']), math.radians(cam['el'])
    tgt = V((cam['tx'], 0, cam['tz']))
    ob.location = tgt + V((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * cam['dist']
    ob.rotation_euler = (tgt - ob.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = ob
    sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y = W, H
    return objs
