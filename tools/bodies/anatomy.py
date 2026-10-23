"""Gray's-level anatomy plates for AW-STUDY-0016: skeleton and layered muscles, front, side and back.

python anatomy.py  -> prototypes/ranch-atelier/dist/studies/bodies-study/img/anatomy-*.svg

The adult man of the canon (docs/oracle/bodies/human-canon.json, 7.5 heads) in the anatomical position: standing,
arms a little away from the body, palms forward. Units are heads, y up from the floor, x out from the midline;
one head = S pixels. Every bone is drawn from measured proportions (Gray 1918, Richer's canon) and placed on the
canon's landmarks, so the plates, the data (docs/oracle/bodies/anatomy.json) and the scorer agree.
The right half is authored and mirrored. PG: the figure is an écorché and a skeleton; the pelvis region shows bone
and muscle only."""
import os, math

from figure import canon, figure, Canvas, Seg, catmull, svg, OUT

BONE = dict(fill='#f3ebd6', line='#6f5d3e', shade='#e2d5b6', cart='#dfe7e2', cartline='#8a9a92', hole='#fbf7ea', far='#cdbf9c')
INK = '#3f3828'


# ---------- drawing helpers ----------
def mirror(pts):
    return [(-x, y) for x, y in pts]


def frame(A, B):
    """Local frame along a limb: point(t, s) with t the distance from A toward B and s across it (s > 0 lateral,
    meaning away from the midline for a limb on the +x side)."""
    dx, dy = B[0] - A[0], B[1] - A[1]; L = math.hypot(dx, dy); d = (dx / L, dy / L)
    n = (-d[1], d[0]) if (-d[1]) > 0 else (d[1], -d[0])
    return lambda t, s: (A[0] + d[0] * t + n[0] * s, A[1] + d[1] * t + n[1] * s)


def band(pts, w0, w1=None, n=24):
    """A smooth strip of width w0 (to w1 at the end) along a polyline: ribs, clavicles, slender bones."""
    w1 = w0 if w1 is None else w1
    P = smooth_pts(pts, n)
    left, right = [], []
    for i, p in enumerate(P):
        a = P[max(i - 1, 0)]; b = P[min(i + 1, len(P) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L; w = (w0 + (w1 - w0) * i / (len(P) - 1)) / 2
        left.append((p[0] + nx * w, p[1] + ny * w)); right.append((p[0] - nx * w, p[1] - ny * w))
    return left + right[::-1]


def smooth_pts(pts, n=24):
    """Catmull-Rom resampling of an open polyline."""
    if len(pts) < 3:
        return [(pts[0][0] + (pts[1][0] - pts[0][0]) * i / n, pts[0][1] + (pts[1][1] - pts[0][1]) * i / n) for i in range(n + 1)]
    out = []; P = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        m = max(2, n // (len(pts) - 1))
        for k in range(m):
            t = k / m; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1])
    return out


class Plate:
    n = 0

    def __init__(self, cv):
        self.cv, self.o = cv, []

    def uid(self):
        Plate.n += 1; return f'c{Plate.n}'

    def shape(self, pts, fill=BONE['fill'], line=BONE['line'], w=1.2, smooth=True, closed=True, cls='', both=True, extra=''):
        for P in ((pts, mirror(pts)) if both else (pts,)):
            c = f' class="{cls}"' if cls else ''
            self.o.append(f'<path{c} d="{self.cv.path(P, closed=closed, smooth=smooth)}" fill="{fill if closed else "none"}" stroke="{line}" stroke-width="{w}" stroke-linejoin="round"{extra}/>')

    def circle(self, c, r, fill=BONE['fill'], line=BONE['line'], w=1.2, both=True):
        for p in ((c, (-c[0], c[1])) if both else (c,)):
            x, y = self.cv.p(p); self.o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * self.cv.S:.1f}" fill="{fill}" stroke="{line}" stroke-width="{w}"/>')

    def ellipse(self, c, rx, ry, fill=BONE['fill'], line=BONE['line'], w=1.2, both=True, rot=0):
        for p, r in (((c, rot), ((-c[0], c[1]), -rot)) if both else ((c, rot),)):
            x, y = self.cv.p(p)
            self.o.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx * self.cv.S:.1f}" ry="{ry * self.cv.S:.1f}" transform="rotate({r:.1f} {x:.1f} {y:.1f})" fill="{fill}" stroke="{line}" stroke-width="{w}"/>')

    def group(self, cls):
        self.o.append(f'<g class="{cls}">')

    def end(self):
        self.o.append('</g>')

    def text(self):
        return ''.join(self.o)


# ---------- the skeleton, front ----------
RIBS = [  # sternal end y, costochondral junction (x, y), lateral extreme (x, y); ribs 8 to 10 join the cartilage above
    (6.17, (0.15, 6.12), (0.34, 6.15)),
    (6.06, (0.19, 5.98), (0.46, 6.02)),
    (5.93, (0.23, 5.80), (0.53, 5.88)),
    (5.80, (0.27, 5.63), (0.58, 5.74)),
    (5.67, (0.31, 5.46), (0.61, 5.58)),
    (5.53, (0.34, 5.29), (0.63, 5.42)),
    (5.40, (0.37, 5.13), (0.635, 5.27)),
    (None, (0.44, 5.01), (0.625, 5.12)),
    (None, (0.50, 4.93), (0.61, 4.99)),
    (None, (0.55, 4.87), (0.585, 4.90)),
]


def skull_front(pl):
    cran = [(0, 7.5), (0.15, 7.48), (0.255, 7.4), (0.31, 7.25), (0.318, 7.08), (0.3, 6.97), (0.29, 6.9), (0.27, 6.82), (0.255, 6.74),
            (0.232, 6.67), (0.214, 6.64), (0.17, 6.56), (0.1, 6.505), (0.035, 6.49), (0, 6.49)]
    full = cran + mirror(cran[::-1])[1:]
    pl.shape(full, both=False)
    # zygomatic arch and cheekbone, temporal fossa line
    pl.shape([(0.19, 6.98), (0.255, 6.92), (0.3, 6.9), (0.29, 6.84), (0.24, 6.84), (0.19, 6.86)], fill=BONE['shade'])
    pl.shape([(0.3, 7.14), (0.24, 7.22), (0.2, 7.3)], closed=False, w=0.9)
    # orbits
    pl.shape([(0.05, 7.03), (0.1, 7.07), (0.17, 7.075), (0.215, 7.04), (0.225, 6.98), (0.2, 6.93), (0.14, 6.925), (0.075, 6.95), (0.05, 6.99)],
             fill=BONE['hole'], line=INK)
    # nasal bones and the pear-shaped opening
    pl.shape([(0.0, 6.94), (0.025, 6.93), (0.03, 6.86), (0.05, 6.81), (0.05, 6.76), (0.03, 6.735), (0.0, 6.735)], fill=BONE['hole'], line=INK, both=True)
    # teeth rows and the maxilla/mandible line
    teeth_top = [(0.0, 6.705), (0.06, 6.7), (0.11, 6.69), (0.13, 6.68)]
    pl.shape(teeth_top, closed=False, w=0.9)
    pl.shape([(0.0, 6.66), (0.06, 6.662), (0.11, 6.668), (0.13, 6.672)], closed=False, w=0.9)
    for x in (0.02, 0.05, 0.08, 0.105):
        pl.shape([(x, 6.705), (x, 6.635)], closed=False, w=0.6)
    # mandible: ramus and body edge, the chin
    pl.shape([(0.255, 6.84), (0.24, 6.72), (0.214, 6.64)], closed=False, w=1.0)
    pl.shape([(0.03, 6.55), (0.0, 6.52)], closed=False, w=0.8)
    # mastoid behind the jaw
    pl.shape([(0.265, 6.78), (0.285, 6.74), (0.27, 6.7)], fill=BONE['shade'])


def spine_front(pl):
    # cervical: C3-C7 bodies below the jaw, with transverse processes
    y = 6.62
    for i in range(5):
        h = 0.06
        pl.shape([(0, y), (0.07, y - 0.005), (0.075, y - h + 0.008), (0, y - h)], smooth=False)
        pl.shape([(0.075, y - 0.015), (0.12, y - 0.02), (0.12, y - 0.04), (0.075, y - 0.045)], smooth=False, w=0.9)
        y -= h + 0.012
    # lumbar L1-L5 below the ribcage (bodies widen downward), with transverse processes
    y = 4.86
    for i in range(5):
        w = 0.085 + 0.005 * i; h = 0.115; tp = (0.17, 0.2, 0.22, 0.2, 0.18)[i]
        pl.shape([(0.0, y), (w - 0.01, y), (w, y - 0.02), (w - 0.012, y - h / 2), (w, y - h + 0.02), (w - 0.01, y - h), (0, y - h)])
        pl.shape([(w - 0.005, y - 0.03), (tp, y - 0.035), (tp + 0.01, y - 0.06), (w - 0.005, y - 0.07)], w=0.9)
        y -= h + 0.035
        pl.shape([(0, y + 0.03), (w + 0.005, y + 0.03), (w + 0.005, y + 0.005), (0, y + 0.005)], fill=BONE['cart'], line=BONE['cartline'], smooth=False, w=0.8)


def thorax_front(pl):
    # back halves of the ribs, seen through the gaps: from the spine they run out and down to the side of the cage
    pl.group('far')
    for ys, c, wl in RIBS:
        pl.shape(band([(0.07, wl[1] + 0.2), (wl[0] * 0.55, wl[1] + 0.17), (wl[0] * 0.9, wl[1] + 0.08), wl], 0.035, 0.045), fill=BONE['far'], line='none', w=0)
    pl.end()
    # ribs: bone from the lateral extreme to the costochondral junction, then cartilage to the sternum
    prev_cart = None
    for i, (ys, c, wl) in enumerate(RIBS):
        lat = (wl[0] - 0.035, wl[1] + 0.04)
        pl.shape(band([lat, (wl[0], wl[1] - 0.005), ((wl[0] + c[0]) / 2 + 0.03, (wl[1] + c[1]) / 2 + 0.005), c], 0.07 if i else 0.075, 0.055))
        if ys is not None:
            cart = [c, ((c[0] + 0.07) / 2 + 0.02, (c[1] + ys) / 2 - 0.02), (0.07, ys)]
        else:
            cart = [c, (prev_cart[1][0] + 0.03, prev_cart[1][1] - 0.04), prev_cart[1]]
        pl.shape(band(cart, 0.045, 0.04), fill=BONE['cart'], line=BONE['cartline'], w=1.0)
        prev_cart = cart
    # sternum: manubrium, body, xiphoid
    man = [(0, 6.215), (0.035, 6.225), (0.07, 6.24), (0.105, 6.205), (0.11, 6.15), (0.085, 6.04), (0.065, 6.0), (0, 6.0)]
    body = [(0, 5.995), (0.068, 5.99), (0.075, 5.8), (0.078, 5.6), (0.07, 5.44), (0.05, 5.37), (0, 5.36)]
    xiph = [(0, 5.36), (0.03, 5.355), (0.022, 5.26), (0.0, 5.2)]
    for part in (man, body, xiph):
        pl.shape(part + mirror(part[::-1])[1:-1], both=False, fill=BONE['fill'] if part is not xiph else BONE['cart'],
                 line=BONE['line'] if part is not xiph else BONE['cartline'])
    # floating ribs 11 and 12, at the side
    pl.shape(band([(0.62, 5.0), (0.62, 4.88), (0.585, 4.8)], 0.045, 0.03))
    pl.shape(band([(0.5, 4.95), (0.47, 4.84), (0.43, 4.78)], 0.04, 0.025), fill=BONE['far'], line=BONE['far'], w=0.6)


