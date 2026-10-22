"""Helmet loss. Every term is 0 when perfect, so the total goes down as the model improves.

Whole-image terms
  sil    1 - IoU of the helmet silhouettes
  cham   symmetric chamfer distance between the outlines, as a fraction of image size
  ssim   1 - SSIM of the grey images
  tone   mean absolute RGB error at 64 x 64 (backdrop, exposure, shadow)
Part crops (boxes in reference pixels at 1024, scored at the evaluation resolution)
  parts_iou, parts_ssim   mean over crest, brow, near cheek guard, far cheek guard, neck guard
Landmarks
  kp     mean distance between 6 projected model points (crest ends, cheek tips, neck-guard tip, near boss) and
         the same points clicked on the reference, as a fraction of image size. Breaks front/back ambiguity.
Style terms (inside the helmet only)
  style   distance between the distributions of gradient strength and edge coherence. Folded paper is flat
          planes plus a few sharp straight creases; crumple noise is lots of medium, incoherent gradients.
  straight  share of the crease ink that lies on straight segments (probabilistic Hough), compared with the
          reference. Folded paper creases are straight; crumple noise is short and wiggly. Added after round 1,
          where the style and crease terms both rewarded the crumple filter.
  crease  chamfer distance between the crease lines (Canny edges) of render and reference. A crease in the
          wrong place, a missing crease and a noise edge all cost; flat planes with creases in the right
          places are what scores well. This is the term that does not reward noise.
"""
import math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.metrics import structural_similarity
from skimage.feature import canny

PARTS = {
    'crest': (330, 80, 790, 470),
    'brow': (280, 290, 790, 560),
    'cheek_near': (410, 540, 720, 945),
    'cheek_far': (270, 560, 430, 930),
    'neck_guard': (680, 560, 860, 800),
}
W = dict(straight=1.0, kp=3.0, sil=0.25, cham=1.5, ssim=0.1, tone=0.4, parts_iou=0.35, parts_ssim=0.15, style=0.4, crease=6.0)

def load_rgb(path, n): return np.asarray(Image.open(path).convert('RGB').resize((n, n), Image.LANCZOS)).astype(np.float64) / 255.0
def load_mask(path, n): return np.asarray(Image.open(path).convert('L').resize((n, n), Image.BILINEAR)) > 127

def outline(m): return m & ~ndi.binary_erosion(m)

def sil_terms(m_r, m_t):
    iou = (m_r & m_t).sum() / max((m_r | m_t).sum(), 1)
    if m_r.sum() == 0: return 1.0, 1.0
    dt_t = ndi.distance_transform_edt(~outline(m_t)); dt_r = ndi.distance_transform_edt(~outline(m_r))
    cham = 0.5 * (dt_t[outline(m_r)].mean() + dt_r[outline(m_t)].mean()) / m_t.shape[0]
    return 1 - iou, cham

def crop(a, box):
    s = a.shape[0] / 1024
    x0, y0, x1, y1 = [int(round(v * s)) for v in box]
    return a[y0:y1, x0:x1]

def coherence(g):
    gx, gy = ndi.sobel(g, 1), ndi.sobel(g, 0)
    jxx = ndi.gaussian_filter(gx * gx, 1.5); jyy = ndi.gaussian_filter(gy * gy, 1.5); jxy = ndi.gaussian_filter(gx * gy, 1.5)
    return np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-6), np.hypot(gx, gy)

def hist_emd(a, b, bins, rng):
    ha, _ = np.histogram(a, bins=bins, range=rng); hb, _ = np.histogram(b, bins=bins, range=rng)
    ha = ha / max(ha.sum(), 1); hb = hb / max(hb.sum(), 1)
    return float(np.abs(np.cumsum(ha) - np.cumsum(hb)).sum() / bins)

