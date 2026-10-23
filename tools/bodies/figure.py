"""Mannequin diagrams for AW-STUDY-0016 (Bodies and Creatures), drawn from docs/oracle/bodies/human-canon.json.

python figure.py  -> prototypes/ranch-atelier/dist/studies/bodies-study/img/*.svg

Every picture comes from the canon numbers, so a change to the canon redraws the sheets. Figures are faceless
figure-drawing mannequins in a fitted base layer: construction, landmarks and muscle groups are layers the page can
switch (classes .lay-construct, .lay-landmarks, .lay-muscle, .lay-bone, .lay-base).
Units are heads, y up from the floor, x to the viewer's right. One head = S pixels."""
import os, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CANON = os.path.join(ROOT, 'docs', 'oracle', 'bodies', 'human-canon.json')
OUT = os.path.join(ROOT, 'prototypes', 'ranch-atelier', 'dist', 'studies', 'bodies-study', 'img')

C = dict(skin='#ead9bf', skin2='#dcc6a6', line='#6b5638', base='#8fa3b8', base2='#7a8ea4', muscle='#c9705c', muscle2='#a9513f',
         tendon='#efd9b4', bone='#f6efdc', boneline='#a08a63', guide='#b64932', grid='#cdbf98', ink='#4c4330')


def canon():
    with open(CANON) as f:
        return json.load(f)


def figure(cn, sex, build):
    """Resolve a sex and build into absolute numbers: y of every landmark in heads above the floor, widths, depths."""
    base = cn['figures'][f'{sex}-average']; b = cn['builds'][build]
    heads = b.get('heads', {}).get(sex) if 'heads' in b else base['heads'] + b.get('heads_add', 0.0)
    up = dict(base['upper']) | b.get('upper', {}).get(sex, {})
    def mult(table, key):
        m = dict(table.get('all', {})) | table.get(sex, {})
        return {k: v * m.get(k, 1.0) for k, v in base[key].items()}
    W, D = mult(b.get('width', {}), 'width'), mult(b.get('depth', {}), 'depth')
    y = {k: heads - v for k, v in up.items()}
    crotch = y['crotch']
    for k, v in base['lower'].items():
        y[k] = crotch * v
    y['crown'] = heads
    return dict(sex=sex, build=build, heads=heads, y=y, W=W, D=D, label=f"{base['label'].split(',')[0]}, {b['label'].lower()}")