def shoulder_front(pl):
    # scapula behind the ribs: lateral border and the inferior angle, faint; coracoid and acromion in front
    pl.group('far'); pl.shape([(0.73, 5.98), (0.7, 5.75), (0.64, 5.45), (0.57, 5.25), (0.54, 5.3), (0.6, 5.6), (0.66, 5.9)], fill=BONE['far'], line='none', w=0); pl.end()
    pl.shape([(0.6, 6.12), (0.66, 6.1), (0.71, 6.06), (0.72, 6.02), (0.69, 6.04), (0.64, 6.07)], fill=BONE['fill'])        # coracoid
    pl.shape([(0.77, 6.27), (0.86, 6.28), (0.9, 6.24), (0.88, 6.2), (0.8, 6.2)], fill=BONE['fill'])                       # acromion
    pl.shape(band([(0.09, 6.205), (0.3, 6.2), (0.55, 6.235), (0.79, 6.245)], 0.07, 0.055))                              # clavicle


def pelvis_front(pl):
    sac = [(0.0, 4.1), (0.12, 4.1), (0.2, 4.08), (0.21, 4.0), (0.15, 3.85), (0.09, 3.72), (0.04, 3.63), (0.0, 3.6)]
    pl.shape(sac + mirror(sac[::-1])[1:-1], both=False, fill=BONE['shade'])
    for yy, ww in ((4.0, 0.17), (3.9, 0.14), (3.8, 0.11), (3.71, 0.08)):
        pl.shape([(-ww, yy), (ww, yy)], closed=False, w=0.6, both=False)
        pl.circle((ww * 0.7, yy - 0.04), 0.012, fill=BONE['hole'], line=BONE['line'], w=0.6)
    hip = [(0.19, 4.08), (0.27, 4.3), (0.36, 4.4), (0.45, 4.42), (0.55, 4.38), (0.6, 4.31), (0.6, 4.25), (0.56, 4.18), (0.53, 4.15),
           (0.5, 4.08), (0.475, 4.0), (0.48, 3.93), (0.52, 3.86), (0.52, 3.76), (0.48, 3.66), (0.4, 3.53), (0.34, 3.44), (0.28, 3.41),
           (0.22, 3.43), (0.15, 3.47), (0.08, 3.5), (0.025, 3.5), (0.025, 3.63), (0.08, 3.645), (0.13, 3.635), (0.2, 3.68),
           (0.27, 3.74), (0.3, 3.78), (0.27, 3.86), (0.21, 3.96)]
    pl.shape(hip)
    pl.shape([(0.31, 4.3), (0.42, 4.36), (0.53, 4.3), (0.49, 4.18), (0.38, 4.08), (0.3, 4.12)], fill=BONE['shade'], line=BONE['shade'])  # iliac fossa
    pl.shape([(0.13, 3.6), (0.2, 3.62), (0.29, 3.57), (0.32, 3.5), (0.27, 3.46), (0.18, 3.5)], fill=BONE['hole'], line=INK, w=1.0)  # obturator foramen
    pl.shape([(0.0, 3.5), (0.025, 3.5), (0.025, 3.63), (0.0, 3.63)], fill=BONE['cart'], line=BONE['cartline'], smooth=False)   # symphysis disc


def femur_front(pl, back=False):
    shaft = [(0.53, 3.9), (0.575, 3.83), (0.575, 3.7), (0.54, 3.55), (0.5, 3.3), (0.45, 3.0), (0.4, 2.7), (0.385, 2.5), (0.42, 2.34),
             (0.445, 2.25), (0.435, 2.14), (0.4, 2.085), (0.34, 2.075), (0.3, 2.11), (0.25, 2.11), (0.2, 2.075), (0.14, 2.085),
             (0.1, 2.15), (0.095, 2.24), (0.115, 2.34), (0.2, 2.5), (0.27, 2.7), (0.33, 3.0), (0.375, 3.3), (0.39, 3.48), (0.37, 3.56),
             (0.395, 3.63), (0.38, 3.72), (0.44, 3.84)]
    pl.shape(shaft)
    pl.circle((0.385, 3.8), 0.1)                                                        # head in the hip socket
    pl.shape([(0.47, 3.62), (0.51, 3.75), (0.52, 3.85)], closed=False, w=0.8)            # intertrochanteric line
    if back:
        pl.shape([(0.2, 2.1), (0.26, 2.2), (0.33, 2.1)], fill=BONE['shade'], w=0.8)                  # intercondylar fossa
        pl.shape([(0.4, 3.55), (0.36, 3.1), (0.3, 2.6)], closed=False, w=0.9)                         # linea aspera
        return
    pl.shape([(0.27, 2.34), (0.37, 2.33), (0.38, 2.24), (0.32, 2.1), (0.27, 2.08), (0.2, 2.1), (0.165, 2.24), (0.18, 2.32)], fill=BONE['fill'], w=1.3)  # patella


def leg_front(pl):
    tib = [(0.1, 2.06), (0.43, 2.06), (0.435, 2.0), (0.4, 1.92), (0.345, 1.8), (0.32, 1.5), (0.3, 1.0), (0.29, 0.6), (0.3, 0.45),
           (0.29, 0.355), (0.21, 0.33), (0.165, 0.31), (0.135, 0.35), (0.14, 0.45), (0.165, 0.6), (0.19, 1.0), (0.2, 1.5),
           (0.175, 1.8), (0.11, 1.92), (0.09, 2.0)]
    fib = band([(0.45, 1.97), (0.43, 1.6), (0.39, 1.0), (0.365, 0.5), (0.36, 0.33)], 0.05, 0.04)
    pl.shape(fib)
    pl.shape([(0.41, 2.0), (0.465, 1.995), (0.475, 1.94), (0.44, 1.9), (0.41, 1.93)])                 # fibular head
    pl.shape([(0.33, 0.48), (0.38, 0.46), (0.385, 0.32), (0.355, 0.24), (0.325, 0.28), (0.325, 0.4)])  # lateral malleolus
    pl.shape(tib)
    pl.shape([(0.24, 1.95), (0.3, 1.95), (0.31, 1.86), (0.27, 1.82), (0.23, 1.87)], fill=BONE['shade'])  # tibial tuberosity
    # foot, seen from the front: talus, tarsals, metatarsals and toes foreshortened toward the viewer
    pl.shape([(0.17, 0.31), (0.3, 0.31), (0.33, 0.25), (0.28, 0.21), (0.18, 0.21), (0.15, 0.25)])
    pl.shape([(0.13, 0.22), (0.37, 0.22), (0.4, 0.15), (0.36, 0.12), (0.14, 0.12), (0.11, 0.16)], fill=BONE['shade'])
    bases = [0.155, 0.205, 0.25, 0.295, 0.34]; heads = [0.12, 0.185, 0.245, 0.305, 0.365]
    for i, (b, h) in enumerate(zip(bases, heads)):
        w = 0.05 if i == 0 else 0.032
        pl.shape(band([(b, 0.14), (h, 0.06)], w, w * 0.8))
        pl.shape(band([(h, 0.05), (h - 0.005, 0.0)], w * 0.95, w * 0.7))


HUM = frame((0.79, 6.0), (0.985, 4.8))      # humerus: t along the bone from the shoulder, s > 0 lateral
FA = frame((0.985, 4.76), (1.225, 3.57))     # forearm (supinated): s > 0 radius side, s < 0 ulna side


def arm_front(pl):
    hum = HUM
    pl.circle((0.755, 6.0), 0.1)                                                                    # humeral head in the socket
    pts = [(-0.06, 0.085), (0.05, 0.095), (0.15, 0.07), (0.35, 0.06), (0.42, 0.068), (0.5, 0.058), (0.85, 0.052), (1.0, 0.06),
           (1.08, 0.1), (1.15, 0.12), (1.19, 0.085), (1.225, 0.03), (1.235, -0.02), (1.22, -0.08), (1.17, -0.16), (1.12, -0.15),
           (1.04, -0.07), (0.85, -0.052), (0.3, -0.052), (0.12, -0.06), (0.06, -0.08), (0.02, -0.05)]
    pl.shape([hum(t, s) for t, s in pts])
    pl.shape([hum(t, s) for t, s in [(0.0, 0.03), (0.07, 0.04), (0.12, 0.03)]], closed=False, w=0.8)   # bicipital groove
    fa = FA
    ulna = [(0.0, -0.02), (0.02, -0.1), (0.1, -0.115), (0.4, -0.095), (0.8, -0.085), (1.05, -0.085), (1.12, -0.1), (1.17, -0.085),
            (1.2, -0.07), (1.17, -0.045), (1.08, -0.05), (0.8, -0.045), (0.4, -0.035), (0.12, -0.015), (0.05, 0.0)]
    rad = [(0.02, 0.02), (0.02, 0.105), (0.08, 0.11), (0.12, 0.085), (0.2, 0.09), (0.5, 0.085), (0.85, 0.105), (1.05, 0.125),
           (1.17, 0.14), (1.18, 0.11), (1.16, -0.035), (1.06, -0.03), (0.85, 0.01), (0.5, 0.025), (0.2, 0.02), (0.15, 0.0),
           (0.11, 0.035), (0.08, 0.025)]
    pl.shape([fa(t, s) for t, s in ulna]); pl.shape([fa(t, s) for t, s in rad])
    arm_hand(pl)


# ---------- the skeleton, back ----------
def skull_back(pl):
    cran = [(0, 7.5), (0.16, 7.475), (0.265, 7.38), (0.315, 7.2), (0.318, 7.03), (0.3, 6.92), (0.27, 6.84), (0.2, 6.79), (0.1, 6.79), (0, 6.81)]
    pl.shape(cran + mirror(cran[::-1])[1:-1], both=False)
    pl.shape([(0.18, 7.0), (0.09, 6.97), (0.0, 6.99)], closed=False, w=0.9)                       # superior nuchal line
    pl.shape([(0.0, 7.06), (0.04, 7.02)], closed=False, w=0.8)                                      # external occipital protuberance
    pl.shape([(0.04, 7.38), (0.0, 7.3), (0.06, 7.2), (0.03, 7.1)], closed=False, w=0.6, both=False)  # lambdoid/sagittal sutures
    pl.shape([(0.0, 7.3), (0.12, 7.23), (0.26, 7.1)], closed=False, w=0.6)
    pl.shape([(0.255, 6.82), (0.28, 6.74), (0.265, 6.7), (0.245, 6.76)], fill=BONE['shade'])          # mastoid
    pl.shape([(0.25, 6.8), (0.235, 6.69), (0.214, 6.64), (0.19, 6.62), (0.2, 6.7), (0.22, 6.8)])      # ramus and angle of the mandible


def spine_back(pl):
    # cervical spinous processes C2-C7 (C7 the prominent one), thoracic T1-T12, lumbar L1-L5, with transverse processes
    ys = [6.74, 6.66, 6.58, 6.5, 6.42, 6.32]
    for k, y in enumerate(ys):
        w = 0.035 + 0.006 * k
        pl.shape([(0.0, y + 0.03), (0.07 + 0.01 * k, y + 0.025), (0.08 + 0.01 * k, y - 0.01), (0.0, y - 0.015)], fill=BONE['shade'], w=0.8)
        pl.shape([(0, y + 0.02), (w, y + 0.015), (w, y - 0.03), (0, y - 0.04)], w=0.9)
    y = 6.22
    for k in range(12):
        pl.shape([(0.0, y), (0.1, y - 0.01), (0.125, y - 0.04), (0.1, y - 0.07), (0.0, y - 0.065)], fill=BONE['shade'], w=0.8)   # lamina and transverse process
        pl.shape([(0, y - 0.005), (0.022, y - 0.01), (0.02, y - 0.1), (0, y - 0.115)], w=0.9)                                   # spinous process
        y -= 0.107
    y = 4.86
    for k in range(5):
        tp = (0.17, 0.2, 0.22, 0.2, 0.18)[k]; h = 0.15
        pl.shape([(0.0, y), (0.08, y - 0.005), (0.085, y - h + 0.02), (0.0, y - h + 0.01)], fill=BONE['shade'], w=0.8)
        pl.shape([(0.08, y - 0.04), (tp, y - 0.045), (tp + 0.01, y - 0.07), (0.08, y - 0.08)], w=0.9)
        pl.shape([(0, y - 0.01), (0.035, y - 0.02), (0.035, y - 0.1), (0, y - 0.11)], w=0.9)
        y -= h


