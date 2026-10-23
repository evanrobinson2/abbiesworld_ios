"""Stages the Moonbase card (Evan, 2026-10-23: "stage a new moonbase scene for the card", "the moonbase isn't rendered"):
the remastered Moon from the game's own tile tray, seen from beside the buggy towards the glass domes, under a black
sky with stars and the Earth. python3 moon-sky.py <tray-render.png> <out.webp>"""
import sys, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
src, out = sys.argv[1], sys.argv[2]
fg = Image.open(src).convert('RGBA'); W, H = fg.size
sky = np.zeros((H, W, 3), np.float32)
t = np.linspace(0, 1, H)[:, None]
sky[:] = (np.array([8, 10, 26]) * (1 - t) + np.array([28, 34, 70]) * t)[:, None, :][:, 0, :][:, None, :]
sky = Image.fromarray(sky.astype(np.uint8)); d = ImageDraw.Draw(sky); rnd = random.Random(7)
for _ in range(int(W * H / 9000)):
  x, y, r = rnd.uniform(0, W), rnd.uniform(0, H * .45), rnd.choice([1, 1, 1, 1.5, 2, 2.6])
  a = rnd.randint(150, 255); d.ellipse((x - r, y - r, x + r, y + r), fill=(a, a, min(255, a + 15)))
# The Earth, low on the left: ocean disc, two cloud swirls, a lit limb.
ex, ey, er = W * .2, H * .13, W * .07
earth = Image.new('RGBA', (W, H)); e = ImageDraw.Draw(earth)
e.ellipse((ex - er * 1.35, ey - er * 1.35, ex + er * 1.35, ey + er * 1.35), fill=(90, 150, 255, 60))
earth = earth.filter(ImageFilter.GaussianBlur(er * .25)); e = ImageDraw.Draw(earth)
e.ellipse((ex - er, ey - er, ex + er, ey + er), fill=(46, 110, 196, 255))
e.ellipse((ex - er * .55, ey - er * .35, ex + er * .1, ey + er * .5), fill=(86, 150, 84, 255))
e.ellipse((ex - er * .1, ey - er * .8, ex + er * .7, ey - er * .2), fill=(240, 246, 255, 230))
e.ellipse((ex - er * .8, ey + er * .35, ex + er * .2, ey + er * .7), fill=(240, 246, 255, 210))
shade = Image.new('L', (W, H), 0); ImageDraw.Draw(shade).ellipse((ex - er * .55, ey - er * .9, ex + er * 1.5, ey + er * 1.2), fill=150)
shade = shade.filter(ImageFilter.GaussianBlur(er * .2)); mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).ellipse((ex - er, ey - er, ex + er, ey + er), fill=255)
earth.paste((10, 14, 40, 255), (0, 0), Image.fromarray(np.minimum(np.array(shade), np.array(mask))))
sky = sky.convert('RGBA'); sky.alpha_composite(earth); sky.alpha_composite(fg)
img = sky.convert('RGB')
h = round(W * 52 / 55); img = img.crop((0, H - h, W, H))
img = ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.15)).enhance(1.06)
img.resize((1440, round(1440 * 52 / 55)), Image.LANCZOS).save(out, quality=88)
print(out, img.size)
