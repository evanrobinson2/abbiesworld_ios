"""Mixing and mastering: hall reverb, filters, bus glue compression, true-peak-safe limiting, loudness."""
import numpy as np
from scipy import signal

SR = 48000


def hall_ir(seconds=2.6, predelay=0.022, seed=7, brightness=0.55, width=1.0):
    """A stereo concert-hall impulse response: sparse early reflections, then a dense tail whose highs die
    faster than its lows (air and wall absorption)."""
    rng = np.random.default_rng(seed)
    n = int(SR * (seconds * 1.6 + predelay))
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    # Tail in three bands, each with its own decay time.
    bands = [(None, 400, 1.15), (400, 3000, 1.0), (3000, None, 0.55 * brightness / 0.55)]
    for lo, hi, rt_scale in bands:
        noise = rng.standard_normal((n, 2))
        if lo and hi:
            sos = signal.butter(2, [lo, hi], 'bandpass', fs=SR, output='sos')
        elif hi:
            sos = signal.butter(2, hi, 'lowpass', fs=SR, output='sos')
        else:
            sos = signal.butter(2, lo, 'highpass', fs=SR, output='sos')
        band = signal.sosfilt(sos, noise, axis=0)
        rt = seconds * rt_scale
        ir += band * np.exp(-6.91 * t / rt)[:, None]
    # Soft onset of the tail, after the pre-delay.
    onset = np.clip((t - predelay) / 0.06, 0, 1) ** 1.5
    ir *= onset[:, None]
    # Early reflections.
    for k in range(14):
        d = predelay + rng.uniform(0.004, 0.075)
        g = 0.55 * np.exp(-k * 0.12) * rng.uniform(0.4, 1.0)
        i = int(d * SR)
        ir[i, 0] += g * rng.choice([-1, 1])
        ir[int((d + rng.uniform(0.0005, 0.004)) * SR), 1] += g * rng.choice([-1, 1])
    # Width: blend toward mono for a narrower room.
    mid = ir.mean(1, keepdims=True)
    ir = mid + (ir - mid) * width
    return ir / np.sqrt((ir ** 2).sum() / 2)


def convolve(x, ir):
    out = np.zeros((len(x) + len(ir) - 1, 2))
    for c in range(2):
        out[:, c] = signal.fftconvolve(x[:, c], ir[:, c])
    return out


def highpass(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, 'highpass', fs=SR, output='sos'), x, axis=0)


def lowpass(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, 'lowpass', fs=SR, output='sos'), x, axis=0)


def shelf(x, hz, db, kind='high'):
    """RBJ shelving filter."""
    A = 10 ** (db / 40)
    w = 2 * np.pi * hz / SR
    cw, sw = np.cos(w), np.sin(w)
    alpha = sw / 2 * np.sqrt(2)
    s = 1 if kind == 'low' else -1
    b0 = A * ((A + 1) - s * (A - 1) * cw + 2 * np.sqrt(A) * alpha)
    b1 = 2 * s * A * ((A - 1) - s * (A + 1) * cw)
    b2 = A * ((A + 1) - s * (A - 1) * cw - 2 * np.sqrt(A) * alpha)
    a0 = (A + 1) + s * (A - 1) * cw + 2 * np.sqrt(A) * alpha
    a1 = -2 * s * ((A - 1) + s * (A + 1) * cw)
    a2 = (A + 1) + s * (A - 1) * cw - 2 * np.sqrt(A) * alpha
    return signal.lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x, axis=0)


def envelope_follow(level, attack, release):
    """One-pole attack/release smoother over a 1-D control signal (vectorised in blocks)."""
    a_att = np.exp(-1 / (attack * SR))
    a_rel = np.exp(-1 / (release * SR))
    out = np.empty_like(level)
    y = 0.0
    # Run at 1/32 rate then upsample; plenty for gain control.
    step = 32
    coarse = level[::step]
    co = np.empty_like(coarse)
    aa, ar = a_att ** step, a_rel ** step
    for i, v in enumerate(coarse):
        y = aa * y + (1 - aa) * v if v > y else ar * y + (1 - ar) * v
        co[i] = y
    out[:] = np.interp(np.arange(len(level)), np.arange(len(co)) * step, co)
    return out


def glue(x, threshold_db=-18, ratio=1.8, attack=0.03, release=0.25):
    """Gentle RMS bus compressor that only shaves the loudest swells."""
    lvl = np.sqrt(envelope_follow((x ** 2).mean(1), 0.01, 0.1) + 1e-12)
    db = 20 * np.log10(lvl + 1e-9)
    over = np.maximum(0, db - threshold_db)
    gr_db = -over * (1 - 1 / ratio)
    gr = 10 ** (envelope_follow(-gr_db, attack, release) * -1 / 20)
    return x * gr[:, None]


def limit(x, ceiling_db=-1.0, lookahead=0.005, release=0.08):
    """Look-ahead brickwall limiter on 4x-oversampled peaks, so the encoded file keeps under the ceiling."""
    ceiling = 10 ** (ceiling_db / 20)
    up = signal.resample_poly(np.abs(x).max(1), 4, 1)
    peak = np.abs(up).reshape(-1, 4).max(1)[:len(x)]
    peak = np.pad(peak, (0, len(x) - len(peak)))
    need = np.minimum(1, ceiling / np.maximum(peak, 1e-9))
    la = int(lookahead * SR)
    # Look ahead: the gain starts falling before the peak arrives.
    need = _running_min(np.concatenate([need, np.ones(la)]), la)[la:]
    gain = 1 - envelope_follow(1 - need, 0.0008, release)
    gain = np.minimum(gain, need)
    return x * gain[:, None]


def _running_min(v, w):
    from scipy.ndimage import minimum_filter1d
    return minimum_filter1d(v, size=2 * w + 1, mode='nearest')


def loudness(x):
    import pyloudnorm as pyln
    return pyln.Meter(SR).integrated_loudness(x)


def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def peaks(x, n=240):
    m = np.abs(x).max(1)
    chunks = np.array_split(m, n)
    v = np.array([c.max() if len(c) else 0 for c in chunks])
    return [round(float(a), 3) for a in v / (v.max() + 1e-9)]
