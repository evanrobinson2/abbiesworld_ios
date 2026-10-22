"""Scores and the sampler that performs them.

A Cue is a piece of music written as code: tempo, meter, key, bars, and Parts. Each Part is one player
(an instrument from instruments.ORCHESTRA) on one stem, with notes in beats. The sampler performs each
note from real recorded samples, so the result sounds like players in a hall, not a synth.
"""
import os, re, functools
import numpy as np
import soundfile as sf
from scipy import signal

from . import instruments as I
from . import dsp
from .dsp import SR

SAMPLES = os.environ.get('VSCO_ROOT', os.path.join(os.path.dirname(__file__), '..', '.samples', 'VSCO-2-CE'))

SCALES = {
    'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10],
}


class Key:
    """Scale degrees to MIDI. Degree 1 is the tonic in octave `octave`; 8 is the tonic an octave up;
    accidentals as strings: '#4', 'b7'."""

    def __init__(self, tonic, mode='major'):
        self.tonic = I.midi(tonic) if isinstance(tonic, str) else tonic
        self.mode = mode
        self.name = re.sub(r'-?\d', '', tonic) if isinstance(tonic, str) else str(tonic)

    def __call__(self, degree, octave=0):
        acc = 0
        if isinstance(degree, str):
            acc = degree.count('#') - degree.count('b')
            degree = int(degree.strip('#b'))
        d = degree - 1
        sc = SCALES[self.mode]
        return self.tonic + 12 * (octave + d // 7) + sc[d % 7] + acc

    def chord(self, root_degree, octave=0, kind=(1, 3, 5)):
        return [self(root_degree + k - 1, octave) for k in kind]

    def shift(self, pitch, steps):
        """Move a pitch `steps` scale steps (a diatonic third below is shift(p, -2))."""
        sc = SCALES[self.mode]
        octv, pc = divmod(pitch - self.tonic, 12)
        i = min(range(7), key=lambda j: abs(sc[j] - pc))
        acc = pc - sc[i]
        i += steps
        return self.tonic + 12 * (octv + i // 7) + sc[i % 7] + acc


@functools.lru_cache(maxsize=None)
def load(path):
    x, sr = sf.read(path, dtype='float32', always_2d=True)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    x = x[:, :2]
    if sr != SR:
        x = signal.resample_poly(x, SR // 100, sr // 100 if sr % 100 == 0 else sr, axis=0).astype('float32')
    # Trim leading silence, keeping a few ms so attacks stay intact.
    env = np.abs(x).max(1)
    on = np.argmax(env > env.max() * 10 ** (-45 / 20))
    x = x[max(0, on - int(0.003 * SR)):]
    return x


@functools.lru_cache(maxsize=None)
def zones(inst):
    return I.zones(SAMPLES, inst)


class Note:
    __slots__ = ('beat', 'pitch', 'dur', 'vel', 'attack', 'shape', 'release')

    def __init__(self, beat, pitch, dur, vel=0.7, attack=None, shape=None, release=None):
        self.beat, self.pitch, self.dur, self.vel = beat, pitch, dur, vel
        self.attack, self.shape, self.release = attack, shape, release


class Part:
    def __init__(self, cue, name, inst, stem, pan=0.0, gain_db=0.0, reverb=0.25, humanize=1.0,
                 attack=None, legato=0.0, release=None):
        self.cue, self.name, self.inst, self.stem = cue, name, inst, stem
        self.pan, self.gain_db, self.reverb, self.humanize = pan, gain_db, reverb, humanize
        self.attack, self.legato, self.release = attack, legato, release
        self.notes = []
        self.fx = []           # (beat, fx name, layer, gain_db, drum)
        self.dyn = []          # (beat, gain_db) automation points

    def note(self, beat, pitch, dur, vel=0.7, **kw):
        self.notes.append(Note(beat, I.midi(pitch), dur, vel, **kw))
        return self

    def chord(self, beat, pitches, dur, vel=0.7, spread=0.0, **kw):
        for i, p in enumerate(pitches):
            self.note(beat + i * spread, p, dur, vel, **kw)
        return self

    def seq(self, beat, text, vel=0.7, transpose=0, **kw):
        """'D5:1 F#5:.5 r:.5 D4,A4:2@.6' -> notes from `beat`. Pitch may be a MIDI number. Returns end beat."""
        for tok in text.split():
            m = re.fullmatch(r'([^:]+):([\d.]+)(?:@([\d.]+))?', tok)
            if not m:
                raise ValueError(f'bad token {tok!r}')
            pitches, dur, v = m.group(1), float(m.group(2)), float(m.group(3)) if m.group(3) else vel
            if pitches != 'r':
                for p in pitches.split(','):
                    p = int(p) if p.lstrip('-').isdigit() else I.midi(p)
                    self.note(beat, p + transpose, dur, v, **kw)
            beat += dur
        return beat

    def hit(self, beat, fx, layer=3, gain_db=0.0, drum=3):
        self.fx.append((beat, fx, layer, gain_db, drum))
        return self

    def ramp(self, *points):
        """Volume automation: ramp((0, -12), (8, 0)) swells from -12 dB to 0 dB over beats 0..8."""
        self.dyn.extend(points)
        return self


class Cue:
    def __init__(self, id, title, bpm, bars, key, beats_per_bar=4, kind='music', loop=False,
                 hall=2.4, brightness=0.55, tail=6.0, stems=None, pickup=0.0):
        self.id, self.title, self.bpm, self.bars, self.key = id, title, bpm, bars, key
        self.bpb, self.kind, self.loop, self.hall, self.brightness = beats_per_bar, kind, loop, hall, brightness
        self.tail, self.pickup = tail, pickup
        self.ring = 1.6 if kind == 'sting' else None     # stings damp ringing instruments so they end cleanly
        self.stems = stems or {}
        self.parts = []
        self.meta = {}

    def part(self, *a, **kw):
        p = Part(self, *a, **kw)
        self.parts.append(p)
        return p

    @property
    def beat_s(self):
        return 60.0 / self.bpm

    @property
    def length_s(self):
        return self.bars * self.bpb * self.beat_s

    def t(self, beat):
        return beat * self.beat_s + self.pickup

    def instruments(self):
        return sorted({p.inst for p in self.parts if p.notes})


# ---------------------------------------------------------------- performance

class Performer:
    def __init__(self, seed=1):
        self.rng = np.random.default_rng(seed)
        self.rr = {}
        self.warnings = set()

    def pick(self, inst, pitch, vel):
        zs = zones(inst)
        best = min(abs(z[0] - pitch) for z in zs)
        near = [z for z in zs if abs(z[0] - pitch) == best]
        # Prefer the sample at or just above the note so we shift down (keeps the attack natural).
        above = [z for z in near if z[0] >= pitch]
        near = above or near
        layers = sorted({z[1] for z in near})
        want = layers[0] + vel * (layers[-1] - layers[0])
        layer = min(layers, key=lambda l: abs(l - want))
        cands = sorted([z for z in near if z[1] == layer], key=lambda z: z[2])
        k = (inst, cands[0][0], layer)
        i = self.rr.get(k, self.rng.integers(len(cands)))
        self.rr[k] = (i + 1) % len(cands)
        return cands[i % len(cands)]

    def render_note(self, part, note, cue):
        gain, rel_default, kind = I.info(part.inst)
        lo, hi = min(z[0] for z in zones(part.inst)), max(z[0] for z in zones(part.inst))
        if note.pitch < lo - 4 or note.pitch > hi + 4:
            # Out of the instrument's range: an orchestrator would take it up or down an octave.
            moved = note.pitch
            while moved < lo - 4:
                moved += 12
            while moved > hi + 4:
                moved -= 12
            self.warnings.add(f'{part.inst} {note.pitch} moved an octave to {moved} (range {lo:.0f}-{hi:.0f})')
            note.pitch = moved
        zp, layer, rr, path = self.pick(part.inst, note.pitch, note.vel)
        if abs(zp - note.pitch) > 4:
            self.warnings.add(f'{part.inst} {note.pitch} is {note.pitch - zp:+.1f} st from its nearest sample')
        x = load(path)
        ratio = 2 ** ((note.pitch - zp) / 12)
        dur_s = note.dur * cue.beat_s + part.legato
        release = note.release if note.release is not None else (part.release if part.release is not None else rel_default)
        damped = note.release is not None or part.release is not None or cue.ring is not None
        if cue.ring is not None and note.release is None and part.release is None:
            release = cue.ring
        if kind == 'hit':
            out_len = int((max(dur_s, 0) + release) * SR) if damped else int(len(x) / ratio)
        else:
            out_len = int((dur_s + release) * SR)
        out_len = max(out_len, 64)
        need = int(out_len * ratio) + 2
        if need > len(x):
            x = extend(x, need)
        pos = np.arange(out_len) * ratio
        y = np.empty((out_len, 2), dtype='float32')
        idx = np.arange(len(x))
        for c in range(2):
            y[:, c] = np.interp(pos, idx, x[:, c], right=0)
        # Envelope.
        env = np.ones(out_len, dtype='float32')
        att = note.attack if note.attack is not None else (part.attack if part.attack is not None else 0.0)
        if att > 0:
            n = min(out_len, int(att * SR))
            env[:n] = np.linspace(0, 1, n) ** 1.5
        hold = int(dur_s * SR)
        if kind == 'sus' or damped:
            if hold < out_len:
                r = np.arange(out_len - hold) / SR
                env[hold:] *= np.exp(-5.0 * r / max(release, 0.02))
        if note.shape:
            tt = np.linspace(0, 1, min(hold, out_len) or 1)
            curve = {'cresc': 0.35 + 0.65 * tt ** 1.3, 'dim': 1 - 0.6 * tt, 'arc': 0.55 + 0.45 * np.sin(np.pi * tt),
                     'swell': 0.15 + 0.85 * tt ** 2}[note.shape]
            env[:len(curve)] *= curve
            env[len(curve):] *= curve[-1]
        fade = min(out_len, int(0.004 * SR))
        env[-fade:] *= np.linspace(1, 0, fade)
        amp = gain * (0.3 + 0.7 * note.vel) ** 1.4
        return y * (env * amp)[:, None]

    def render_part(self, part, cue, n):
        buf = np.zeros((n, 2), dtype='float32')
        h = part.humanize
        for note in part.notes:
            jitter = self.rng.normal(0, 0.006 * h) if h else 0
            note.vel = float(np.clip(note.vel + (self.rng.normal(0, 0.035 * h) if h else 0), 0.02, 1))
            y = self.render_note(part, note, cue)
            at = int(max(0, cue.t(note.beat) + jitter) * SR)
            if at >= n:
                continue
            m = min(len(y), n - at)
            buf[at:at + m] += y[:m]
        for beat, name, layer, g, drum in part.fx:
            y = fx_sample(name, layer, drum, self.rng) * 10 ** (g / 20)
            at = int(cue.t(beat) * SR)
            if name in I.PEAK_ALIGNED:
                pk = int(np.argmax(np.abs(y).max(1)))
                y, at = (y[pk - at:], 0) if pk > at else (y, at - pk)
            m = min(len(y), n - at)
            if m > 0:
                buf[at:at + m] += y[:m]
        if part.dyn:
            pts = sorted(part.dyn)
            ts = [cue.t(b) * SR for b, _ in pts]
            curve = 10 ** (np.interp(np.arange(n), ts, [g for _, g in pts]) / 20)
            buf *= curve[:, None].astype('float32')
        # Constant-power pan as a balance control on the stereo sample.
        a = (part.pan + 1) * np.pi / 4
        buf[:, 0] *= np.cos(a) * np.sqrt(2)
        buf[:, 1] *= np.sin(a) * np.sqrt(2)
        return buf * 10 ** (part.gain_db / 20)


def extend(x, need):
    """Lengthen a sustained sample by crossfading repeats of its steady middle (no audible loop point)."""
    a, b = int(len(x) * 0.35), int(len(x) * 0.9)
    seg = x[a:b]
    xf = min(int(0.25 * SR), len(seg) // 3)
    out = x[:b].copy()
    ramp = np.linspace(0, 1, xf, dtype='float32')[:, None]
    while len(out) < need:
        tail = out[-xf:] * (1 - ramp) + seg[:xf] * ramp
        out = np.concatenate([out[:-xf], tail, seg[xf:]])
    return out


def fx_sample(name, layer, drum, rng):
    import glob
    pat = I.FX[name]
    if '{' in pat:
        cands = []
        for rr in (1, 2, 3, 4):
            for lay in (layer, layer - 1, layer + 1, 3, 1):
                p = os.path.join(SAMPLES, pat.format(layer=lay, rr=rr, drum=drum))
                if os.path.exists(p):
                    cands.append(p)
                    break
        if not cands:
            raise FileNotFoundError(f'{name} layer {layer}')
    else:
        cands = sorted(glob.glob(os.path.join(SAMPLES, pat)))
        if not cands:
            raise FileNotFoundError(f'{name}: {pat}')
    return load(cands[rng.integers(len(cands))])
