"""Side-by-side: reference | render | silhouette overlay."""
import sys
from PIL import Image
ref, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
n = int(sys.argv[4]) if len(sys.argv) > 4 else 384
ims = [Image.open(ref).convert('RGB').resize((n, n))]
import os
for suf in ('_render.png', '_sil.png'):
    if os.path.exists(prefix + suf): ims.append(Image.open(prefix + suf).convert('RGB').resize((n, n), Image.NEAREST if 'sil' in suf else Image.LANCZOS))
c = Image.new('RGB', (n * len(ims), n))
for i, im in enumerate(ims): c.paste(im, (i * n, 0))
c.save(out)
