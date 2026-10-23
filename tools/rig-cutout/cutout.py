"""Cut a pasted character picture into rigged 2D parts. usage: python3 cutout.py <hero.png> <mask.png> <outdir>
1) landmarks read by eye -> 2) render-and-compare loop refines them against the figure mask -> 3) every figure pixel goes to the
nearest bone part (children sit under parents, extra overlap kept under the parent so joints can turn) -> 4) decorations (hair,
belt, scarf) lifted off by colour and the base inpainted -> sprites + rig.json + posed SVG previews."""
import sys, os, json, numpy as np, cv2, base64
from scipy import ndimage as ndi
src, mpath, out = sys.argv[1:4]; os.makedirs(out+"/sprites", exist_ok=True)
img = cv2.imread(src); H, W = img.shape[:2]; fg = cv2.imread(mpath, 0) > 127
LM = dict(head=(525,135), skull=(535,190), neck=(545,205), waist=(548,410), hips=(555,505),
  shR=(440,240), elR=(275,275), wrR=(205,295), tipR=(140,325), shL=(630,215), elL=(722,235), wrL=(815,268), tipL=(865,320),
  hipR=(520,525), knR=(385,690), anR=(330,800), toeR=(285,945), hipL=(585,535), knL=(670,650), anL=(535,690), toeL=(505,775))
# (part, bone, parent bone, a, b, width_a, width_b, pivot landmark)
PARTS = [("pelvis","hips",None,"waist","hips",150,175,"hips"),("chest","spine","hips","neck","waist",190,150,"waist"),
 ("neck","neck","spine","neck","skull",55,55,"neck"),("head","head","neck","head","head",118,118,"skull")]
for s in "RL":
    PARTS += [(f"upperarm_{s}",f"upperarm_{s}","spine",f"sh{s}",f"el{s}",72,56,f"sh{s}"),(f"forearm_{s}",f"forearm_{s}",f"upperarm_{s}",f"el{s}",f"wr{s}",54,38,f"el{s}"),
              (f"hand_{s}",f"hand_{s}",f"forearm_{s}",f"wr{s}",f"tip{s}",40,18,f"wr{s}"),
              (f"thigh_{s}",f"thigh_{s}","hips",f"hip{s}",f"kn{s}",125,92,f"hip{s}"),(f"shin_{s}",f"shin_{s}",f"thigh_{s}",f"kn{s}",f"an{s}",88,58,f"kn{s}"),
              (f"foot_{s}",f"foot_{s}",f"shin_{s}",f"an{s}",f"toe{s}",58,28,f"an{s}")]
