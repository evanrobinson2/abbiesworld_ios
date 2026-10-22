"""Render the figure from several azimuths (turntable/proof sheet). usage: views.py params out.png level az1,az2,..."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build
from PIL import Image
p = json.load(open(sys.argv[1])); out = sys.argv[2]; level = int(sys.argv[3]); azs = [float(a) for a in sys.argv[4].split(',')]
px = int(sys.argv[5]) if len(sys.argv) > 5 else 384
samples = int(sys.argv[6]) if len(sys.argv) > 6 else 24
tiles = []
for i, az in enumerate(azs):
    q = json.loads(json.dumps(p)); q['cam']['az'] = p['cam'].get('az', 0) + az
    build.setup(q, level=level, W=px, H=px)
    path = out.replace('.png', f'_{i:03d}.png'); build.render(path, px, px, samples=samples)
    tiles.append(Image.open(path).convert('RGB'))
sheet = Image.new('RGB', (px * len(tiles), px))
for i, t in enumerate(tiles): sheet.paste(t, (i * px, 0))
sheet.save(out)
