"""Read a .unitypackage 2D character (prefab bone hierarchy + .anim clips + sprites) and render frames, to study how a
professional rig is built. Reads text YAML only; nothing is executed. usage: python3 unitypack_render.py <pack.unitypackage> <outdir> <clip> <prefab_name>
Private asset: never commit the extracted art."""
import sys, os, re, math, tarfile, json, collections, numpy as np, cv2
from PIL import Image
pack, out, clip, prefab = sys.argv[1:5]; os.makedirs(out, exist_ok=True); ex = out + "/x"
if not os.path.isdir(ex):
    with tarfile.open(pack, "r:gz") as t:
        for mem in t.getmembers():
            if mem.isfile() and ".." not in mem.name and not mem.name.startswith("/"): t.extract(mem, ex, filter="data")
P = {open(f"{ex}/{d}/pathname").read().split("\n")[0]: d for d in os.listdir(ex) if os.path.exists(f"{ex}/{d}/pathname")}
G = {d: p for p, d in P.items()}
txt = lambda p: open(f"{ex}/{P[p]}/asset", errors="replace").read()
def docs(t):
    for d in re.split(r"\n--- ", t):
        m = re.match(r"!u!(\d+) &(-?\d+)", d.strip()); 
        if m: yield m.group(1), m.group(2), d
GO, TR, SR = {}, {}, {}
for cid, fid, d in docs(txt(f"Assets/Prefabs/{prefab}.prefab")):
    g = lambda pat, dd=d: re.search(pat, dd)
    if cid == "1": GO[fid] = dict(name=g(r"m_Name: (.*)").group(1), active=int(g(r"m_IsActive: (\d)").group(1)))
    elif cid == "4":
        q = [float(v) for v in g(r"m_LocalRotation: \{x: ([-\d.e]+), y: ([-\d.e]+), z: ([-\d.e]+), w: ([-\d.e]+)").groups()]
        TR[fid] = dict(go=g(r"m_GameObject: \{fileID: (-?\d+)").group(1), parent=g(r"m_Father: \{fileID: (-?\d+)").group(1),
            pos=[float(v) for v in g(r"m_LocalPosition: \{x: ([-\d.e]+), y: ([-\d.e]+)").groups()], rot=math.degrees(2*math.atan2(q[2], q[3])),
            sc=[float(v) for v in g(r"m_LocalScale: \{x: ([-\d.e]+), y: ([-\d.e]+)").groups()])
    elif cid == "212":
        gm = re.search(r"m_Sprite: \{fileID: \d+, guid: (\w+)", d)
        SR[g(r"m_GameObject: \{fileID: (-?\d+)").group(1)] = dict(order=int(g(r"m_SortingOrder: (-?\d+)").group(1)), guid=gm.group(1) if gm else None,
            enabled=int(g(r"m_Enabled: (\d)").group(1)), flipx=int(g(r"m_FlipX: (\d)").group(1)) if g(r"m_FlipX: (\d)") else 0)
kids = collections.defaultdict(list)
for f, t in TR.items(): kids[t["parent"]].append(f)
root = [f for f, t in TR.items() if t["parent"] == "0"][0]
path_of, node_of = {}, {}
def walk(f, pre):
    n = GO[TR[f]["go"]]["name"]; pth = n if f == root else (pre + "/" + n if pre else n)
    if f != root: path_of[f] = pth; node_of[pth] = f
    for k in kids[f]: walk(k, "" if f == root else pth)
walk(root, "")
for _p, _f in list(node_of.items()):  # the Animator sits on "base": clip paths are relative to it
    if _p == "base": node_of[""] = _f
    elif _p.startswith("base/"): node_of[_p[5:]] = _f
# sprites
def sprite(guid):
    d = guid; meta = open(f"{ex}/{d}/asset.meta").read(); im = Image.open(f"{ex}/{d}/asset").convert("RGBA")
    ppu = float(re.search(r"spritePixelsToUnits: ([\d.]+)", meta).group(1)); pv = re.search(r"spritePivot: \{x: ([-\d.]+), y: ([-\d.]+)\}", meta); 
    return np.array(im), ppu, (float(pv.group(1)), float(pv.group(2)))
# clip
def keys(block):
    ks = []
    for kt in re.finditer(r"time: ([-\d.e]+)\n\s+value: (\{.*?\}|[-\d.e]+)\n\s+inSlope: (\{.*?\}|[-\d.eInfity]+)\n\s+outSlope: (\{.*?\}|[-\d.eInfity]+)", block):
        val = kt.group(2); vv = [float(x) for x in re.findall(r"[-\d.e]+", val)] if val.startswith("{") else [float(val)]
        ks.append((float(kt.group(1)), np.array(vv), kt.group(3), kt.group(4)))
    return ks
