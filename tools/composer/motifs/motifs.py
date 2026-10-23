"""Reference renders of the two Abbie's World melodies in docs/music/MUSIC_BIBLE.md, so Evan can pick the canonical one.

Both are written out note for note here (the Bible gives pitch contours only, so the rhythm is our reading of its 3+3+2
signature: dotted quarter, dotted quarter, quarter, with the last group split into two eighths when a phrase has four
notes). Same tempo, key and palette for both, so the melody is the only difference:
glockenspiel lead, handbell chords, plucked strings, bouncing bass, handclaps and a soft shimmer pad.

    python3 tools/composer/motifs/motifs.py      # writes <id>.mid, <id>.mp3 and motifs.json next to this file

Pure numpy synthesis (no samples, no API), deterministic. The MIDI is the transcription the Bible asks for in section 11.
"""
import json, os, struct, subprocess, tempfile
import numpy as np
from scipy.signal import fftconvolve
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
BPM = 124
E8 = 60 / BPM / 2          # one eighth note, seconds
BAR = 8                    # eighths per 4/4 bar
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def midi(name, octave):
    return 12 * (octave + 1) + NOTE[name]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


# Chords as (bass root, upper voicing). Voicings sit around middle C so the bells stay under the glockenspiel.
CHORDS = {
    'D6/9': ('D', ['D4', 'F#4', 'A4', 'B4', 'E5']),
    'G6': ('G', ['G3', 'B3', 'D4', 'E4']),
    'A(add9)': ('A', ['A3', 'C#4', 'E4', 'B4']),
    'Bm7': ('B', ['B3', 'D4', 'F#4', 'A4']),
    'Gmaj7': ('G', ['G3', 'B3', 'D4', 'F#4']),
    'D/F#': ('F#', ['D4', 'F#4', 'A4']),
    'Em7': ('E', ['E4', 'G4', 'B4', 'D5']),
    'A': ('A', ['A3', 'C#4', 'E4']),
}


def parse(n):
    return midi(n[:-1], int(n[-1]))


# Each melody: bars of (note or None for rest, eighths). Each harmony: per bar, list of (chord, eighths).
MOTIFS = {
    'hook-late': {
        'title': 'Later hook (four phrases)',
        'contour': 'D-E-F#-A | B-A-F#-E | D-F#-A-B | A-E-F#-D',
        'harmony_source': 'D6/9 -> G6 -> A(add9) -> D6/9',
        'melody': [[('D5', 3), ('E5', 3), ('F#5', 1), ('A5', 1)],
                   [('B5', 3), ('A5', 3), ('F#5', 1), ('E5', 1)],
                   [('D5', 3), ('F#5', 3), ('A5', 1), ('B5', 1)],
                   [('A5', 3), ('E5', 3), ('F#5', 1), ('D5', 1)]],
        'harmony': [[('D6/9', 8)], [('G6', 8)], [('A(add9)', 8)], [('D6/9', 8)]],
        'harmony2': [[('D6/9', 8)], [('G6', 8)], [('A(add9)', 8)], [('D6/9', 8)]],
    },
    'early-sep13': {
        'title': 'Early motif (13 Sept, with the G-sharp)',
        'contour': 'D-F#-A-B-G#-A | F#-E-D',
        'harmony_source': 'D6/9 | Bm7 | Gmaj7 | A(add9) | D/F# | Gmaj7 | Em7-A | D6/9',
        'melody': [[('D5', 3), ('F#5', 3), ('A5', 1), ('B5', 1)],
                   [('G#5', 3), ('A5', 3), (None, 2)],
                   [('F#5', 3), ('E5', 3), ('D5', 2)],
                   [('D5', 6), (None, 2)]],
        'harmony': [[('D6/9', 8)], [('Bm7', 8)], [('Gmaj7', 8)], [('A(add9)', 8)]],
        'harmony2': [[('D/F#', 8)], [('Gmaj7', 8)], [('Em7', 4), ('A', 4)], [('D6/9', 8)]],
    },
}


# ---- instruments -------------------------------------------------------------------------------------------------

def env_t(dur):
    return np.arange(int(dur * SR)) / SR


def glock(f, dur=1.6, vel=1.0):
    t = env_t(dur)
    out = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
              for r, a, d in ((1, 1, 1.1), (2.76, .3, .35), (5.40, .12, .15), (8.93, .05, .08)))
    return vel * out * np.minimum(1, t / .002)


