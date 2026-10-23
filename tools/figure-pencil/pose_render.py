"""Pose the sealed base-layer mannequins (female-toned / male-toned) and render a clean line image: heavy silhouette, light part seams.
usage: python3 pose_render.py <male|female> <leap|stride> <out.png> [--yaw 35]
Facing +z, y up. Joint pivots are read from the limb parts' ends. Rotation order per chain is proximal to distal."""
import sys, numpy as np, trimesh, cv2
who, pose, out = sys.argv[1:4]; yaw = float(sys.argv[sys.argv.index("--yaw")+1]) if "--yaw" in sys.argv else 35
G = f"../../prototypes/ranch-atelier/dist/studies/bodies/{who}-toned.glb"
sc = trimesh.load(G); M = {}
for nid in sc.graph.nodes_geometry:
    T, gname = sc.graph[nid]; m = sc.geometry[gname].copy(); m.apply_transform(T); M[gname] = m
def end(name, top=True, k=.02):
    v = M[name].vertices; y = v[:,1].max() if top else v[:,1].min(); s = v[(v[:,1] > y-k) if top else (v[:,1] < y+k)]; return s.mean(0)
def R(ax, deg):
    t = np.deg2rad(deg); c, s = np.cos(t), np.sin(t)
    return {"x": np.array([[1,0,0],[0,c,-s],[0,s,c]]), "y": np.array([[c,0,s],[0,1,0],[-s,0,c]]), "z": np.array([[c,-s,0],[s,c,0],[0,0,1]])}[ax]
def Rm(*rs):
    m = np.eye(3)
    for ax, d in rs: m = R(ax, d) @ m
    return m
J = {}
for s in "lr":
    J[f"sh_{s}"] = end(f"arm_upper_{s}", True, .03); J[f"el_{s}"] = end(f"arm_upper_{s}", False, .02); J[f"wr_{s}"] = end(f"arm_lower_{s}", False, .02)
    J[f"hip_{s}"] = end(f"leg_upper_{s}", True, .02); J[f"kn_{s}"] = end(f"leg_upper_{s}", False, .02); J[f"an_{s}"] = end(f"leg_lower_{s}", False, .02)
pelvis = np.array([0, J["hip_l"][1], 0]); foot = lambda s: [f"foot_{s}", f"foot_mid_{s}", f"foot_front_{s}"]
M = {n: m for n, m in M.items() if not n.startswith("abs_")}
UP = [n for n in M if n in ("torso","head","neck","sports_top") or n.startswith("deltoid")]
chains = {}
for s in "lr":
    chains[f"arm_{s}"] = [([f"deltoid_{s}", f"arm_upper_{s}"], f"sh_{s}"), ([f"arm_lower_{s}"], f"el_{s}"), ([f"hand_{s}"], f"wr_{s}")]
    chains[f"leg_{s}"] = [([f"leg_upper_{s}", f"briefs_leg_{s}"], f"hip_{s}"), ([f"leg_lower_{s}"], f"kn_{s}"), (foot(s), f"an_{s}")]
# angles per pose: arm/leg chain -> list of rotation lists per level (axis, deg)
P = {"leap": dict(lean=-14, root=[("z", 0)],
        arm_l=[[("z", -168)], [("z", -10)], []], arm_r=[[("z", 120), ("x", -25)], [("x", -75)], []],
        leg_l=[[("x", -78)], [("x", 70)], [("x", 25)]], leg_r=[[("x", 28)], [("x", 105)], [("x", 30)]]),
     "stride": dict(lean=8, root=[],
        arm_l=[[("x", 38)], [("x", -50)], []], arm_r=[[("x", -42)], [("x", -55)], []],
        leg_l=[[("x", -42)], [("x", 18)], [("x", -4)]], leg_r=[[("x", 32)], [("x", 62)], [("x", 14)]])}[pose]
if who == "female":  # same pose language, hands a little softer
    pass
V = {n: m.vertices.copy() for n, m in M.items()}; Jp = {k: v.copy() for k, v in J.items()}
for ch, levels in chains.items():
    for i, rots in enumerate(P[ch]):
        if not rots: continue
        Rt = Rm(*rots); piv = Jp[levels[i][1]].copy()
        for names, _ in levels[i:]:
            for n in names: V[n] = (V[n]-piv) @ Rt.T + piv
        for _, jn in levels[i:]: Jp[jn] = (Jp[jn]-piv) @ Rt.T + piv