def thorax_back(pl):
    for ys, c, wl in RIBS:
        pl.shape(band([(0.1, wl[1] + 0.2), (wl[0] * 0.55, wl[1] + 0.17), (wl[0] * 0.9, wl[1] + 0.08), wl, (wl[0] - 0.02, wl[1] - 0.06)], 0.05, 0.06))
    pl.shape(band([(0.1, 5.03), (0.4, 4.98), (0.6, 4.86), (0.6, 4.78)], 0.05, 0.035))      # rib 11
    pl.shape(band([(0.1, 4.92), (0.3, 4.86), (0.43, 4.79)], 0.045, 0.03))                  # rib 12


def scapula_back(pl):
    sc = [(0.32, 6.08), (0.45, 6.07), (0.6, 6.06), (0.64, 6.04), (0.7, 6.0), (0.725, 5.93), (0.7, 5.86), (0.64, 5.62), (0.53, 5.42),
          (0.45, 5.32), (0.41, 5.3), (0.385, 5.36), (0.34, 5.6), (0.3, 5.86), (0.3, 5.98)]
    pl.shape(sc)
    pl.shape([(0.6, 5.5), (0.5, 5.4), (0.42, 5.36)], closed=False, w=0.7)
    pl.shape(band([(0.305, 5.88), (0.5, 5.96), (0.7, 6.06), (0.8, 6.15)], 0.045, 0.07))      # spine of the scapula
    pl.shape([(0.77, 6.12), (0.88, 6.18), (0.91, 6.24), (0.86, 6.28), (0.77, 6.26), (0.74, 6.18)])  # acromion


def pelvis_back(pl):
    sac = [(0.0, 4.12), (0.1, 4.12), (0.17, 4.08), (0.16, 3.95), (0.12, 3.8), (0.07, 3.68), (0.03, 3.62), (0.0, 3.6)]
    pl.shape(sac + mirror(sac[::-1])[1:-1], both=False)
    pl.shape([(0.0, 3.6), (0.02, 3.6), (0.015, 3.53), (0.0, 3.52)], fill=BONE['shade'])        # coccyx
    for yy in (4.02, 3.92, 3.82, 3.72):
        pl.circle((0.06 + 0.4 * (yy - 3.7), yy), 0.015, fill=BONE['hole'], w=0.6)
    pl.shape([(0, 4.1), (0, 3.66)], closed=False, w=1.4, both=False)                              # median sacral crest
    ilium = [(0.13, 4.07), (0.2, 4.28), (0.31, 4.38), (0.45, 4.42), (0.56, 4.37), (0.6, 4.29), (0.59, 4.2), (0.55, 4.08), (0.52, 3.95),
             (0.53, 3.83), (0.5, 3.72), (0.44, 3.6), (0.38, 3.5), (0.32, 3.43), (0.25, 3.41), (0.2, 3.44), (0.19, 3.52), (0.22, 3.6),
             (0.19, 3.67), (0.21, 3.76), (0.24, 3.86), (0.2, 3.96), (0.16, 4.0)]
    pl.shape(ilium)
    pl.shape([(0.24, 4.2), (0.4, 4.05), (0.5, 3.92)], closed=False, w=0.7)                       # gluteal lines
    pl.shape([(0.3, 4.32), (0.45, 4.2), (0.55, 4.1)], closed=False, w=0.7)
    pl.shape([(0.22, 3.41), (0.3, 3.42), (0.33, 3.48), (0.28, 3.52), (0.21, 3.5)], fill=BONE['shade'])  # ischial tuberosity
    pl.circle((0.135, 4.05), 0.018, fill=BONE['shade'])                                            # PSIS


def legs_back(pl):
    femur_front(pl, back=True)
    tib = [(0.1, 2.06), (0.43, 2.06), (0.435, 2.0), (0.4, 1.9), (0.33, 1.75), (0.31, 1.5), (0.3, 1.0), (0.29, 0.6), (0.3, 0.45),
           (0.29, 0.355), (0.21, 0.33), (0.165, 0.31), (0.135, 0.35), (0.14, 0.45), (0.165, 0.6), (0.19, 1.0), (0.2, 1.5),
           (0.18, 1.75), (0.11, 1.9), (0.09, 2.0)]
    pl.shape(tib)
    pl.shape([(0.2, 1.8), (0.33, 1.7)], closed=False, w=0.7)                                       # soleal line
    pl.shape(band([(0.45, 1.97), (0.43, 1.6), (0.39, 1.0), (0.365, 0.5), (0.36, 0.33)], 0.05, 0.04))
    pl.shape([(0.41, 2.0), (0.465, 1.995), (0.475, 1.94), (0.44, 1.9), (0.41, 1.93)])
    pl.shape([(0.33, 0.48), (0.38, 0.46), (0.385, 0.32), (0.355, 0.24), (0.325, 0.28), (0.325, 0.4)])
    pl.shape([(0.17, 0.3), (0.31, 0.3), (0.33, 0.22), (0.31, 0.12), (0.29, 0.02), (0.24, 0.0), (0.19, 0.02), (0.17, 0.12), (0.16, 0.22)], fill=BONE['fill'])  # calcaneus
    pl.shape([(0.2, 0.31), (0.3, 0.31), (0.3, 0.27), (0.2, 0.27)], fill=BONE['shade'])            # talus


def arm_back(pl):
    hum, fa = HUM, FA
    pts = [(-0.06, 0.09), (0.05, 0.1), (0.15, 0.075), (0.35, 0.062), (0.5, 0.058), (0.85, 0.052), (1.0, 0.06), (1.08, 0.1), (1.15, 0.12),
           (1.19, 0.085), (1.22, 0.04), (1.22, -0.08), (1.17, -0.16), (1.12, -0.15), (1.04, -0.07), (0.85, -0.052), (0.3, -0.052),
           (0.12, -0.065), (0.02, -0.07), (-0.05, -0.04)]
    pl.shape([hum(t, s) for t, s in pts])
    pl.shape([hum(t, s) for t, s in [(1.04, -0.03), (1.0, 0.0), (1.04, 0.04), (1.12, 0.04), (1.12, -0.03)]], fill=BONE['shade'])  # olecranon fossa
    ulna = [(-0.06, -0.02), (-0.07, -0.08), (0.02, -0.11), (0.1, -0.115), (0.4, -0.095), (0.8, -0.085), (1.05, -0.085), (1.12, -0.1),
            (1.17, -0.085), (1.2, -0.07), (1.17, -0.045), (1.08, -0.05), (0.8, -0.045), (0.4, -0.035), (0.12, -0.015), (0.0, 0.0)]
    rad = [(0.02, 0.02), (0.02, 0.105), (0.08, 0.11), (0.12, 0.085), (0.2, 0.09), (0.5, 0.085), (0.85, 0.105), (1.05, 0.125),
           (1.17, 0.14), (1.18, 0.11), (1.16, -0.035), (1.06, -0.03), (0.85, 0.01), (0.5, 0.025), (0.2, 0.02), (0.15, 0.0)]
    pl.shape([fa(t, s) for t, s in rad]); pl.shape([fa(t, s) for t, s in ulna])
    pl.shape([fa(t, s) for t, s in [(1.07, 0.02), (1.1, 0.04), (1.13, 0.03)]], closed=False, w=0.8)   # dorsal (Lister's) tubercle
    arm_hand(pl)


def skeleton_back(S=100, pad=0.4):
    H = 7.5; W = 3.3
    cv = Canvas(S, (W / 2) * S, pad * S, H)
    pl = Plate(cv)
    thorax_back(pl); spine_back(pl); scapula_back(pl); pelvis_back(pl); legs_back(pl); arm_back(pl); skull_back(pl)
    w, h = W * S, (H + 2 * pad) * S
    return svg(w, h, f'<rect width="{w:.0f}" height="{h:.0f}" fill="#fffcf0"/>' + pl.text(), 'Skeleton, back view')



# ---------- the skeleton, side (the man's right side; front is +x) ----------
HUMS = frame((-0.02, 6.0), (-0.065, 4.8))     # humerus, side: s > 0 toward the front
FAS = frame((-0.06, 4.76), (0.0, 3.57))       # forearm, side


def x_sternum(y):
    return 0.3 + (6.22 - y) * 0.19


def skull_side(pl):
    cran = [(-0.02, 7.5), (0.2, 7.44), (0.33, 7.3), (0.4, 7.13), (0.435, 7.03), (0.41, 6.99), (0.425, 6.95), (0.465, 6.88), (0.445, 6.84),
            (0.445, 6.8), (0.475, 6.77), (0.455, 6.73), (0.462, 6.69), (0.455, 6.655), (0.445, 6.6), (0.44, 6.54), (0.42, 6.5),
            (0.37, 6.495), (0.25, 6.52), (0.12, 6.56), (0.04, 6.6), (0.02, 6.68), (0.03, 6.77), (0.015, 6.84), (-0.05, 6.8),
            (-0.07, 6.77), (-0.12, 6.8), (-0.22, 6.83), (-0.33, 6.9), (-0.395, 7.03), (-0.4, 7.2), (-0.34, 7.36), (-0.2, 7.47)]
    pl.shape(cran, both=False)
    pl.shape([(0.3, 7.05), (0.4, 7.06), (0.43, 7.0), (0.41, 6.93), (0.35, 6.92), (0.31, 6.96)], fill=BONE['hole'], line=INK, both=False)    # orbit
    pl.shape([(0.43, 6.86), (0.465, 6.88), (0.45, 6.8), (0.43, 6.8)], fill=BONE['hole'], line=INK, both=False)                             # nasal opening
    pl.shape([(0.08, 6.89), (0.3, 6.9), (0.34, 6.84), (0.3, 6.83), (0.1, 6.85)], fill=BONE['shade'], both=False)                            # zygomatic arch
    pl.shape([(0.3, 6.92), (0.24, 7.1), (0.12, 7.25), (-0.05, 7.3), (-0.2, 7.25)], closed=False, w=0.7, both=False)                         # temporal line
    pl.circle((0.0, 6.88), 0.025, fill=BONE['hole'], line=INK, both=False)                                                                  # ear canal
    pl.shape([(0.04, 6.6), (0.03, 6.77), (0.07, 6.82), (0.12, 6.75)], closed=False, w=0.9, both=False)                                       # ramus and notch
    pl.shape([(0.3, 6.7), (0.46, 6.69)], closed=False, w=0.8, both=False)
    for x in (0.33, 0.37, 0.41, 0.44):
        pl.shape([(x, 6.72), (x, 6.63)], closed=False, w=0.6, both=False)
    pl.shape([(-0.03, 6.82), (-0.055, 6.73), (-0.075, 6.78)], fill=BONE['shade'], both=False)                                               # mastoid