# ---------- geometry helpers ----------
def catmull(pts, closed=True, k=1 / 6):
    n = len(pts)
    if n < 3:
        return 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in pts)
    P = pts
    d = f'M{P[0][0]:.2f},{P[0][1]:.2f}'
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if closed or i > 0 else P[0]
        p1, p2 = P[i], P[(i + 1) % n]
        p3 = P[(i + 2) % n] if closed or i + 2 < n else P[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        d += f' C{c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p2[0]:.2f},{p2[1]:.2f}'
    return d + (' Z' if closed else '')


class Seg:
    """A body part from A to B with a width profile [(t, left, right)] in heads; local(t, s) maps into the plane,
    s = -1 on the left edge, +1 on the right edge (left/right as seen walking from A to B)."""

    def __init__(self, A, B, prof, cap=0.35):
        self.A, self.B, self.prof, self.cap = A, B, sorted(prof), cap
        dx, dy = B[0] - A[0], B[1] - A[1]; L = math.hypot(dx, dy) or 1e-6
        self.d = (dx / L, dy / L); self.n = (self.d[1], -self.d[0]); self.L = L

    def w(self, t):
        p = self.prof
        if t <= p[0][0]: return p[0][1:]
        for (t0, l0, r0), (t1, l1, r1) in zip(p, p[1:]):
            if t <= t1:
                u = (t - t0) / (t1 - t0 or 1e-6); return l0 + (l1 - l0) * u, r0 + (r1 - r0) * u
        return p[-1][1:]

    def local(self, t, s):
        l, r = self.w(min(max(t, 0), 1)); h = (r if s > 0 else l) * s
        return (self.A[0] + self.d[0] * self.L * t + self.n[0] * h, self.A[1] + self.d[1] * self.L * t + self.n[1] * h)

    def outline(self):
        ts = sorted({p[0] for p in self.prof} | {i / 8 for i in range(9)})
        right = [self.local(t, 1) for t in ts]; left = [self.local(t, -1) for t in reversed(ts)]
        lb, rb = self.w(1); la, ra = self.w(0)
        endB = (self.B[0] + self.d[0] * self.cap * (lb + rb) / 2 + self.n[0] * (rb - lb) / 2, self.B[1] + self.d[1] * self.cap * (lb + rb) / 2 + self.n[1] * (rb - lb) / 2)
        endA = (self.A[0] - self.d[0] * self.cap * (la + ra) / 2 + self.n[0] * (ra - la) / 2, self.A[1] - self.d[1] * self.cap * (la + ra) / 2 + self.n[1] * (ra - la) / 2)
        return right + [endB] + left + [endA]

    def shape(self, ts_pts):
        return [self.local(t, s) for t, s in ts_pts]


def mirror(pts):
    return [(-x, y) for x, y in pts]


# ---------- the figure, as shapes in head units ----------
def front_parts(f, back=False):
    """Front (or back) view. Returns ordered parts: list of (name, outline points, Seg or None)."""
    y, W = f['y'], f['W']; H = f['heads']; fem = f['sex'] == 'female'
    parts = []
    # legs: hip joint to knee to ankle, thighs converge to the knees
    W['thigh'] = min(W['thigh'], W['hips'] / 2 * 1.02)
    hx = W['hips'] / 2 - W['thigh'] / 2 * 0.98
    kx = max(0.22, hx * 0.62); ax = kx * 0.92
    thigh = Seg((hx, y['troch'] + 0.15), (kx, y['knee']),
                [(0, W['thigh'] / 2 * 0.95, W['thigh'] / 2), (0.25, W['thigh'] / 2 * 0.9, W['thigh'] / 2 * 1.02), (0.6, W['thigh'] / 2 * 0.72, W['thigh'] / 2 * 0.84),
                 (0.85, W['knee'] / 2 * 1.12, W['knee'] / 2 * 1.02), (1, W['knee'] / 2, W['knee'] / 2)], cap=0.2)
    shin = Seg((kx, y['knee']), (ax, y['ankle']),
               [(0, W['knee'] / 2, W['knee'] / 2), (0.18, W['calf'] / 2 * 0.9, W['calf'] / 2 * 1.04), (0.32, W['calf'] / 2 * 1.04, W['calf'] / 2 * 0.98),
                (0.7, W['ankle'] / 2 * 1.35, W['ankle'] / 2 * 1.25), (1, W['ankle'] / 2, W['ankle'] / 2)], cap=0.2)
    fw = W['foot'] / 2
    foot = [(ax - fw * 0.55, y['ankle'] + 0.12), (ax + fw * 0.6, y['ankle'] + 0.1), (ax + fw * 1.05, 0.06), (ax + fw * 0.9, 0.0),
            (ax - fw * 0.95, 0.0), (ax - fw * 1.0, 0.06)]
    if back:
        foot = [(ax - fw * 0.6, y['ankle'] + 0.12), (ax + fw * 0.6, y['ankle'] + 0.12), (ax + fw * 0.7, 0.04), (ax + fw * 0.4, 0.0), (ax - fw * 0.4, 0.0), (ax - fw * 0.7, 0.04)]
    for side in (1, -1):
        mf = (lambda p: p) if side > 0 else mirror
        parts += [(f'foot{side}', mf(foot), None), (f'shin{side}', mf(shin.outline()), (shin, side)), (f'thigh{side}', mf(thigh.outline()), (thigh, side))]
    # torso: crotch to the base of the neck, a vertical segment with the width at each landmark
    yb, yt = y['crotch'] - 0.12, y['pit'] + 0.1
    T = lambda yy: (yy - yb) / (yt - yb)
    sh_joint = W['shoulders'] / 2 - W['upper_arm'] / 2 * 0.95
    tp = [(0, 0.22, 0.22), (T(y['crotch'] + 0.05), W['hips'] / 2 * 0.72, W['hips'] / 2 * 0.72), (T(y['troch']), W['hips'] / 2, W['hips'] / 2),
          (T(y['asis']), W['hips'] / 2 * 0.95, W['hips'] / 2 * 0.95), (T(y['iliac']), W['waist'] / 2 * (1.12 if fem else 1.06), W['waist'] / 2 * (1.12 if fem else 1.06)),
          (T(y['waist']), W['waist'] / 2, W['waist'] / 2), (T(y['ribs']), W['chest'] / 2 * 0.9, W['chest'] / 2 * 0.9),
          (T(y['nipple']), W['chest'] / 2, W['chest'] / 2), (T(y['nipple'] + 0.35), W['chest'] / 2 * 1.02, W['chest'] / 2 * 1.02),
          (T(y['acromion'] - 0.12), sh_joint + 0.06, sh_joint + 0.06), (T(y['acromion'] + 0.02), sh_joint * 0.75, sh_joint * 0.75),
          (1, W['neck'] / 2 * 1.3, W['neck'] / 2 * 1.3)]
    torso = Seg((0, yb), (0, yt), [(t, l, r) for t, l, r in tp], cap=0.0)
    parts.append(('torso', torso.outline(), (torso, 1)))
    # neck and head
    yc = y['chin']; hw = W['head'] / 2
    neck = Seg((0, y['pit'] - 0.05), (0, yc + 0.18), [(0, W['neck'] / 2 * 1.15, W['neck'] / 2 * 1.15), (0.5, W['neck'] / 2, W['neck'] / 2), (1, W['neck'] / 2 * 0.95, W['neck'] / 2 * 0.95)], cap=0)
    parts.append(('neck', neck.outline(), (neck, 1)))
    head = [(0, H), (hw * 0.78, H - 0.08), (hw, H - 0.38), (hw * 0.95, H - 0.58), (hw * 0.78, H - 0.8), (hw * 0.4, yc + 0.03), (0, yc),
            (-hw * 0.4, yc + 0.03), (-hw * 0.78, H - 0.8), (-hw * 0.95, H - 0.58), (-hw, H - 0.38), (-hw * 0.78, H - 0.08)]
    parts.append(('head', head, None))
    # arms: shoulder joint, elbow, wrist, fingertips; a slight A pose
    S = (sh_joint, y['acromion'] - 0.18)
    def at_y(P, yy, ang):
        return (P[0] + (P[1] - yy) * math.tan(math.radians(ang)), yy)
    E = at_y(S, y['elbow'], 9); Wr = at_y(E, y['wrist'], 11); F = at_y(Wr, y['fingertip'], 6)
    ua = W['upper_arm'] / 2; fa = W['forearm'] / 2; wr = W['wrist'] / 2; hd = W['hand'] / 2
    upper = Seg(S, E, [(0, ua * 1.05, ua * 1.0), (0.2, ua * 0.95, ua * 1.12), (0.45, ua * 0.85, ua * 1.0), (0.75, ua * 0.86, ua * 0.84), (1, fa * 0.92, fa * 0.92)], cap=0.5)
    fore = Seg(E, Wr, [(0, fa * 0.95, fa * 0.92), (0.22, fa * 1.02, fa * 1.06), (0.6, fa * 0.78, fa * 0.82), (1, wr, wr)], cap=0.2)
    hand = Seg(Wr, F, [(0, wr * 1.05, wr * 1.05), (0.3, hd * 1.0, hd * 1.08), (0.55, hd * 0.95, hd * 0.95), (0.85, hd * 0.7, hd * 0.75), (1, hd * 0.35, hd * 0.35)], cap=0.4)
    for side in (1, -1):
        mf = (lambda p: p) if side > 0 else mirror
        parts += [(f'upper{side}', mf(upper.outline()), (upper, side)), (f'fore{side}', mf(fore.outline()), (fore, side)), (f'hand{side}', mf(hand.outline()), (hand, side))]
    f['_segs'] = dict(thigh=thigh, shin=shin, torso=torso, neck=neck, upper=upper, fore=fore, hand=hand)
    f['_joints'] = dict(shoulder=S, elbow=E, wrist=Wr, hip=(hx, y['troch'] - 0.05), knee=(kx, y['knee'] + 0.05), ankle=(ax, y['ankle']))
    return parts


def side_parts(f):
    """Side view, facing the viewer's left. x < 0 is the front of the body."""
    y, D = f['y'], f['D']; H = f['heads']; fem = f['sex'] == 'female'
    dc, dw, db = D['chest'] / 1.05, D['waist'] / 0.86, D['buttocks'] / 1.0
    belly = max(0.0, D['waist'] - (0.78 if fem else 0.86))
    # torso: (y, front x, back x)
    rows = [(y['crotch'] - 0.1, -0.28, 0.42 * db), (y['troch'] - 0.05, -0.4, 0.62 * db), (y['asis'], -0.48 - belly * 0.35, 0.56 * db),
            (y['navel'], -0.5 * dw - belly * 0.7, 0.42 if not fem else 0.4), (y['waist'], -0.46 * dw - belly * 0.55, 0.36 if not fem else 0.33),
            (y['ribs'], -0.54 * dc - belly * 0.25, 0.42), (y['nipple'] - (0.3 if fem else 0.2), -0.56 * dc - (0.06 if fem else 0), 0.46),
            (y['nipple'], -(0.62 if not fem else 0.7) * dc, 0.49), (y['nipple'] + 0.35, -0.56 * dc, 0.5),
            (y['acromion'], -0.36, 0.42), (y['pit'] + 0.05, -0.25, 0.3)]
    front = [(x, yy) for yy, x, _ in rows]; backc = [(x, yy) for yy, _, x in reversed(rows)]
    torso = front + backc
    # neck leans forward
    neck = [(-0.24, y['pit'] + 0.02), (-0.2, y['chin'] + 0.12), (0.12, y['chin'] + 0.2), (0.26, y['pit'] + 0.25), (0.3, y['pit'] + 0.05)]
    hd = D['head']
    head = [(0.02, H), (0.4 * hd / 0.86, H - 0.12), (0.52 * hd / 0.86, H - 0.42), (0.42, H - 0.72), (0.18, H - 0.84), (0.04, y['chin'] + 0.16),
            (-0.22, y['chin']), (-0.36, y['chin'] + 0.06), (-0.4, H - 0.8), (-0.47, H - 0.66), (-0.41, H - 0.52), (-0.44, H - 0.42),
            (-0.37, H - 0.2), (-0.2, H - 0.04)]
    # leg: one closed outline from the front of the thigh, round the foot, up the back
    dt, dk = D['thigh'] / 0.8, D['calf'] / 0.62
    yk, ya, yt = y['knee'], y['ankle'], y['troch']
    legf = [(-0.4 * dt, yt), (-0.46 * dt, (yt + yk) / 2 + 0.3), (-0.4 * dt, (yt + yk) / 2 - 0.2), (-0.28, yk + 0.25), (-0.27, yk + 0.05), (-0.22, yk - 0.2),
            (-0.18, (yk + ya) / 2), (-0.13, ya + 0.32), (-0.16, ya + 0.12)]
    foot = [(-0.45, 0.2), (-0.72, 0.1), (-0.84, 0.04), (-0.8, 0.0), (0.18, 0.0), (0.28, 0.06), (0.26, 0.2)]
    legb = [(0.12, ya + 0.3), (0.18, ya + 0.75), (0.4 * dk, yk - 0.55), (0.34 * dk, yk - 0.15), (0.22, yk + 0.08), (0.28 * dt, yk + 0.5),
            (0.38 * dt, (yt + yk) / 2 + 0.2), (0.44 * db, y['crotch'] - 0.08)]
    leg = legf + foot + legb
    # arm hanging, elbow a little back
    S = (0.04, y['acromion'] - 0.2); E = (0.15, y['elbow']); Wr = (0.02, y['wrist']); F = (-0.05, y['fingertip'])
    ua = f['W']['upper_arm'] / 2; fa = f['W']['forearm'] / 2; wr = f['W']['wrist'] / 2
    upper = Seg(S, E, [(0, ua * 1.25, ua * 1.25), (0.25, ua * 1.15, ua * 1.1), (0.5, ua * 1.0, ua * 0.95), (1, fa * 0.9, fa * 0.9)], cap=0.5)
    fore = Seg(E, Wr, [(0, fa * 0.95, fa), (0.25, fa * 1.05, fa * 1.0), (1, wr * 0.8, wr * 0.8)], cap=0.2)
    hand = Seg(Wr, F, [(0, wr * 0.8, wr * 0.8), (0.35, wr * 0.95, wr * 0.9), (0.8, wr * 0.6, wr * 0.6), (1, wr * 0.3, wr * 0.3)], cap=0.4)
    f['_side'] = dict(S=S, E=E, Wr=Wr, F=F, upper=upper, fore=fore, hand=hand)
    return [('leg', leg, None), ('torso', torso, None), ('neck', neck, None), ('head', head, None),
            ('upper', upper.outline(), None), ('fore', fore.outline(), None), ('hand', hand.outline(), None)]


# ---------- SVG ----------
class Canvas:
    def __init__(self, S, ox, oy, H):
        self.S, self.ox, self.oy, self.H = S, ox, oy, H

    def p(self, pt):
        return (self.ox + pt[0] * self.S, self.oy + (self.H - pt[1]) * self.S)

    def path(self, pts, closed=True, smooth=True):
        P = [self.p(q) for q in pts]
        return catmull(P, closed) if smooth else 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in P) + (' Z' if closed else '')


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;')


