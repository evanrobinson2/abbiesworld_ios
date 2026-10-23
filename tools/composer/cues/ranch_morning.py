"""Ranch Morning: the home theme. Warm, unhurried, sunlight on a field; Tiny Glade rather than a cartoon."""
from engine.core import Cue, Key
from cues.common import STEMS, strings, arp, play, motif, n

META = {
    'id': 'ranch-morning',
    'title': 'Ranch Morning',
    'group': 'Music',
    'brief': 'Home theme for the Ranch in daylight. Strings breathe under a harp that never stops moving; the flute '
             'sings Abbie\'s motif, the horn answers it in the second half. Calm enough to build to for an hour.',
    'uses': ['ranch daytime', 'building and placing tiles', 'title screen'],
    'tags': ['ranch', 'day', 'pastoral', 'home', 'theme'],
}

# D major, 16 bars of 4/4. (bass, cellos, violas, violins); harp figure notes.
H = [
    ('D2', ['D3', 'A3'], 'F#4', ['A4', 'D5'], ['D3', 'A3', 'D4', 'F#4', 'A4']),
    ('D2', ['D3', 'B3'], 'G4', ['B4', 'D5'], ['G2', 'D3', 'G3', 'B3', 'D4']),
    ('B1', ['F#3', 'A3'], 'D4', ['F#4', 'B4'], ['B2', 'F#3', 'B3', 'D4', 'F#4']),
    ('G1', ['G2', 'D3'], 'A4', ['B4', 'D5'], ['G2', 'D3', 'A3', 'B3', 'D4']),
    ('F#1', ['A2', 'D3'], 'F#4', ['A4', 'D5'], ['F#2', 'D3', 'A3', 'D4', 'F#4']),
    ('G1', ['B2', 'D3'], 'G4', ['B4', 'D5'], ['G2', 'D3', 'G3', 'B3', 'D4']),
    ('E2', ['E3', 'B3'], 'D4', ['G4', 'B4'], ['E2', 'B2', 'E3', 'G3', 'D4']),
    [(0, 2, ('A1', ['E3', 'A3'], 'D4', ['E4', 'A4'])), (2, 2, ('A1', ['E3', 'A3'], 'C#4', ['E4', 'A4']))],
    ('B1', ['F#3', 'B3'], 'D4', ['F#4', 'B4'], ['B2', 'F#3', 'B3', 'D4', 'F#4']),
    ('F#1', ['C#3', 'A3'], 'E4', ['F#4', 'A4'], ['F#2', 'C#3', 'F#3', 'A3', 'C#4']),
    ('G1', ['D3', 'B3'], 'F#4', ['G4', 'B4'], ['G2', 'D3', 'F#3', 'B3', 'D4']),
    ('F#1', ['A2', 'D3'], 'F#4', ['A4', 'D5'], ['F#2', 'D3', 'A3', 'D4', 'F#4']),
    ('E2', ['E3', 'B3'], 'G4', ['B4', 'D5'], ['E2', 'B2', 'E3', 'G3', 'D4']),
    ('G1', ['D3', 'B3'], 'G4', ['B4', 'D5'], ['G2', 'D3', 'G3', 'B3', 'D4']),
    ('A1', ['E3', 'A3'], 'D4', ['E4', 'A4'], ['A2', 'E3', 'A3', 'D4', 'E4']),
    ('A1', ['E3', 'A3'], 'C#4', ['E4', 'G4'], ['A2', 'E3', 'G3', 'C#4', 'E4']),
]
HARP_DEFAULT = ['D3', 'A3', 'D4', 'F#4', 'A4']


