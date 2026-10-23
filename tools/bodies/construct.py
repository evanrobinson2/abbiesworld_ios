"""Drawing-technique diagrams for AW-STUDY-0016 installment 1b, from docs/oracle/bodies/construction.json and the canon.

python construct.py  -> prototypes/ranch-atelier/dist/studies/bodies-study/img/{build,gesture,limbs,sections,foreshorten}.svg
                     and a copy of construction.json for the page

build:       the figure built in six steps (head, masses, stick and joints, cylinders, contour, clean)
gesture:     the line of action: a C curve, an S curve, and contrapposto with opposite shoulder and hip tilts
limbs:       the sausage limb next to the clean limb (offset bulges, straight against curve, no wrinkles)
sections:    cross-sections with their plane counts
foreshorten: a limb turning toward the viewer, and the nearer form overlapping the farther
Units are heads, y up from the floor, as in figure.py."""
import os, json, math

from figure import canon, figure, front_parts, draw_front, Canvas, Seg, catmull, mirror, svg, C, OUT, ROOT

CONSTRUCTION = os.path.join(ROOT, 'docs', 'oracle', 'bodies', 'construction.json')
PAPER = '#fffcf0'
FONT = 'font-family="Manrope,system-ui,sans-serif"'


def text(x, y, s, size=13, weight=700, fill=None, anchor='middle'):
    return f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="{anchor}" {FONT} font-size="{size}" font-weight="{weight}" fill="{fill or C["ink"]}">{s}</text>'


def line(cv, pts, col=None, w=1.4, dash='', smooth=False, closed=False, fill='none'):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<path d="{cv.path(pts, closed=closed, smooth=smooth)}" fill="{fill}" stroke="{col or C["guide"]}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"{d}/>'


def circle(cv, p, r, col=None, w=1.3, fill='none'):
    x, y = cv.p(p); return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="{col or C["guide"]}" stroke-width="{w}"/>'


def ellipse(cv, p, rx, ry, col=None, w=1.3, fill='none', rot=0):
    x, y = cv.p(p)
    return f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx * cv.S:.1f}" ry="{ry * cv.S:.1f}" transform="rotate({rot:.1f} {x:.1f} {y:.1f})" fill="{fill}" stroke="{col or C["guide"]}" stroke-width="{w}"/>'


# ---------- 1. the build strip ----------
def masses(f, cv, col=None, w=1.4, head_only=False):
    y, W = f['y'], f['W']; H = f['heads']; o = []
    o.append(ellipse(cv, (0, H - 0.42), W['head'] / 2 * 0.98, 0.43, col, w))           # cranium ball
    hw = W['head'] / 2                                                                    # jaw plane
    o.append(line(cv, [(-hw * 0.92, H - 0.62), (-hw * 0.45, y['chin'] + 0.04), (0, y['chin']), (hw * 0.45, y['chin'] + 0.04), (hw * 0.92, H - 0.62)], col, w))
    if head_only: return ''.join(o)
    cy = (y['pit'] + y['ribs']) / 2                                                       # ribcage egg
    o.append(ellipse(cv, (0, cy), W['chest'] / 2 * 0.84, (y['pit'] - y['ribs']) / 2 * 1.04, col, w))
    pw = W['hips'] / 2 * 0.86                                                             # pelvis box, narrower below
    o.append(line(cv, [(-pw, y['iliac']), (pw, y['iliac']), (pw * 0.6, y['crotch']), (-pw * 0.6, y['crotch'])], col, w, closed=True))
    bw = W['waist'] / 2 * 0.8                                                             # waist bean, the flexible link
    o.append(line(cv, [(-bw, y['ribs'] + 0.05), (-bw * 0.92, (y['ribs'] + y['iliac']) / 2), (-bw * 1.02, y['iliac'] - 0.02)], col, w * 0.8, dash='4 3', smooth=True))
    o.append(line(cv, [(bw, y['ribs'] + 0.05), (bw * 0.92, (y['ribs'] + y['iliac']) / 2), (bw * 1.02, y['iliac'] - 0.02)], col, w * 0.8, dash='4 3', smooth=True))
    nw = W['neck'] / 2                                                                    # neck cylinder
    o.append(line(cv, [(-nw, y['chin'] + 0.15), (-nw * 1.1, y['pit'] - 0.05)], col, w)); o.append(line(cv, [(nw, y['chin'] + 0.15), (nw * 1.1, y['pit'] - 0.05)], col, w))
    return ''.join(o)