def bell(f, dur=2.4, vel=1.0):
    """Handbell: hum, strike and a soft upper partial, long ring."""
    t = env_t(dur)
    out = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
              for r, a, d in ((1, 1, 1.6), (2, .45, .9), (3, .18, .5), (4.2, .08, .25)))
    return vel * out * np.minimum(1, t / .004)


def pluck(f, dur=1.0, vel=1.0, seed=0):
    """Karplus-Strong plucked string."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = .996 * .5 * (buf[i % p] + buf[(i + 1) % p])
    return vel * out


def bass(f, dur, vel=1.0):
    t = env_t(dur)
    e = np.exp(-t / .22) * np.minimum(1, t / .004) * np.minimum(1, (dur - t) / .02).clip(0)
    return vel * e * (np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .1 * np.sin(6 * np.pi * f * t))


def clap(seed):
    rng = np.random.default_rng(seed)
    t = env_t(.18)
    n = rng.standard_normal(len(t))
    n = np.diff(n, prepend=0)                       # tilt up: cheap high-pass
    e = np.zeros_like(t)
    for off in (0, .011, .022):                     # three hands, slightly apart
        e += np.where(t >= off, np.exp(-(t - off) / .012), 0)
    e += .5 * np.exp(-t / .06)
    return .25 * n * e


def kick():
    t = env_t(.25)
    f = 45 + 70 * np.exp(-t / .03)
    return .9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12)


def shaker(seed):
    rng = np.random.default_rng(seed)
    t = env_t(.07)
    return .05 * np.diff(rng.standard_normal(len(t)), prepend=0) * np.exp(-t / .02)


def pad(freqs, dur):
    t = env_t(dur)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-.12, .12):                       # detuned pair, in cents/100
            ph = (f * 2 ** (d / 12) * t) % 1
            out += 2 * ph - 1
    y = np.empty_like(out); acc = 0.
    for i, x in enumerate(out):                     # one-pole low-pass
        acc += .06 * (x - acc); y[i] = acc
    e = np.minimum(1, t / .6) * np.minimum(1, (dur - t) / .8).clip(0)
    return .03 * y * e / max(1, len(freqs))


# ---- arrangement -------------------------------------------------------------------------------------------------

def render(m):
    bars = len(m['melody'])
    total = (2 * bars + 1) * BAR * E8 + 2.5
    mix = {k: np.zeros(int(total * SR)) for k in ('lead', 'bells', 'pluck', 'bass', 'drums', 'pad')}
    notes = {'lead': [], 'chords': [], 'bass': []}      # MIDI events: (start eighth, length eighths, note, vel)

    def put(track, sig, at):
        i = int(at * SR); mix[track][i:i + len(sig)] += sig[:len(mix[track]) - i]

    for rep in range(2):
        harm = m['harmony'] if rep == 0 else m['harmony2']
        for b in range(bars):
            bar0 = (rep * bars + b) * BAR
            # melody
            pos = bar0
            for k, (n, ln) in enumerate(m['melody'][b]):
                if n:
                    p = parse(n)
                    last = rep == 1 and b == bars - 1 and k == len(m['melody'][b]) - 1
                    put('lead', glock(hz(p + 12), 2.6 if last else 1.6, .55), pos * E8)
                    if rep == 1:
                        put('pluck', pluck(hz(p), 1.2, .35, seed=pos), pos * E8)
                    notes['lead'].append((pos, ln + (BAR if last else 0), p, 100))
                pos += ln
            # harmony
            pos = bar0
            for name, ln in harm[b]:
                root, voicing = CHORDS[name]
                vs = [parse(v) for v in voicing]
                for j, v in enumerate(vs):
                    put('bells', bell(hz(v), 2.2, .16), pos * E8 + j * .012)
                    notes['chords'].append((pos, ln, v, 70))
                put('pad', pad([hz(v) for v in vs], ln * E8 + .8), pos * E8)
                # bouncing bass on the 3+3+2 grid: root, octave, fifth
                r = midi(root, 2)
                for off, iv in ((0, 0), (3, 12), (6, 7)):
                    if off < ln:
                        put('bass', bass(hz(r + iv), min(3, ln - off) * E8 * .9, .5), (pos + off) * E8)
                        notes['bass'].append((pos + off, min(3, ln - off), r + iv, 90))
                pos += ln
            # drums: soft kick on the 3+3+2 accents, claps on 2 and 4 from the second pass, shaker eighths
            if rep == 1:
                for off in (0, 3, 6):
                    put('drums', kick() * .5, (bar0 + off) * E8)
                for off in (2, 6):
                    put('drums', clap(bar0 + off), (bar0 + off) * E8)
            for off in range(BAR):
                put('drums', shaker(bar0 + off) * (1.4 if off in (0, 3, 6) else .7), (bar0 + off) * E8)
    # final chord rings
    end = 2 * bars * BAR
    for v in CHORDS['D6/9'][1]:
        put('bells', bell(hz(parse(v)), 2.8, .16), end * E8)
    put('bass', bass(hz(midi('D', 2)), 1.6, .5), end * E8)
    notes['bass'].append((end, BAR, midi('D', 2), 90))

    gains = {'lead': 1, 'bells': .8, 'pluck': .6, 'bass': .9, 'drums': .8, 'pad': 1}
    dry = sum(gains[k] * v for k, v in mix.items())
    rng = np.random.default_rng(7)
    ir_t = env_t(1.6)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / .35)
    wet = fftconvolve(dry, ir)[:len(dry)]
    out = dry + .18 * wet / (np.abs(wet).max() + 1e-9) * np.abs(dry).max()
    return out / (np.abs(out).max() + 1e-9) * .89, notes


def write_midi(path, notes):
    tpq = 480; ticks = tpq // 2   # ticks per eighth

    def vlq(n):
        b = [n & 0x7F]; n >>= 7
        while n:
            b.insert(0, (n & 0x7F) | 0x80); n >>= 7
        return bytes(b)

    def track(events, ch=0, name=b''):
        ev = []
        for s, ln, p, v in events:
            ev.append((s * ticks, 0x90 | ch, p, v)); ev.append(((s + ln) * ticks - 1, 0x80 | ch, p, 0))
        ev.sort(key=lambda e: (e[0], e[1] & 0xF0 == 0x90))
        data = b'\x00\xff\x03' + vlq(len(name)) + name; t0 = 0
        for t, st, p, v in ev:
            data += vlq(t - t0) + bytes([st, p, v]); t0 = t
        data += b'\x00\xff\x2f\x00'
        return b'MTrk' + struct.pack('>I', len(data)) + data

    tempo = 60_000_000 // BPM
    meta = (b'\x00\xff\x51\x03' + tempo.to_bytes(3, 'big') + b'\x00\xff\x58\x04\x04\x02\x18\x08'
            + b'\x00\xff\x59\x02\x02\x00' + b'\x00\xff\x2f\x00')
    t0 = b'MTrk' + struct.pack('>I', len(meta)) + meta
    trs = [track(notes['lead'], 0, b'Melody'), track(notes['chords'], 1, b'Chords'), track(notes['bass'], 2, b'Bass')]
    open(path, 'wb').write(b'MThd' + struct.pack('>IHHH', 6, 1, 1 + len(trs), tpq) + t0 + b''.join(trs))


def main():
    index = {'source': 'docs/music/MUSIC_BIBLE.md section 1', 'bpm': BPM, 'key': 'D major', 'meter': '4/4, 3+3+2',
             'palette': 'glockenspiel lead, handbell chords, plucked strings (second pass), bouncing bass, '
                        'handclaps and soft kick (second pass), shaker, shimmer pad',
             'motifs': []}
    for mid, m in MOTIFS.items():
        audio, notes = render(m)
        write_midi(os.path.join(HERE, f'{mid}.mid'), notes)
        with tempfile.NamedTemporaryFile(suffix='.wav') as w:
            sf.write(w.name, audio, SR)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w.name, '-af', 'loudnorm=I=-16:TP=-1:LRA=20',
                            '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(HERE, f'{mid}.mp3')],
                           check=True)
        index['motifs'].append({'id': mid, 'title': m['title'], 'contour': m['contour'],
                                'harmony': m['harmony_source'], 'audio': f'{mid}.mp3', 'midi': f'{mid}.mid',
                                'duration_s': round(len(audio) / SR, 2)})
        print(mid, round(len(audio) / SR, 1), 's')
    json.dump(index, open(os.path.join(HERE, 'motifs.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
