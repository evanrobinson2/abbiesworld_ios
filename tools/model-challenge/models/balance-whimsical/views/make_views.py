"""Clean the Midjourney views for scoring: paint out the cast-shadow streak that runs across the floor
on either side of the base (the harness mask otherwise reads it as part of the object), and drop the
'side' view (it is a third front-on pose with the beam spanning the frame, not a +X side view)."""
import os, numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); MJ = os.path.join(H, '../../../mj/balance-whimsical')
CUT = {'front': (1340, 318, 612), 'back': (1340, 276, 568)}   # (first floor row, base x0, base x1)
for v, (y0, x0, x1) in CUT.items():
    a = np.asarray(Image.open(os.path.join(MJ, f'view_{v}.png')).convert('RGB')).copy()
    for y in range(y0, 1452):          # paint each floor row with the clean wall colour just above it
        bg = a[y0 - 6, 2:8].mean(0).astype(np.uint8)
        a[y, :x0] = bg; a[y, x1:] = bg
    Image.fromarray(a).save(os.path.join(H, f'view_{v}.png'))
