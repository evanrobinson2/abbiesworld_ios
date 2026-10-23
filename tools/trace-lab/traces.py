"""Trace one Midjourney sketch four ways and score each against the original.
usage: python3 traces.py <src.png> <outdir>
Routes: A potrace (filled outline), C centerline + measured stroke width (skeleton -> beziers),
Scores (all on the ink mask, 3px tolerance): recall (original ink covered), precision (drawn ink that is real),
chamfer (mean px distance), weight_corr (line-weight correlation along the line)."""
import sys, os, json, numpy as np, cv2, potrace, cairosvg
from skimage.morphology import skeletonize
from scipy import ndimage as ndi
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
S = 3  # work at 3x so traced curves are smooth
img = cv2.imread(src, cv2.IMREAD_COLOR); H, W = img.shape[:2]
big = cv2.resize(img, (W*S, H*S), interpolation=cv2.INTER_CUBIC)
gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY).astype(np.float32)
bg = cv2.GaussianBlur(gray, (0,0), 40); d = np.clip(bg-gray, 0, None)   # darkness vs paper
ink = (d > max(12, d.max()*0.18))
ink = ndi.binary_opening(ink, iterations=1)
cv2.imwrite(f"{out}/ink.png", (~ink*255).astype(np.uint8))

def to_svg_paths(bmp, turd=12):
    bm = potrace.Bitmap(~bmp); pl = bm.trace(turdsize=turd, alphamax=1.0, opttolerance=0.4)
    ds = []
    for c in pl:
        s = c.start_point; d = f"M{s.x/S:.2f},{s.y/S:.2f}"
        for seg in c.segments:
            if seg.is_corner: d += f"L{seg.c.x/S:.2f},{seg.c.y/S:.2f}L{seg.end_point.x/S:.2f},{seg.end_point.y/S:.2f}"
            else: d += f"C{seg.c1.x/S:.2f},{seg.c1.y/S:.2f} {seg.c2.x/S:.2f},{seg.c2.y/S:.2f} {seg.end_point.x/S:.2f},{seg.end_point.y/S:.2f}"
        ds.append(d+"Z")
    return " ".join(ds)
def wrap(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="100%" height="100%" fill="#fff"/>{body}</svg>'

# A potrace filled outline
A = wrap(f'<path d="{to_svg_paths(ink)}" fill="#1d3f8f" fill-rule="evenodd"/>')

# C centerline: skeleton -> graph walk -> smoothed polylines -> stroke with measured half-width
sk = skeletonize(ink); dist = ndi.distance_transform_edt(ink)
nb = ndi.convolve(sk.astype(int), np.ones((3,3),int), mode="constant") - 1
nodes = sk & (nb != 2); ys, xs = np.nonzero(sk); pts = set(zip(ys, xs)); seen = set(); strokes = []
def nbrs(p): return [(p[0]+dy,p[1]+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx) and (p[0]+dy,p[1]+dx) in pts]
def walk(a, b):
    path = [a, b]; seen.add((a,b)); seen.add((b,a)); cur, prev = b, a
    while cur not in nodeset:
        nx = [n for n in nbrs(cur) if n != prev and (cur,n) not in seen]
        if not nx: break
        n = min(nx, key=lambda q: abs(q[0]-cur[0])+abs(q[1]-cur[1])); seen.add((cur,n)); seen.add((n,cur)); path.append(n); prev, cur = cur, n
    return path
nodeset = set(zip(*np.nonzero(nodes)))
starts = list(nodeset) or [next(iter(pts))]
for p in starts + list(pts):
    for n in nbrs(p):
        if (p,n) not in seen:
            pa = walk(p, n)
            if len(pa) >= 12: strokes.append(pa)
def smooth(a, k=9):
    a = np.array(a, float); 
    if len(a) < k: return a
    ker = np.ones(k)/k; pad = np.pad(a, ((k//2,k//2),(0,0)), mode="edge")
    return np.stack([np.convolve(pad[:,i], ker, "valid") for i in range(2)], 1)
def bez(p):  # Catmull-Rom -> cubic through every 6th point
    p = p[::6] if len(p) > 12 else p
    if len(p) < 2: return ""
    d = f"M{p[0][1]/S:.2f},{p[0][0]/S:.2f}"
    for i in range(len(p)-1):
        p0,p1,p2,p3 = p[max(i-1,0)],p[i],p[i+1],p[min(i+2,len(p)-1)]
        c1 = p1+(p2-p0)/6; c2 = p2-(p3-p1)/6
        d += f"C{c1[1]/S:.2f},{c1[0]/S:.2f} {c2[1]/S:.2f},{c2[0]/S:.2f} {p2[1]/S:.2f},{p2[0]/S:.2f}"
    return d
def build(vary=True, jitter=False):
    body = ""
    for pa in strokes:
        sp = smooth(pa); w = np.array([dist[int(y),int(x)] for y,x in pa]); w = np.convolve(np.pad(w,(4,4),mode="edge"), np.ones(9)/9, "valid")
        # split the stroke into 4 chunks so the width can change along the line
        n = max(1, len(sp)//25 if vary else 1)
        for ch in np.array_split(np.arange(len(sp)), n):
            if len(ch) < 2: continue
            ch = np.arange(max(ch[0]-1,0), ch[-1]+1); sw = 2*np.mean(w[ch])/S if vary else 2*np.mean(dist[ink])/S*0.9
            body += f'<path d="{bez(sp[ch])}" fill="none" stroke="#1d3f8f" stroke-width="{max(sw,0.35):.2f}" stroke-linecap="round"/>'
    return wrap(body)
C0, C = build(False), build(True)
svgs = {"A_potrace": A, "C0_centerline_flat": C0, "C_centerline_weighted": C}
def render(svg): 
    cairosvg.svg2png(bytestring=svg.encode(), write_to="/tmp/_r.png", output_width=W*S, output_height=H*S)
    r = cv2.imread("/tmp/_r.png", 0).astype(np.float32); return cv2.GaussianBlur(r,(0,0),0.6), (r < 140)
dist_o = ndi.distance_transform_edt(~ink); wo = dist
rep = {}
for k, s in svgs.items():
    open(f"{out}/{k}.svg","w").write(s); g, m = render(s); cv2.imwrite(f"{out}/{k}.png", g.astype(np.uint8))
    tol = 3*S; dm = ndi.distance_transform_edt(~m)
    recall = float((dm[ink] <= tol).mean()); precision = float((dist_o[m] <= tol).mean())
    chamfer = float((dm[sk].mean() + dist_o[skeletonize(m)].mean())/2/S)
    # line-weight match: local stroke thickness (2*dt) sampled on the original skeleton
    dmk = ndi.distance_transform_edt(m); a = wo[sk]; b = dmk[sk]; sel = a>0
    wc = float(np.corrcoef(a[sel], b[sel])[0,1]) if b[sel].std()>0 else 0.0
    rep[k] = dict(recall=round(recall,3), precision=round(precision,3), chamfer_px=round(chamfer,2), weight_corr=round(wc,2), svg_bytes=len(s))
json.dump(rep, open(f"{out}/scores.json","w"), indent=1); print(json.dumps(rep, indent=1))