def sticks(f, cv, col=None, w=1.6):
    j = f['_joints']; y = f['y']; o = []
    sh = j['shoulder']; o.append(line(cv, [(-sh[0], sh[1]), sh], col, w))
    hp = j['hip']; o.append(line(cv, [(-hp[0], hp[1]), hp], col, w))
    o.append(line(cv, [(0, y['chin']), (0, (y['pit'] + y['ribs']) / 2), (0, y['iliac'])], col, w, smooth=True))
    F = f['_segs']['hand'].B
    for m in (lambda p: p, lambda p: (-p[0], p[1])):
        o.append(line(cv, [m(j['shoulder']), m(j['elbow']), m(j['wrist']), m(F)], col, w))
        o.append(line(cv, [m(j['hip']), m(j['knee']), m(j['ankle']), m((j['ankle'][0] + 0.2, 0.02))], col, w))
        for k in ('shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'):
            o.append(circle(cv, m(j[k]), 4.2, col, 1.2, fill=PAPER))
    return ''.join(o)


def cylinders(f, cv, col=None, w=1.3):
    """Each limb as a straight tapered cylinder (no bulges yet) with its end ellipse; hands and feet as wedges."""
    sg = f['_segs']; j = f['_joints']; o = []
    for name in ('upper', 'fore', 'thigh', 'shin'):
        s = sg[name]; a = sum(s.w(0)) / 2; b = sum(s.w(1)) / 2
        cyl = Seg(s.A, s.B, [(0, a, a), (1, b, b)], cap=0)
        ang = math.degrees(math.atan2(-(s.B[1] - s.A[1]), s.B[0] - s.A[0])) + 90
        for m in (lambda p: p, mirror):
            pts = m([cyl.local(0, -1), cyl.local(1, -1)]); o.append(line(cv, pts, col, w))
            pts = m([cyl.local(0, 1), cyl.local(1, 1)]); o.append(line(cv, pts, col, w))
            for t, r in ((0, a), (1, b)):
                c = m([(s.A[0] + (s.B[0] - s.A[0]) * t, s.A[1] + (s.B[1] - s.A[1]) * t)])[0]
                o.append(ellipse(cv, c, r, r * 0.32, col, w * 0.8, rot=ang if m is not mirror else -ang))
    h = sg['hand']
    for m in (lambda p: p, mirror):
        o.append(line(cv, m([h.local(0, -1), h.local(0.45, -1.1), h.local(1, -0.5), h.local(1, 0.5), h.local(0.45, 1.1), h.local(0, 1)]), col, w, closed=True))
        a = j['ankle']; fw = f['W']['foot'] / 2
        o.append(line(cv, m([(a[0] - fw * 0.6, a[1] + 0.1), (a[0] + fw * 0.6, a[1] + 0.1), (a[0] + fw, 0.0), (a[0] - fw, 0.0)]), col, w, closed=True))
        k = j['knee']; kw = f['W']['knee'] / 2 * 0.9
        o.append(line(cv, m([(k[0] - kw, k[1] + 0.12), (k[0] + kw, k[1] + 0.12), (k[0] + kw, k[1] - 0.14), (k[0] - kw, k[1] - 0.14)]), col, w * 0.9, closed=True))
    return ''.join(o)