def spine_side(pl):
    def vert(c, depth, h, sp, sp_len, cls=None):
        x, y = c
        pl.shape([(x - depth / 2, y + h / 2), (x + depth / 2, y + h / 2), (x + depth / 2 + 0.005, y - h / 2), (x - depth / 2, y - h / 2)], both=False)
        pl.shape([(x - depth / 2, y + h / 2 - 0.01), (x - depth / 2 - sp_len * 0.4, y + h / 2), (x - depth / 2 - sp_len, y - sp),
                  (x - depth / 2 - sp_len + 0.02, y - sp - 0.03), (x - depth / 2 - 0.02, y - h / 2)], fill=BONE['shade'], both=False)
    cerv = [(0.02, 6.72), (0.035, 6.64), (0.035, 6.56), (0.03, 6.48), (0.015, 6.4), (-0.01, 6.32)]
    for k, c in enumerate(cerv): vert(c, 0.075, 0.06, 0.03 + 0.01 * k, 0.1 + 0.02 * k)
    for k in range(12):
        u = k / 11; x = -0.06 - 0.11 * math.sin(math.pi * u * 0.95) + 0.02 * u; y = 6.22 - k * 0.107
        vert((x, y), 0.095 + 0.03 * u, 0.085, 0.08, 0.17 - 0.03 * abs(u - 0.4))
    for k in range(5):
        u = k / 4; x = -0.06 + 0.07 * math.sin(math.pi * u); y = 4.84 - k * 0.15
        vert((x, y), 0.16, 0.115, 0.03, 0.13)
        pl.shape([(x - 0.08, y - 0.06), (x + 0.08, y - 0.06), (x + 0.08, y - 0.09), (x - 0.08, y - 0.09)], fill=BONE['cart'], line=BONE['cartline'], w=0.6, both=False, smooth=False)
    sac = [(0.0, 4.1), (-0.16, 4.13), (-0.25, 3.98), (-0.3, 3.78), (-0.29, 3.64), (-0.25, 3.57), (-0.21, 3.62), (-0.18, 3.8), (-0.1, 3.97)]
    pl.shape(sac, fill=BONE['shade'], both=False)


def thorax_side(pl):
    back_y = [6.2, 6.1, 5.99, 5.88, 5.77, 5.66, 5.55, 5.45, 5.35, 5.25]
    cart_prev = None
    for k, ((ys, c, wl), yb) in enumerate(zip(RIBS, back_y)):
        xc = x_sternum(c[1]) - 0.1 - (0.0 if k < 7 else 0.06 * (k - 6))
        path = [(-0.1, yb), (-0.3, yb - 0.04), (-0.37, yb - 0.13), (-0.2, (yb + c[1]) / 2 - 0.14), (0.1, c[1] - 0.06), (xc, c[1])]
        pl.shape(band(path, 0.06, 0.05), both=False)
        if ys is not None:
            cart = [(xc, c[1]), ((xc + x_sternum(ys)) / 2, (c[1] + ys) / 2 - 0.02), (x_sternum(ys) - 0.02, ys)]
        else:
            cart = [(xc, c[1]), (cart_prev[1][0] - 0.02, cart_prev[1][1] - 0.05), cart_prev[1]]
        pl.shape(band(cart, 0.045, 0.04), fill=BONE['cart'], line=BONE['cartline'], w=1.0, both=False)
        cart_prev = cart
    pl.shape(band([(-0.1, 5.15), (-0.3, 5.05), (-0.25, 4.85), (-0.1, 4.78)], 0.05, 0.03), both=False)       # rib 11
    st = [(0.29, 6.23), (0.34, 6.22), (0.35, 6.02), (0.47, 5.4), (0.485, 5.36), (0.47, 5.2), (0.45, 5.33), (0.41, 5.4), (0.29, 6.0), (0.27, 6.15)]
    pl.shape(st, both=False)
    pl.shape(band([(0.3, 6.22), (0.15, 6.24), (0.02, 6.25)], 0.07, 0.06), both=False)                       # clavicle, foreshortened
    sc = [(-0.12, 6.08), (-0.2, 6.02), (-0.26, 5.6), (-0.25, 5.3), (-0.2, 5.4), (-0.1, 5.85), (-0.05, 5.98)]
    pl.shape(sc, both=False)                                                                                    # scapula, edge on
    pl.shape([(-0.24, 6.12), (-0.05, 6.2), (0.03, 6.28), (0.07, 6.25), (0.0, 6.17), (-0.2, 6.06)], fill=BONE['shade'], both=False)  # spine and acromion


def pelvis_side(pl):
    il = [(-0.28, 4.1), (-0.2, 4.3), (-0.05, 4.41), (0.12, 4.41), (0.25, 4.33), (0.33, 4.2), (0.3, 4.13), (0.29, 4.04), (0.22, 3.98),
          (0.2, 3.9), (0.25, 3.75), (0.3, 3.65), (0.345, 3.58), (0.335, 3.5), (0.25, 3.48), (0.12, 3.5), (-0.05, 3.44), (-0.15, 3.41),
          (-0.2, 3.46), (-0.17, 3.58), (-0.22, 3.68), (-0.19, 3.8), (-0.26, 3.95)]
    pl.shape(il, both=False)
    pl.shape([(-0.15, 4.25), (0.0, 4.15), (0.15, 4.12)], closed=False, w=0.7, both=False)
    pl.ellipse((0.1, 3.57), 0.08, 0.05, fill=BONE['hole'], line=INK, both=False)
    pl.circle((0.03, 3.82), 0.12, fill=BONE['shade'], both=False)                                                # acetabulum


def leg_side(pl):
    fem = [(-0.06, 3.9), (0.04, 3.9), (0.08, 3.75), (0.08, 3.6), (0.105, 3.2), (0.095, 2.8), (0.065, 2.45), (0.1, 2.28), (0.11, 2.15),
           (0.06, 2.08), (-0.05, 2.07), (-0.12, 2.1), (-0.145, 2.2), (-0.1, 2.35), (-0.065, 2.6), (-0.05, 3.1), (-0.06, 3.55), (-0.1, 3.75)]
    pl.shape(fem, both=False)
    pl.circle((0.03, 3.82), 0.095, both=False)
    pl.shape([(0.12, 2.32), (0.18, 2.3), (0.205, 2.2), (0.18, 2.1), (0.13, 2.1), (0.11, 2.2)], both=False)          # patella
    tib = [(-0.12, 2.06), (0.12, 2.06), (0.14, 1.97), (0.15, 1.9), (0.12, 1.82), (0.1, 1.4), (0.09, 0.9), (0.095, 0.5), (0.11, 0.35),
           (0.1, 0.31), (-0.05, 0.31), (-0.04, 0.45), (-0.03, 1.0), (-0.05, 1.6), (-0.09, 1.85), (-0.13, 1.98)]
    pl.shape(tib, both=False)
    pl.shape(band([(-0.08, 1.96), (-0.07, 1.6), (-0.04, 1.0), (-0.02, 0.5), (-0.01, 0.32)], 0.05, 0.045), both=False)   # fibula
    pl.shape([(-0.11, 1.99), (-0.05, 2.0), (-0.04, 1.93), (-0.1, 1.9)], both=False)
    pl.shape([(-0.05, 0.46), (0.03, 0.45), (0.04, 0.3), (0.0, 0.23), (-0.05, 0.27)], both=False)                    # lateral malleolus
    foot = [(-0.22, 0.12), (-0.2, 0.2), (-0.08, 0.24), (0.05, 0.31), (0.16, 0.28), (0.3, 0.2), (0.5, 0.12), (0.64, 0.085), (0.75, 0.07),
            (0.86, 0.04), (0.87, 0.01), (0.8, 0.0), (0.64, 0.01), (0.5, 0.02), (0.3, 0.06), (0.15, 0.04), (-0.05, 0.0), (-0.2, 0.01), (-0.23, 0.05)]
    pl.shape(foot, both=False)
    for a, b in (((-0.05, 0.0), (-0.05, 0.22)), ((0.1, 0.3), (0.13, 0.06)), ((0.3, 0.2), (0.3, 0.06)), ((0.64, 0.085), (0.64, 0.01))):
        pl.shape([a, b], closed=False, w=0.7, both=False)                                                           # calcaneus, talus/navicular, cuneiforms, metatarsal heads
    pl.shape([(0.75, 0.07), (0.75, 0.01)], closed=False, w=0.6, both=False)


def arm_side(pl):
    h, f = HUMS, FAS
    pl.circle((-0.01, 6.0), 0.1, both=False)
    pts = [(-0.05, 0.1), (0.1, 0.08), (0.3, 0.06), (0.9, 0.055), (1.05, 0.07), (1.17, 0.08), (1.22, 0.04), (1.21, -0.06), (1.15, -0.08),
           (1.0, -0.06), (0.4, -0.055), (0.1, -0.075), (-0.05, -0.09)]
    pl.shape([h(t, s) for t, s in pts], both=False)
    ulna = [(-0.07, -0.06), (-0.02, -0.1), (0.1, -0.075), (0.5, -0.05), (1.05, -0.035), (1.18, -0.03), (1.2, 0.0), (1.1, 0.0), (0.5, -0.01), (0.1, 0.0), (0.0, 0.02)]
    rad = [(0.02, 0.0), (0.02, 0.07), (0.1, 0.06), (0.5, 0.04), (0.9, 0.055), (1.12, 0.07), (1.19, 0.06), (1.2, -0.02), (1.1, -0.01), (0.5, 0.0), (0.12, 0.01)]
    pl.shape([f(t, s) for t, s in ulna], both=False); pl.shape([f(t, s) for t, s in rad], both=False)
    hand = [(1.2, -0.03), (1.2, 0.07), (1.32, 0.08), (1.6, 0.07), (1.8, 0.07), (1.95, 0.06), (1.98, 0.03), (1.95, 0.0), (1.6, -0.03), (1.32, -0.045)]
    pl.shape([f(t, s) for t, s in hand], fill=BONE['fill'], both=False)
    for t in (1.32, 1.6, 1.74, 1.86):
        pl.shape([f(t, -0.03), f(t, 0.07)], closed=False, w=0.6, both=False)
    pl.shape(band([f(1.28, 0.07), f(1.45, 0.11), f(1.58, 0.12), f(1.66, 0.12)], 0.05, 0.035), both=False)          # thumb, toward the viewer


def skeleton_side(S=100, pad=0.4):
    H = 7.5; W = 3.3
    cv = Canvas(S, (W / 2 - 0.1) * S, pad * S, H)
    pl = Plate(cv)
    spine_side(pl); thorax_side(pl); pelvis_side(pl); leg_side(pl); skull_side(pl); arm_side(pl)
    w, h = W * S, (H + 2 * pad) * S
    return svg(w, h, f'<rect width="{w:.0f}" height="{h:.0f}" fill="#fffcf0"/>' + pl.text(), 'Skeleton, side view')


# ---------- muscles, drawn from their attachments ----------
MUS = dict(fill='#c56b56', fiber='#99463a', line='#7d3a2f', deep='#b0614f', tendon='#efe5d0', tline='#b5a483', fat='#f1d9a8')


def along(line, f):
    """Point at fraction f of the arc length of a polyline."""
    if len(line) == 1: return line[0]
    seg = [math.dist(a, b) for a, b in zip(line, line[1:])]; L = sum(seg) * f
    for (a, b), d in zip(zip(line, line[1:]), seg):
        if L <= d or d == seg[-1] and (a, b) == (line[-2], line[-1]):
            u = 0 if d == 0 else min(L / d, 1); return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
        L -= d
    return line[-1]


