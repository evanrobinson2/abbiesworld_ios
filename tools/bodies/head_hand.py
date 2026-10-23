"""Head and hand reference sheets for AW-STUDY-0016, drawn from the "head" and "hand" sections of human-canon.json.

python head_hand.py  -> prototypes/ranch-atelier/dist/studies/bodies-study/img/head.svg and hand.svg

The head is a Loomis construction with feature placement marks only (no likeness, no face); the hand is the back of a
right hand built bone by bone from the finger ratios."""
import os, math
from figure import canon, catmull, svg, C, OUT

FONT = 'font-family="Manrope,system-ui,sans-serif"'


def P(ox, oy, S):
    return lambda x, y: (ox + x * S, oy + y * S)


def path(pts, closed=True):
    return catmull(pts, closed)


def text(x, y, s, anchor='start', size=14, weight=400, fill='#797058'):
    return f'<text x="{x:.1f}" y="{y:.1f}" {FONT} font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>'


def head_front(h, sex, ox, oy, S):
    """Front view: egg, the Loomis thirds, feature placement marks. y down from the crown, x from the centre line."""
    p = P(ox, oy, S); H, W = h['heights'], h['widths'][sex]; hw, cw, jw = W['head'] / 2, W['cheekbones'] / 2, W['jaw'] / 2
    o = []
    egg = [(0, 0), (hw * 0.8, 0.07), (hw, 0.34), (cw * 1.02, H['eye'] + 0.08), (jw * 1.1, H['jaw_angle'] - 0.06), (jw * 0.62, 0.95), (0, 1.0),
           (-jw * 0.62, 0.95), (-jw * 1.1, H['jaw_angle'] - 0.06), (-cw * 1.02, H['eye'] + 0.08), (-hw, 0.34), (-hw * 0.8, 0.07)]
    o.append(f'<path d="{path([p(*q) for q in egg])}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6"/>')
    # ears, between the brow and the nose
    for s in (1, -1):
        ear = [(s * hw * 0.97, H['ear_top']), (s * (hw + 0.07), H['ear_top'] + 0.04), (s * (hw + 0.06), H['ear_bottom'] - 0.08), (s * hw * 0.95, H['ear_bottom'])]
        o.append(f'<path d="{path([p(*q) for q in ear], closed=False)}" fill="{C["skin2"]}" stroke="{C["line"]}" stroke-width="1.4"/>')
    # Loomis guide lines
    for k in ('hairline', 'brow', 'eye', 'nose', 'mouth'):
        a, b = p(-hw * 1.35, H[k]), p(hw * 1.35, H[k])
        o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{C["guide"]}" stroke-width="1" stroke-dasharray="{"0" if k == "eye" else "5 4"}"/>')
    a, b = p(0, -0.03), p(0, 1.03)
    o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{C["guide"]}" stroke-width="1" stroke-dasharray="3 3"/>')
    # placement marks: two eye lozenges one eye apart, a nose wedge as wide as the gap, the mouth line under the pupils
    e = W['eye']; g = W['between_eyes'] / 2
    for s in (1, -1):
        x0, x1 = s * g, s * (g + e)
        loz = [p(x0, H['eye']), p((x0 + x1) / 2, H['eye'] - 0.035), p(x1, H['eye']), p((x0 + x1) / 2, H['eye'] + 0.03)]
        o.append(f'<path d="{path(loz)}" fill="#fffcf0" stroke="{C["line"]}" stroke-width="1.2"/>')
    nb = W['nose'] / 2
    nose = [p(0, H['brow'] + 0.04), p(nb, H['nose'] - 0.01), p(0, H['nose'] + 0.01), p(-nb, H['nose'] - 0.01)]
    o.append(f'<path d="M{nose[0][0]:.1f},{nose[0][1]:.1f} L{nose[1][0]:.1f},{nose[1][1]:.1f} L{nose[2][0]:.1f},{nose[2][1]:.1f} L{nose[3][0]:.1f},{nose[3][1]:.1f} Z" fill="{C["skin2"]}" stroke="{C["line"]}" stroke-width="1.1" stroke-linejoin="round"/>')
    mw = W['mouth'] / 2; a, b, c = p(-mw, H['mouth']), p(0, H['mouth'] + 0.012), p(mw, H['mouth'])
    o.append(f'<path d="M{a[0]:.1f},{a[1]:.1f} Q{b[0]:.1f},{b[1]:.1f} {c[0]:.1f},{c[1]:.1f}" fill="none" stroke="{C["line"]}" stroke-width="1.4"/>')
    # five eyes across
    y = H['eye'] + 0.12
    for i in range(5):
        x0 = -hw + i * (2 * hw / 5); a, b = p(x0 + 0.01, y), p(x0 + 2 * hw / 5 - 0.01, y)
        o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{C["muscle"]}" stroke-width="3" stroke-linecap="round" opacity=".55"/>')
    return ''.join(o)


