"""Side-by-side of mj hero and r/hero.png (cropped to the model) into the given output path."""
import sys, numpy as np
from PIL import Image
im = Image.open('r/hero.png'); a = np.asarray(im)[..., 3] > 0; ys, xs = np.where(a)
pad = 10; im = im.crop((xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad))
bg = Image.new('RGBA', im.size, (237, 230, 214, 255)); bg.alpha_composite(im)
bg = bg.resize((round(bg.width * 560 / bg.height), 560))
h = Image.open('../../mj/cedar-upgrade/hero.png').convert('RGBA').crop((380, 80, 1650, 1880)).resize((395, 560))
c = Image.new('RGBA', (h.width + bg.width + 10, 560), 'white'); c.paste(h, (0, 0)); c.paste(bg, (h.width + 10, 0)); c.save(sys.argv[1])