def style_term(g_r, g_t, m_r, m_t):
    ir = ndi.binary_erosion(m_r, iterations=3); it = ndi.binary_erosion(m_t, iterations=3)
    c_r, mag_r = coherence(g_r); c_t, mag_t = coherence(g_t)
    e1 = hist_emd(mag_r[ir], mag_t[it], 40, (0, 1.5))
    sr = ir & (mag_r > 0.15); st = it & (mag_t > 0.15)
    e2 = hist_emd(c_r[sr], c_t[st], 20, (0, 1)) if sr.sum() > 20 else 1.0
    return 0.5 * e1 * 10 + 0.5 * e2 * 4

def creases(g, m):
    inner = ndi.binary_erosion(m, iterations=max(2, g.shape[0] // 128))
    return canny(g, sigma=max(1.0, g.shape[0] / 384), low_threshold=0.04, high_threshold=0.10) & inner

def crease_term(g_r, g_t, m_r, m_t):
    er, et = creases(g_r, m_r), creases(g_t, m_t)
    if er.sum() < 10: return 0.2
    dt_t = ndi.distance_transform_edt(~et); dt_r = ndi.distance_transform_edt(~er)
    n = g_r.shape[0]
    cap = 0.06 * n  # an edge farther than this from any reference crease counts as fully wrong
    return float(0.5 * (np.minimum(dt_t[er], cap).mean() + np.minimum(dt_r[et], cap).mean()) / n)

def kp_term(kp, ref):
    d = [math.hypot(kp[k][0] - ref[k][0], kp[k][1] - ref[k][1]) for k in ref if not k.startswith('_') and k in kp]
    return float(np.mean(d) / 1024) if d else 0.0

def straightness(g, m):
    from skimage.transform import probabilistic_hough_line
    from skimage.draw import line as dl
    e = creases(g, m)
    if e.sum() < 10: return 0.0
    lines = probabilistic_hough_line(e, threshold=5, line_length=int(0.035 * g.shape[0]), line_gap=2, rng=0)
    cov = np.zeros_like(e)
    for (x0, y0), (x1, y1) in lines:
        rr, cc = dl(y0, x0, y1, x1); cov[rr, cc] = 1
    cov = ndi.binary_dilation(cov, iterations=1)
    return float((e & cov).sum() / e.sum())

_ST = {}
def score(m_r, m_t, rgb_r=None, rgb_t=None, kp=None, kp_ref=None):
    s, c = sil_terms(m_r, m_t)
    t = dict(sil=float(s), cham=float(c), kp=kp_term(kp, kp_ref) if kp else 0.0)
    pi, ps = [], []
    for k, box in PARTS.items():
        a, b = crop(m_r, box), crop(m_t, box)
        iou = (a & b).sum() / max((a | b).sum(), 1); t['iou_' + k] = float(iou); pi.append(1 - iou)
    t['parts_iou'] = float(np.mean(pi))
    if rgb_r is None:
        t['total'] = float(W['kp'] * t['kp'] + W['sil'] * t['sil'] + W['cham'] * t['cham'] + W['parts_iou'] * t['parts_iou'])
        return t
    g_r, g_t = rgb_r.mean(-1), rgb_t.mean(-1)
    t['ssim'] = 1 - structural_similarity(g_r, g_t, data_range=1.0)
    for k, box in PARTS.items():
        ss = structural_similarity(crop(g_r, box), crop(g_t, box), data_range=1.0); t['ssim_' + k] = float(ss); ps.append(1 - ss)
    t['parts_ssim'] = float(np.mean(ps))
    small = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((64, 64), Image.BOX)) / 255.0
    t['tone'] = float(np.abs(small(rgb_r) - small(rgb_t)).mean())
    t['style'] = float(style_term(g_r, g_t, m_r, m_t))
    t['crease'] = crease_term(g_r, g_t, m_r, m_t)
    key = g_t.shape[0]
    if key not in _ST: _ST[key] = straightness(g_t, m_t)
    t['straight_r'] = straightness(g_r, m_r); t['straight'] = abs(t['straight_r'] - _ST[key])
    t['total'] = float(sum(W[k] * t[k] for k in W))
    return t