def build_strip(cn, S=40):
    f = figure(cn, 'male', 'average'); front_parts(f); H = f['heads']
    steps = [('Head', 'and plumb line'), ('Masses', 'ribcage, pelvis, waist'), ('Stick figure', 'joints as circles'), ('Cylinders', 'boxes at the joints'),
             ('Contour', 'over the forms'), ('Planes', 'then detail')]
    pw = 3.3; w = pw * len(steps) * S; top = 26; h = (H + 1.6) * S + top
    o = [f'<rect width="{w:.0f}" height="{h:.0f}" fill="{PAPER}"/>']
    faint = '#d9b9a8'
    for i, lab in enumerate(steps):
        cv = Canvas(S, (pw * i + pw / 2) * S, top, H)
        o.append(f'<line x1="{(pw * i + 0.2) * S:.0f}" x2="{(pw * (i + 1) - 0.2) * S:.0f}" y1="{cv.p((0, 0))[1]:.1f}" y2="{cv.p((0, 0))[1]:.1f}" stroke="{C["line"]}" stroke-width="1"/>')
        if i == 0:
            o.append(line(cv, [(0, H + 0.1), (0, -0.05)], C['grid'], 1.2, dash='5 4'))
            for k in range(int(H) + 1):
                o.append(line(cv, [(-0.25, H - k), (0.25, H - k)], C['grid'], 1.2))
            o.append(masses(f, cv, head_only=True))
        elif i < 4:
            o.append(masses(f, cv, faint if i > 1 else None))
            if i >= 2: o.append(sticks(f, cv, faint if i > 2 else None))
            if i == 3: o.append(cylinders(f, cv))
        elif i == 4:
            o.append(f'<g opacity="0.55">{masses(f, cv, faint)}{cylinders(f, cv, faint)}</g>')
            o.append(f'<g class="contour-only">{draw_front(f, cv, "front", uid=f"build{i}")}</g>')
        else:
            o.append(draw_front(f, cv, 'front', uid=f'build{i}'))
        o.append(text((pw * i + pw / 2) * S, h - 30, f'{i + 1}  {lab[0]}', 14)); o.append(text((pw * i + pw / 2) * S, h - 12, lab[1], 12, 500))
    # step 5 shows the contour only: hide the skin fill and base layer so the forms show through
    style = f'<style>.contour-only .part{{fill:none}} .contour-only .lay-base{{display:none}}</style>'
    return svg(w, h, style + ''.join(o), 'Building the figure in six steps')


# ---------- 2. gesture ----------
def pose(cv, f, spine, sh_tilt, hip_tilt, feet, arms, col=None):
    """A stick figure on a line of action. spine: [pelvis centre, mid, pit] in heads; tilts in degrees (+ = right side up)."""
    y, W = f['y'], f['W']; o = []; col = col or C['line']
    pel, mid, pit = spine
    head_c = (pit[0] + (pit[0] - mid[0]) * 0.6, pit[1] + 0.85)
    def tilt(c, half, deg):
        a = math.radians(deg); return (c[0] - half * math.cos(a), c[1] - half * math.sin(a)), (c[0] + half * math.cos(a), c[1] + half * math.sin(a))
    shL, shR = tilt((pit[0], pit[1] - 0.25), W['shoulders'] / 2 * 0.82, sh_tilt)
    hpL, hpR = tilt(pel, W['hips'] / 2 * 0.62, hip_tilt)
    o.append(f'<path d="{cv.path([pel, mid, pit, head_c], closed=False)}" fill="none" stroke="{col}" stroke-width="2.4" stroke-linecap="round"/>')
    o.append(ellipse(cv, head_c, 0.33, 0.45, col, 2.0, fill=PAPER, rot=-math.degrees(math.atan2(pit[0] - mid[0], pit[1] - mid[1]))))
    o.append(ellipse(cv, ((pit[0] + mid[0]) / 2, (pit[1] + mid[1]) / 2 + 0.25), W['chest'] / 2 * 0.72, 0.85, col, 1.6, fill='none',
                     rot=-math.degrees(math.atan2(pit[0] - mid[0], pit[1] - mid[1]))))
    o.append(line(cv, [shL, shR], C['guide'], 2.2)); o.append(line(cv, [hpL, hpR], C['guide'], 2.2))
    for hip, (knee, ankle, toe) in zip((hpL, hpR), feet):
        o.append(line(cv, [hip, knee, ankle, toe], col, 2.2))
        for p in (hip, knee, ankle): o.append(circle(cv, p, 3.4, col, 1.4, fill=PAPER))
    for sh, (el, wr) in zip((shL, shR), arms):
        o.append(line(cv, [sh, el, wr], col, 2.2))
        for p in (sh, el, wr): o.append(circle(cv, p, 3.4, col, 1.4, fill=PAPER))
    return ''.join(o)


