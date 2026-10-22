"""Loss v2: whole-figure terms plus part crops at 512 px, and a style term that separates clean folds from noise.

Parts (boxes in reference pixels at 1024): the parts Evan named as carrying the look.
style: distance between distributions of (gradient magnitude) and (edge coherence) inside the figure.
  Folded paper = flat planes plus sharp, straight creases: many near-zero gradients, a tail of strong
  coherent edges. Crumple noise = lots of medium, incoherent gradients.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.metrics import structural_similarity
import loss as L1

N2 = 512
PARTS = {  # x0, y0, x1, y1 at 1024
    'crest_helmet': (430, 60, 580, 290),
    'shoulders': (330, 240, 640, 420),
    'shield': (580, 330, 780, 790),
    'skirt': (380, 470, 640, 710),
    'legs_feet': (360, 690, 690, 990),
}
W2 = dict(sil=0.25, cham=1.5, ssim=0.1, tone=0.4, parts_iou=0.35, parts_ssim=0.15, style=0.4)

def load_rgb(path): return L1.load_rgb(path, N2)
def load_mask(path): return L1.load_mask(path, N2)

def crop(a, box):
    s = N2 / 1024
    x0, y0, x1, y1 = [int(round(v * s)) for v in box]
    return a[y0:y1, x0:x1]

def coherence(g):
    gx, gy = ndi.sobel(g, 1), ndi.sobel(g, 0)
    jxx = ndi.gaussian_filter(gx * gx, 1.5); jyy = ndi.gaussian_filter(gy * gy, 1.5); jxy = ndi.gaussian_filter(gx * gy, 1.5)
    tr = jxx + jyy
    disc = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2)
    return disc / (tr + 1e-6), np.hypot(gx, gy)

def hist_emd(a, b, bins, rng):
    ha, _ = np.histogram(a, bins=bins, range=rng); hb, _ = np.histogram(b, bins=bins, range=rng)
    ha = ha / max(ha.sum(), 1); hb = hb / max(hb.sum(), 1)
    return float(np.abs(np.cumsum(ha) - np.cumsum(hb)).sum() / bins)

def style_term(g_r, g_t, m_r, m_t):
    inner_r = ndi.binary_erosion(m_r, iterations=3); inner_t = ndi.binary_erosion(m_t, iterations=3)
    c_r, mag_r = coherence(g_r); c_t, mag_t = coherence(g_t)
    e1 = hist_emd(mag_r[inner_r], mag_t[inner_t], 40, (0, 1.5))
    strong_r = inner_r & (mag_r > 0.15); strong_t = inner_t & (mag_t > 0.15)
    e2 = hist_emd(c_r[strong_r], c_t[strong_t], 20, (0, 1)) if strong_r.sum() > 20 else 1.0
    return 0.5 * e1 * 10 + 0.5 * e2 * 4, e1, e2

def score(m_r, m_t, rgb_r, rgb_t):
    """m_r, m_t at N2; rgb at N2."""
    s, c = L1.sil_terms(m_r, m_t)
    g_r, g_t = rgb_r.mean(-1), rgb_t.mean(-1)
    t = dict(sil=float(s), cham=float(c))
    t['ssim'] = 1 - structural_similarity(g_r, g_t, data_range=1.0)
    small = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((64, 64), Image.BOX)) / 255.0
    t['tone'] = float(np.abs(small(rgb_r) - small(rgb_t)).mean())
    pi, ps = [], []
    for k, box in PARTS.items():
        a, b = crop(m_r, box), crop(m_t, box)
        iou = (a & b).sum() / max((a | b).sum(), 1)
        ss = structural_similarity(crop(g_r, box), crop(g_t, box), data_range=1.0)
        t['iou_' + k] = float(iou); t['ssim_' + k] = float(ss)
        pi.append(1 - iou); ps.append(1 - ss)
    t['parts_iou'] = float(np.mean(pi)); t['parts_ssim'] = float(np.mean(ps))
    st, e1, e2 = style_term(g_r, g_t, m_r, m_t)
    t['style'] = float(st); t['style_mag'] = e1; t['style_coh'] = e2
    t['total'] = float(sum(W2[k] * t[k] for k in W2))
    return t
