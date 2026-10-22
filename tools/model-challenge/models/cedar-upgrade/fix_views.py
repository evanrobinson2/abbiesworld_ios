"""Remove the ground band from the turnaround views (it is part of the sheet, not the tree) so the target mask is the tree only."""
import numpy as np
from PIL import Image
import shutil
SKY = np.array([248, 238, 199])
Y0, Y1 = 1480, 1518   # ground band starts ~1484; root flare touches the ground line at ~1520
for v in ['front', 'side', 'back']:
    a = np.asarray(Image.open(f'../../mj/cedar-upgrade/view_{v}.png').convert('RGB')).astype(int).copy()
    for y in range(Y0, Y1):
        edge = np.median(np.concatenate([a[y, :6], a[y, -6:]]), 0)
        d = np.linalg.norm(a[y] - edge, axis=-1) / 255
        a[y][d < 0.10] = SKY
    a = a[:Y1]
    Image.fromarray(a.astype(np.uint8)).save(f'views/view_{v}.png')
shutil.copy('../../mj/cedar-upgrade/hero.png', 'views/hero.png')