def build(variant=None):
    k = Key('D4', 'major')
    cue = Cue('ranch-morning', 'Ranch Morning', 76, 16, k, loop=True, hall=2.6, stems=STEMS)
    cue.meta['motif'] = 'flute bars 1-2 and 5-6; horn bars 9-11; flute and oboe in thirds bars 13-16'
    bars = [h if isinstance(h, list) else h[:4] for h in H]
    strings(cue, bars, 4, vel=0.42)

    # Pulse: harp eighths, pizzicato on 1 and 3.
    harp = cue.part('harp', 'harp', 'pulse', pan=-0.15, gain_db=-3, reverb=0.35)
    pizz = cue.part('cello pizz', 'cellos_pizz', 'pulse', pan=0.3, gain_db=-6, reverb=0.3)
    for i, h in enumerate(H):
        notes = h[4] if not isinstance(h, list) else ['A2', 'E3', 'A3', 'C#4', 'E4']
        pat = [0, 1, 2, 3, 4, 3, 2, 1] if i % 2 == 0 else [0, 2, 1, 3, 2, 4, 3, 2]
        arp(harp, i * 4, notes, pat, 0.5, 4, vel=0.42, accent=0.1, ring=1.5)
        root = n(notes[0])
        pizz.note(i * 4, root, 1, 0.5).note(i * 4 + 2, n(notes[1]), 1, 0.4)

    # Melody.
    fl = cue.part('flute', 'flute', 'melody', pan=-0.2, gain_db=-4, reverb=0.4, attack=0.03, legato=0.06)
    ob = cue.part('oboe', 'oboe', 'melody', pan=0.15, gain_db=-7, reverb=0.4, attack=0.03, legato=0.06)
    hn = cue.part('horn', 'horn', 'melody', pan=0.25, gain_db=-2, reverb=0.45, attack=0.06, legato=0.08)
    fl.seq(0, 'A4:1 D5:.5 E5:.5 F#5:2  E5:1.5 D5:.5 B4:2  A4:1 B4:.5 D5:.5 F#5:1.5 E5:.5  D5:2 B4:1 A4:1', vel=0.55)
    fl.seq(16, 'A4:1 D5:.5 E5:.5 F#5:2  G5:1.5 F#5:.5 E5:1 D5:1  B4:1 D5:.5 E5:.5 G5:1 F#5:1  E5:3 r:1', vel=0.6)
    hn.seq(32, 'F#3:1 B3:.5 C#4:.5 D4:2  C#4:1.5 A3:.5 F#3:2  G3:1 A3:.5 B3:.5 D4:2  A3:3 r:1', vel=0.5)
    top = 'G5:1 F#5:.5 E5:.5 D5:2  B4:1 D5:.5 E5:.5 G5:2  A5:2 G5:1 E5:1  E5:2 C#5:1 r:1'
    fl.seq(48, top, vel=0.55)
    beat = 48
    for tok in top.split():
        p, d = tok.split(':')
        if p != 'r':
            ob.note(beat, k.shift(n(p), -2), float(d), 0.5)
        beat += float(d)

    # Color: a bell on each phrase, triangle at the top of each half.
    gl = cue.part('glock', 'glock', 'color', pan=-0.4, gain_db=-1, reverb=0.5)
    for b, p in [(0, 'A6'), (16, 'A6'), (32, 'F#6'), (40, 'G6'), (48, 'B6'), (56, 'A6')]:
        gl.note(b, n(p), 2, 0.4)
    gl.seq(4, 'D6:.5 E6:.5 F#6:1', vel=0.3)
    gl.seq(20, 'D6:.5 E6:.5 F#6:1', vel=0.3)
    tri = cue.part('triangle', 'flute', 'color', reverb=0.5)
    tri.hit(0, 'triangle', gain_db=-16).hit(32, 'triangle', gain_db=-16)
    vn_hi = cue.part('violins high', 'violins', 'color', pan=-0.3, gain_db=-5, reverb=0.6, attack=0.4)
    for b, p in [(32, ['F#5', 'B5']), (36, ['E5', 'A5']), (40, ['D5', 'G5']), (44, ['D5', 'F#5'])]:
        vn_hi.chord(b, [n(x) for x in p], 4, 0.3, shape='arc')
    return cue
