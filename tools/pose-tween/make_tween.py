"""Animated SVG of a stick figure moving between two poses, in the blue graphite
sketch style of the Midjourney figure-practice sheet.

Poses are absolute segment angles in degrees: 0 points straight down, 90 points
right, 180 points up. Angles are interpolated (not joint positions) so limbs keep
their length. Writes pose-tween.svg next to this file.

    python3 tools/pose-tween/make_tween.py
"""
import math, os

L = dict(torso=110, neck=16, head=21, uarm=58, farm=54, thigh=82, shin=78, foot=22)

# crouch: weight down, torso forward, arms swung back, ready to spring
CROUCH = dict(px=170, py=455, torso=150, neck=145,
              r_uarm=-35, r_farm=-15, l_uarm=-50, l_farm=-30,
              r_thigh=75, r_shin=-25, r_foot=95, l_thigh=55, l_shin=-30, l_foot=90)
# leap: the Midjourney pose. Leaning back, one arm flung up and out, the other
# bent overhead, left leg straight down, right leg kicked back at the knee
LEAP = dict(px=205, py=300, torso=196, neck=192,
            r_uarm=140, r_farm=132, l_uarm=200, l_farm=105,
            r_thigh=112, r_shin=28, r_foot=40, l_thigh=8, l_shin=4, l_foot=18)

def d(a):
    r = math.radians(a)
    return math.sin(r), math.cos(r)

def step(p, a, n):
    dx, dy = d(a)
    return (p[0] + dx * n, p[1] + dy * n)

def skeleton(P):
    hip = (P["px"], P["py"])
    chest = step(hip, P["torso"], L["torso"])
    neck = step(chest, P["neck"], L["neck"])
    head = step(neck, P["neck"], L["head"])
    bones, joints = [], [hip, chest]
    for s in "rl":
        sh = step(chest, P["torso"] + 180, 6)
        el = step(sh, P[s + "_uarm"], L["uarm"]); wr = step(el, P[s + "_farm"], L["farm"])
        kn = step(hip, P[s + "_thigh"], L["thigh"]); an = step(kn, P[s + "_shin"], L["shin"])
        to = step(an, P[s + "_foot"], L["foot"])
        bones += [[sh, el, wr], [hip, kn, an, to]]
        joints += [el, wr, kn, an]
    bones.append([hip, chest, neck])
    return bones, joints, head

def f(v): return f"{v:.1f}"

def bone_d(bones): return " ".join("M" + " L".join(f"{f(x)} {f(y)}" for x, y in b) for b in bones)

def joint_d(joints, r=5):
    return " ".join(f"M{f(x-r)} {f(y)} a{r} {r} 0 1 0 {2*r} 0 a{r} {r} 0 1 0 {-2*r} 0" for x, y in joints)

def lerp(A, B, t): return {k: A[k] + (B[k] - A[k]) * t for k in A}

def ease(t): return 0.5 - 0.5 * math.cos(math.pi * t)

# timeline: hold crouch, spring up, hang, drop back, hold
N, DUR = 72, 2.8
def phase(i):
    u = i / (N - 1)
    if u < 0.15: return 0.0
    if u < 0.45: return ease((u - 0.15) / 0.30)
    if u < 0.60: return 1.0
    if u < 0.90: return 1 - ease((u - 0.60) / 0.30)
    return 0.0

frames = [skeleton(lerp(CROUCH, LEAP, phase(i))) for i in range(N)]
heads = [h for _, _, h in frames]

def anim(attr, vals):
    return (f'<animate attributeName="{attr}" dur="{DUR}s" repeatCount="indefinite" '
            f'calcMode="linear" values="{";".join(vals)}"/>')

def ghost(P):
    b, j, h = skeleton(P)
    return (f'<path d="{bone_d(b)}"/><path d="{joint_d(j)}"/>'
            f'<circle cx="{f(h[0])}" cy="{f(h[1])}" r="{L["head"]}"/>')

b0, j0, h0 = frames[0]
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
<title>Crouch to leap</title>
<defs>
  <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="2.2"/>
  </filter>
</defs>
<rect width="400" height="600" fill="#ffffff"/>
<g fill="none" stroke="#2f5fb3" stroke-linecap="round" stroke-linejoin="round" filter="url(#pencil)">
  <path d="M40 545 Q200 540 360 547" stroke-width="1.2" opacity="0.45"/>
  <g stroke-width="1.1" opacity="0.16">{ghost(CROUCH)}{ghost(LEAP)}</g>
  <ellipse cx="190" cy="546" rx="58" ry="6" fill="#2f5fb3" stroke="none" opacity="0.10">
    {anim("rx", [f(58 - 26 * phase(i)) for i in range(N)])}
    {anim("cx", [f(frames[i][0][-1][0][0]) for i in range(N)])}
  </ellipse>
  <path d="{bone_d(b0)}" stroke-width="2.6">{anim("d", [bone_d(b) for b, _, _ in frames])}</path>
  <path d="{joint_d(j0)}" stroke-width="1.8">{anim("d", [joint_d(j) for _, j, _ in frames])}</path>
  <circle cx="{f(h0[0])}" cy="{f(h0[1])}" r="{L["head"]}" stroke-width="2.2">
    {anim("cx", [f(h[0]) for h in heads])}{anim("cy", [f(h[1]) for h in heads])}
  </circle>
</g>
</svg>
'''
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pose-tween.svg")
open(out, "w").write(svg)
print(out, len(svg))