def muscle_fibers(o, i, mid=None, belly=0.0, n=14, seg=10, sag=(0, 0), t0=0.0, t1=0.0, tw=None):
    """Fibers from the origin line o to the insertion line i, as smooth curves through: the origin, (a tendon
    junction), the belly, (a tendon junction), the insertion. A fusiform muscle spreads its fibers to `belly` across
    at `mid`; a flat muscle (belly 0) runs them straight, bent by `sag`. t0/t1 put the muscle-tendon junctions that
    far along, narrowed to `tw`. Returns the fibers and the sample index of each junction."""
    O = [along(o, k / n) for k in range(n + 1)]; I = [along(i, k / n) for k in range(n + 1)]
    oc, ic = along(o, 0.5), along(i, 0.5)
    dx, dy = ic[0] - oc[0], ic[1] - oc[1]; L = math.hypot(dx, dy) or 1; ax = (-dy / L, dx / L)
    if mid is None: mid = ((oc[0] + ic[0]) / 2, (oc[1] + ic[1]) / 2)
    mid = (mid[0] + sag[0], mid[1] + sag[1])
    sgn = 1 if ((O[-1][0] - O[0][0]) + (I[-1][0] - I[0][0])) * ax[0] + ((O[-1][1] - O[0][1]) + (I[-1][1] - I[0][1])) * ax[1] >= 0 else -1
    ax = (ax[0] * sgn, ax[1] * sgn)
    span = lambda line: math.dist(line[0], line[-1]) if len(line) > 1 else 0.0
    def junction(c, E, frac, width):
        """Points where the fibers meet the tendon: moved from the attachment E toward the belly, kept in E's order."""
        J = (c[0] + (mid[0] - c[0]) * frac, c[1] + (mid[1] - c[1]) * frac); sp = span(E)
        out = []
        for k in range(n + 1):
            if sp > 1e-6 and not belly:
                Mk = ((O[k][0] + I[k][0]) / 2, (O[k][1] + I[k][1]) / 2); out.append((E[k][0] + (Mk[0] - E[k][0]) * frac, E[k][1] + (Mk[1] - E[k][1]) * frac))
            elif sp > 1e-6:
                g = width / sp; out.append((J[0] + (E[k][0] - c[0]) * g, J[1] + (E[k][1] - c[1]) * g))
            else:
                out.append((J[0] + ax[0] * (k / n - 0.5) * width, J[1] + ax[1] * (k / n - 0.5) * width))
        return out
    J0 = junction(oc, O, min(t0 * 2, 0.85), tw or max(span(o) * 1.3, 0.03)) if t0 else None
    J1 = junction(ic, I, min(t1 * 2, 0.85), tw or max(span(i) * 1.3, 0.03)) if t1 else None
    fibers = []
    for k in range(n + 1):
        if belly:
            u = k / n - 0.5; Mk = (mid[0] + ax[0] * u * belly, mid[1] + ax[1] * u * belly)
        else:
            Mk = ((O[k][0] + I[k][0]) / 2 + sag[0], (O[k][1] + I[k][1]) / 2 + sag[1])
        ctrl = [O[k]] + ([J0[k]] if J0 else []) + [Mk] + ([J1[k]] if J1 else []) + [I[k]]
        P = smooth_pts(ctrl, seg * (len(ctrl) - 1))
        fibers.append(P)
    m = len(fibers[0]) - 1; per = m // (len(ctrl) - 1)
    j0 = per if J0 else 0
    j1 = m - per if J1 else m
    return fibers, j0, j1


def region(fibers, j0, j1):
    first, last = fibers[0][j0:j1 + 1], fibers[-1][j0:j1 + 1]
    return first + [f[j1] for f in fibers[1:-1]] + last[::-1] + [f[j0] for f in fibers[-2:0:-1]]


def draw_muscle(pl, spec, both=True):
    """spec: o, i (attachment lines), mid, belly, sag, t0/t1 (tendon at each end, as a fraction of the length), tw
    (tendon width at the junction), strap (a centreline and widths instead of o/i), deep (a deeper layer), name."""
    if 'strap' in spec:
        line = spec['strap']; w0, w1 = spec.get('w', (0.08, 0.08)); m = 28
        b = band(line, w0, w1, n=m); half = len(b) // 2
        left, right = b[:half], b[half:][::-1]
        fibers = [[(l[0] + (r[0] - l[0]) * k / 6, l[1] + (r[1] - l[1]) * k / 6) for l, r in zip(left, right)] for k in range(7)]
        m = len(left) - 1; j0 = round(spec.get('t0', 0) * m); j1 = round((1 - spec.get('t1', 0)) * m)
    else:
        fibers, j0, j1 = muscle_fibers(spec['o'], spec['i'], spec.get('mid'), spec.get('belly', 0.0), n=spec.get('n', 14),
                                       sag=spec.get('sag', (0, 0)), t0=spec.get('t0', 0), t1=spec.get('t1', 0), tw=spec.get('tw'))
        m = len(fibers[0]) - 1
    fill = MUS['deep'] if spec.get('deep') else MUS['fill']
    attrs = f' data-m="{spec.get("name", "")}"'
    if 'outline' in spec:   # an art-directed silhouette; the fibers from the attachments are clipped to it
        for mf in ((lambda p: p, mirror) if both else (lambda p: p,)):
            ol = mf(spec['outline']); cid = pl.uid(); cv = pl.cv
            pl.o.append(f'<clipPath id="{cid}"><path d="{cv.path(ol)}"/></clipPath>')
            pl.o.append(f'<path d="{cv.path(ol)}" fill="{fill}" stroke="none"{attrs}/>')
            pl.o.append(f'<g clip-path="url(#{cid})">')
            if j1 < m: pl.o.append(f'<path d="{cv.path(mf(region(fibers, j1, m)))}" fill="{MUS["tendon"]}" stroke="{MUS["tline"]}" stroke-width="0.8"/>')
            if j0 > 0: pl.o.append(f'<path d="{cv.path(mf(region(fibers, 0, j0)))}" fill="{MUS["tendon"]}" stroke="{MUS["tline"]}" stroke-width="0.8"/>')
            for fb in fibers[1:-1]:
                pl.o.append(f'<path d="{cv.path(mf(fb[j0:j1 + 1]), closed=False, smooth=False)}" fill="none" stroke="{MUS["fiber"]}" stroke-width="0.45"/>')
            pl.o.append('</g>')
            pl.o.append(f'<path d="{cv.path(ol)}" fill="none" stroke="{MUS["line"]}" stroke-width="1.0"/>')
        return
    if j0 > 0: pl.shape(region(fibers, 0, j0), fill=MUS['tendon'], line=MUS['tline'], w=0.8, both=both, extra=attrs)
    if j1 < m: pl.shape(region(fibers, j1, m), fill=MUS['tendon'], line=MUS['tline'], w=0.8, both=both, extra=attrs)
    if j1 > j0:
        pl.shape(region(fibers, j0, j1), fill=fill, line=MUS['line'], w=1.0, both=both, extra=attrs)
        for f in fibers[1:-1:2]:
            pl.shape(f[j0:j1 + 1], closed=False, line=MUS['fiber'], w=0.45, both=both, smooth=False)
    for f in fibers[1:-1:3]:
        if j1 < m: pl.shape(f[j1:], closed=False, line=MUS['tline'], w=0.4, both=both, smooth=False)
        if j0 > 0: pl.shape(f[:j0 + 1], closed=False, line=MUS['tline'], w=0.4, both=both, smooth=False)


def arm_hand(pl):
    fa = FA
    # hand, palm forward: carpals, metacarpals, phalanges; the thumb on the lateral side
    pl.shape([fa(t, s) for t, s in [(1.19, -0.09), (1.19, 0.12), (1.27, 0.13), (1.33, 0.07), (1.33, -0.08), (1.27, -0.11)]], fill=BONE['shade'])
    mc_base = [-0.065, -0.022, 0.022, 0.065]; mc_head = [-0.085, -0.03, 0.025, 0.078]; mc_len = [0.37, 0.4, 0.42, 0.41]
    fingers = [0.73, 0.93, 1.0, 0.89]; mid = 0.38; ph = [1, 0.63, 0.45]
    for b, h, L, k in zip(mc_base, mc_head, mc_len, fingers):
        p0 = fa(1.32, b); p1 = fa(1.32 + L * 0.66, h)
        pl.shape(band([p0, p1], 0.05, 0.045))
        dirx, diry = p1[0] - p0[0], p1[1] - p0[1]; dl = math.hypot(dirx, diry); u = (dirx / dl, diry / dl)
        pos = (p1[0] + u[0] * 0.012, p1[1] + u[1] * 0.012)
        for j, r in enumerate(ph):
            seg = mid * k * r / sum(ph); nxt = (pos[0] + u[0] * seg, pos[1] + u[1] * seg)
            pl.shape(band([pos, nxt], 0.044 - 0.005 * j, 0.038 - 0.006 * j))
            pos = (nxt[0] + u[0] * 0.01, nxt[1] + u[1] * 0.01)
    t0 = fa(1.3, 0.13); t1 = fa(1.46, 0.21); t2 = fa(1.58, 0.245); t3 = fa(1.67, 0.265)
    pl.shape(band([t0, t1], 0.055, 0.048)); pl.shape(band([t1, t2], 0.048, 0.042)); pl.shape(band([t2, t3], 0.042, 0.034))


def skeleton_front(S=100, pad=0.4):
    H = 7.5; W = 3.3
    cv = Canvas(S, (W / 2) * S, pad * S, H)
    pl = Plate(cv)
    pl.group('skel')
    thorax_front(pl); shoulder_front(pl)
    spine_front(pl); pelvis_front(pl)
    femur_front(pl); leg_front(pl)
    arm_front(pl)
    skull_front(pl)
    pl.end()
    w, h = W * S, (H + 2 * pad) * S
    body = f'<rect width="{w:.0f}" height="{h:.0f}" fill="#fffcf0"/><style>.far{{opacity:.55}}</style>' + pl.text()
    return svg(w, h, body, 'Skeleton, front view, anatomical position')



