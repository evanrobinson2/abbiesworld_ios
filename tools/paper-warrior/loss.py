"""Image-space loss between a render and a reference image. Asset-agnostic.

Components (each 0 = perfect):
  sil   1 - IoU of figure silhouettes
  cham  symmetric chamfer distance between silhouette outlines, as a fraction of image size
  ssim  1 - SSIM of grayscale images (whole frame: figure, light, backdrop)
  edge  1 - correlation of blurred gradient-magnitude maps inside the figure (facet/fold structure)
  tone  mean absolute RGB error at low resolution (backdrop colour, exposure, shadow)
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.metrics import structural_similarity

WEIGHTS = dict(sil=0.35, cham=2.0, ssim=0.2, edge=0.2, tone=0.6)
N = 256

def load_rgb(path, n=N):
    return np.asarray(Image.open(path).convert('RGB').resize((n, n), Image.LANCZOS)).astype(np.float64) / 255.0

def load_mask(path, n=N):
    return np.asarray(Image.open(path).convert('L').resize((n, n), Image.BILINEAR)) > 127

def outline(m):
    return m & ~ndi.binary_erosion(m)

def sil_terms(m_r, m_t):
    inter = (m_r & m_t).sum(); union = (m_r | m_t).sum()
    iou = inter / max(union, 1)
    if m_r.sum() == 0:
        return 1.0, 1.0
    dt_t = ndi.distance_transform_edt(~outline(m_t))
    dt_r = ndi.distance_transform_edt(~outline(m_r))
    cham = 0.5 * (dt_t[outline(m_r)].mean() + dt_r[outline(m_t)].mean()) / m_t.shape[0]
    return 1 - iou, cham

def grad_mag(g):
    return np.hypot(ndi.sobel(g, 0), ndi.sobel(g, 1))

def image_terms(rgb_r, rgb_t, m_r, m_t):
    g_r, g_t = rgb_r.mean(-1), rgb_t.mean(-1)
    ssim = structural_similarity(g_r, g_t, data_range=1.0)
    region = ndi.binary_dilation(m_r | m_t, iterations=2)
    e_r = ndi.gaussian_filter(grad_mag(g_r), 2.0)[region]
    e_t = ndi.gaussian_filter(grad_mag(g_t), 2.0)[region]
    e_r = (e_r - e_r.mean()) / (e_r.std() + 1e-9); e_t = (e_t - e_t.mean()) / (e_t.std() + 1e-9)
    edge = float((e_r * e_t).mean())
    small = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((64, 64), Image.BOX)) / 255.0
    tone = float(np.abs(small(rgb_r) - small(rgb_t)).mean())
    return 1 - ssim, 1 - edge, tone

def total(terms, weights=WEIGHTS):
    return float(sum(weights[k] * terms[k] for k in terms if k in weights))

def score(m_r, m_t, rgb_r=None, rgb_t=None):
    s, c = sil_terms(m_r, m_t)
    t = dict(sil=float(s), cham=float(c))
    if rgb_r is not None:
        a, b, d = image_terms(rgb_r, rgb_t, m_r, m_t)
        t.update(ssim=float(a), edge=float(b), tone=float(d))
    t['total'] = total(t)
    return t
