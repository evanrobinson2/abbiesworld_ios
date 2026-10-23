"""Tileable height maps (bump) and the normal maps made from them, for the café kit (AW-STUDY-0013).

Each surface has a real-world source: what the micro-relief of that material looks like at about 10 cm to 1 m.
`python textures.py` writes textures/<name>_height.png (the bump source, kept as the editable intent) and
textures/<name>_normal.png (OpenGL/glTF convention, +Y up). All maps tile in both directions.
"""
import os, numpy as np
from PIL import Image

N = 256
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
rng = np.random.default_rng(13)

def blur(a, r):
    """Wrap-around box blur, r passes of 3x3 (tileable)."""
    for _ in range(r):
        a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5
    return a

def noise(scale, octaves=4):
    """Tileable value noise from a periodic random grid, summed over octaves."""
    out = np.zeros((N, N))
    amp = 1.0
    for o in range(octaves):
        g = max(2, int(scale * 2 ** o))
        grid = rng.random((g, g))
        up = np.kron(grid, np.ones((N // g + 1, N // g + 1)))[:N, :N]
        out += blur(up, max(1, int(N / g / 3))) * amp
        amp *= 0.5
    return (out - out.min()) / (out.max() - out.min() + 1e-9)

yy, xx = np.mgrid[0:N, 0:N] / N

def norm(h):
    return (h - h.min()) / (h.max() - h.min() + 1e-9)

H = {}
# Painted plaster and enamel: a soft orange-peel.
H['paint'] = norm(noise(24, 3))
# Glazed ceramic: almost flat, long gentle waves.
H['ceramic'] = norm(noise(3, 2)) * 0.5
# Wood grain along X: stretched noise plus growth rings that wobble.
w = noise(6, 3)
H['wood'] = norm(np.sin((yy * 38 + w * 1.6) * 2 * np.pi) * 0.5 + noise(48, 2) * 0.5)
# Brushed stainless: fine lines along X.
lines = rng.random(N)[None, :].repeat(N, 0).T
H['brushed'] = norm(blur(lines, 1) * 0.8 + noise(64, 1) * 0.2)
# Canvas weave for beanbags and cushions: over-under threads.
t = 32
H['weave'] = norm(np.abs(np.sin(xx * t * np.pi)) * (np.sin(yy * t * np.pi * 2) > 0) + np.abs(np.sin(yy * t * np.pi)) * (np.sin(xx * t * np.pi * 2) <= 0) + noise(32, 2) * 0.3)
# Short-pile carpet and rug: dense fibre tufts.
H['carpet'] = norm(blur(rng.random((N, N)), 2) + noise(16, 2) * 0.5)
# Textured ABS plastic (1980s computer case): fine stipple.
H['stipple'] = norm(blur(rng.random((N, N)), 1) ** 3)
# Rubber feet and grips: coarse stipple.
H['rubber'] = norm(blur((rng.random((N, N)) > 0.93).astype(float), 3))
# Chalkboard: slate grain.
H['slate'] = norm(noise(40, 3) + blur(rng.random((N, N)), 1) * 0.3)
# Knurled metal (knobs, grinder dial): diamond knurl.
H['knurl'] = norm(np.abs(np.sin((xx + yy) * 48 * np.pi)) + np.abs(np.sin((xx - yy) * 48 * np.pi)))
# LED dance tile: a 6 x 6 grid of domed lenses under a frosted top.
c = 6
fx, fy = (xx * c) % 1 - 0.5, (yy * c) % 1 - 0.5
H['leddots'] = norm(np.clip(1 - np.sqrt(fx ** 2 + fy ** 2) / 0.32, 0, 1) ** 0.6 + noise(32, 1) * 0.08)
# Mirror tiles: flat (the faceting is geometry); a faint warp.
H['mirror'] = norm(noise(2, 1)) * 0.2
# Paper and card: fibre.
H['paper'] = norm(blur(rng.random((N, N)), 1) * 0.5 + noise(20, 2) * 0.5)

STRENGTH = {'paint': 2, 'ceramic': 1, 'wood': 4, 'brushed': 2, 'weave': 5, 'carpet': 6, 'stipple': 4, 'rubber': 5,
            'slate': 3, 'knurl': 6, 'leddots': 6, 'mirror': 1, 'paper': 2}

def to_normal(h, s):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * s
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * s
    n = np.dstack([-dx, dy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)

def led_colour():
    """Base colour for the LED floor: the reference's pink-peach and violet checker with lit lenses."""
    c = 1  # one tile per texture repeat; the floor mesh repeats it per 0.6 m tile with alternating UV offset
    img = np.zeros((N, N, 3))
    img[:] = (0.95, 0.62, 0.62)
    lens = H['leddots'][..., None]
    return (np.clip(img * (0.75 + 0.35 * lens), 0, 1) * 255).astype(np.uint8)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for k, h in H.items():
        Image.fromarray((h * 255).astype(np.uint8)).save(os.path.join(OUT, f'{k}_height.png'))
        Image.fromarray(to_normal(h, STRENGTH[k])).save(os.path.join(OUT, f'{k}_normal.png'), optimize=True)
    print('wrote', len(H), 'maps to', OUT)