def muscles_back():
    """The superficial muscles seen from behind, deep to superficial, right side (mirrored)."""
    h, f = HUM, FA
    M = []
    # deep layer that shows through: erector spinae under the thoracolumbar fascia, rhomboids, splenius
    M.append(dict(name='erector spinae', o=[(0.03, 3.75), (0.17, 4.05)], i=[(0.04, 5.6), (0.2, 5.5)], mid=(0.11, 4.6), belly=0.2, deep=True, n=8))
    M.append(dict(name='splenius capitis', o=[(0.02, 6.3), (0.03, 6.6)], i=[(0.2, 6.85), (0.27, 6.8)], deep=True, n=6))
    M.append(dict(name='levator scapulae', o=[(0.08, 6.7), (0.1, 6.55)], i=[(0.31, 6.05), (0.33, 6.1)], deep=True, n=5))
    M.append(dict(name='rhomboids', o=[(0.02, 6.3), (0.02, 5.7)], i=[(0.31, 6.0), (0.4, 5.35)], deep=True, n=8))
    M.append(dict(name='serratus posterior and ribs', o=[(0.55, 5.3), (0.6, 5.0)], i=[(0.63, 5.25), (0.64, 5.0)], deep=True, n=4))
    # shoulder blade muscles
    M.append(dict(name='supraspinatus', o=[(0.33, 6.06), (0.36, 5.95)], i=[h(-0.03, 0.08), h(0.0, 0.1)], deep=True, n=6))
    M.append(dict(name='infraspinatus', o=[(0.32, 5.84), (0.36, 5.55), (0.42, 5.38)], i=[h(0.03, 0.09), h(0.07, 0.1)], mid=(0.52, 5.7), belly=0.32, t1=0.12, n=12))
    M.append(dict(name='teres minor', o=[(0.6, 5.62), (0.66, 5.76)], i=[h(0.09, 0.09), h(0.12, 0.08)], mid=(0.66, 5.62), belly=0.08, n=5))
    M.append(dict(name='teres major', o=[(0.41, 5.32), (0.5, 5.4)], i=[h(0.18, -0.06), h(0.24, -0.05)], mid=(0.6, 5.48), belly=0.14, n=8))
    # big sheets
    M.append(dict(name='latissimus dorsi', o=[(0.02, 5.45), (0.02, 4.9), (0.04, 4.35), (0.2, 4.3), (0.4, 4.38), (0.56, 4.37)],
                  i=[h(0.12, -0.05), h(0.15, -0.04), h(0.2, -0.04), h(0.24, -0.03)], sag=(0.0, -0.06), t0=0.22, n=18))
    M.append(dict(name='external oblique', o=[(0.6, 5.0), (0.62, 4.8)], i=[(0.55, 4.38), (0.6, 4.33)], n=5))
    M.append(dict(name='trapezius', o=[(0.0, 6.84), (0.0, 6.55), (0.0, 6.3), (0.0, 5.9), (0.0, 5.4), (0.0, 4.98)],
                  i=[(0.55, 6.24), (0.8, 6.24), (0.72, 6.08), (0.52, 5.97), (0.36, 5.9), (0.31, 5.82)], sag=(0.02, 0), n=22, t0=0.04))
    M.append(dict(name='deltoid', o=[(0.38, 5.92), (0.6, 6.02), (0.78, 6.14), (0.88, 6.24), (0.92, 6.2)], i=[h(0.43, 0.02), h(0.48, 0.07)], mid=(0.8, 5.83), belly=0.38, n=16))
    # arm: triceps, then the forearm extensors (palm forward, so the back of the forearm faces the viewer)
    M.append(dict(name='triceps (lateral head)', o=[h(0.12, 0.08), h(0.4, 0.07)], i=[h(1.0, 0.0), h(1.05, 0.04)], mid=h(0.62, 0.09), belly=0.14, t1=0.25, n=8))
    M.append(dict(name='triceps (long head)', o=[(0.68, 5.9), (0.7, 5.86)], i=[h(1.0, -0.04), h(1.05, 0.0)], mid=h(0.6, -0.08), belly=0.2, t0=0.08, t1=0.3, n=10))
    M.append(dict(name='triceps tendon', strap=[h(0.82, -0.01), h(1.08, -0.02), f(-0.02, -0.06)], w=(0.11, 0.06), t0=1.0))
    M.append(dict(name='anconeus', o=[h(1.12, 0.08), h(1.15, 0.1)], i=[f(0.2, -0.06), f(0.28, -0.05)], deep=False, n=5))
    M.append(dict(name='brachioradialis', o=[h(0.8, 0.07), h(1.0, 0.1)], i=[f(1.1, 0.11), f(1.13, 0.13)], mid=f(0.27, 0.16), belly=0.15, t1=0.45, n=8))
    M.append(dict(name='extensor carpi radialis longus and brevis', o=[h(1.0, 0.1), h(1.13, 0.11)], i=[f(1.22, 0.1), f(1.24, 0.06)], mid=f(0.35, 0.11), belly=0.13, t1=0.45, n=8))
    M.append(dict(name='extensor digitorum', o=[h(1.14, 0.1), h(1.16, 0.12)], i=[f(1.2, -0.03), f(1.22, 0.05)], mid=f(0.42, 0.02), belly=0.13, t1=0.42, n=10))
    M.append(dict(name='extensor carpi ulnaris', o=[h(1.15, 0.1), f(0.3, -0.08)], i=[f(1.22, -0.07), f(1.23, -0.05)], mid=f(0.5, -0.06), belly=0.09, t1=0.35, n=6))
    M.append(dict(name='flexor carpi ulnaris', o=[f(0.05, -0.1), f(0.4, -0.1)], i=[f(1.17, -0.09), f(1.19, -0.08)], mid=f(0.45, -0.12), belly=0.06, t1=0.3, n=5))
    M.append(dict(name='abductor pollicis longus and extensor pollicis brevis', o=[f(0.55, 0.04), f(0.65, 0.0)], i=[f(1.25, 0.15), f(1.28, 0.16)], mid=f(0.85, 0.1), belly=0.09, t1=0.3, n=6))
    M.append(dict(name='first dorsal interosseous', o=[f(1.3, 0.06), f(1.35, 0.1)], i=[f(1.55, 0.09), f(1.58, 0.11)], mid=f(1.45, 0.14), belly=0.07, n=5))
    # hip and thigh
    M.append(dict(name='gluteus medius', o=[(0.3, 4.38), (0.45, 4.42), (0.58, 4.34)], i=[(0.53, 3.9), (0.58, 3.85)], mid=(0.5, 4.15), belly=0.25, n=10))
    M.append(dict(name='adductor magnus', o=[(0.08, 3.48), (0.22, 3.43)], i=[(0.18, 2.45), (0.3, 2.7)], mid=(0.17, 3.0), belly=0.16, deep=True, n=8))
    M.append(dict(name='gracilis', strap=[(0.05, 3.5), (0.065, 3.0), (0.09, 2.45), (0.12, 2.1), (0.15, 1.88)], w=(0.09, 0.03), t1=0.3))
    M.append(dict(name='vastus lateralis', o=[(0.57, 3.7), (0.53, 3.2)], i=[(0.42, 2.3), (0.44, 2.2)], mid=(0.57, 2.85), belly=0.13, deep=True, n=8))
    M.append(dict(name='semimembranosus', o=[(0.2, 3.44), (0.24, 3.42)], i=[(0.11, 2.0), (0.14, 1.97)], mid=(0.15, 2.55), belly=0.16, t0=0.2, t1=0.15, deep=True, n=8))
    M.append(dict(name='semitendinosus', o=[(0.22, 3.43), (0.26, 3.42)], i=[(0.13, 1.92), (0.15, 1.88)], mid=(0.22, 2.85), belly=0.13, t1=0.38, n=8))
    M.append(dict(name='biceps femoris', o=[(0.27, 3.43), (0.3, 3.44), (0.38, 3.0)], i=[(0.43, 1.97), (0.46, 1.95)], mid=(0.38, 2.75), belly=0.17, t1=0.18, n=10))
    M.append(dict(name='iliotibial band', strap=[(0.6, 3.75), (0.6, 3.0), (0.52, 2.4), (0.45, 2.02)], w=(0.07, 0.05), t0=1.0))
    M.append(dict(name='gluteus maximus', o=[(0.14, 4.18), (0.1, 4.0), (0.05, 3.8), (0.02, 3.62), (0.04, 3.52)],
                  i=[(0.6, 3.8), (0.59, 3.68), (0.56, 3.55), (0.5, 3.42), (0.45, 3.35)], mid=(0.32, 3.68), belly=0.34, sag=(0.0, -0.03), n=18))
    # leg
    M.append(dict(name='soleus', o=[(0.15, 1.8), (0.42, 1.88)], i=[(0.2, 0.7), (0.3, 0.7)], mid=(0.27, 1.25), belly=0.4, deep=True, n=10))
    M.append(dict(name='peroneus longus', o=[(0.45, 1.95), (0.46, 1.8)], i=[(0.38, 0.45), (0.4, 0.42)], mid=(0.49, 1.4), belly=0.07, t1=0.45, deep=True, n=5))
    M.append(dict(name='gastrocnemius (lateral head)', o=[(0.34, 2.2), (0.4, 2.18)], i=[(0.25, 1.1), (0.28, 1.15)], mid=(0.39, 1.65), belly=0.15, n=8))
    M.append(dict(name='gastrocnemius (medial head)', o=[(0.12, 2.18), (0.18, 2.2)], i=[(0.22, 1.0), (0.25, 1.05)], mid=(0.1, 1.55), belly=0.18, n=8))
    M.append(dict(name='calcaneal (Achilles) tendon', strap=[(0.245, 1.1), (0.245, 0.6), (0.24, 0.15)], w=(0.12, 0.075), t0=1.0))
    return M


def muscles_back_plate(S=100, pad=0.4):
    H = 7.5; W = 3.3
    cv = Canvas(S, (W / 2) * S, pad * S, H)
    pl = Plate(cv)
    thorax_back(pl); spine_back(pl); scapula_back(pl); pelvis_back(pl); legs_back(pl); arm_back(pl); skull_back(pl)
    for spec in muscles_back():
        draw_muscle(pl, spec)
    w, h = W * S, (H + 2 * pad) * S
    return svg(w, h, f'<rect width="{w:.0f}" height="{h:.0f}" fill="#fffcf0"/>' + pl.text(), 'Superficial muscles, back view')



