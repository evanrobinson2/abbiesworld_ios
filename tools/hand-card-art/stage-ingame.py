"""Hand-card art from the game's own tile tray (render-ingame.cjs, rendered with a transparent background): a low,
close camera on each tile's heart. The tray's grass blades come out see-through, so small holes are filled from the
ground around them; the open sky behind the tile edge becomes a soft day sky. Output is 1440 px wide, sharp enough
for the held card. python3 stage-ingame.py <render.png> <out.webp>"""
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W, H = im.size; q = W / 1024
a = np.array(im).astype(np.float32); rgb, al = a[:, :, :3], a[:, :, 3]
m = (al >= 250).astype(np.float32)
G = lambda x, r: np.array(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
# Sky is the see-through run at the top of each column; any see-through pixel below the first solid one is a blade.
first = np.where(m.any(0), m.argmax(0), H)
hole = (m == 0) & (np.arange(H)[:, None] > first[None, :])
fill = rgb.copy(); known = m.copy()
for r in (3 * q, 8 * q, 20 * q):  # widen until every hole has ground colour
  den = G(known * 255, r); col = np.stack([G(fill[:, :, i] * known, r) for i in range(3)], -1) / np.maximum(den, 1)[:, :, None] * 255
  new = hole & (known == 0) & (den > 8); fill[new] = col[new]; known = np.where(new, 1., known)
res = np.where(m[:, :, None] > 0, rgb, np.where(hole[:, :, None], fill, 0))
alpha = np.where((m > 0) | hole, 255, 0).astype(np.uint8)
fg = Image.fromarray(np.dstack([np.clip(res, 0, 255).astype(np.uint8), alpha]))
t = np.linspace(0, 1, H)[:, None, None]
sky = (np.array([150, 200, 236]) * (1 - t) + np.array([226, 240, 236]) * t) * np.ones((H, W, 3))
img = Image.fromarray(sky.astype(np.uint8)).convert('RGBA'); img.alpha_composite(fg); img = img.convert('RGB')
h = round(W * 52 / 55); img = img.crop((0, H - h, W, H))
img = ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.12)).enhance(1.05)
img.resize((1440, round(1440 * 52 / 55)), Image.LANCZOS).save(out, quality=88)
