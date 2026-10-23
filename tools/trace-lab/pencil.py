"""Draw a traced sketch again with an emulated pencil: strokes sampled from the centerline, pressure from the picture's own
darkness, taper at the ends, hand wobble, and graphite that only lands where pressure beats the paper's tooth.
usage: python3 pencil.py <src.png> <out.png> [--tone 1.0] [--grain 0.9] [--tint blue|grey]"""
import sys, numpy as np, cv2, argparse
from skimage.morphology import skeletonize
from scipy import ndimage as ndi
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out"); ap.add_argument("--tone", type=float, default=1.0)
ap.add_argument("--grain", type=float, default=.9); ap.add_argument("--tint", default="blue"); ap.add_argument("--scale", type=int, default=3)
ap.add_argument("--seed", type=int, default=3); ap.add_argument("--wobble", type=float, default=.7); ap.add_argument("--layers", type=int, default=1); ap.add_argument("--hatch", type=float, default=0); ap.add_argument("--shade", default="")
a = ap.parse_args(); S = a.scale; rng = np.random.default_rng(a.seed)
img = cv2.imread(a.src); H, W = img.shape[:2]; big = cv2.resize(img, (W*S, H*S), interpolation=cv2.INTER_CUBIC)
g = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY).astype(np.float32); dk = np.clip(cv2.GaussianBlur(g,(0,0),40)-g, 0, None); dk /= dk.max()
ink = ndi.binary_opening(dk > .16); sk = skeletonize(ink); dist = ndi.distance_transform_edt(ink)
pts = set(zip(*np.nonzero(sk))); nb = ndi.convolve(sk.astype(int), np.ones((3,3),int), mode="constant") - 1
nodeset = set(zip(*np.nonzero(sk & (nb != 2)))); seen = set()
def nbrs(p): return [(p[0]+dy,p[1]+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx) and (p[0]+dy,p[1]+dx) in pts]
def walk(p, n):
    path = [p, n]; seen.add((p,n)); seen.add((n,p)); prev, cur = p, n
    while cur not in nodeset:
        nx = [q for q in nbrs(cur) if q != prev and (cur,q) not in seen]
        if not nx: break
        q = min(nx, key=lambda r: abs(r[0]-cur[0])+abs(r[1]-cur[1])); seen.add((cur,q)); seen.add((q,cur)); path.append(q); prev, cur = cur, q
    return path
strokes = []
for p in list(nodeset) + list(pts):
    for n in nbrs(p):
        if (p,n) not in seen:
            pa = walk(p, n)
            if len(pa) >= 10 * S // 3: strokes.append(pa)