def draw_front(f, cv, view='front', uid='a'):
    parts = front_parts(f, back=(view == 'back'))
    y, W = f['y'], f['W']; seg = f['_segs']; fem = f['sex'] == 'female'; out = []
    clip_id = f'clip-{uid}'
    body = ''.join(f'<path d="{cv.path(pts)}"/>' for _, pts, _ in parts)
    out.append(f'<clipPath id="{clip_id}">{body}</clipPath>')
    for name, pts, _ in parts:
        out.append(f'<path class="part" d="{cv.path(pts)}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.4" stroke-linejoin="round"/>')
    # muscle groups, drawn in each part's own coordinates (t along, s across), right side then mirrored
    mus = muscles_front(f) if view == 'front' else muscles_back(f)
    m = [f'<g class="lay-muscle" clip-path="url(#{clip_id})" stroke="{C["muscle2"]}" stroke-width="0.9" stroke-linejoin="round">']
    for segname, pts, col in mus:
        s = seg[segname]
        for side in ((1,) if segname in ('torso', 'neck') and pts[0] == 'centre' else (1, -1)):
            P = s.shape(pts[1:] if pts[0] == 'centre' else pts)
            if side < 0: P = mirror(P)
            m.append(f'<path d="{cv.path(P)}" fill="{col}"/>')
    m.append('</g>')
    out += m
    # base layer: briefs (both), a fitted top (women)
    trunk = ''.join(f'<path d="{cv.path(pts)}"/>' for n, pts, _ in parts if n == 'torso' or n.startswith('thigh'))
    out.append(f'<clipPath id="{clip_id}-trunk">{trunk}</clipPath>')
    g = [f'<g class="lay-base" clip-path="url(#{clip_id}-trunk)" fill="{C["base"]}" stroke="{C["base2"]}" stroke-width="1">']
    yb_top = y['asis'] + 0.1
    briefs = [(-W['hips'], yb_top), (W['hips'], yb_top), (W['hips'], y['crotch'] - 0.35), (0.62, y['crotch'] - 0.42), (0, y['crotch'] - 0.1), (-0.62, y['crotch'] - 0.42), (-W['hips'], y['crotch'] - 0.35)]
    g.append(f'<path d="{cv.path(briefs, smooth=False)}"/>')
    if fem:
        top = [(-W['chest'], y['acromion'] - 0.3), (-0.22, y['pit'] - 0.3), (0.22, y['pit'] - 0.3), (W['chest'], y['acromion'] - 0.3), (W['chest'], y['nipple'] - 0.42), (-W['chest'], y['nipple'] - 0.42)]
        g.append(f'<path d="{cv.path(top, smooth=False)}"/>')
        if view == 'front':  # the bust as two soft forms under the fitted top
            for sg in (1, -1):
                arc = [(sg * 0.05, y['nipple'] - 0.3), (sg * 0.3, y['nipple'] - 0.4), (sg * W['chest'] / 2 * 0.8, y['nipple'] - 0.22)]
                g.append(f'<path d="{cv.path(arc, closed=False)}" fill="none" stroke="{C["base2"]}" stroke-width="1.6"/>')
    g.append('</g>')
    out += g
    # bones that show at the surface
    out.append(bones_front(f, cv, view, clip_id))
    # construction: ribcage, pelvis, shoulder and hip lines, joints
    out.append(construct_front(f, cv, view))
    # outline again on top so every layer sits inside a clean edge
    _, ycut = cv.p((0, y['crotch'] - 0.14))
    out.append(f'<clipPath id="{clip_id}-legs"><rect x="-9999" y="{ycut:.1f}" width="99999" height="99999"/></clipPath>')
    out.append(f'<g fill="none" stroke="{C["line"]}" stroke-width="1.6" stroke-linejoin="round">'
               + ''.join(f'<path d="{cv.path(pts)}"' + (f' clip-path="url(#{clip_id}-legs)"' if n.startswith('thigh') else '') + '/>' for n, pts, _ in parts) + '</g>')
    return '\n'.join(out)


