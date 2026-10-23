"""Parametric papercraft base body: one recipe, eight body types (male and female x average, heroic, skinny, fat).
python body.py              -> out/<sex>-<build>.glb and out/<sex>-<build>.json (measurements and sockets for armour)
python body.py --lineup     -> also out/lineup.png, all eight side by side
Z up, metres, origin between the feet on the ground, front faces -Y. Shape numbers live in BASE, SEX and BUILD;
a new body type is a new dict of multipliers, not a new model."""
import os, sys, math, json, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', 'roman-kit'))
import kit  # noqa: E402

# Male average, fractions of height for z, metres for widths. Torso rings: (z, half-width, half-depth, forward shift).
BASE = dict(
    height=1.78, n=12,
    torso=[(0.465, 0.150, 0.100, 0.00), (0.520, 0.172, 0.112, 0.00), (0.600, 0.146, 0.098, 0.00), (0.650, 0.152, 0.104, 0.00),
           (0.720, 0.172, 0.116, 0.00), (0.775, 0.190, 0.110, 0.00), (0.815, 0.196, 0.088, 0.01), (0.840, 0.120, 0.070, 0.01)],
    neck=(0.835, 0.885, 0.050), head=(0.875, 1.0, 0.078, 0.095),        # neck z0, z1, radius; head z0, z1, half-width, half-depth
    shoulder=(0.180, 0.800), arm_len=(0.185, 0.165), arm_r=(0.046, 0.040, 0.032), arm_spread=14,
    hip=(0.090, 0.480), leg_len=(0.235, 0.215), leg_r=(0.078, 0.055, 0.040), hand=(0.095, 0.045, 0.022), foot=(0.25, 0.09, 0.07),
)
# Multipliers: sh = shoulders, ch = chest, wa = waist, be = belly (forward), hi = hips, li = limb girth, ne = neck, h = height
SEX = dict(
    male=dict(h=1.0, sh=1.0, ch=1.0, wa=1.0, hi=1.0, li=1.0, ne=1.0, bust=0.0, head=1.0),
    female=dict(h=0.94, sh=0.87, ch=0.94, wa=0.86, hi=1.10, li=0.88, ne=0.85, bust=1.0, head=0.96),
)
BUILD = dict(
    average=dict(h=1.0, sh=1.0, ch=1.0, wa=1.0, be=0.0, hi=1.0, li=1.0, ne=1.0),
    heroic=dict(h=1.05, sh=1.22, ch=1.18, wa=0.96, be=0.0, hi=1.0, li=1.28, ne=1.35),
    skinny=dict(h=1.0, sh=0.88, ch=0.84, wa=0.82, be=0.0, hi=0.88, li=0.72, ne=0.85),
    toned=dict(h=1.02, sh=1.12, ch=1.08, wa=0.92, be=0.0, hi=0.98, li=1.12, ne=1.15, tone=1.0),
    fat=dict(h=0.98, sh=1.12, ch=1.25, wa=1.45, be=1.0, hi=1.28, li=1.38, ne=1.35),
)
PAPER = kit.mat('PaperBody', (236, 230, 216), 0.85)
CLOTH = kit.mat('Cloth', (176, 184, 196), 0.9)


def params(sex, build):
    s, b = SEX[sex], BUILD[build]
    return {k: s.get(k, 1.0) * b.get(k, 1.0) for k in ('h', 'sh', 'ch', 'wa', 'hi', 'li', 'ne', 'head')} | dict(be=b['be'], bust=s['bust'], tone=b.get('tone', 0.0) * (1 - 0.35 * s['bust']))


def torso(m, H):
    rings = []; meas = {}
    for i, (z, rx, ry, fw) in enumerate(BASE['torso']):
        # each ring takes the multiplier of the body region it sits in
        if z < 0.56:   k, kd = m['hi'], m['hi']
        elif z < 0.68: k, kd = m['wa'], m['wa'] * (1 + 0.35 * m['be'])
        elif z < 0.79: k, kd = m['ch'], m['ch']
        else:          k, kd = m['sh'], m['ch']
        if i in (2, 3): fw -= 0.05 * m['be'] * (1 if i == 3 else 0.7)
        r = kit.ring(rx * k, ry * kd, z * H, BASE['n'], cy=fw)
        bump = {4: 0.55, 5: 0.2}.get(i, 0.0) * m['bust']          # two bust lobes on the front of the chest rings
        pec = {4: 0.22, 5: 0.16}.get(i, 0.0) * m['tone'] * (1 - m['bust'])           # flatter, wider pectoral shelf
        for amt, cx, wd in ((bump, 0.085, 0.06), (pec, 0.08, 0.075)):
            if amt:
                front = r[:, 1] < fw
                r[front, 1] = fw + (r[front, 1] - fw) * (1 + amt * np.exp(-((np.abs(r[front, 0]) - cx * k) / wd) ** 2))
        rings.append(r)
        meas[('crotch', 'hips', 'waist', 'belly', 'chest', 'armpit', 'shoulders', 'neck_base')[i]] = dict(z=round(z * H, 3), half_width=round(rx * k, 3), half_depth=round(ry * kd, 3), forward=round(fw, 3))
    o = kit.loft('torso', rings, PAPER, cap_start=True, cap_end=True)
    if m['tone']:
        abs_(rings, H)
    briefs(rings, H)
    if m['bust']:
        top(rings, H)
    return o, meas