def gesture(cn, S=34):
    f = figure(cn, 'male', 'average'); H = f['heads'] + 0.3
    panels = []
    # contrapposto: weight on the right leg, right hip up, right shoulder down; the standing ankle under the pit
    panels.append((('Contrapposto', 'hips and shoulders tilt apart'), dict(
        spine=[(0.1, 3.75), (0.02, 4.75), (-0.08, 6.1)], sh_tilt=-7, hip_tilt=9,
        feet=[((-0.55, 1.95), (-0.42, 0.12), (-0.62, 0.0)), ((0.22, 2.05), (-0.06, 0.12), (0.12, 0.0))],
        arms=[((-0.98, 4.65), (-1.05, 3.55)), ((0.95, 4.55), (1.0, 3.45))]),
        [(-0.08, 7.5), (-0.08, 6.1), (0.06, 4.6), (0.08, 3.4), (-0.06, 0.12)]))
    panels.append((('C curve', 'one sweep, head to foot'), dict(
        spine=[(0.0, 3.7), (0.3, 4.75), (0.42, 6.0)], sh_tilt=-4, hip_tilt=4,
        feet=[((-0.25, 1.95), (-0.5, 0.12), (-0.3, 0.0)), ((0.55, 2.0), (0.9, 0.3), (1.15, 0.2))],
        arms=[((-0.45, 4.7), (-0.3, 3.7)), ((1.2, 5.0), (1.75, 5.7))]),
        [(0.2, 7.35), (0.45, 6.0), (0.3, 4.75), (0.0, 3.7), (-0.25, 1.95), (-0.5, 0.12)]))
    panels.append((('S curve', 'ribcage against pelvis'), dict(
        spine=[(-0.2, 3.7), (0.15, 4.8), (-0.15, 6.05)], sh_tilt=-10, hip_tilt=12,
        feet=[((-0.65, 1.95), (-0.25, 0.12), (-0.45, 0.0)), ((0.35, 2.05), (0.55, 0.12), (0.75, 0.0))],
        arms=[((-1.05, 5.05), (-0.75, 4.15)), ((0.85, 4.55), (0.55, 3.75))]),
        [(-0.45, 7.45), (-0.15, 6.05), (0.15, 4.8), (-0.2, 3.7), (-0.4, 1.9), (-0.25, 0.12)]))
    pw = 5.0; w = pw * len(panels) * S; top = 18; h = (H + 1.4) * S + top
    o = [f'<rect width="{w:.0f}" height="{h:.0f}" fill="{PAPER}"/>']
    for i, (lab, kw, loa) in enumerate(panels):
        cv = Canvas(S, (pw * i + pw / 2) * S, top, H)
        o.append(f'<path d="{cv.path(loa, closed=False)}" fill="none" stroke="{C["guide"]}" stroke-width="7" stroke-opacity="0.22" stroke-linecap="round"/>')
        o.append(pose(cv, f, **kw))
        o.append(f'<line x1="{(pw * i + 0.3) * S:.0f}" x2="{(pw * (i + 1) - 0.3) * S:.0f}" y1="{cv.p((0, 0))[1]:.1f}" y2="{cv.p((0, 0))[1]:.1f}" stroke="{C["line"]}" stroke-width="1"/>')
        o.append(text((pw * i + pw / 2) * S, h - 28, lab[0], 14)); o.append(text((pw * i + pw / 2) * S, h - 10, lab[1], 12, 500))
    return svg(w, h, ''.join(o), 'The line of action: contrapposto, C curve and S curve')