def smooth(arr, k):
    arr = np.asarray(arr, float); k = min(k, len(arr)|1)
    if k < 3: return arr
    pad = np.pad(arr, ((k//2,k//2),)+((0,0),)*(arr.ndim-1), mode="edge"); ker = np.ones(k)/k
    return np.stack([np.convolve(pad[:,i], ker, "valid") for i in range(arr.shape[1])],1) if arr.ndim>1 else np.convolve(pad, ker, "valid")
def lowfreq(n, amp):  # smooth random drift along the stroke
    k = max(3, n//6); r = rng.normal(0, 1, n+2*k); r = np.convolve(r, np.ones(k)/k, "same")[k:k+n]; return r/ (r.std()+1e-6)*amp
Hs, Ws = H*S, W*S
press = np.zeros((Hs, Ws), np.float32); passes = a.layers
for layer in range(passes):
    order = []
    for pa in strokes:
        sp = smooth(pa, 7); n = len(sp)
        if layer: sp = sp + np.stack([lowfreq(n, a.wobble*S*1.0), lowfreq(n, a.wobble*S*1.0)], 1)  # re-stroke: new hand wobble
        else: sp = sp + np.stack([lowfreq(n, a.wobble*S*.5), lowfreq(n, a.wobble*S*.5)], 1)
        ys = np.clip(np.array([p[0] for p in pa]).astype(int), 0, Hs-1); xs = np.clip(np.array([p[1] for p in pa]).astype(int), 0, Ws-1)
        w = smooth(dist[ys, xs], 15); dkn = smooth(dk[ys, xs], 15)
        t = np.arange(n); taper = np.clip(np.minimum(t, n-1-t)/(8*S/3+1), .15, 1)           # pencil lifts at both ends
        pr = np.clip((.35 + 1.1*dkn) * a.tone * (.85 + .15*np.abs(lowfreq(n, 1))) * (.5+.5*taper), 0, 1.2)
        order.append((pr.mean(), sp, np.maximum(1, w*(.55+.45*taper)*(.8 if layer else 1)), pr))
    order.sort(key=lambda o: o[0])
    for _, sp, w, pr in order:
        for i in range(len(sp)-1):
            cv2.line(press, (int(sp[i,1]), int(sp[i,0])), (int(sp[i+1,1]), int(sp[i+1,0])), float(pr[i]), int(max(1, round(w[i]*1.15))), cv2.LINE_AA)

# hatching: the original's soft tone (not line) becomes parallel pencil strokes, pressure from local tone, tapered
if a.hatch > 0:
    tone = cv2.GaussianBlur(dk, (0,0), 2*S) if not a.shade else cv2.GaussianBlur((255-cv2.resize(cv2.imread(a.shade,0),(Ws,Hs))).astype(np.float32)/255*.25, (0,0), 2*S); soft = (tone > .012) & ~ndi.binary_dilation(ink, iterations=2*S)
    ang = np.deg2rad(52); d = np.array([np.cos(ang), np.sin(ang)]); nrm = np.array([-d[1], d[0]]); sp_ = max(3, int(4.2*S*(1.1-a.hatch*.3)))
    diag = int(np.hypot(Hs, Ws)); cen = np.array([Ws/2, Hs/2])
    for off in range(-diag//2, diag//2, sp_):
        base = cen + nrm*(off + rng.normal(0, S*.5)); ts = np.arange(-diag//2, diag//2, 1.0)
        P = base[None,:] + ts[:,None]*d[None,:]; xi = P[:,0].astype(int); yi = P[:,1].astype(int); ok = (xi>=0)&(xi<Ws)&(yi>=0)&(yi<Hs)
        m = np.zeros(len(ts), bool); m[ok] = soft[yi[ok], xi[ok]]
        for run in ndi.find_objects(ndi.label(m)[0]):
            r = run[0]; l = r.stop-r.start
            if l < 7*S: continue
            seg = P[r.start:r.stop] + rng.normal(0, .3*S, (l,2)); ta = np.clip(np.minimum(np.arange(l), l-1-np.arange(l))/(5*S), .1, 1)
            for i in range(0, l-1, 2):
                x0,y0 = seg[i]; x1,y1 = seg[min(i+2,l-1)]; tt = tone[int(np.clip(y0,0,Hs-1)), int(np.clip(x0,0,Ws-1))]
                cv2.line(press, (int(x0),int(y0)), (int(x1),int(y1)), float(np.clip(.55*ta[i]*(.5+8*tt)*a.hatch, 0, .75)), max(1, int(S*.5)), cv2.LINE_AA)
# paper tooth: fibres + pits at several scales
def noise(sig, seed): 
    r = np.random.default_rng(seed).normal(0,1,(Hs,Ws)).astype(np.float32); r = cv2.GaussianBlur(r,(0,0),sig); return (r-r.mean())/r.std()
tooth = .5*noise(.9,1) + .35*noise(2.2,2) + .2*noise(7,3); tooth = (tooth - tooth.min())/(tooth.max()-tooth.min())
press = cv2.GaussianBlur(press, (0,0), .6*S/3)
dep = np.clip((press*1.15 - tooth*a.grain*.75), 0, 1) ** .85                     # graphite lands only where pressure beats the tooth
dep = np.clip(dep + .10*press*tooth*(1-a.grain*.3), 0, 1)                      # a little smudge in the valleys
paper = np.array([226,238,247], np.float32)[None,None,:] * np.ones((Hs,Ws,1), np.float32)          # BGR warm paper
paper *= (0.975 + 0.016*noise(1.2,5) + 0.008*noise(14,6))[...,None]
gcol = np.array([88,66,48] if a.tint=="blue" else [60,60,62], np.float32)     # BGR graphite (blue-grey or neutral)
out = paper*(1-dep[...,None]) + gcol[None,None,:]*dep[...,None]
cv2.imwrite(a.out, np.clip(out,0,255).astype(np.uint8)); print(a.out, len(strokes), "strokes")