SC = 4; sm = cv2.resize(fg.astype(np.uint8), (W//SC, H//SC), interpolation=cv2.INTER_AREA) > 0
yy, xx = np.mgrid[0:H//SC, 0:W//SC]; X = xx*SC+SC/2; Y = yy*SC+SC/2
def sd(lm, a, b, wa, wb, X=X, Y=Y):
    pa = np.array(lm[a], float); pb = np.array(lm[b], float); v = pb-pa; l2 = max(v@v, 1e-6)
    t = np.clip(((X-pa[0])*v[0]+(Y-pa[1])*v[1])/l2, 0, 1); return np.hypot(X-(pa[0]+t*v[0]), Y-(pa[1]+t*v[1])) - (wa+(wb-wa)*t)/2
def union_iou(lm, wm):
    m = np.zeros(sm.shape, bool)
    for i, p in enumerate(PARTS): m |= sd(lm, p[3], p[4], p[5]*wm[i], p[6]*wm[i]) <= 0
    return (m & sm).sum()/(m | sm).sum(), m
lm = {k: list(map(float, v)) for k, v in LM.items()}; wm = [1.0]*len(PARTS); i0, _ = union_iou(lm, wm); best = 1-i0; rng = np.random.default_rng(3)
for it in range(1, 3501):
    l2 = {k: v[:] for k, v in lm.items()}; w2 = wm[:]; s = 14*(1-it/3800)+2
    if rng.random() < .75:
        k = rng.choice([q for q in l2 if q not in ("head",)]); l2[k][0] += rng.normal(0, s); l2[k][1] += rng.normal(0, s)
        if abs(l2[k][0]-LM[k][0]) > 45 or abs(l2[k][1]-LM[k][1]) > 45: continue
    else:
        j = rng.integers(len(w2)); w2[j] = float(np.clip(w2[j]*np.exp(rng.normal(0, .06)), .75, 1.35))
    v, _ = union_iou(l2, w2)
    if 1-v < best: best, lm, wm = 1-v, l2, w2
i1, _ = union_iou(lm, wm); print("bone-shape fit IoU %.3f -> %.3f" % (i0, i1))
# 3) assign pixels at full res: nearest part, with draw order (parents above children)
fy, fx = np.mgrid[0:H, 0:W]; D = np.stack([sd(lm, p[3], p[4], p[5]*wm[i], p[6]*wm[i], fx+.5, fy+.5) for i, p in enumerate(PARTS)])
own = np.argmin(D, 0); own[~fg] = -1
ORDER = {}  # sorting: leaves low, parents high, head top
depth = {p[1]: 0 for p in PARTS}
def dep(b):
    par = {p[1]: p[2] for p in PARTS}; n = 0
    while par[b]: b = par[b]; n += 1
    return n
sorting = {p[0]: (10 - dep(p[1])) * 10 + (0 if p[0].endswith("_R") else 1) for p in PARTS}  # deeper = lower
sorting["head"] = 120; sorting["neck"] = 95; sorting["chest"] = 90; sorting["pelvis"] = 85
# 4) decorations by colour
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); Hh, Ss, Vv = hsv[...,0].astype(int), hsv[...,1].astype(int), hsv[...,2].astype(int)
orange = (Hh >= 5) & (Hh <= 22) & (Ss > 110) & (Vv > 120); red = ((Hh <= 6) | (Hh >= 170)) & (Ss > 140)
gold = (Hh >= 14) & (Hh <= 28) & (Ss > 90) & (Vv > 110)
yy_, xx_ = fy, fx
dec = {"hair": fg & orange & (yy_ < 135) & (xx_ > 460) & (xx_ < 580),
       "belt": fg & gold & (yy_ > 380) & (yy_ < 510) & (xx_ > 480) & (xx_ < 650),
       "scarf": fg & (red | gold) & (yy_ > 185) & (yy_ < 275) & (xx_ > 470) & (xx_ < 600)}
for k in dec: dec[k] = ndi.binary_opening(dec[k], iterations=1); dec[k] = ndi.binary_closing(dec[k], iterations=3) & fg
DEC_BONE = {"hair": "head", "belt": "hips", "scarf": "spine"}; DEC_SORT = {"hair": 130, "belt": 100, "scarf": 105}
decall = np.zeros_like(fg)
for m in dec.values(): decall |= m
base = cv2.inpaint(img, (ndi.binary_dilation(decall, iterations=2)*255).astype(np.uint8), 5, cv2.INPAINT_TELEA)
def sprite(mask, src_img, name):
    ys, xs = np.nonzero(mask)
    if len(ys) == 0: return None
    x0, x1, y0, y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
    rgba = np.dstack([src_img[y0:y1, x0:x1], (mask[y0:y1, x0:x1]*255).astype(np.uint8)]); rgba[...,3] = cv2.GaussianBlur(rgba[...,3], (0,0), .7)
    cv2.imwrite(f"{out}/sprites/{name}.png", rgba); return dict(file=f"sprites/{name}.png", x=int(x0), y=int(y0), w=int(x1-x0), h=int(y1-y0))
parts_out = []; names = [p[0] for p in PARTS]
par_part = {p[1]: p[0] for p in PARTS}
for i, p in enumerate(PARTS):
    m = own == i
    m_extra = m | (ndi.binary_dilation(m, iterations=7) & fg & np.isin(own, [names.index(par_part[p[2]])] if p[2] else []))  # extra pixels from the parent, kept under it
    sp = sprite(m_extra & ~dec["hair"]*0 if False else m_extra, base, p[0])
    if sp: parts_out.append(dict(name=p[0], bone=p[1], sorting=sorting[p[0]], **sp))
for k, m in dec.items():
    sp = sprite(m, img, "deco_"+k)
    if sp: parts_out.append(dict(name="deco_"+k, bone=DEC_BONE[k], sorting=DEC_SORT[k], decoration=True, **sp))
bones = []
for p in PARTS:
    px, py = lm[p[7]]; bones.append(dict(name=p[1], parent=p[2], pivot=[round(px,1), round(py,1)], tip=[round(lm[p[4]][0],1), round(lm[p[4]][1],1)]))
rig = dict(format="aw-rig2d-lite/1", source=os.path.basename(src), image_size=[W, H], units="pixels, y down; Unity import divides by pixelsPerUnit",
  side="L/R are the character's own sides (screen-right arm = L)", bones=bones, parts=sorted(parts_out, key=lambda q: q["sorting"]), landmarks=lm, fit=dict(iou_start=round(i0,3), iou_end=round(i1,3)))
json.dump(rig, open(out+"/rig.json", "w"), indent=1); print(len(parts_out), "sprites")
# preview svg with nested bone groups
kids = {}
for b in bones: kids.setdefault(b["parent"], []).append(b["name"])
bone = {b["name"]: b for b in bones}; byb = {}
for q in parts_out: byb.setdefault(q["bone"], []).append(q)
def b64(f): return "data:image/png;base64," + base64.b64encode(open(f"{out}/{f}", "rb").read()).decode()
def grp(b, ang):
    px, py = bone[b]["pivot"]; s = f'<g transform="rotate({ang.get(b,0)} {px} {py})">'
    for q in byb.get(b, []): s += f'<image href="{b64(q["file"])}" x="{q["x"]}" y="{q["y"]}" width="{q["w"]}" height="{q["h"]}" data-z="{q["sorting"]}"/>'
    for c in kids.get(b, []): s += grp(c, ang)
    return s + "</g>"
print("ok")
json.dump(dict(sorting=sorting), open(out+"/_sorting.json","w"))
