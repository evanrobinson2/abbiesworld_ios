"""Roman helmet (Imperial Gallic type with a fore-and-aft crest), from Evan's Midjourney job 615426e3 image 2.
python build.py  ->  helmet.glb next to this file. Shape numbers live in P; revisions are parameter edits."""
import os, sys, math, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import kit  # noqa: E402

P = dict(
    bowl_rx=0.105, bowl_ry=0.13, bowl_h=0.145, bowl_n=14, wall=0.006,
    band_h=0.032, band_out=0.01,
    visor_z=0.048, visor_out=0.052, visor_arc=165,             # degrees of the front covered by the brow peak
    neck_drop=0.11, neck_out=0.12, neck_arc=100,
    cheek_top=-0.004, cheek_len=0.215, cheek_y0=-0.105, cheek_y1=0.05, cheek_flare=18, cheek_wrap=28,
    crest_cz=0.075, crest_R=0.175, crest_depth=0.07, crest_w=0.062, crest_a0=-8, crest_a1=165, crest_blocks=8,
    stud_r=0.016,
    jitter=0.0018, facet=0.007,
)
IVORY = kit.mat('Ivory', (236, 229, 215), 0.72)


def bowl():
    rings = []
    for k, t in enumerate(np.linspace(0, 1, 6)):
        z = P['bowl_h'] * math.sin(t * math.pi / 2) if k else 0.0
        s = math.cos(t * math.pi / 2) if k < 5 else 0.12
        rings.append(kit.ring(P['bowl_rx'] * s, P['bowl_ry'] * s, z, P['bowl_n'], -math.pi / 2, 3 * math.pi / 2))
    o = kit.loft('bowl', rings, IVORY, cap_end=True)
    return kit.solidify(o, P['wall'], 1)


def band():
    rx, ry = P['bowl_rx'] + P['band_out'], P['bowl_ry'] + P['band_out']
    rings = [kit.ring(rx, ry, z, P['bowl_n'], -math.pi / 2, 3 * math.pi / 2) for z in (-0.004, P['band_h'])]
    o = kit.loft('brow_band', rings, IVORY)
    kit.solidify(o, 0.008, 1)
    r2 = [kit.ring(rx + 0.004, ry + 0.004, z, P['bowl_n'], -math.pi / 2, 3 * math.pi / 2) for z in (0.008, 0.016)]
    kit.solidify(kit.loft('band_rib', r2, IVORY), 0.004, 1)


def sector_plate(name, a0, a1, r_in_scale, out, z_in, z_out, n=9):
    a0, a1 = math.radians(a0), math.radians(a1)
    inner = kit.ring(P['bowl_rx'] * r_in_scale, P['bowl_ry'] * r_in_scale, z_in, n, a0, a1, endpoint=True)
    outer = kit.ring(P['bowl_rx'] * r_in_scale + out, P['bowl_ry'] * r_in_scale + out, z_out, n, a0, a1, endpoint=True)
    return kit.loft(name, [inner, outer], IVORY, closed=False)


def visor():
    h = P['bowl_h']; z = P['visor_z']; s = math.cos(math.asin(min(z / h, 0.99)))
    a = P['visor_arc'] / 2
    o = sector_plate('brow_peak', -90 - a, -90 + a, s, P['visor_out'], z, z - 0.006)
    kit.solidify(o, 0.008, -1)
    # the raised brow rib that runs round the front of the dome above the peak
    zr = h * 0.6; sr = math.cos(math.asin(0.6)) + 0.03
    ang = np.radians(np.linspace(-90 - a + 15, -90 + a - 15, 11))
    pts = np.c_[P['bowl_rx'] * sr * np.cos(ang), P['bowl_ry'] * sr * np.sin(ang), zr - 0.012 * np.cos(np.linspace(-1.3, 1.3, 11))]
    kit.tube('brow_rib', pts, 0.007, 5, IVORY)


def neck_guard():
    a = P['neck_arc'] / 2
    rx, ry = P['bowl_rx'] + P['band_out'], P['bowl_ry'] + P['band_out']
    a0, a1 = math.radians(90 - a), math.radians(90 + a); n = 9
    r0 = kit.ring(rx, ry, 0.0, n, a0, a1, endpoint=True)
    r1 = kit.ring(rx + 0.01, ry + 0.01, -P['neck_drop'] * 0.6, n, a0, a1, endpoint=True)
    r2 = kit.ring(rx + P['neck_out'], ry + P['neck_out'], -P['neck_drop'], n, a0, a1, endpoint=True)
    kit.solidify(kit.loft('neck_guard', [r0, r1, r2], IVORY, closed=False), 0.007, -1)


