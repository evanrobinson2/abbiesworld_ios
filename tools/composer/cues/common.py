"""Shared writing tools for the cues: Abbie's motif, string-section voicing, harp figures."""
from engine.core import Cue, Key
from engine.instruments import midi

# Abbie's motif: a rising fourth, two steps up to the third, and a turn home. Every cue quotes it, so the
# whole game sounds like one score. As scale degrees from the tonic, with lengths in beats:
MOTIF = [(5, -1, 1.0), (1, 0, 0.5), (2, 0, 0.5), (3, 0, 2.0)]            # sol | do re mi—
MOTIF_ANSWER = [(2, 0, 1.5), (1, 0, 0.5), (6, -1, 2.0)]                  # re— do la—
MOTIF_TEXT = 'Abbie\'s motif: sol-do-re-mi (rising fourth, then steps to the third), answered re-do-la.'

# Intensity layers the runtime director opens as play gets busier (0 = calm building, 1 = big moment).
STEMS = {
    'foundation': {'min': 0.0, 'role': 'sustained strings and bass, always on'},
    'pulse': {'min': 0.2, 'role': 'harp, pizzicato and mallet motion'},
    'melody': {'min': 0.45, 'role': 'the tune: woodwinds, horn, solo strings'},
    'color': {'min': 0.7, 'role': 'bells, glockenspiel, triangle, high shimmer'},
}
STEM_ORDER = ['foundation', 'pulse', 'melody', 'color']


def n(x):
    return midi(x) if isinstance(x, str) else x


def motif(key, octave=0, answer=False, scale=1.0):
    """Motif as (pitch, beats) pairs in `key`."""
    src = MOTIF_ANSWER if answer else MOTIF
    return [(key(d, o + octave), b * scale) for d, o, b in src]


def play(part, beat, notes, vel=0.7, **kw):
    for p, d in notes:
        if p is not None:
            part.note(beat, p, d, vel, **kw)
        beat += d
    return beat


def strings(cue, bars, bpb, vel=0.45, stem='foundation', violins=True, shape=None, start_bar=0, phrase=4, gains=None):
    """bars: one tuple per bar: (bass, cellos, violas, violins), each a note or list. A bar may instead be a
    list of (beat_in_bar, beats, tuple) for chord changes inside the bar. Chords overlap so the section
    re-bows smoothly; the dynamics breathe over each `phrase` bars rather than every bar."""
    gains = gains or {}
    lg, at = 0.35, 0.15
    parts = {
        'bass': cue.part('basses', 'bass', stem, pan=0.25, gain_db=gains.get('bass', -2), reverb=0.2, attack=at, legato=lg),
        'vc': cue.part('cellos', 'cellos', stem, pan=0.35, gain_db=gains.get('vc', -1), reverb=0.25, attack=at, legato=lg),
        'va': cue.part('violas', 'violas', stem, pan=0.1, gain_db=gains.get('va', -2), reverb=0.3, attack=at, legato=lg),
        'vn': cue.part('violins', 'violins', stem, pan=-0.35, gain_db=gains.get('vn', -4), reverb=0.35, attack=at, legato=lg),
    }
    total = len(bars) * bpb
    for p in parts.values():
        for s0 in range(start_bar * bpb, start_bar * bpb + total, phrase * bpb):
            p.ramp((s0, -1.5), (s0 + phrase * bpb * 0.6, 1.0), (s0 + phrase * bpb, -1.5))
    for i, bar in enumerate(bars):
        segs = bar if isinstance(bar, list) else [(0, bpb, bar)]
        for off, dur, v in segs:
            beat = (start_bar + i) * bpb + off
            for name, notes in zip(('bass', 'vc', 'va', 'vn'), v):
                if notes is None or (name == 'vn' and not violins):
                    continue
                for p in (notes if isinstance(notes, (list, tuple)) else [notes]):
                    parts[name].note(beat, n(p), dur, vel, shape=shape)
    return parts


def arp(part, beat, notes, pattern, step, bars_beats, vel=0.55, accent=0.12, ring=None):
    """Repeat `pattern` (indices into notes) every `step` beats for `bars_beats` beats."""
    notes = [n(x) for x in notes]
    k = 0
    t = 0.0
    while t < bars_beats - 1e-6:
        i = pattern[k % len(pattern)]
        if i is not None:
            v = vel + (accent if k % len(pattern) == 0 else 0)
            part.note(beat + t, notes[i % len(notes)] + 12 * (i // len(notes)), ring or step, v)
        k += 1
        t += step