def front_y(rings, z):
    zs = [r[0, 2] for r in rings]; ys = [r[:, 1].min() for r in rings]
    return float(np.interp(z, zs, ys))


def abs_(rings, H):
    """Six low paper plates on the belly, two columns of three, for a toned stomach."""
    for row, zf in enumerate((0.585, 0.625, 0.665)):
        z = zf * H; y = front_y(rings, z)
        for sx in (-1, 1):
            o = kit.box(f'abs_{row}{"l" if sx < 0 else "r"}', (0.05, 0.006, 0.04), (sx * 0.029, y + 0.004, z), PAPER)
            o.rotation_euler = (0, 0, math.radians(-6 * sx)); kit.bevel(o, 0.004)


def briefs(rings, H):
    """Paper briefs: a band hugging the pelvis rings, a little proud of the skin."""
    sel = [r for r in rings if r[0, 2] <= 0.548 * H]
    top = rings[1] * [1, 1, 0] + [0, 0, 0.545 * H]
    band = [np.c_[r[:, 0] * 1.03, r[:, 1] * 1.04, r[:, 2]] for r in sel + [top]]
    b0 = band[0]; rx = np.abs(b0[:, 0]).max()
    b0[:, 2] += 0.035 * H * (np.abs(b0[:, 0]) / rx) ** 2 - 0.006 * H   # brief cut: high at the hips, low at the middle
    kit.loft('briefs', band, CLOTH, cap_start=True)


def top(rings, H):
    """Paper sports top: a band over the chest rings, from under the bust to the armpits."""
    z0, z1 = 0.685 * H, 0.79 * H
    sel = [r for r in rings if z0 <= r[0, 2] <= z1]
    lo = rings[3] + (rings[4] - rings[3]) * ((z0 - rings[3][0, 2]) / (rings[4][0, 2] - rings[3][0, 2]))
    band = [np.c_[r[:, 0] * 1.04, r[:, 1] * 1.05, r[:, 2]] for r in [lo] + sel]
    kit.loft('sports_top', band, CLOTH)


def head_neck(m, H):
    z0, z1, r = BASE['neck']
    kit.tube('neck', [(0, 0.01, z0 * H), (0, 0.01, z1 * H)], r * m['ne'], 7, PAPER)
    hz0, hz1, hw, hd = BASE['head']; s = m['head']
    zs = np.r_[np.linspace(hz0, hz1 - 0.012, 5), hz1] * H; prof = [0.62, 0.9, 1.0, 1.0, 0.88, 0.5]
    rings = [kit.ring(hw * p * s, hd * p * s, z, 8, cy=0.012) for z, p in zip(zs, prof)]
    kit.loft('head', rings, PAPER, cap_start=True, cap_end=True)
    return dict(center=[0, 0.012, round((hz0 + hz1) / 2 * H, 3)], half_width=round(hw * s, 3), half_depth=round(hd * s, 3), top=round(hz1 * H, 3))