def head_side(h, sex, ox, oy, S):
    """Side view facing left: the cranium ball with its side plane, the jaw, the ear behind the middle."""
    p = P(ox, oy, S); H, D = h['heights'], h['depth']; d = D['head']; fem = sex == 'female'
    o = []
    br = 0.025 if fem else 0.0; nt = -0.06 if fem else -0.09
    prof = [(0.3, 0), (0.62, 0.08), (0.8, 0.35), (0.74, 0.62), (0.58, 0.78), (D['jaw_angle_from_face'] - 0.04, H['jaw_angle']), (0.22, 0.97),
            (0.06, 1.0), (0.0, 0.94), (0.02, 0.87), (-0.02, H['mouth']), (0.0, H['nose'] + 0.04), (nt, H['nose'] - 0.01), (0.0, 0.56),
            (br, H['brow'] + 0.03), (0.03 + br, 0.3), (0.12, 0.1)]
    shifted = [(x + 0.12, y) for x, y in prof]
    o.append(f'<path d="{path([p(*q) for q in shifted])}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6"/>')
    # Loomis ball and its flat side plane
    c = p(0.42 + 0.12, 0.4)
    o.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{0.38 * S:.1f}" fill="none" stroke="{C["guide"]}" stroke-width="1.2"/>')
    o.append(f'<ellipse cx="{c[0]:.1f}" cy="{c[1] + 0.04 * S:.1f}" rx="{0.17 * S:.1f}" ry="{0.24 * S:.1f}" fill="none" stroke="{C["guide"]}" stroke-width="1.2" stroke-dasharray="4 3"/>')
    # ear, behind the middle
    ex = D['ear_from_face'] + 0.12
    ear = [p(ex, H['ear_top']), p(ex + 0.1, H['ear_top'] - 0.01), p(ex + 0.12, (H['ear_top'] + H['ear_bottom']) / 2), p(ex + 0.06, H['ear_bottom']), p(ex - 0.01, H['ear_bottom'] - 0.03)]
    o.append(f'<path d="{path(ear)}" fill="{C["skin2"]}" stroke="{C["line"]}" stroke-width="1.3"/>')
    for k in ('hairline', 'brow', 'eye', 'nose', 'mouth'):
        a, b = p(-0.25, H[k]), p(d + 0.3, H[k])
        o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{C["guide"]}" stroke-width="1" stroke-dasharray="{"0" if k == "eye" else "5 4"}"/>')
    # eye placement, set back from the brow
    e = p(0.12 + 0.05, H['eye'])
    o.append(f'<path d="M{e[0]:.1f},{e[1] - 4:.1f} L{e[0] + 0.07 * S:.1f},{e[1]:.1f} L{e[0]:.1f},{e[1] + 4:.1f} Z" fill="#fffcf0" stroke="{C["line"]}" stroke-width="1.1"/>')
    # jaw line from the chin to the angle under the ear
    a, b = p(0.06 + 0.12, 0.99), p(D['jaw_angle_from_face'] + 0.08, H['jaw_angle'])
    o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{C["guide"]}" stroke-width="1.2"/>')
    return ''.join(o)


