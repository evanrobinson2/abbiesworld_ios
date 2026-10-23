"""Contact sheet of asset renders: python sheet.py out.jpg id id ..."""
import sys, os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', '..', 'prototypes', 'ranch-atelier', 'dist', 'models')
ids = sys.argv[2:]; n = len(ids); c = min(4, n); r = (n + c - 1) // c; S = 360
W = Image.new('RGB', (c * S, r * S), (40, 12, 32)); d = ImageDraw.Draw(W)
for i, id in enumerate(ids):
    p = os.path.join(SITE, 'cafe-' + id.replace('_', '-'), 'render.jpg')
    if os.path.exists(p):
        W.paste(Image.open(p).resize((S, S)), ((i % c) * S, (i // c) * S))
    d.text(((i % c) * S + 8, (i // c) * S + 8), id, fill=(0, 0, 0))
W.save(sys.argv[1], quality=85)