def cheeks():
    L, y0, y1 = P['cheek_len'], P['cheek_y0'], P['cheek_y1']
    # side outline (y, z): broad top under the band, a mouth notch on the front edge, a pointed chin lobe
    out = [(y0 + 0.02, 0), (y1, 0), (y1 + 0.01, -0.12 * L), (y1 + 0.022, -0.45 * L), (y1 + 0.005, -0.8 * L), (y1 - 0.04, -L),
           (y0 + 0.02, -0.97 * L), (y0 - 0.015, -0.78 * L), (y0 + 0.035, -0.6 * L), (y0 - 0.01, -0.45 * L), (y0 + 0.01, -0.12 * L)]
    fl = math.tan(math.radians(P['cheek_flare']))
    for side in (-1, 1):
        x0 = P['bowl_rx'] + P['band_out'] + 0.004
        wr = math.tan(math.radians(P['cheek_wrap']))     # the front edge wraps in toward the face
        v = [(side * (x0 - z * fl - max(0.0, y1 - y) * wr * 0.5), y, P['cheek_top'] + z) for y, z in out]
        o = kit.mesh(f'cheek_guard_{"l" if side < 0 else "r"}', v, [tuple(range(len(v)))], IVORY)
        kit.solidify(o, 0.007, 0)


def ear_guards():
    for side in (-1, 1):
        # a flanged arch over the ear, behind the cheek guard's hinge
        a = np.linspace(0, math.pi, 8); x0 = P['bowl_rx'] + P['band_out']
        inner = np.c_[np.full(8, side * (x0 + 0.002)), P['cheek_y1'] + 0.035 + 0.032 * np.cos(a), 0.012 - 0.045 * np.sin(a)]
        outer = np.c_[np.full(8, side * (x0 + 0.02)), P['cheek_y1'] + 0.035 + 0.045 * np.cos(a), 0.012 - 0.058 * np.sin(a)]
        kit.solidify(kit.loft(f'ear_guard_{"l" if side < 0 else "r"}', [inner, outer], IVORY, closed=False), 0.006, 0)


def studs():
    for side in (-1, 1):
        for i, y in enumerate((-0.035, 0.0)):
            o = kit.loft(f'stud_{side}_{i}', [kit.ring(P['stud_r'], P['stud_r'], 0, 6), kit.ring(P['stud_r'] * 0.6, P['stud_r'] * 0.6, 0.01, 6)], IVORY, cap_start=True, cap_end=True)
            o.rotation_euler = (0, math.radians(90 * side), 0)
            ang = math.atan2(y, side * P['bowl_rx'])
            o.location = (side * (P['bowl_rx'] - 0.004), y * 1.25 - 0.03, P['band_h'] + 0.018)


def crest():
    cz, R, D, W = P['crest_cz'], P['crest_R'], P['crest_depth'], P['crest_w']
    a0, a1, nb = math.radians(P['crest_a0']), math.radians(P['crest_a1']), P['crest_blocks']
    edges = np.linspace(a0, a1, nb + 1); gap = math.radians(1.2)
    rnd = np.random.default_rng(3)
    for i in range(nb):
        b0, b1 = edges[i] + gap, edges[i + 1] - gap
        ro = R + rnd.uniform(-0.006, 0.01); ri = R - D
        w_in, w_out = W * 0.42, W * 0.55
        v = []
        for ang in (b0, b1):
            c, s = math.cos(ang), math.sin(ang)
            for rr, w in ((ri, w_in), (ro, w_out)):
                for x in (-w, w):
                    v.append((x, -c * rr, cz + s * rr))   # angle 0 = back (+Y), 180 = front (-Y)
        # v order: [b0: in -w, in +w, out -w, out +w], [b1: same]
        f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        kit.jitter(kit.mesh(f'crest_block_{i}', v, f, IVORY), 0.003, i)
    # the curved holder the plume sits in, and the post that carries it
    a = np.linspace(a0 + 0.05, a1 - 0.05, 12)
    pts = np.c_[np.zeros_like(a), -np.cos(a) * (R - D - 0.006), cz + np.sin(a) * (R - D - 0.006)]
    kit.tube('crest_holder', pts, 0.008, 6, IVORY)
    kit.box('crest_post', (0.018, 0.018, R - D - 0.006 - (P['bowl_h'] - cz) + 0.01), (0, 0, (P['bowl_h'] + cz + R - D - 0.006) / 2), IVORY)


def build(out):
    kit.reset()
    bowl(); band(); visor(); neck_guard(); cheeks(); ear_guards(); studs(); crest()
    for o in list(kit.bpy.context.scene.objects):
        if o.type == 'MESH' and not o.name.startswith('crest_block'):
            kit.jitter(o, P['jitter'], zlib.crc32(o.name.encode()))
        if o.type == 'MESH' and o.name.split('_')[0] in ('bowl', 'cheek', 'neck', 'crest'):
            kit.facet(o, P['facet'], 0.02)
    kit.ground()
    kit.export(out)
    return kit.triangles()


if __name__ == '__main__':
    print('triangles', build(os.path.join(HERE, 'helmet.glb')))
