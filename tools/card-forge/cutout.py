"""Cut a concept-art subject off its plain studio backdrop, keeping its cast shadow as a real shadow.

Midjourney concept art for Abbie's World is painted on a flat warm backdrop. Cards put the subject on a painted
world backdrop instead, so every card in a set shares one look. Output is an RGBA PNG: the subject is opaque, the
backdrop is transparent, and the shadow it cast on the backdrop becomes black at the matching opacity.

The subject matte comes from rembg's isnet-general-use model (pip install "rembg[cpu]"); a colour key alone leaks
through pale subjects such as a cream cow on a cream backdrop. The shadow comes from how much darker each backdrop
pixel is than a smooth fit of the backdrop, so it is a true multiply shadow.

  python3 tools/card-forge/cutout.py in.jpg out.png
"""
import argparse
import numpy as np
from PIL import Image, ImageFilter


def fit_backdrop(img, strip=24):
    h, w, _ = img.shape
    ys, xs = np.mgrid[0:h, 0:w]
    m = np.zeros((h, w), bool)
    m[:strip], m[-strip:], m[:, :strip], m[:, -strip:] = True, True, True, True
    lum = img.mean(2)
    m &= lum > np.percentile(lum[m], 35)  # ignore shadow and subject that touch the border
    X = np.stack([np.ones(m.sum()), xs[m] / w, ys[m] / h, (xs[m] / w) ** 2, (ys[m] / h) ** 2, xs[m] * ys[m] / w / h], 1)
    A = np.stack([np.ones(h * w), (xs / w).ravel(), (ys / h).ravel(), ((xs / w) ** 2).ravel(), ((ys / h) ** 2).ravel(), (xs * ys / w / h).ravel()], 1)
    bg = np.zeros_like(img)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(X, img[..., c][m], rcond=None)
        bg[..., c] = (A @ coef).reshape(h, w)
    return np.clip(bg, 1e-3, 1)


_session = None


def subject_matte(im):
    global _session
    from rembg import remove, new_session
    if _session is None:
        _session = new_session('isnet-general-use')
    return np.asarray(remove(im, session=_session, only_mask=True), np.float32) / 255


def cutout(src, dst, tol=0.05):
    im = Image.open(src).convert('RGB')
    img = np.asarray(im, np.float32) / 255
    bg = fit_backdrop(img)
    a = subject_matte(im)
    a = np.where(a < 0.03, 0, np.where(a > 0.97, 1, a))
    # unmix the old backdrop from the soft edge so no cream halo survives on a new backdrop
    fg = np.where(a[..., None] > 0.02, (img - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 0.02), img)
    # cast shadow: backdrop pixels darker than the fitted backdrop, with the backdrop's own hue
    r = img / bg
    k = r.mean(2)
    neutral = np.abs(r - k[..., None]).max(2) < tol
    sh = np.clip((1 - k) * 1.1, 0, 0.8) * neutral * (1 - a)
    # only the ground around the subject's feet can hold its shadow; the rest is backdrop vignette
    ys, xs = np.nonzero(a > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    hh, ww = y1 - y0, x1 - x0
    gy, gx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    near = np.clip(1 - np.maximum(np.maximum(x0 - 0.45 * ww - gx, gx - x1 - 0.45 * ww), 0) / (0.15 * ww + 1), 0, 1)
    near *= np.clip((gy - (y0 + 0.45 * hh)) / (0.1 * hh + 1), 0, 1) * np.clip(1 - (gy - y1 - 0.12 * hh) / (0.06 * hh + 1), 0, 1)
    sh *= near
    sh = np.asarray(Image.fromarray((sh * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    sh = np.where(sh < 0.05, 0, sh)
    out_a = np.clip(a + sh * (1 - a), 0, 1)
    out_rgb = np.clip(fg, 0, 1) * (a / np.maximum(out_a, 1e-4))[..., None]
    out = np.dstack([out_rgb, out_a])
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(dst, optimize=True)
    print(f'{dst}: subject {float((a > 0.5).mean()) * 100:.1f}% of frame, shadow {float((sh > 0).mean()) * 100:.1f}%')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--tol', type=float, default=0.05)
    a = ap.parse_args()
    cutout(a.src, a.dst, a.tol)
