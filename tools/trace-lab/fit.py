"""Landmark fit + render-and-compare loop for the 2D mannequin, against a Midjourney sketch (the intended thing).
usage: python3 fit.py <src.png> <outdir>
Round 0 = landmarks read by eye off a grid (what we do today). Round 1 = same puppet after a hill-climb that
renders the puppet, compares it to the picture's silhouette + ink, and keeps changes that score better."""
import sys, os, json, numpy as np, cv2
from scipy import ndimage as ndi
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
img = cv2.imread(src); H, W = img.shape[:2]; K = 2
g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0,0), .8)
d = np.clip(cv2.GaussianBlur(g,(0,0),30) - g, 0, None); ink = d > max(10, d.max()*.18)
sil = ndi.binary_fill_holes(ndi.binary_closing(ink, iterations=3)); sil = ndi.binary_opening(sil, iterations=2)
dink = ndi.distance_transform_edt(~ink)
# landmarks (original px), read off the 32px grid
L = dict(head=(74,156), neck=(102,172), chest=(122,200), waist=(135,225), pelvis=(190,242),
  sA=(108,148), eA=(120,86), wA=(182,62), hA=(192,78),
  sB=(124,158), eB=(172,108), wB=(190,80), hB=(192,66),
  sC=(150,190), eC=(248,152), wC=(300,98), hC=(340,58),
  hip=(182,260), kS=(162,385), aS=(102,480), tS=(80,526),
  kK=(260,332), aK=(315,265), tK=(328,240))
# parts: (name, a, b, width_a, width_b)  capsule/tapered limb between two landmarks
P = [("upperarmA","sA","eA",13,10),("forearmA","eA","wA",10,8),("handA","wA","hA",9,6),
 ("upperarmB","sB","eB",13,10),("forearmB","eB","wB",10,8),("handB","wB","hB",9,5),
 ("upperarmC","sC","eC",12,9),("forearmC","eC","wC",10,6),("handC","wC","hC",6,3),
 ("thighK","hip","kK",26,16),("shinK","kK","aK",16,8),("footK","aK","tK",8,4),
 ("thighS","hip","kS",24,14),("shinS","kS","aS",14,8),("footS","aS","tS",8,3),
 ("chest","neck","waist",40,34),("abdomen","waist","pelvis",32,36),("neckp","head","neck",9,9)]
def draw(Lm, Wd, scale=K, outline=False):
    m = np.zeros((H*scale, W*scale), np.uint8)
    def pt(k): return (int(Lm[k][0]*scale), int(Lm[k][1]*scale))
    for i,(n,a,b,wa,wb) in enumerate(P):
        pa, pb = np.array(Lm[a],float), np.array(Lm[b],float); wa, wb = Wd[i]
        v = pb-pa; l = np.linalg.norm(v)+1e-6; nrm = np.array([-v[1],v[0]])/l
        poly = np.array([pa+nrm*wa/2, pb+nrm*wb/2, pb-nrm*wb/2, pa-nrm*wa/2])*scale
        cv2.fillConvexPoly(m, poly.astype(np.int32), 255)
        cv2.circle(m, pt(a), max(1,int(wa/2*scale)), 255, -1); cv2.circle(m, pt(b), max(1,int(wb/2*scale)), 255, -1)
    cv2.ellipse(m, pt("head"), (int(24*scale), int(26*scale)), 20, 0, 360, 255, -1)
    cv2.ellipse(m, pt("pelvis"), (int(30*scale), int(24*scale)), 30, 0, 360, 255, -1)
    return m>0
def score(Lm, Wd):
    m = draw(Lm, Wd, 1); inter = (m&sil).sum(); iou = inter/ (m|sil).sum()
    edge = m ^ ndi.binary_erosion(m); ch = dink[edge].mean() if edge.any() else 99
    return float(iou), float(ch)
def loss(Lm, Wd): i,c = score(Lm,Wd); return (1-i)+0.01*c
Wd = [[wa,wb] for (_,_,_,wa,wb) in P]
i0,c0 = score(L, Wd); print("round0 iou %.3f chamfer %.2f"%(i0,c0))
rng = np.random.default_rng(7); best = loss(L,Wd); Lb = {k:list(v) for k,v in L.items()}; Wb = [w[:] for w in Wd]; hist=[(0,i0,c0)]
for it in range(1,4001):
    L2 = {k:list(v) for k,v in Lb.items()}; W2 = [w[:] for w in Wb]
    s = 6*(1-it/4500)+0.8
    for _ in range(rng.integers(1,3)):
        if rng.random()<.7: k = rng.choice(list(L2)); L2[k][0]+=rng.normal(0,s); L2[k][1]+=rng.normal(0,s)
        else: j = rng.integers(len(W2)); W2[j][rng.integers(2)] = max(2, W2[j][rng.integers(2)]+rng.normal(0,s*.5))
    l = loss(L2,W2)
    if l < best: best, Lb, Wb = l, L2, W2
    if it%500==0: i,c = score(Lb,Wb); hist.append((it,i,c)); print(it, "iou %.3f chamfer %.2f"%(i,c))
i1,c1 = score(Lb,Wb)
def save(Lm, Wd, name):
    m = draw(Lm, Wd, K); o = np.full((H*K,W*K,3),255,np.uint8)
    base = cv2.resize(img,(W*K,H*K)); a = (m*0.0)
    o[m] = (250,244,238); e = m ^ ndi.binary_erosion(m, iterations=2); o[e] = (143,95,47)
    cv2.imwrite(f"{out}/{name}.png", o)
    ov = cv2.resize(img,(W*K,H*K)).copy(); ov[e] = (0,0,230); cv2.imwrite(f"{out}/{name}_overlay.png", ov)
save(L,Wd,"puppet_round0"); save(Lb,Wb,"puppet_round1")
json.dump(dict(round0=dict(iou=i0,chamfer=c0), round1=dict(iou=i1,chamfer=c1), history=hist, landmarks_round0=L, landmarks_round1=Lb, widths_round1=Wb), open(f"{out}/fit.json","w"), indent=1)
print("round1 iou %.3f chamfer %.2f"%(i1,c1))
