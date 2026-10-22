"""Split a Midjourney turnaround sheet into one image per view.

    python3 split_views.py sheet.png out_dir front side back

Midjourney lays the panels out in equal widths. Each cut starts at the 1/n
mark and snaps to a visible seam line within 2% of it when there is one (a
column that differs from its neighbour down most of the image height). Writes
view_<name>.png per panel.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def seams(gray, n):
    d = np.median(np.abs(np.diff(gray, axis=1)), axis=0)
    w = gray.shape[1]
    s = int(w * 0.02)
    cuts = [0]
    for k in range(1, n):
        c = round(w * k / n)
        i = c - s + int(np.argmax(d[c - s:c + s]))
        cuts.append(i + 1 if d[i] >= 2 * max(np.median(d), 1) else c)
    return cuts + [w]


def main(src, out_dir, *names):
    names = names or ("front", "side", "back")
    im = Image.open(src).convert("RGB")
    gray = np.asarray(im.convert("L")).astype(float)
    cuts = seams(gray, len(names))
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name, a, b in zip(names, cuts, cuts[1:]):
        # Trim a few pixels so the seam line itself is not in either view.
        im.crop((a + 4, 0, b - 4, im.height)).save(out / f"view_{name}.png")
        print(name, a, b)


if __name__ == "__main__":
    main(*sys.argv[1:])