def M(t0, t1, s0, s1, bulge=0.0, n=6):
    """A muscle belly as a lens between t0..t1 and s0..s1 in part coordinates."""
    pts = []
    for i in range(n + 1):
        u = i / n; t = t0 + (t1 - t0) * u; b = math.sin(math.pi * u) * bulge
        pts.append((t, s1 + b))
    for i in range(n, -1, -1):
        u = i / n; t = t0 + (t1 - t0) * u; b = math.sin(math.pi * u) * bulge
        pts.append((t, s0 - b))
    return pts


def muscles_front(f):
    y = f['y']; T = lambda yy: (yy - (y['crotch'] - 0.12)) / ((y['pit'] + 0.1) - (y['crotch'] - 0.12))
    mc, md, ml, tn = C['muscle'], C['muscle2'], '#d98a72', C['tendon']
    fem = f['sex'] == 'female'
    abs_top = T(y['nipple'] - 0.3); abs_bot = T(y['crotch'] + 0.25)
    out = [
        # pectoral: breastbone to the arm
        ('torso', [(T(y['pit']) - 0.01, 0.06), (T(y['acromion']) - 0.02, 0.62), (T(y['nipple'] + 0.32), 0.98), (T(y['nipple'] - 0.05), 0.82), (T(y['nipple'] - 0.28), 0.45), (T(y['nipple'] - 0.25), 0.06)], ml),
        # rectus abdominis, with its tendon bands
        ('torso', M(abs_bot, abs_top, 0.04, 0.34, 0.03), mc),
        ('torso', [(T(y['ribs']) + 0.008, 0.04), (T(y['ribs']) + 0.008, 0.35), (T(y['ribs']) - 0.004, 0.35), (T(y['ribs']) - 0.004, 0.04)], tn),
        ('torso', [(T(y['waist']) + 0.006, 0.04), (T(y['waist']) + 0.006, 0.36), (T(y['waist']) - 0.004, 0.36), (T(y['waist']) - 0.004, 0.04)], tn),
        ('torso', [(T(y['navel']) + 0.004, 0.04), (T(y['navel']) + 0.004, 0.36), (T(y['navel']) - 0.004, 0.36), (T(y['navel']) - 0.004, 0.04)], tn),
        # external oblique: ribs to the hip bone
        ('torso', [(T(y['nipple'] - 0.32), 0.62), (T(y['nipple'] - 0.2), 0.95), (T(y['iliac']) - 0.01, 1.0), (T(y['asis']), 0.9), (T(y['crotch'] + 0.5), 0.4), (T(y['navel']), 0.38), (T(y['ribs']), 0.4)], md),
        # neck: the strap from behind the ear to the pit of the neck
        ('neck', [(0.95, 0.85), (1.0, 0.55), (0.1, 0.12), (0.02, 0.3)], mc),
        ('torso', [(0.995, 0.6), (T(y['acromion']) + 0.004, 0.98), (T(y['acromion']) - 0.012, 0.9), (0.97, 0.45)], md),
        # arm: deltoid cap, biceps; forearm flexors and the brachioradialis
        ('upper', M(0.0, 0.5, -0.95, 0.98, 0.05), ml),
        ('upper', M(0.42, 0.95, -0.55, 0.6, 0.08), mc),
        ('fore', M(0.0, 0.7, 0.05, 1.0, 0.05), md),
        ('fore', M(0.02, 0.8, -1.0, 0.0, 0.03), mc),
        # thigh: tensor, quads, the inner teardrop, sartorius strap, adductors
        ('thigh', M(0.0, 0.3, 0.45, 1.0, 0.0), md),
        ('thigh', M(0.12, 0.8, -0.25, 0.4, 0.1), mc),
        ('thigh', M(0.25, 0.92, 0.42, 1.0, 0.05), md),
        ('thigh', M(0.55, 0.92, -1.0, -0.35, 0.08), ml),
        ('thigh', [(0.02, 0.62), (0.08, 0.42), (0.95, -0.82), (0.9, -1.0), (0.6, -0.7)], tn),
        ('thigh', M(0.0, 0.5, -1.0, -0.5, 0.0), md),
        # lower leg: shin muscle beside the shin bone, calf edges
        ('shin', M(0.12, 0.75, 0.15, 0.85, 0.05), mc),
        ('shin', M(0.08, 0.6, -1.0, -0.55, 0.08), md),
        ('shin', M(0.05, 0.42, 0.82, 1.0, 0.0), md),
    ]
    if fem:
        out[0] = ('torso', [(T(y['pit']) - 0.01, 0.06), (T(y['acromion']) - 0.02, 0.62), (T(y['nipple'] + 0.32), 0.98), (T(y['nipple'] + 0.05), 0.82), (T(y['nipple'] - 0.1), 0.45), (T(y['nipple'] - 0.08), 0.06)], ml)
    return out


