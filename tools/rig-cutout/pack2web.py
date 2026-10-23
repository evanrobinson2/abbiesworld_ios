"""Export a Unity 2D character pack (prefab + clips + sprites) to a neutral rig.json + sprites/ for the web studio.
usage: python3 pack2web.py <pack.unitypackage> <outdir> <prefab_name> <clip_folder> [clip ...]   (private art: never commit the output)"""
import sys, os, re, json, runpy, shutil
pack, out, prefab, folder = sys.argv[1:5]; clips = sys.argv[5:]; os.makedirs(out + "/sprites", exist_ok=True)
lib = lambda clip: runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "unitypack_render.py"), run_name="lib") if False else None
def load(clip):
    sys.argv = ["x", pack, out + "/_x", f"{folder}/{clip}.anim", prefab]
    return runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "unitypack_render.py"), run_name="lib")
g = load(clips[0]); TR, GO, SR, G = g["TR"], g["GO"], g["SR"], g["G"]; root = g["root"]; node_of = g["node_of"]; path_of = g["path_of"]
order = []; idx = {}
def add(f):
    idx[f] = len(order); order.append(f)
    for k in g["kids"][f]: add(k)
add(root)
nodes = []
for f in order:
    t = TR[f]; nodes.append(dict(name=GO[t["go"]]["name"], path=path_of.get(f, ""), parent=idx.get(t["parent"], -1), pos=t["pos"], rot=round(t["rot"], 4), scale=t["sc"], active=GO[t["go"]]["active"]))
sprites = {}; atts = []
for f in order:
    sr = SR.get(TR[f]["go"])
    if not sr or not sr["guid"]: continue
    if not os.path.exists(f"{g['ex']}/{sr['guid']}/asset.meta"): continue
    img, ppu, pv = g["sprite"](sr["guid"]); nm = os.path.basename(G[sr["guid"]])[:-4]
    if nm not in sprites:
        shutil.copy(f"{g['ex']}/{sr['guid']}/asset", f"{out}/sprites/{nm}.png"); sprites[nm] = dict(w=int(img.shape[1]), h=int(img.shape[0]), ppu=ppu, pivot=list(pv))
    atts.append(dict(node=idx[f], sprite=nm, order=sr["order"], enabled=sr["enabled"], flipx=sr["flipx"]))
def num(s): return None if "Infinity" in s else [float(v) for v in re.findall(r"[-\d.e]+", s)]
cl = {}
for c in clips:
    gg = load(c); curves = []
    for (kind, pth, attr), ks in gg["curves"].items():
        f = gg["node_of"].get(pth)
        if f is None or f not in idx: continue
        curves.append(dict(node=idx[f], kind=kind, attr=attr, keys=[dict(t=k[0], v=[float(x) for x in k[1]], i=num(k[2]), o=num(k[3])) for k in ks]))
    cl[c] = dict(length=gg["length"], loop=c not in ("jump_start", "jump_midair", "jump_land", "hurt"), curves=curves)
json.dump(dict(source=prefab, nodes=nodes, sprites=sprites, attachments=atts, clips=cl), open(out + "/rig.json", "w"))
print(len(nodes), "nodes", len(atts), "attachments", len(sprites), "sprites", {k: len(v["curves"]) for k, v in cl.items()})