# ---------- 3. sausage limb vs clean limb ----------
def limbs(cn, S=64):
    f = figure(cn, 'male', 'average'); front_parts(f); W = f['W']; y = f['y']; sg = f['_segs']
    th, sh = sg['thigh'], sg['shin']
    # the same leg, made symmetric: both edges bulge at the same height (the sausage), plus wrinkles
    def sausage(s):
        a = sum(s.w(0)) / 2; b = sum(s.w(1)) / 2; m = max(a, b) * 1.08
        return Seg(s.A, s.B, [(0, a, a), (0.5, m, m), (1, b, b)], cap=s.cap)
    top = y['troch'] + 0.25; H = top + 0.2
    w = 11.0 * S; h = (H + 0.9) * S
    o = [f'<rect width="{w:.0f}" height="{h:.0f}" fill="{PAPER}"/>']

    def leg(cv, a, b, ticks):
        for s in (a, b):
            o.append(f'<path d="{cv.path(s.outline())}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6" stroke-linejoin="round"/>')
        if ticks:
            for s, peaks in ticks:
                for t, side in peaks:
                    p = s.local(t, side); q = s.local(t, side * 1.35)
                    o.append(line(cv, [p, q], C['guide'], 2.2))
        return cv

    # 1 sausage, front view
    cv = Canvas(S, 1.4 * S - th.A[0] * S, 10, H)
    sa, sb = sausage(th), sausage(sh); leg(cv, sa, sb, [(sa, [(0.5, 1), (0.5, -1)]), (sb, [(0.5, 1), (0.5, -1)])])
    for s in (sa, sb):  # the wrinkles a contour drawing adds when it has no forms under it
        for t in (0.28, 0.34, 0.62, 0.7):
            o.append(line(cv, [s.local(t, -0.7), s.local(t + 0.025, 0), s.local(t, 0.7)], C['line'], 0.9, smooth=True))
    o.append(text(1.4 * S, h - 30, 'No: sausage', 14, fill=C['guide'])); o.append(text(1.4 * S, h - 12, 'bulges level, wrinkles', 12, 500))
    # 2 clean, front view (the canon leg)
    cv = Canvas(S, 4.1 * S - th.A[0] * S, 10, H)
    leg(cv, th, sh, [(th, [(0.25, 1), (0.82, -1)]), (sh, [(0.3, 1), (0.38, -1)])])
    o.append(text(4.1 * S, h - 30, 'Yes: offset bulges', 14)); o.append(text(4.1 * S, h - 12, 'outer high, inner low', 12, 500))
    # 3 clean, side view: shin straight in front, calf curved behind; thigh curved in front
    ky, ay, hy = y['knee'], y['ankle'], y['troch']
    side_leg = [(0.28, hy + 0.15), (0.36, (hy + ky) / 2 + 0.1), (0.25, ky + 0.15), (0.22, ky - 0.05), (0.15, ay + 0.15), (0.12, ay),
                (0.62, 0.05), (0.66, 0.0), (-0.22, 0.0), (-0.2, ay + 0.02), (-0.14, ay + 0.35), (-0.3, ky - 0.65), (-0.28, ky - 0.25),
                (-0.2, ky + 0.05), (-0.28, (hy + ky) / 2), (-0.33, hy)]
    cv = Canvas(S, 6.8 * S, 10, H)
    o.append(f'<path d="{cv.path(side_leg)}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6" stroke-linejoin="round"/>')
    o.append(line(cv, [(0.27, ky - 0.08), (0.13, ay + 0.2)], C['guide'], 2.4, dash='6 4'))
    o.append(text(6.8 * S, h - 30, 'Straight against curve', 14)); o.append(text(6.8 * S, h - 12, 'side: shin straight, calf round', 12, 500))
    # 4 the arm: deltoid wedge, forearm round at the elbow and flat at the wrist
    up, fo, ha = sg['upper'], sg['fore'], sg['hand']
    cv = Canvas(S, 9.5 * S - up.A[0] * S, 24 + (up.A[1] - H) * S, H)
    for s in (up, fo, ha):
        o.append(f'<path d="{cv.path(s.outline())}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6" stroke-linejoin="round"/>')
    o.append(line(cv, [up.local(0.0, 1.0), up.local(0.5, 0.2), up.local(0.0, -0.6)], C['guide'], 1.6))   # deltoid wedge
    for s, peaks in ((up, [(0.2, 1), (0.55, -1)]), (fo, [(0.18, 1), (0.3, -1)])):
        for t, side in peaks:
            o.append(line(cv, [s.local(t, side), s.local(t, side * 1.4)], C['guide'], 2.2))
    o.append(text(9.5 * S, h - 30, 'Arm: wedge into cylinder', 14)); o.append(text(9.5 * S, h - 12, 'bellies high, tendons low', 12, 500))
    return svg(w, h, ''.join(o), 'Sausage limb against the clean limb')


# ---------- 4. cross-sections ----------
def polygon(n, rx, ry, rot=0.0, squash=None):
    pts = []
    for i in range(n):
        a = math.radians(rot) + 2 * math.pi * i / n; x, y = math.cos(a) * rx, math.sin(a) * ry
        if squash: x, y = squash(x, y)
        pts.append((x, y))
    return pts