def muscles_back(f):
    y = f['y']; T = lambda yy: (yy - (y['crotch'] - 0.12)) / ((y['pit'] + 0.1) - (y['crotch'] - 0.12))
    mc, md, ml, tn = C['muscle'], C['muscle2'], '#d98a72', C['tendon']
    return [
        # trapezius kite, latissimus wing, the spine's two columns
        ('torso', [(1.0, 0.02), (1.0, 0.55), (T(y['acromion']), 0.85), (T(y['nipple'] + 0.2), 0.4), (T(y['ribs']) + 0.03, 0.04)], ml),
        ('torso', [(T(y['nipple'] + 0.15), 0.98), (T(y['nipple'] - 0.3), 1.0), (T(y['waist']), 0.82), (T(y['iliac']), 0.55), (T(y['navel']) - 0.02, 0.05), (T(y['ribs']), 0.05), (T(y['nipple']), 0.42)], md),
        ('torso', M(T(y['iliac']) - 0.05, T(y['ribs']) + 0.05, 0.03, 0.22, 0.02), mc),
        # shoulder-blade muscles
        ('torso', [(T(y['acromion']) - 0.03, 0.85), (T(y['nipple'] + 0.15), 0.9), (T(y['nipple']), 0.6), (T(y['nipple'] + 0.25), 0.45)], mc),
        # seat: gluteus medius over the hip, maximus below
        ('torso', [(T(y['iliac']), 0.62), (T(y['iliac']) - 0.01, 0.95), (T(y['troch']), 1.0), (T(y['asis']) - 0.04, 0.5)], md),
        ('torso', [(T(y['asis']) + 0.02, 0.08), (T(y['asis']) - 0.02, 0.62), (T(y['troch']) + 0.02, 1.0), (0.12, 0.92), (0.0, 0.45), (0.02, 0.05)], mc),
        ('neck', M(0.0, 1.0, -0.2, 0.9, 0.0), ml),
        # arm: rear deltoid, triceps horseshoe, extensors
        ('upper', M(0.0, 0.48, -0.95, 0.98, 0.05), ml),
        ('upper', M(0.38, 0.95, -0.7, 0.75, 0.06), mc),
        ('fore', M(0.0, 0.75, -0.9, 0.9, 0.05), md),
        # thigh: outer and inner hamstrings, the outer band
        ('thigh', M(0.05, 0.85, -0.85, -0.05, 0.08), mc),
        ('thigh', M(0.05, 0.85, 0.05, 0.85, 0.08), md),
        ('thigh', M(0.0, 0.95, 0.85, 1.0, 0.0), tn),
        # calf: two heads of the gastrocnemius, the heel tendon
        ('shin', M(0.04, 0.48, -0.95, -0.02, 0.1), mc),
        ('shin', M(0.04, 0.42, 0.02, 0.95, 0.1), md),
        ('shin', M(0.42, 1.0, -0.35, 0.35, 0.0), tn),
    ]


def dot(cv, pt, r=3.2, cls='lay-bone'):
    x, yy = cv.p(pt)
    return f'<circle class="{cls}" cx="{x:.1f}" cy="{yy:.1f}" r="{r}" fill="{C["bone"]}" stroke="{C["boneline"]}" stroke-width="1"/>'


