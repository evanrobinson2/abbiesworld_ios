import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import helmet
p = json.load(open(sys.argv[1])); mode = sys.argv[2]; out = sys.argv[3]; px = int(sys.argv[4]) if len(sys.argv) > 4 else 384
filt = json.loads(sys.argv[5]) if len(sys.argv) > 5 else None
t = time.time(); parts = helmet.setup(p, mode, filt, px, px); print('build', round(time.time() - t, 2), 'tris', helmet.tri_count(parts))
t = time.time(); m = helmet.silhouette(parts, px, px); print('sil', round(time.time() - t, 2))
t = time.time(); helmet.render(out, px, px, 16); print('render', round(time.time() - t, 2))
