"""Renders every pose variant from the hero direction into r/pose_<state>.png and tiles them in r/poses.jpg."""
import sys, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import hero_check
px = int(sys.argv[1]) if len(sys.argv) > 1 else 256
ims = []
for st in ['idle', 'feeding', 'rest']:
    hero_check.main(os.path.join(HERE, 'variants', f'{st}.glb'), os.path.join(HERE, 'r'), px, 8, 60, 14, f'pose_{st}.png', False)
    im = Image.open(os.path.join(HERE, 'r', f'pose_{st}.png')).convert('RGBA'); bg = Image.new('RGB', im.size, (237, 230, 214)); bg.paste(im, (0, 0), im); ims.append(bg)
sheet = Image.new('RGB', (px * 3, px), 'white')
for i, im in enumerate(ims):
    sheet.paste(im, (i * px, 0))
sheet.save(os.path.join(HERE, 'r', 'poses.jpg'), quality=88)