def bones_front(f, cv, view, clip=''):
    y, W = f['y'], f['W']; j = f['_joints']; o = [f'<g class="lay-bone" fill="{C["bone"]}" stroke="{C["boneline"]}" stroke-width="1"' + (f' clip-path="url(#{clip})"' if clip else '') + '>']
    if view == 'front':
        sx = W['shoulders'] / 2 - W['upper_arm'] / 2 * 0.6
        for sg in (1, -1):  # collarbones, a shallow S from the pit to the shoulder point
            cl = [(sg * 0.06, y['pit'] + 0.02), (sg * sx * 0.45, y['pit'] - 0.02), (sg * sx * 0.8, y['acromion'] + 0.02), (sg * sx, y['acromion'] - 0.02)]
            o.append(f'<path d="{cv.path(cl, closed=False)}" fill="none" stroke="{C["boneline"]}" stroke-width="3" stroke-linecap="round"/>')
            o.append(f'<path d="{cv.path(cl, closed=False)}" fill="none" stroke="{C["bone"]}" stroke-width="1.6" stroke-linecap="round"/>')
        o.append(f'<path d="{cv.path([(0, y["pit"]), (0, y["nipple"] - 0.35)], closed=False, smooth=False)}" stroke="{C["boneline"]}" stroke-width="2.4" fill="none"/>')
        for sg in (1, -1):
            o.append(dot(cv, (sg * (W['hips'] / 2 * 0.62), y['asis'] + 0.02)))
            o.append(dot(cv, (sg * j['knee'][0], y['knee'] + 0.1), 5))
            kx, ax = j['knee'][0], j['ankle'][0]
            o.append(f'<path d="{cv.path([(sg * (kx - 0.02), y["knee"] - 0.12), (sg * (ax - 0.03), y["ankle"] + 0.25)], closed=False, smooth=False)}" stroke="{C["boneline"]}" stroke-width="2.6" fill="none"/>')
            o.append(dot(cv, (sg * (ax - W['ankle'] / 2 * 0.85), y['ankle'] + 0.06), 2.6))
            o.append(dot(cv, (sg * (ax + W['ankle'] / 2 * 0.85), y['ankle'] - 0.02), 2.6))
    else:
        o.append(dot(cv, (0, y['pit'] + 0.12), 3.6))
        o.append(f'<path d="{cv.path([(0, y["pit"] + 0.12), (0, y["iliac"] - 0.15)], closed=False, smooth=False)}" stroke="{C["boneline"]}" stroke-width="1.6" stroke-dasharray="2 4" fill="none"/>')
        for sg in (1, -1):
            sp = [(sg * 0.18, y['nipple'] + 0.22), (sg * (W['shoulders'] / 2 - 0.3), y['acromion'] - 0.08)]
            o.append(f'<path d="{cv.path(sp, closed=False, smooth=False)}" stroke="{C["boneline"]}" stroke-width="3" fill="none" stroke-linecap="round"/>')
            o.append(dot(cv, (sg * 0.3, y['nipple'] - 0.35), 2.6))
            o.append(dot(cv, (sg * 0.16, y['iliac'] - 0.1), 3))
            o.append(dot(cv, f['_joints']['elbow'] if sg > 0 else mirror([f['_joints']['elbow']])[0], 3))
    o.append('</g>')
    return ''.join(o)