def sections(cn, S=95):
    f = figure(cn, 'male', 'average'); W, D = f['W'], f['D']
    items = [
        ('Ribcage', 8, polygon(8, W['chest'] / 2 * 0.84, D.get('chest', 1.0) / 2, 22.5), 'rounded box'),
        ('Neck', 6, polygon(6, W['neck'] / 2, W['neck'] / 2 * 0.95, 0), 'cylinder'),
        ('Upper arm', 6, polygon(6, W['upper_arm'] / 2 * 0.85, W['upper_arm'] / 2, 0), 'flattened side to side'),
        ('Forearm, wrist', 6, polygon(6, W['wrist'] / 2, W['wrist'] / 4, 0), 'flat box, 2 to 1'),
        ('Thigh', 7, polygon(7, W['thigh'] / 2, W['thigh'] / 2 * 0.95, 90, squash=lambda x, y: (x * (0.85 if x < 0 else 1.0), y)), 'rounded triangle'),
        ('Shin', 6, [(-0.13, 0.2), (0.13, 0.2), (0.22, 0.0), (0.14, -0.2), (-0.04, -0.26), (-0.2, -0.08)], 'D: flat front, round calf'),
    ]
    cw = 175; w = cw * len(items); h = 2.15 * S
    o = [f'<rect width="{w:.0f}" height="{h:.0f}" fill="{PAPER}"/>']
    for i, (name, n, pts, note) in enumerate(items):
        cx, cy = cw * i + cw / 2, 1.0 * S
        P = [(cx + x * S, cy - y * S) for x, y in pts]
        o.append(f'<path d="{catmull(P, True)}" fill="none" stroke="{C["grid"]}" stroke-width="1.2" stroke-dasharray="4 3"/>')
        o.append(f'<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in P) + f' Z" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6" stroke-linejoin="round"/>')
        for x, y in P:
            o.append(f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x:.1f}" y2="{y:.1f}" stroke="{C["skin2"]}" stroke-width="1"/>')
        o.append(text(cx, h - 30, f'{name}: {n} planes', 13)); o.append(text(cx, h - 13, note, 11.5, 500))
    return svg(w, h, ''.join(o), 'Cross-sections and their plane counts (front is up)')


# ---------- 5. foreshortening ----------
def foreshorten(cn, S=60):
    w = 9.0 * S; h = 3.4 * S; o = [f'<rect width="{w:.0f}" height="{h:.0f}" fill="{PAPER}"/>']
    # a forearm cylinder turning toward the viewer: shorter, and its near end ellipse gets rounder and bigger
    for i, (ang, lab) in enumerate(((0, 'side on'), (45, 'turned 45°'), (75, 'turned 75°'))):
        cx = (0.9 + 1.6 * i) * S; L = 2.0 * math.cos(math.radians(ang)) * S; r0, r1 = 0.36 * S * (1 + 0.25 * math.sin(math.radians(ang))), 0.24 * S
        e0, e1 = max(0.12, math.sin(math.radians(ang))), max(0.12, math.sin(math.radians(ang)) * 0.9)
        ytop, yb = 0.35 * S, 0.35 * S + L
        o.append(f'<path d="M{cx - r1:.1f},{ytop:.1f} L{cx - r0:.1f},{yb:.1f} A{r0:.1f},{r0 * e0:.1f} 0 0 0 {cx + r0:.1f},{yb:.1f} L{cx + r1:.1f},{ytop:.1f}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6"/>')
        o.append(f'<ellipse cx="{cx:.1f}" cy="{ytop:.1f}" rx="{r1:.1f}" ry="{r1 * e1:.1f}" fill="{C["skin2"]}" stroke="{C["line"]}" stroke-width="1.2"/>')
        o.append(f'<ellipse cx="{cx:.1f}" cy="{yb:.1f}" rx="{r0:.1f}" ry="{r0 * e0:.1f}" fill="none" stroke="{C["guide"]}" stroke-width="1.6"/>')
        o.append(text(cx, h - 14, lab, 12.5))
    # an arm pointing at the viewer: hand over forearm over upper arm, nearer forms bigger
    cx, cy = 6.9 * S, 1.45 * S
    for dx, dy, r, lab in ((0.55, -0.55, 0.42, 'upper arm'), (0.25, -0.22, 0.5, 'forearm'), (0.0, 0.1, 0.62, 'hand')):
        o.append(f'<circle cx="{cx + dx * S:.1f}" cy="{cy + dy * S:.1f}" r="{r * S:.1f}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6"/>')
    o.append(text(cx + 0.25 * S, h - 30, 'Pointing at you', 14)); o.append(text(cx + 0.25 * S, h - 13, 'the nearer form overlaps the farther', 11.5, 500))
    return svg(w, h, ''.join(o), 'Foreshortening: shorter length, rounder ends, overlaps')


def main():
    cn = canon(); os.makedirs(OUT, exist_ok=True)
    data = json.load(open(CONSTRUCTION))  # the steps the page lists; copied next to it so the page and modelers read one file
    with open(os.path.join(OUT, '..', 'construction.json'), 'w') as fh:
        json.dump(data, fh, indent=1)
    files = {'build.svg': build_strip(cn), 'gesture.svg': gesture(cn), 'limbs.svg': limbs(cn), 'sections.svg': sections(cn), 'foreshorten.svg': foreshorten(cn)}
    for name, txt in files.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            fh.write(txt)
        print(name, len(txt) // 1024, 'KB')


if __name__ == '__main__':
    main()