# lean the whole upper body (and arms) about the pelvis
Rl = R("x", P["lean"]); 
upper = set(UP) | {n for ch in ("arm_l","arm_r") for names, _ in chains[ch] for n in names}
for n in upper: V[n] = (V[n]-pelvis) @ Rl.T + pelvis
# camera: yaw about y, orthographic
Ry = R("y", yaw); allv = np.vstack([V[n] for n in V]) @ Ry.T
x0, x1 = allv[:,0].min(), allv[:,0].max(); y0, y1 = allv[:,1].min(), allv[:,1].max()
Wp, Hp = 768, 1152; sc_ = min((Wp*.82)/(x1-x0), (Hp*.88)/(y1-y0)); ox = Wp/2 - (x0+x1)/2*sc_; oy = Hp/2 + (y0+y1)/2*sc_
depth = np.full((Hp, Wp), -1e9, np.float32); pid = np.full((Hp, Wp), -1, np.int16); nrm = np.zeros((Hp, Wp, 3), np.float32); names = list(M)
for k, n in enumerate(names):
    v = V[n] @ Ry.T; f = M[n].faces; fn = np.cross(v[f[:,1]]-v[f[:,0]], v[f[:,2]]-v[f[:,0]]); fn /= (np.linalg.norm(fn, axis=1, keepdims=True)+1e-9)
    sx = v[:,0]*sc_+ox; sy = -v[:,1]*sc_+oy
    for ti, tri in enumerate(f):
        xs, ys, zs = sx[tri], sy[tri], v[tri,2]; xa, xb = int(max(0, np.floor(xs.min()))), int(min(Wp-1, np.ceil(xs.max()))); ya, yb = int(max(0, np.floor(ys.min()))), int(min(Hp-1, np.ceil(ys.max())))
        if xb < xa or yb < ya: continue
        gx, gy = np.meshgrid(np.arange(xa, xb+1)+.5, np.arange(ya, yb+1)+.5)
        d = (ys[1]-ys[2])*(xs[0]-xs[2]) + (xs[2]-xs[1])*(ys[0]-ys[2])
        if abs(d) < 1e-9: continue
        l0 = ((ys[1]-ys[2])*(gx-xs[2]) + (xs[2]-xs[1])*(gy-ys[2]))/d; l1 = ((ys[2]-ys[0])*(gx-xs[2]) + (xs[0]-xs[2])*(gy-ys[2]))/d; l2 = 1-l0-l1
        m = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4); z = l0*zs[0]+l1*zs[1]+l2*zs[2]
        sub = depth[ya:yb+1, xa:xb+1]; up = m & (z > sub)
        sub[up] = z[up]; pid[ya:yb+1, xa:xb+1][up] = k; nrm[ya:yb+1, xa:xb+1][up] = fn[ti]
mask = pid >= 0; img = np.full((Hp, Wp), 255, np.float32)
def edge(a): 
    return cv2.morphologyEx(a.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3,3), np.uint8)) > 0
sil = edge(mask)
dz = cv2.Sobel(np.where(mask, depth, 0).astype(np.float32), cv2.CV_32F, 1, 0) ** 2 + cv2.Sobel(np.where(mask, depth, 0).astype(np.float32), cv2.CV_32F, 0, 1) ** 2
jump = (np.sqrt(dz) > .02*sc_/10) & mask
seam = (np.zeros_like(mask)); pg = pid.astype(np.int32)
seam = (pg != np.roll(pg, 1, 1)) | (pg != np.roll(pg, 1, 0)); seam &= mask
crease = np.zeros_like(mask)
dn = (nrm * np.roll(nrm, 1, 1)).sum(2); dn2 = (nrm * np.roll(nrm, 1, 0)).sum(2); crease = ((dn < .55) | (dn2 < .55)) & mask
img[crease] = np.minimum(img[crease], 120); img[seam] = np.minimum(img[seam], 70); img[jump] = np.minimum(img[jump], 60)
sil_t = cv2.dilate(sil.astype(np.uint8), np.ones((3,3), np.uint8)) > 0; img[sil_t] = 20
L_ = np.array([-.5, .6, .65]); L_ /= np.linalg.norm(L_); shade = np.where(mask, np.clip(.6 - (nrm @ L_), 0, 1), 0)
cv2.imwrite(out.replace(".png", "_shade.png"), (255 - shade*255).astype(np.uint8))
cv2.imwrite(out, img.astype(np.uint8)); print(out, int(mask.sum()))