curves = {}
t = txt(f"Assets/Animations/{clip}")
length = float(re.search(r"m_StopTime: ([\d.]+)", t).group(1))
for sec, kind in (("m_EulerCurves", "euler"), ("m_ScaleCurves", "scale"), ("m_PositionCurves", "pos"), ("m_FloatCurves", "float")):
    i = t.find(sec + ":"); 
    if i < 0: continue
    j = min([k for k in (t.find(s + ":", i + 5) for s in ("m_PositionCurves", "m_ScaleCurves", "m_FloatCurves", "m_PPtrCurves", "m_EulerCurves", "m_RotationCurves", "m_Bounds", "m_ClipBindingConstant", "m_AnimationClipSettings")) if k > 0] + [len(t)])
    for blk in re.split(r"\n  - curve:", t[i + len(sec) + 1:j]):
        pm = re.search(r"\n    path: (.*)", blk)
        if not pm: continue
        am = re.search(r"\n    attribute: (\S+)", blk); ks = keys(blk)
        if ks: curves[(kind, pm.group(1), am.group(1) if am else "")] = ks
def ev(ks, tm):
    if len(ks) == 1 or tm <= ks[0][0]: return ks[0][1]
    if tm >= ks[-1][0]: return ks[-1][1]
    for a, b in zip(ks, ks[1:]):
        if a[0] <= tm <= b[0]:
            if "Infinity" in a[3] or "Infinity" in b[2]: return a[1]
            u = (tm - a[0]) / (b[0] - a[0]); h = b[0] - a[0]
            s = lambda x: np.array([float(v) for v in re.findall(r"[-\d.e]+", x)]) if x.startswith("{") else np.array([float(x)])
            m0, m1 = s(a[3]) * h, s(b[2]) * h; h00, h10, h01, h11 = 2*u**3-3*u**2+1, u**3-2*u**2+u, -2*u**3+3*u**2, u**3-u**2
            return h00*a[1] + h10*m0 + h01*b[1] + h11*m1
S = 100.0  # px per unit at output
def render(tm, size=(700, 800), origin=(350, 640)):
    state = {f: dict(rot=TR[f]["rot"], pos=list(TR[f]["pos"]), sc=list(TR[f]["sc"]), active=GO[TR[f]["go"]]["active"]) for f in TR}
    for (kind, pth, attr), ks in curves.items():
        f = node_of.get(pth)
        if f is None: continue
        v = ev(ks, tm % length if length else tm)
        if kind == "euler": state[f]["rot"] = float(v[2])
        elif kind == "scale": state[f]["sc"] = [float(v[0]), float(v[1])]
        elif kind == "pos": state[f]["pos"] = [float(v[0]), float(v[1])]
        elif kind == "float" and attr == "m_IsActive": state[f]["active"] = int(round(float(v[0])))
    world = {}
    def mat(f):
        s = state[f]; c, sn = math.cos(math.radians(s["rot"])), math.sin(math.radians(s["rot"]))
        L = np.array([[c*s["sc"][0], -sn*s["sc"][1], s["pos"][0]], [sn*s["sc"][0], c*s["sc"][1], s["pos"][1]], [0, 0, 1]])
        return L
    def go(f, Mp, act):
        M = Mp @ mat(f); a = act and state[f]["active"]; world[f] = (M, a)
        for k in kids[f]: go(k, M, a)
    go(root, np.eye(3), 1)
    can = np.zeros((size[1], size[0], 3), np.float32) + np.array([138, 128, 120], np.float32)
    items = []
    for f, (M, a) in world.items():
        sr = SR.get(TR[f]["go"])
        if sr and a and sr["enabled"] and sr["guid"]: items.append((sr["order"], f, M, sr))
    for _, f, M, sr in sorted(items, key=lambda q: q[0]):
        img, ppu, pv = sprite(sr["guid"]); h, w = img.shape[:2]
        # sprite pixel (u,v down) -> unit coords: x=(u-pv.x*w)/ppu ; y=(pv.y*h-v)/ppu  (pv.y measured from bottom)
        sx = -1 if sr["flipx"] else 1
        A = np.array([[sx/ppu, 0, -sx*pv[0]*w/ppu], [0, -1/ppu, pv[1]*h/ppu], [0, 0, 1]])
        W = np.array([[S, 0, origin[0]], [0, -S, origin[1]], [0, 0, 1]]) @ M @ A
        wr = cv2.warpAffine(img.astype(np.float32), W[:2], size, flags=cv2.INTER_AREA if False else cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0)); a_ = wr[..., 3:4] / 255.0
        can = can * (1 - a_) + wr[..., :3][..., ::-1] * a_
    return can.clip(0, 255).astype(np.uint8)
if __name__ == "__main__":
    name = clip.split("/")[-1][:-5]; n = 6; frames = [render(length * i / n) for i in range(n)]
    cv2.imwrite(f"{out}/{name}_strip.png", np.hstack(frames)); print(name, length, len(curves), "curves")
