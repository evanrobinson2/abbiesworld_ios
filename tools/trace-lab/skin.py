"""Traced-skin puppet: cut the traced picture into the fitted parts and hang them on a skeleton, so a posed
puppet keeps the picture's line quality. Two ink layers (dark outline, light construction) keep line weight and value.
usage: python3 skin.py <src.png> <fit.json> <outdir>"""
import sys, os, json, numpy as np, cv2, potrace, cairosvg
from scipy import ndimage as ndi
src, fitj, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
fit = json.load(open(fitj)); L = fit["landmarks_round1"]; Wd = fit["widths_round1"]
S = 3; img = cv2.imread(src); H, W = img.shape[:2]
big = cv2.resize(img, (W*S,H*S), interpolation=cv2.INTER_CUBIC); g = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY).astype(np.float32)
d = np.clip(cv2.GaussianBlur(g,(0,0),40)-g, 0, None); m = d.max()
dark = ndi.binary_opening(d > m*.40); light = ndi.binary_opening(d > m*.12) & ~dark
ink = d > m*.18
sil = ndi.binary_fill_holes(ndi.binary_closing(ink, iterations=8)); sil = ndi.binary_opening(sil, iterations=5)
# parts: name -> (a, b, wa, wb, parent)
PT = {"abdomen":("waist","pelvis",32,36,None),"chest":("neck","waist",40,34,"abdomen"),"head":("head","head",50,50,"chest"),
 "upperarmA":("sA","eA",13,10,"chest"),"forearmA":("eA","wA",10,8,"upperarmA"),"handA":("wA","hA",9,6,"forearmA"),
 "upperarmB":("sB","eB",13,10,"chest"),"forearmB":("eB","wB",10,8,"upperarmB"),"handB":("wB","hB",9,5,"forearmB"),
 "upperarmC":("sC","eC",12,9,"chest"),"forearmC":("eC","wC",10,6,"upperarmC"),"handC":("wC","hC",6,3,"forearmC"),
 "thighS":("hip","kS",24,14,"abdomen"),"shinS":("kS","aS",14,8,"thighS"),"footS":("aS","tS",8,3,"shinS"),
 "thighK":("hip","kK",26,16,"abdomen"),"shinK":("kK","aK",16,8,"thighK"),"footK":("aK","tK",8,4,"shinK")}
# fitted widths (round 1) by index order of fit.py's P list
order = ["upperarmA","forearmA","handA","upperarmB","forearmB","handB","upperarmC","forearmC","handC","thighK","shinK","footK","thighS","shinS","footS","chest","abdomen"]
for n,w in zip(order, Wd): a,b,_,_,p = PT[n]; PT[n] = (a,b,w[0],w[1],p)
yy, xx = np.mgrid[0:H*S, 0:W*S]; X = xx/S; Y = yy/S
def sd(n):  # signed distance to the tapered capsule (negative inside)
    a,b,wa,wb,_ = PT[n]; pa = np.array(L[a]); pb = np.array(L[b]); v = pb-pa; l2 = max(v@v,1e-6)
    t = np.clip(((X-pa[0])*v[0]+(Y-pa[1])*v[1])/l2, 0, 1); cx = pa[0]+t*v[0]; cy = pa[1]+t*v[1]
    return np.hypot(X-cx, Y-cy) - (wa+(wb-wa)*t)/2
names = list(PT); D = np.stack([sd(n) for n in names]); own = np.argmin(D, 0); far = D.min(0) > 9
def trace(bmp):
    pl = potrace.Bitmap(~bmp).trace(turdsize=10, alphamax=1.0, opttolerance=.4); ds = []
    for c in pl:
        s = c.start_point; q = f"M{s.x/S:.1f},{s.y/S:.1f}"
        for seg in c.segments:
            if seg.is_corner: q += f"L{seg.c.x/S:.1f},{seg.c.y/S:.1f}L{seg.end_point.x/S:.1f},{seg.end_point.y/S:.1f}"
            else: q += f"C{seg.c1.x/S:.1f},{seg.c1.y/S:.1f} {seg.c2.x/S:.1f},{seg.c2.y/S:.1f} {seg.end_point.x/S:.1f},{seg.end_point.y/S:.1f}"
        ds.append(q+"Z")
    return " ".join(ds)
paths = {}
for i,n in enumerate(names):
    reg = (own==i) & ~far
    fill = trace(reg & sil); dk = trace(reg & dark); lt = trace(reg & light)
    paths[n] = (fill, dk, lt)
children = {n: [c for c in names if PT[c][4]==n] for n in names}
def group(n, ang):
    px, py = L[PT[n][0]]; a = ang.get(n, 0); f, dk, lt = paths[n]
    s = f'<g transform="rotate({a} {px:.1f} {py:.1f})"><path d="{f}" fill="#fbfcfe"/><path d="{lt}" fill="#6f8fcf" fill-opacity=".55"/><path d="{dk}" fill="#1d3f8f"/>'
    for c in children[n]: s += group(c, ang)
    return s + "</g>"
def svg(ang): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="100%" height="100%" fill="#fff"/>{group("abdomen", ang)}</svg>'
poses = {"rest": {}, "arms_lower_leg_down": {"upperarmA": -28, "upperarmB": 30, "upperarmC": 35, "thighK": 32, "shinK": -22, "thighS": -6}}
res = {}
for k, a in poses.items():
    s = svg(a); open(f"{out}/skin_{k}.svg","w").write(s); cairosvg.svg2png(bytestring=s.encode(), write_to=f"{out}/skin_{k}.png", output_width=W*2, output_height=H*2)
# rest fidelity vs the original ink
r = cv2.imread(f"{out}/skin_rest.png", 0); orig = cv2.resize(ink.astype(np.uint8), (W*2,H*2), interpolation=cv2.INTER_NEAREST)>0
m_ = r < 235; do = ndi.distance_transform_edt(~orig); dm = ndi.distance_transform_edt(~m_)
res = dict(rest_recall=float((dm[orig]<=6).mean()), rest_precision=float((do[m_]<=6).mean()), parts=len(names), svg_bytes=len(open(f"{out}/skin_rest.svg").read()))
json.dump(res, open(f"{out}/skin_scores.json","w"), indent=1); print(res)