def construct_front(f, cv, view):
    y, W = f['y'], f['W']; j = f['_joints']
    g = [f'<g class="lay-construct" fill="none" stroke="{C["guide"]}" stroke-width="1.3">']
    # ribcage egg and pelvis bowl (Bridgman's masses)
    cy = (y['pit'] + y['ribs']) / 2; rx = W['chest'] / 2 * 0.84; ry = (y['pit'] - y['ribs']) / 2 * 1.04
    x, yy = cv.p((0, cy)); g.append(f'<ellipse cx="{x:.1f}" cy="{yy:.1f}" rx="{rx * cv.S:.1f}" ry="{ry * cv.S:.1f}"/>')
    pw = W['hips'] / 2 * 0.86
    pel = [(-pw * 0.9, y['iliac']), (pw * 0.9, y['iliac']), (pw * 0.62, y['crotch'] + 0.05), (0, y['crotch'] - 0.02), (-pw * 0.62, y['crotch'] + 0.05)]
    g.append(f'<path d="{cv.path(pel)}"/>')
    g.append(f'<path d="{cv.path([(0, y["chin"]), (0, y["crotch"])], closed=False, smooth=False)}" stroke-dasharray="5 4"/>')
    for a, b in (('shoulder', 'shoulder'), ('hip', 'hip')):
        p = j[a]; g.append(f'<path d="{cv.path([(-p[0], p[1]), p], closed=False, smooth=False)}"/>')
    for k in ('shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'):
        for p in (j[k], mirror([j[k]])[0]):
            x, yy = cv.p(p); g.append(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="5"/>')
    # Loomis head: centre line and the eye line halfway down the head
    H = f['heads']; hw = W['head'] / 2
    g.append(f'<path d="{cv.path([(-hw * 0.98, H - 0.5), (hw * 0.98, H - 0.5)], closed=False, smooth=False)}"/>')
    g.append(f'<path d="{cv.path([(0, H), (0, y["chin"])], closed=False, smooth=False)}" stroke-dasharray="3 3"/>')
    g.append('</g>')
    return ''.join(g)


def draw_side(f, cv, uid='s'):
    parts = side_parts(f); y = f['y']; H = f['heads']; fem = f['sex'] == 'female'; o = []
    clip_id = f'clip-{uid}'
    o.append(f'<clipPath id="{clip_id}">' + ''.join(f'<path d="{cv.path(p)}"/>' for n, p, _ in parts if n != 'leg_far') + '</clipPath>')
    for name, pts, _ in parts:
        fill = C['skin2'] if name == 'leg_far' else C['skin']
        o.append(f'<path d="{cv.path(pts)}" fill="{fill}" stroke="{C["line"]}" stroke-width="1.4" stroke-linejoin="round"/>')
    # base layer
    db = f['D']['buttocks']
    briefs = [(-1.5, y['asis'] + 0.08), (1.5, y['asis'] + 0.22), (1.5, y['crotch'] - 0.3), (-1.5, y['crotch'] - 0.2)]
    o.append(f'<g class="lay-base" clip-path="url(#{clip_id})" fill="{C["base"]}" stroke="{C["base2"]}"><path d="{cv.path(briefs, smooth=False)}"/>')
    if fem:
        o.append(f'<path d="{cv.path([(-1.5, y["acromion"] - 0.32), (1.5, y["acromion"] - 0.2), (1.5, y["nipple"] - 0.4), (-1.5, y["nipple"] - 0.44)], smooth=False)}"/>')
    o.append('</g>')
    # plumb line: ear, shoulder, hip joint, just in front of the knee and the ankle (Gray, Vanderpoel)
    x0, y0 = cv.p((0.04, H - 0.5)); x1, y1 = cv.p((0.04, 0))
    o.append(f'<g class="lay-construct"><path d="M{x0:.1f},{y0:.1f} L{x1:.1f},{y1:.1f}" stroke="{C["guide"]}" stroke-width="1.3" stroke-dasharray="6 4"/>')
    for p in [(0.04, H - 0.5), (0.04, y['acromion'] - 0.2), (0.04, y['troch']), (0.04, y['ankle'] + 0.05)]:
        x, yy = cv.p(p); o.append(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="5" fill="none" stroke="{C["guide"]}" stroke-width="1.3"/>')
    # spine S-curve and the tilted pelvis
    sp = [(0.24, y['pit'] + 0.15), (0.34, y['nipple']), (0.26, y['waist']), (0.32, y['iliac'] - 0.2), (0.38, y['crotch'] + 0.05)]
    o.append(f'<path d="{cv.path(sp, closed=False)}" fill="none" stroke="{C["guide"]}" stroke-width="2"/>')
    tilt = 0.14 if fem else 0.08
    pel = [(-0.48, y['asis'] + 0.02), (0.36, y['iliac'] - 0.08 + tilt), (0.42, y['crotch'] + 0.25), (-0.3, y['crotch'] + 0.08)]
    o.append(f'<path d="{cv.path(pel, smooth=False)}" fill="none" stroke="{C["guide"]}" stroke-width="1.3"/>')
    cy = (y['pit'] + y['ribs']) / 2; x, yy = cv.p((0.0, cy))
    o.append(f'<ellipse cx="{x:.1f}" cy="{yy:.1f}" rx="{0.5 * f["D"]["chest"] * cv.S:.1f}" ry="{(y["pit"] - y["ribs"]) / 2 * cv.S:.1f}" transform="rotate(-8 {x:.1f} {yy:.1f})" fill="none" stroke="{C["guide"]}" stroke-width="1.3"/></g>')
    # bones at the surface: kneecap, shin edge, heel, the bump of the hip joint
    o.append(f'<g class="lay-bone">{dot(cv, (-0.22, y["knee"] + 0.15), 4.5)}{dot(cv, (0.0, y["troch"]), 4)}{dot(cv, (0.0, y["ankle"]), 3)}{dot(cv, (-0.47, y["asis"]), 3)}'
             f'<path d="{cv.path([(-0.17, y["knee"] - 0.22), (-0.1, y["ankle"] + 0.32)], closed=False, smooth=False)}" stroke="{C["boneline"]}" stroke-width="2.6"/></g>')
    o.append(f'<g fill="none" stroke="{C["line"]}" stroke-width="1.6">' + ''.join(f'<path d="{cv.path(p)}"/>' for n, p, _ in parts if n != 'leg_far') + '</g>')
    return '\n'.join(o)


def ruler(cv, f, x_heads, labels=True, right=False):
    """Head-unit ticks and landmark lines across the sheet."""
    H = f['heads']; y = f['y']; o = [f'<g class="lay-landmarks" font-family="Manrope,system-ui,sans-serif" font-size="12" fill="{C["ink"]}">']
    xa, _ = cv.p((x_heads, 0))
    for i in range(int(math.floor(H)) + 1):
        _, yy = cv.p((0, H - i))
        o.append(f'<line x1="{xa - 10:.1f}" x2="{xa + 10:.1f}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{C["ink"]}" stroke-width="1.2"/>')
        if i: o.append(f'<text x="{xa - 16:.1f}" y="{yy - (cv.S / 2) + 4:.1f}" text-anchor="end" font-weight="700" font-size="13">{i}</text>')
    _, yt = cv.p((0, H)); _, yb = cv.p((0, 0))
    o.append(f'<line x1="{xa:.1f}" x2="{xa:.1f}" y1="{yt:.1f}" y2="{yb:.1f}" stroke="{C["ink"]}" stroke-width="1.2"/>')
    o.append('</g>')
    return ''.join(o)


def landmark_lines(cv, f, x0, x1, keys):
    names = dict(chin='chin', nipple='chest line', navel='navel', crotch='crotch (the middle)', fingertip='fingertips', knee='knee', ankle='ankle', pit='pit of the neck', troch='hip bump', elbow='elbow', wrist='wrist')
    o = [f'<g class="lay-landmarks" font-family="Manrope,system-ui,sans-serif" font-size="12" fill="{C["muted"] if "muted" in C else C["ink"]}">']
    for k in keys:
        _, yy = cv.p((0, f['y'][k]))
        xa, _ = cv.p((x0, 0)); xb, _ = cv.p((x1, 0))
        o.append(f'<line x1="{xa:.1f}" x2="{xb:.1f}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{C["grid"]}" stroke-width="1" stroke-dasharray="4 5"/>')
        o.append(f'<text x="{xb + 6:.1f}" y="{yy + 4:.1f}" fill="#797058">{names.get(k, k)}</text>')
    o.append('</g>')
    return ''.join(o)


STYLE = ('<style>.lay-muscle,.lay-bone,.lay-construct,.lay-landmarks{display:none}'
         '.show-muscle .lay-muscle,.show-bone .lay-bone,.show-construct .lay-construct,.show-landmarks .lay-landmarks{display:inline}</style>')


def svg(w, h, body, title, show='landmarks'):
    cls = ' '.join(f'show-{k}' for k in show.split())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" class="{cls}" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{esc(title)}">'
            f'<title>{esc(title)}</title>{STYLE}{body}</svg>\n')


def sheet(cn, sex, S=62):
    """The proportion sheet: front, side and back of one average figure on a head grid."""
    f = figure(cn, sex, 'average'); H = f['heads']
    pad, gap = 1.2, 2.9
    xs = [pad + 0.6, pad + 0.6 + gap, pad + 0.6 + 2 * gap]
    wh = xs[-1] + 4.3
    cv0 = Canvas(S, 0, 22, H); body = []
    body.append(f'<rect width="{wh * S:.0f}" height="{(H + 0.9) * S + 22:.0f}" fill="#fffcf0"/>')
    for i in range(int(math.ceil(H)) + 1):  # head grid
        _, yy = cv0.p((0, H - i)); body.append(f'<line x1="{0.9 * S:.0f}" x2="{(wh - 0.3) * S:.0f}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{C["grid"]}" stroke-width="1"/>')
    body.append(ruler(cv0, f, 0.95))
    for view, x in zip(('front', 'side', 'back'), xs):
        cv = Canvas(S, (x + 0.4) * S, 22, H)
        body.append(f'<g class="view view-{view}">')
        body.append(draw_side(f, cv, uid=f'{sex}-side') if view == 'side' else draw_front(f, cv, view, uid=f'{sex}-{view}'))
        tx, ty = cv.p((0, -0.45))
        body.append(f'<text x="{tx:.0f}" y="{ty:.0f}" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-size="17" font-weight="700" fill="{C["ink"]}">{view.title()}</text></g>')
    cv = Canvas(S, 0, 22, H)
    body.append(landmark_lines(cv, f, 1.1, xs[-1] + 1.8, ['chin', 'nipple', 'navel', 'crotch', 'fingertip', 'knee', 'ankle']))
    return svg(wh * S, (H + 0.9) * S + 22, ''.join(body), f"{f['label']}: {H} heads, front, side and back")


def lineup(cn, S=40):
    """Eight figures: man and woman, each average, heroic, skinny and heavy, on one floor, true relative scale."""
    figs = [figure(cn, s, b) for s in ('male', 'female') for b in ('average', 'heroic', 'skinny', 'heavy')]
    # true scale: the woman is about 93 percent of the man's height; each heads count is relative to its own head
    stature = dict(male=1.0, female=0.93)
    Hmax = 8.6; step = 2.95; w = (len(figs) * step + 0.6) * S; out = [f'<rect width="{w:.0f}" height="{(Hmax + 1.75) * S:.0f}" fill="#fffcf0"/>']
    for i, f in enumerate(figs):
        tall = stature[f['sex']] * (1.04 if f['build'] == 'heroic' else 1.0)
        hs = S * 8.0 * tall / f['heads']
        cv = Canvas(hs, (0.6 + step * i + step / 2) * S, (Hmax + 0.3) * S - f['heads'] * hs, f['heads'])
        out.append(f'<g class="fig">{draw_front(f, cv, "front", uid=f"lu{i}")}</g>')
        tx, ty = cv.p((0, -0.5 * S / hs))
        out.append(f'<text x="{tx:.0f}" y="{ty + 4:.0f}" text-anchor="middle" font-family="Manrope,system-ui,sans-serif" font-size="13" font-weight="700" fill="{C["ink"]}">{f["label"]}</text>')
        out.append(f'<text x="{tx:.0f}" y="{ty + 20:.0f}" text-anchor="middle" font-family="Manrope,system-ui,sans-serif" font-size="12" fill="#797058">{f["heads"]:g} heads</text>')
    out.append(f'<line x1="0" x2="{w:.0f}" y1="{(Hmax + 0.3) * S:.1f}" y2="{(Hmax + 0.3) * S:.1f}" stroke="{C["line"]}" stroke-width="1.4"/>')
    return svg(w, (Hmax + 1.75) * S, ''.join(out), 'Eight body types on one floor')


def toy_compare(cn, S=52):
    """Real proportions next to our toy proportions: same landmarks, a slightly bigger head, hands and feet."""
    real = figure(cn, 'male', 'average'); toy = toy_figure(cn, 'male')
    figs = [(real, 'Real: 7.5 heads'), (toy, 'Toy: 7.25 heads')]
    Ht = real['heads']; w = 6.6 * S; out = [f'<rect width="{w:.0f}" height="{(Ht + 1.1) * S:.0f}" fill="#fffcf0"/>']
    for i, (f, lab) in enumerate(figs):
        hs = S * Ht / f['heads']
        cv = Canvas(hs, (1.7 + 3.2 * i) * S, 18, f['heads'])
        out.append(draw_front(f, cv, 'front', uid=f'toy{i}'))
        out.append(f'<text x="{(1.7 + 3.2 * i) * S:.0f}" y="{(Ht + 0.75) * S + 18:.0f}" text-anchor="middle" font-family="Manrope,system-ui,sans-serif" font-size="14" font-weight="700" fill="{C["ink"]}">{lab}</text>')
    return svg(w, (Ht + 1.1) * S, ''.join(out), 'Real and toy proportions side by side')


def toy_figure(cn, sex):
    """Toy style: the same body at 7.25 heads (a head about 3 percent bigger), hands and feet 10 percent bigger, nothing else."""
    f = figure(cn, sex, 'average'); H0 = f['heads']; H = 7.25
    sv, sw = (H - 1.0) / (H0 - 1.0), H / H0   # below the chin: same body, measured in the bigger head
    f['y'] = {k: v * sv for k, v in f['y'].items()}
    f['y']['crown'] = H; f['y']['chin'] = H - 1.0
    f['W'] = {k: v if k == 'head' else v * sw * (1.1 if k in ('hand', 'foot') else 1.0) for k, v in f['W'].items()}
    f['D'] = {k: v if k == 'head' else v * sw for k, v in f['D'].items()}
    f['heads'] = H; f['label'] = 'Toy'
    return f


def main():
    cn = canon(); os.makedirs(OUT, exist_ok=True)
    files = {f'sheet-{s}.svg': sheet(cn, s) for s in ('male', 'female')}
    files['lineup.svg'] = lineup(cn)
    files['toy.svg'] = toy_compare(cn)
    for name, text in files.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            fh.write(text)
        print(name, len(text) // 1024, 'KB')


if __name__ == '__main__':
    main()
