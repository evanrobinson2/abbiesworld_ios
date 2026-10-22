"""Spin the figure (not the camera) for N views. usage: spin.py params out.png n px samples"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build
from PIL import Image
p = json.load(open(sys.argv[1])); out = sys.argv[2]; n = int(sys.argv[3]); px = int(sys.argv[4]); smp = int(sys.argv[5])
tiles = []
for i in range(n):
    q = json.loads(json.dumps(p)); q['fig']['yaw'] = p['fig']['yaw'] + 360 / n * i
    build.setup(q, level=2, W=px, H=px); f = out.replace('.png', f'_{i:02d}.png'); build.render(f, px, px, samples=smp); tiles.append(Image.open(f).convert('RGB'))
s = Image.new('RGB', (px * n, px)); [s.paste(t, (i * px, 0)) for i, t in enumerate(tiles)]; s.save(out)
tiles[0].save(out.replace('.png', '.gif'), save_all=True, append_images=tiles[1:], duration=300, loop=0)