def muscles_side():
    """The superficial muscles of the right side, deep to superficial. The bulky ones carry an outline, the profile
    they give the body from the side; fibers still run from their real attachments."""
    h, f = HUMS, FAS
    M = []
    # neck
    M.append(dict(name='scalenes', o=[(0.0, 6.7), (0.02, 6.55)], i=[(0.05, 6.17), (0.1, 6.16)], deep=True, n=5))
    M.append(dict(name='splenius capitis and levator scapulae', o=[(-0.12, 6.35), (-0.06, 6.6)], i=[(-0.1, 6.84), (-0.04, 6.8)], deep=True, n=5))
    M.append(dict(name='trapezius', o=[(-0.33, 6.88), (-0.22, 6.6), (-0.2, 6.32), (-0.3, 6.05)], i=[(0.08, 6.26), (0.0, 6.27), (-0.1, 6.22), (-0.22, 6.12)], n=12,
                  outline=[(-0.34, 6.9), (-0.26, 6.86), (-0.15, 6.62), (-0.04, 6.42), (0.06, 6.3), (0.09, 6.25), (-0.05, 6.2), (-0.25, 6.08), (-0.34, 6.05), (-0.31, 6.4), (-0.3, 6.7)]))
    M.append(dict(name='sternocleidomastoid', o=[(-0.07, 6.8), (-0.02, 6.83)], i=[(0.28, 6.22), (0.18, 6.23)], mid=(0.12, 6.52), belly=0.12, t1=0.1, n=10))
    # trunk
    M.append(dict(name='erector spinae', o=[(-0.27, 4.0), (-0.12, 4.1)], i=[(-0.36, 5.4), (-0.22, 5.4)], mid=(-0.32, 4.6), belly=0.14, deep=True, n=6))
    M.append(dict(name='rectus abdominis', o=[(0.33, 3.62), (0.37, 3.62)], i=[(0.43, 5.38), (0.51, 5.32)], n=6,
                  outline=[(0.42, 5.38), (0.52, 5.3), (0.51, 4.9), (0.48, 4.5), (0.44, 4.0), (0.37, 3.62), (0.33, 3.64), (0.4, 4.0), (0.43, 4.5), (0.45, 4.9)]))
    M.append(dict(name='serratus anterior', o=[(0.2, 5.55), (0.24, 5.2), (0.15, 4.97)], i=[(-0.1, 5.75), (-0.12, 5.6), (-0.14, 5.45)], n=12))
    M.append(dict(name='external oblique', o=[(0.15, 5.3), (-0.1, 4.85)], i=[(0.47, 4.8), (0.15, 4.36)], n=12,
                  outline=[(0.15, 5.32), (0.33, 5.27), (0.46, 5.02), (0.48, 4.65), (0.43, 4.4), (0.3, 4.33), (0.1, 4.37), (-0.02, 4.45), (-0.1, 4.8), (0.0, 5.1)]))
    M.append(dict(name='latissimus dorsi', o=[(-0.44, 5.3), (-0.4, 4.6), (-0.1, 4.4)], i=[(-0.09, 5.74), (-0.05, 5.7)], n=14,
                  outline=[(-0.36, 5.48), (-0.45, 5.2), (-0.44, 4.8), (-0.37, 4.46), (-0.15, 4.4), (-0.01, 4.45), (-0.05, 4.9), (-0.06, 5.4), (-0.05, 5.74), (-0.2, 5.68)]))
    M.append(dict(name='pectoralis major', o=[(0.32, 6.2), (0.5, 5.45)], i=[(0.05, 5.85), (0.05, 5.7)], n=12,
                  outline=[(0.3, 6.21), (0.41, 6.1), (0.51, 5.86), (0.56, 5.6), (0.53, 5.4), (0.41, 5.35), (0.21, 5.45), (0.06, 5.66), (0.05, 5.86), (0.15, 6.02)]))
    # hip and thigh
    M.append(dict(name='gluteus medius', o=[(-0.2, 4.32), (0.0, 4.42), (0.2, 4.33)], i=[(-0.05, 3.88), (0.0, 3.87), (0.05, 3.88)], n=10,
                  outline=[(-0.22, 4.3), (-0.05, 4.43), (0.15, 4.38), (0.25, 4.25), (0.15, 4.0), (0.03, 3.88), (-0.1, 3.95), (-0.25, 4.1)]))
    M.append(dict(name='semitendinosus and semimembranosus', o=[(-0.3, 3.35), (-0.2, 3.4)], i=[(-0.27, 2.25), (-0.2, 2.2)], deep=True, n=6,
                  outline=[(-0.28, 3.35), (-0.39, 3.05), (-0.4, 2.65), (-0.32, 2.28), (-0.24, 2.25), (-0.3, 2.65), (-0.33, 3.0)]))
    M.append(dict(name='rectus femoris', o=[(0.27, 4.02), (0.29, 4.0)], i=[(0.16, 2.33), (0.21, 2.32)], t0=0.06, t1=0.12, n=8,
                  outline=[(0.27, 4.02), (0.32, 3.6), (0.35, 3.1), (0.33, 2.7), (0.26, 2.42), (0.2, 2.33), (0.22, 2.6), (0.24, 3.0), (0.25, 3.5)]))
    M.append(dict(name='vastus lateralis', o=[(-0.12, 3.7), (0.12, 3.75)], i=[(0.0, 2.25), (0.17, 2.28)], n=16,
                  outline=[(-0.03, 3.78), (0.1, 3.75), (0.2, 3.5), (0.27, 3.15), (0.27, 2.8), (0.23, 2.5), (0.17, 2.3), (0.1, 2.25), (0.0, 2.3), (-0.12, 2.5), (-0.2, 2.85), (-0.2, 3.2), (-0.13, 3.55)]))
    M.append(dict(name='biceps femoris', o=[(-0.27, 3.38), (-0.15, 3.42)], i=[(-0.12, 1.98), (-0.08, 1.96)], t1=0.12, n=10,
                  outline=[(-0.16, 3.43), (-0.3, 3.3), (-0.38, 3.0), (-0.36, 2.6), (-0.28, 2.3), (-0.17, 2.1), (-0.09, 1.96), (-0.12, 2.2), (-0.19, 2.5), (-0.21, 2.9), (-0.18, 3.2)]))
    M.append(dict(name='tensor fasciae latae', o=[(0.28, 4.18), (0.35, 4.16)], i=[(0.18, 3.58), (0.14, 3.58)], n=6,
                  outline=[(0.28, 4.2), (0.35, 4.15), (0.36, 4.0), (0.3, 3.76), (0.22, 3.58), (0.15, 3.6), (0.2, 3.85), (0.24, 4.05)]))
    M.append(dict(name='iliotibial band', strap=[(0.15, 3.6), (0.06, 3.0), (0.01, 2.5), (0.03, 2.02)], w=(0.1, 0.06), t0=1.0))
    M.append(dict(name='gluteus maximus', o=[(-0.3, 4.12), (-0.4, 3.9), (-0.43, 3.6), (-0.35, 3.38)], i=[(0.05, 3.8), (0.05, 3.65), (0.0, 3.5), (-0.05, 3.34)], n=16,
                  outline=[(-0.3, 4.12), (-0.4, 3.96), (-0.46, 3.76), (-0.47, 3.6), (-0.42, 3.45), (-0.3, 3.36), (-0.12, 3.35), (-0.03, 3.42), (0.03, 3.6), (0.03, 3.76), (-0.05, 3.9), (-0.18, 4.05)]))
    M.append(dict(name='patellar ligament', strap=[(0.17, 2.11), (0.14, 1.9)], w=(0.06, 0.05), t0=1.0))
    # leg
    M.append(dict(name='soleus', o=[(-0.1, 1.85), (-0.03, 1.7)], i=[(-0.16, 0.72), (-0.11, 0.7)], deep=True, n=8,
                  outline=[(-0.08, 1.86), (-0.13, 1.5), (-0.25, 1.2), (-0.23, 0.86), (-0.17, 0.7), (-0.1, 0.74), (-0.05, 1.1), (-0.02, 1.5)]))
    M.append(dict(name='gastrocnemius (lateral head)', o=[(-0.14, 2.2), (-0.06, 2.16)], i=[(-0.21, 1.05), (-0.14, 1.05)], n=10,
                  outline=[(-0.12, 2.21), (-0.24, 2.0), (-0.33, 1.7), (-0.32, 1.45), (-0.25, 1.2), (-0.19, 1.04), (-0.13, 1.08), (-0.1, 1.4), (-0.06, 1.8), (-0.06, 2.1)]))
    M.append(dict(name='peroneus longus and brevis', o=[(-0.08, 1.95), (-0.03, 1.92)], i=[(-0.05, 0.42), (-0.02, 0.4)], t1=0.4, n=6,
                  outline=[(-0.08, 1.96), (-0.03, 1.9), (0.02, 1.5), (0.02, 1.0), (-0.01, 0.62), (-0.05, 0.62), (-0.07, 1.0), (-0.09, 1.5)]))
    M.append(dict(name='extensor digitorum longus', o=[(0.05, 1.93), (0.09, 1.9)], i=[(0.3, 0.2), (0.4, 0.15)], t1=0.5, n=6))
    M.append(dict(name='tibialis anterior', o=[(0.1, 1.9), (0.15, 1.88)], i=[(0.18, 0.3), (0.2, 0.28)], t1=0.42, n=6, mid=(0.15, 1.45), belly=0.08))
    M.append(dict(name='calcaneal (Achilles) tendon', strap=[(-0.17, 1.05), (-0.17, 0.6), (-0.19, 0.16)], w=(0.1, 0.07), t0=1.0))
    M.append(dict(name='extensor digitorum brevis', o=[(0.08, 0.2), (0.12, 0.18)], i=[(0.4, 0.12), (0.45, 0.1)], mid=(0.22, 0.17), belly=0.06, n=4))
    # arm, from the side (palm forward): deltoid over the shoulder, triceps behind, biceps in front, extensors behind the forearm
    M.append(dict(name='brachialis', o=[(0.0, 5.3), (0.08, 5.25)], i=[(-0.02, 4.68), (0.03, 4.66)], deep=True, n=6,
                  outline=[(0.0, 5.35), (0.08, 5.2), (0.1, 4.95), (0.06, 4.7), (-0.01, 4.66), (-0.04, 4.9), (-0.04, 5.2)]))
    M.append(dict(name='triceps', o=[(-0.14, 5.88), (-0.05, 5.8)], i=[(-0.14, 4.75), (-0.1, 4.72)], t1=0.22, n=8,
                  outline=[(-0.13, 5.88), (-0.21, 5.5), (-0.22, 5.1), (-0.18, 4.85), (-0.13, 4.72), (-0.09, 4.8), (-0.08, 5.2), (-0.06, 5.6)]))
    M.append(dict(name='biceps brachii', o=[(0.03, 5.65), (0.07, 5.6)], i=[(0.0, 4.72), (0.04, 4.7)], t1=0.15, n=8,
                  outline=[(0.04, 5.62), (0.11, 5.32), (0.12, 5.02), (0.08, 4.82), (0.03, 4.72), (0.01, 5.0), (0.02, 5.3)]))
    M.append(dict(name='deltoid', o=[(0.13, 6.25), (-0.23, 6.12)], i=[(-0.06, 5.45), (-0.02, 5.45)], n=14,
                  outline=[(0.12, 6.26), (0.0, 6.31), (-0.15, 6.21), (-0.24, 6.1), (-0.2, 5.9), (-0.12, 5.65), (-0.07, 5.44), (-0.02, 5.45), (0.07, 5.65), (0.13, 5.9), (0.16, 6.1)]))
    M.append(dict(name='forearm flexors', o=[(0.0, 4.72), (0.06, 4.66)], i=[(0.02, 3.62), (0.04, 3.62)], t1=0.4, deep=True, n=6,
                  outline=[(0.03, 4.72), (0.1, 4.55), (0.12, 4.3), (0.09, 4.0), (0.05, 3.75), (0.03, 3.6), (0.0, 3.75), (0.0, 4.3)]))
    M.append(dict(name='forearm extensors (extensor digitorum, extensor carpi ulnaris)', o=[(-0.12, 4.75), (-0.06, 4.7)], i=[(-0.06, 3.62), (-0.03, 3.6)], t1=0.38, n=8,
                  outline=[(-0.1, 4.76), (-0.18, 4.55), (-0.17, 4.2), (-0.11, 3.85), (-0.06, 3.62), (-0.03, 3.75), (-0.06, 4.2), (-0.07, 4.6)]))
    M.append(dict(name='brachioradialis and extensor carpi radialis', o=[(-0.04, 5.05), (0.02, 5.0)], i=[(-0.01, 3.62), (0.02, 3.62)], t1=0.42, n=8,
                  outline=[(-0.02, 5.05), (0.05, 4.78), (0.06, 4.4), (0.03, 4.05), (0.01, 3.75), (-0.03, 3.75), (-0.05, 4.2), (-0.05, 4.6)]))
    M.append(dict(name='abductor pollicis longus', o=[(-0.05, 4.1), (-0.03, 4.0)], i=[(0.04, 3.55), (0.06, 3.53)], mid=(0.0, 3.8), belly=0.05, t1=0.3, n=5))
    return M