def head_sheet(cn, S=230):
    h = cn['head']; out = []
    w, hgt = 4 * 1.25 * S + 220, 1.45 * S
    out.append(f'<rect width="{w:.0f}" height="{hgt:.0f}" fill="#fffcf0"/>')
    x = 0.75 * S
    for sex in ('male', 'female'):
        out.append(head_front(h, sex, x, 0.14 * S, S)); out.append(text(x, 1.3 * S, ('Man' if sex == 'male' else 'Woman') + ', front', 'middle', 15, 700, C['ink']))
        x += 1.2 * S
        out.append(head_side(h, sex, x - 0.55 * S, 0.14 * S, S)); out.append(text(x - 0.1 * S, 1.3 * S, 'side', 'middle', 15, 700, C['ink']))
        x += 1.3 * S
    names = dict(hairline='hairline', brow='brow, ear top', eye='eyes: halfway', nose='nose, ear bottom', mouth='mouth')
    for k, lab in names.items():
        out.append(text(w - 210, 0.14 * S + h['heights'][k] * S + 4, lab))
    out.append(text(w - 210, 0.14 * S + 1.0 * S + 4, 'chin'))
    return svg(w, hgt, ''.join(out), 'Head proportions: the Loomis thirds, front and side, man and woman', show='')


def hand_sheet(cn, sex='male', S=420):
    """Back of a right hand, fingers up. Each finger is three bones in the canon's ratio; the knuckles make an arc."""
    hd = cn['hand']; W = hd['width'][sex]; p = P(0.55 * S, 1.08 * S, S); out = []
    w, hgt = 1.5 * S, 1.2 * S
    out.append(f'<rect width="{w:.0f}" height="{hgt:.0f}" fill="#fffcf0"/>')
    palm, kw = hd['palm_length'], W['knuckles']; mf = hd['middle_finger_length']; ph = hd['phalanges']; tot = sum(ph)
    # knuckle positions across the back of the hand (index on the left for a right hand seen from the back... thumb left)
    order = ['index', 'middle', 'ring', 'little']; xs = [-kw * 0.36, -kw * 0.12, kw * 0.12, kw * 0.35]
    fw = [kw * 0.23, kw * 0.24, kw * 0.22, kw * 0.19]
    fan = [-4, 0, 4, 9]
    pal = [(-W['wrist'] / 2, 0), (W['wrist'] / 2, 0), (kw / 2 * 0.98, -palm * 0.55), (kw / 2, -palm + hd['knuckle_drop']['little'])]
    for i, k in enumerate(reversed(order)):
        j = 3 - i; pal.append((xs[j], -palm + hd['knuckle_drop'][k] - 0.015))
    pal += [(-kw / 2, -palm + 0.03), (-kw / 2 * 1.02, -palm * 0.6)]
    out.append(f'<path d="{path([p(*q) for q in pal])}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.6"/>')
    tips = {}
    for j, k in enumerate(order):
        L = mf * hd['fingers'][k]; a = math.radians(fan[j]); d = (math.sin(a), -math.cos(a))
        base = (xs[j], -palm + hd['knuckle_drop'][k]); y0 = 0.0
        for n, r in enumerate(ph):
            seg = L * r / tot; s0 = base[0] + d[0] * y0, base[1] + d[1] * y0; s1 = base[0] + d[0] * (y0 + seg), base[1] + d[1] * (y0 + seg)
            wd = fw[j] * (1 - 0.1 * n) / 2; nx, ny = -d[1], d[0]
            box = [p(s0[0] + nx * wd, s0[1] + ny * wd), p(s1[0] + nx * wd * 0.95, s1[1] + ny * wd * 0.95), p(s1[0] - nx * wd * 0.95, s1[1] - ny * wd * 0.95), p(s0[0] - nx * wd, s0[1] - ny * wd)]
            rr = wd * S * (0.9 if n == 2 else 0.35)
            out.append(f'<path d="M{box[0][0]:.1f},{box[0][1]:.1f} L{box[1][0]:.1f},{box[1][1]:.1f} L{box[2][0]:.1f},{box[2][1]:.1f} L{box[3][0]:.1f},{box[3][1]:.1f} Z" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.5" stroke-linejoin="round"/>')
            if n == 2:
                c = p(s1[0], s1[1]); out.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{wd * S:.1f}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.5"/>')
                out.append(f'<path d="M{box[1][0]:.1f},{box[1][1]:.1f} L{box[2][0]:.1f},{box[2][1]:.1f}" stroke="{C["skin"]}" stroke-width="3"/>')
            c = p(*s0); out.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{4 if n else 6}" fill="{C["bone"]}" stroke="{C["boneline"]}"/>')
            y0 += seg
        tips[k] = (base[0] + d[0] * L, base[1] + d[1] * L)
    # thumb: three segments from near the wrist, out to the side, its tip level with the index base knuckle
    tb = (-W['wrist'] / 2 * 0.9, -hd['thumb_base']); tt = (-kw / 2 - 0.1, -palm * 0.86)
    tl = math.dist(tb, tt); d = ((tt[0] - tb[0]) / tl, (tt[1] - tb[1]) / tl); nx, ny = -d[1], d[0]; y0 = 0
    for n, r in enumerate((0.4, 0.33, 0.27)):
        seg = tl * r; s0 = (tb[0] + d[0] * y0, tb[1] + d[1] * y0); s1 = (tb[0] + d[0] * (y0 + seg), tb[1] + d[1] * (y0 + seg)); wd = kw * (0.15 - 0.015 * n)
        box = [p(s0[0] + nx * wd, s0[1] + ny * wd), p(s1[0] + nx * wd, s1[1] + ny * wd), p(s1[0] - nx * wd, s1[1] - ny * wd), p(s0[0] - nx * wd, s0[1] - ny * wd)]
        out.append(f'<path d="M{box[0][0]:.1f},{box[0][1]:.1f} L{box[1][0]:.1f},{box[1][1]:.1f} L{box[2][0]:.1f},{box[2][1]:.1f} L{box[3][0]:.1f},{box[3][1]:.1f} Z" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.5" stroke-linejoin="round"/>')
        c = p(*s0); out.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="5" fill="{C["bone"]}" stroke="{C["boneline"]}"/>')
        y0 += seg
    c = p(*tt); out.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{kw * 0.13 * S:.1f}" fill="{C["skin"]}" stroke="{C["line"]}" stroke-width="1.5"/>')
    # the knuckle arc and the tip relations
    arc = [p(xs[j], -palm + hd['knuckle_drop'][k]) for j, k in enumerate(order)]
    out.append(f'<path d="{path(arc, closed=False)}" fill="none" stroke="{C["guide"]}" stroke-width="1.6" stroke-dasharray="6 4"/>')
    tiparc = [p(*tips[k]) for k in order]
    out.append(f'<path d="{path(tiparc, closed=False)}" fill="none" stroke="{C["guide"]}" stroke-width="1.2" stroke-dasharray="3 4"/>')
    for k in ('wrist', 'knuckles', 'tip'):
        yy = {'wrist': 0, 'knuckles': -palm, 'tip': -palm - mf}[k]; a, b = p(-0.55, yy), p(0.68, yy)
        out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{C["grid"]}" stroke-dasharray="4 5"/>')
        out.append(text(b[0] + 6, b[1] + 4, {'wrist': 'wrist crease', 'knuckles': 'knuckles', 'tip': 'fingertip = 1 hand'}[k]))
    return svg(w, hgt, ''.join(out), 'The back of a right hand: palm equals the middle finger, bones in ratio, knuckles in an arc', show='')


def main():
    cn = canon(); os.makedirs(OUT, exist_ok=True)
    for name, s in (('head.svg', head_sheet(cn)), ('hand.svg', hand_sheet(cn))):
        open(os.path.join(OUT, name), 'w').write(s); print(name, len(s) // 1024, 'KB')


if __name__ == '__main__':
    main()