def limbs(m, H):
    sock = {}
    sx, sz = BASE['shoulder']; ua, fa = BASE['arm_len']; r0, r1, r2 = (r * m['li'] for r in BASE['arm_r'])
    a = math.radians(BASE['arm_spread'])
    for side, tag in ((-1, 'l'), (1, 'r')):
        p0 = np.array([side * (sx * m['sh'] - r0 * 0.4), 0.0, sz * H])
        d = np.array([side * math.sin(a), 0, -math.cos(a)])
        p1 = p0 + d * ua * H; p2 = p1 + d * fa * H
        kit.tube(f'arm_upper_{tag}', [p0, p1], [r0, r1 * 1.05], 7, PAPER)
        if m['tone']:  # deltoid cap over the shoulder joint
            kit.tube(f'deltoid_{tag}', [p0 + [0, 0, 0.03], p0 + d * 0.11], [r0 * 1.32, r0 * 0.95], 7, PAPER)
        kit.tube(f'arm_lower_{tag}', [p1, p2], [r1, r2], 7, PAPER)
        hl, hw, ht = BASE['hand']; ph = p2 + d * hl * H * 0.5
        kit.tube(f'hand_{tag}', [p2, p2 + d * hl], [hw * m['li'] ** 0.5, hw * 0.6], 6, PAPER).scale = (1, 1, 1)
        sock[f'shoulder_{tag}'] = [round(v, 3) for v in p0]; sock[f'hand_{tag}'] = [round(v, 3) for v in p2 + d * hl * 0.5]
    hx, hz = BASE['hip']; th, sh_ = BASE['leg_len']; l0, l1, l2 = (r * m['li'] for r in BASE['leg_r'])
    for side, tag in ((-1, 'l'), (1, 'r')):
        p0 = np.array([side * hx * m['hi'], 0, hz * H]); p1 = np.array([side * hx * m['hi'] * 0.85, -0.005, (hz - th) * H])
        p2 = np.array([side * hx * m['hi'] * 0.8, 0.01, 0.045 * H])
        kit.tube(f'leg_upper_{tag}', [p0 + [0, 0, 0.03], (p0 * 0.6 + p1 * 0.4), p1], [l0 * 0.95, l0 * 0.92, l1 * 1.05], 7, PAPER)
        top = p0 + [0, 0, 0.03]; cuff = top + (p1 - top) * 0.16
        kit.tube(f'briefs_leg_{tag}', [top, cuff], [l0 * 1.02, l0 * 0.99], 7, CLOTH)
        kit.tube(f'leg_lower_{tag}', [p1, p1 * 0.7 + p2 * 0.3, p2], [l1, l1 * (1.08 + 0.12 * m['tone']), l2], 7, PAPER)
        fl, fw, fh = BASE['foot']; fw *= m['li'] ** 0.4
        heel = p2 + [0, 0.03, -0.045 * H + 0.0]; toe = heel + [0, -fl, 0]
        kit.loft(f'foot_{tag}', [kit.ring(fw * 0.4, fw * 0.5, 0, 6, cx=heel[0], cy=heel[1]) + [0, 0, 0],
                                 kit.ring(fw * 0.45, fw * 0.55, fh, 6, cx=heel[0], cy=heel[1] - 0.02)], PAPER, cap_start=True, cap_end=True)
        kit.loft(f'foot_front_{tag}', [kit.ring(fw * 0.42, 0.03, 0, 6, cx=heel[0], cy=heel[1] - fl * 0.55),
                                       kit.ring(fw * 0.25, 0.02, fh * 0.55, 6, cx=heel[0], cy=heel[1] - fl * 0.6)], PAPER, cap_start=True, cap_end=True)
        kit.tube(f'foot_mid_{tag}', [heel + [0, -0.02, fh * 0.45], toe + [0, 0.04, fh * 0.25]], [fw * 0.5, fw * 0.42], 6, PAPER)
        sock[f'hip_{tag}'] = [round(v, 3) for v in p0]; sock[f'foot_{tag}'] = [round(v, 3) for v in heel + [0, -fl * 0.5, 0]]
    sock['foot_length'] = BASE['foot'][0]
    return sock


def build(sex, build_, offset=(0, 0, 0), export=None):
    m = params(sex, build_); H = BASE['height'] * m['h']
    before = set(kit.bpy.context.scene.objects)
    _, meas = torso(m, H); head = head_neck(m, H); sock = limbs(m, H)
    for o in kit.bpy.context.scene.objects:
        if o not in before and o.type == 'MESH':
            kit.facet(o, 0.0025, 0.03, levels=0, seed=zlib.crc32(o.name.encode()) % 97)
    info = dict(sex=sex, build=build_, height_m=round(H, 3), multipliers=m, torso=meas, head=head, sockets=sock)
    if export:
        kit.ground(); kit.export(export + '.glb'); info['triangles'] = kit.triangles()
        json.dump(info, open(export + '.json', 'w'), indent=2)
    else:
        new = [o for o in kit.bpy.context.scene.objects if o not in before]
        piv = kit.bpy.data.objects.new(f'{sex}-{build_}', None); kit.bpy.context.scene.collection.objects.link(piv)
        for o in new:
            o.parent = piv
        piv.location = offset
    return info


TYPES = [(s, b) for s in ('male', 'female') for b in ('average', 'heroic', 'skinny', 'fat')]

if __name__ == '__main__':
    out = os.path.join(HERE, 'out'); os.makedirs(out, exist_ok=True)
    for s, b in TYPES:
        kit.reset(); info = build(s, b, export=os.path.join(out, f'{s}-{b}'))
        print(s, b, info['height_m'], 'm', info['triangles'], 'tris')
    if '--lineup' in sys.argv:
        import lineup
        lineup.render(os.path.join(out, 'lineup.png'))