def muscles_side_plate(S=100, pad=0.4):
    H = 7.5; W = 3.3
    cv = Canvas(S, (W / 2 - 0.1) * S, pad * S, H)
    pl = Plate(cv)
    spine_side(pl); thorax_side(pl); pelvis_side(pl); leg_side(pl); skull_side(pl)
    allm = muscles_side(); k = next(i for i, m in enumerate(allm) if m['name'] == 'brachialis')
    arm_specs = allm[k:]
    for spec in allm[:k]:
        draw_muscle(pl, spec, both=False)
    arm_side(pl)
    for spec in arm_specs:
        draw_muscle(pl, spec, both=False)
    w, h = W * S, (H + 2 * pad) * S
    return svg(w, h, f'<rect width="{w:.0f}" height="{h:.0f}" fill="#fffcf0"/>' + pl.text(), 'Superficial muscles, side view')


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {'anatomy-skeleton-front.svg': skeleton_front(), 'anatomy-muscles-front.svg': muscles_front_plate(), 'anatomy-skeleton-back.svg': skeleton_back(), 'anatomy-muscles-back.svg': muscles_back_plate(), 'anatomy-skeleton-side.svg': skeleton_side(), 'anatomy-muscles-side.svg': muscles_side_plate()}
    for name, text in files.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            fh.write(text)
        print(name, len(text) // 1024, 'KB')



def muscles_front():
    """The superficial muscles seen from the front, deep to superficial, right side (mirrored)."""
    h, f = HUM, FA
    M = []
    # neck
    M.append(dict(name='sternohyoid', strap=[(0.025, 6.56), (0.03, 6.4), (0.035, 6.24)], w=(0.04, 0.045), deep=True))
    M.append(dict(name='trapezius', o=[(0.1, 6.7), (0.14, 6.42)], i=[(0.55, 6.245), (0.8, 6.27)], sag=(0.02, 0.03), n=10))
    M.append(dict(name='sternocleidomastoid', o=[(0.24, 6.84), (0.29, 6.79)], i=[(0.045, 6.24), (0.2, 6.215)], mid=(0.17, 6.5), belly=0.12, t1=0.12, n=12))
    # trunk
    M.append(dict(name='serratus anterior', o=[(0.6, 5.62), (0.62, 5.5)], i=[(0.69, 5.66), (0.7, 5.6)], deep=True, n=6))
    for k, y in enumerate((5.45, 5.3, 5.16, 5.03)):
        M.append(dict(name='serratus anterior', o=[(0.57 + 0.01 * k, y + 0.02), (0.6 + 0.01 * k, y - 0.04)], i=[(0.69, y + 0.13), (0.7, y + 0.08)], n=6))
    M.append(dict(name='latissimus dorsi', o=[(0.6, 4.85), (0.64, 5.05), (0.68, 5.4)], i=[(0.69, 5.86), (0.73, 5.9), (0.75, 5.95)], sag=(0.02, 0), n=8))
    M.append(dict(name='rectus abdominis', o=[(0.012, 3.64), (0.1, 3.645)], i=[(0.03, 5.37), (0.23, 5.33)], mid=(0.135, 4.55), belly=0.25, n=10))
    M.append(dict(name='external oblique', o=[(0.6, 5.5), (0.63, 5.25), (0.62, 5.0), (0.6, 4.85), (0.58, 4.75)],
                  i=[(0.235, 5.3), (0.25, 4.95), (0.27, 4.6), (0.33, 4.3), (0.5, 4.16)], sag=(0.01, -0.02), t1=0.4))
    M.append(dict(name='pectoralis major', o=[(0.5, 6.235), (0.1, 6.21), (0.075, 6.0), (0.08, 5.6), (0.09, 5.42), (0.22, 5.3), (0.34, 5.32)],
                  i=[h(0.07, 0.07), h(0.14, 0.065), h(0.22, 0.06), h(0.3, 0.06)], sag=(0.0, -0.035), t1=0.06, n=18))
    # shoulder and arm
    M.append(dict(name='coracobrachialis', o=[(0.69, 6.05), (0.7, 6.03)], i=[h(0.5, -0.06), h(0.6, -0.055)], mid=h(0.3, -0.1), belly=0.07, deep=True, n=6))
    M.append(dict(name='triceps (long and medial heads)', o=[h(0.15, -0.09), h(0.25, -0.12)], i=[h(1.12, -0.06), h(1.18, -0.02)], mid=h(0.62, -0.17), belly=0.16, deep=True, n=8))
    M.append(dict(name='brachialis', o=[h(0.5, -0.06), h(0.55, 0.07)], i=[f(0.08, -0.07), f(0.12, -0.03)], mid=h(0.92, 0.0), belly=0.34, deep=True, n=10))
    M.append(dict(name='biceps brachii', o=[(0.69, 6.04), h(0.02, 0.03)], i=[f(0.14, 0.0), f(0.18, 0.04)], mid=h(0.66, -0.01), belly=0.29, t0=0.12, t1=0.2, n=12))
    M.append(dict(name='deltoid', o=[(0.55, 6.23), (0.7, 6.255), (0.84, 6.275), (0.9, 6.23)], i=[h(0.43, 0.02), h(0.48, 0.07)], mid=(0.835, 5.88), belly=0.33, n=16))
    # forearm, supinated: flexors from the medial epicondyle, the mobile wad laterally
    me = [h(1.13, -0.15), h(1.18, -0.12)]
    M.append(dict(name='flexor digitorum superficialis', o=[f(0.15, -0.05), f(0.25, 0.05)], i=[f(1.08, -0.06), f(1.1, 0.05)], mid=f(0.45, -0.03), belly=0.26, t1=0.35, deep=True, n=10))
    M.append(dict(name='extensor carpi radialis longus', o=[h(0.98, 0.1), h(1.08, 0.11)], i=[f(0.75, 0.12), f(0.8, 0.12)], mid=f(0.28, 0.17), belly=0.1, t1=0.45, deep=True, n=6))
    M.append(dict(name='flexor carpi ulnaris', o=me, i=[f(1.17, -0.08), f(1.19, -0.07)], mid=f(0.38, -0.12), belly=0.13, t1=0.3, n=8))
    M.append(dict(name='palmaris longus', o=me, i=[f(1.2, -0.01), f(1.22, 0.01)], mid=f(0.33, -0.05), belly=0.08, t1=0.55, n=6))
    M.append(dict(name='flexor carpi radialis', o=me, i=[f(1.2, 0.04), f(1.22, 0.06)], mid=f(0.36, 0.0), belly=0.11, t1=0.5, n=8))
    M.append(dict(name='pronator teres', o=me, i=[f(0.5, 0.08), f(0.56, 0.1)], mid=f(0.24, 0.04), belly=0.13, n=8))
    M.append(dict(name='brachioradialis', o=[h(0.8, 0.07), h(1.0, 0.1)], i=[f(1.1, 0.11), f(1.13, 0.13)], mid=f(0.27, 0.16), belly=0.17, t1=0.45, n=10))
    # hand: thenar and hypothenar eminences, palmar aponeurosis
    M.append(dict(name='thenar eminence', o=[f(1.22, 0.06), f(1.24, 0.12)], i=[f(1.44, 0.15), f(1.5, 0.19)], mid=f(1.35, 0.13), belly=0.1, n=8))
    M.append(dict(name='hypothenar eminence', o=[f(1.22, -0.08), f(1.24, -0.04)], i=[f(1.6, -0.08), f(1.62, -0.05)], mid=f(1.42, -0.08), belly=0.07, n=6))
    M.append(dict(name='palmar aponeurosis', o=[f(1.22, -0.01), f(1.22, 0.01)], i=[f(1.6, -0.06), f(1.63, 0.07)], t1=1.0, n=8))
    # hip and thigh
    M.append(dict(name='gluteus medius', o=[(0.56, 4.38), (0.6, 4.3)], i=[(0.56, 3.88), (0.58, 3.82)], mid=(0.61, 4.08), belly=0.08, deep=True, n=6))
    M.append(dict(name='iliopsoas', o=[(0.27, 3.92), (0.42, 4.0)], i=[(0.37, 3.55), (0.39, 3.58)], mid=(0.36, 3.72), belly=0.12, deep=True, n=8))
    M.append(dict(name='pectineus', o=[(0.13, 3.64), (0.25, 3.71)], i=[(0.36, 3.42), (0.38, 3.5)], deep=True, n=6))
    M.append(dict(name='adductor magnus', o=[(0.08, 3.5), (0.12, 3.47)], i=[(0.14, 2.45), (0.2, 2.6)], mid=(0.13, 3.0), belly=0.12, deep=True, n=6))
    M.append(dict(name='adductor longus', o=[(0.07, 3.6), (0.11, 3.63)], i=[(0.31, 2.95), (0.34, 3.12)], mid=(0.17, 3.3), belly=0.13, t0=0.08, n=8))
    M.append(dict(name='gracilis', strap=[(0.05, 3.51), (0.075, 3.0), (0.1, 2.45), (0.13, 2.1), (0.15, 1.88)], w=(0.09, 0.03), t1=0.3))
    M.append(dict(name='vastus lateralis', o=[(0.57, 3.75), (0.53, 3.25)], i=[(0.36, 2.37), (0.42, 2.3)], mid=(0.52, 2.9), belly=0.24, t1=0.12, n=12))
    M.append(dict(name='vastus medialis', o=[(0.38, 3.35), (0.27, 2.9)], i=[(0.18, 2.29), (0.21, 2.36)], mid=(0.17, 2.55), belly=0.18, n=10))
    M.append(dict(name='rectus femoris', o=[(0.47, 4.0), (0.49, 3.97)], i=[(0.21, 2.35), (0.33, 2.35)], mid=(0.38, 3.05), belly=0.2, t0=0.08, t1=0.18, n=12))
    M.append(dict(name='tensor fasciae latae', o=[(0.53, 4.16), (0.59, 4.27)], i=[(0.6, 3.6), (0.56, 3.55)], mid=(0.6, 3.88), belly=0.12, n=8))
    M.append(dict(name='iliotibial band', strap=[(0.6, 3.6), (0.585, 3.0), (0.5, 2.4), (0.44, 2.02)], w=(0.06, 0.045), t0=1.0))
    M.append(dict(name='sartorius', strap=[(0.53, 4.15), (0.47, 3.75), (0.33, 3.2), (0.19, 2.6), (0.13, 2.25), (0.12, 2.0), (0.15, 1.85)], w=(0.075, 0.05), t1=0.12))
    M.append(dict(name='patellar ligament', strap=[(0.27, 2.11), (0.27, 1.88)], w=(0.11, 0.09), t0=1.0))
    # leg
    M.append(dict(name='soleus', o=[(0.12, 1.65), (0.15, 1.3)], i=[(0.17, 0.7), (0.19, 0.65)], mid=(0.1, 1.1), belly=0.1, deep=True, n=6))
    M.append(dict(name='gastrocnemius (medial head)', o=[(0.1, 2.05), (0.14, 2.08)], i=[(0.15, 1.1), (0.17, 1.05)], mid=(0.085, 1.6), belly=0.12, n=8))
    M.append(dict(name='peroneus longus', o=[(0.45, 1.97), (0.465, 1.85)], i=[(0.38, 0.45), (0.4, 0.42)], mid=(0.5, 1.5), belly=0.09, t1=0.45, n=6))
    M.append(dict(name='extensor digitorum longus', o=[(0.42, 1.95), (0.44, 1.6)], i=[(0.3, 0.3), (0.36, 0.3)], mid=(0.45, 1.35), belly=0.08, t1=0.5, n=8))
    M.append(dict(name='tibialis anterior', o=[(0.32, 1.9), (0.37, 1.85)], i=[(0.2, 0.2), (0.22, 0.2)], mid=(0.375, 1.5), belly=0.18, t1=0.45, n=10))
    return M


def muscles_front_plate(S=100, pad=0.4):
    H = 7.5; W = 3.3
    cv = Canvas(S, (W / 2) * S, pad * S, H)
    pl = Plate(cv)
    thorax_front(pl); shoulder_front(pl); spine_front(pl); pelvis_front(pl); femur_front(pl); leg_front(pl); arm_front(pl); skull_front(pl)
    for spec in muscles_front():
        draw_muscle(pl, spec)
        if spec['name'] == 'rectus abdominis':
            for y in (5.12, 4.83, 4.53):
                pl.shape([(0.015, y + 0.01), (0.13, y - 0.01), (0.25, y + 0.015)], closed=False, line=MUS['tendon'], w=2.6)
            pl.shape([(0, 5.36), (0, 3.64)], closed=False, line=MUS['tendon'], w=3, both=False)
    w, h = W * S, (H + 2 * pad) * S
    return svg(w, h, f'<rect width="{w:.0f}" height="{h:.0f}" fill="#fffcf0"/><style>.far{{opacity:.55}}</style>' + pl.text(), 'Superficial muscles, front view')


if __name__ == '__main__':
    main()
