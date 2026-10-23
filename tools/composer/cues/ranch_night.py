"""Ranch Night: a lullaby waltz for the Ranch after dark. Piano and hushed strings; clarinet, then a solo
violin, sing Abbie's motif slowly. Fireflies, not ghosts."""
from engine.core import Cue, Key
from cues.common import STEMS, strings, arp, n

META = {
    'id': 'ranch-night',
    'title': 'Ranch Night',
    'group': 'Music',
    'brief': 'Night bed for the Ranch: a slow 3/4 lullaby. Piano ripples under muted-feeling strings; the clarinet '
             'and then a solo violin sing Abbie\'s motif. Warm and safe, made for winding down.',
    'uses': ['ranch night', 'bedtime', 'quiet building', 'end of a session'],
    'tags': ['ranch', 'night', 'lullaby', 'waltz', 'calm'],
}

H = [
    ('Bb1', ['Bb2', 'F3'], 'D4', ['F4', 'Bb4'], ['Bb2', 'F3', 'Bb3', 'D4', 'F4']),
    ('G1', ['G2', 'D3'], 'Bb3', ['D4', 'G4'], ['G2', 'D3', 'G3', 'Bb3', 'D4']),
    ('Eb2', ['Eb3', 'Bb3'], 'G4', ['G4', 'Bb4'], ['Eb2', 'Bb2', 'Eb3', 'G3', 'Bb3']),
    ('F1', ['C3', 'A3'], 'C4', ['F4', 'A4'], ['F2', 'C3', 'F3', 'A3', 'C4']),
    ('D2', ['F3', 'Bb3'], 'D4', ['F4', 'Bb4'], ['D2', 'F2', 'Bb2', 'D3', 'F3']),
    ('Eb2', ['G3', 'Bb3'], 'Eb4', ['G4', 'Bb4'], ['Eb2', 'Bb2', 'Eb3', 'G3', 'Bb3']),
    ('C2', ['G3', 'Bb3'], 'Eb4', ['G4', 'C5'], ['C3', 'G3', 'Bb3', 'Eb4', 'G4']),
    [(0, 1.5, ('F1', ['C3', 'F3'], 'Bb3', ['C4', 'F4'])), (1.5, 1.5, ('F1', ['C3', 'F3'], 'A3', ['C4', 'F4']))],
    ('G1', ['D3', 'Bb3'], 'D4', ['G4', 'Bb4'], ['G2', 'D3', 'G3', 'Bb3', 'D4']),
    ('D2', ['A2', 'F3'], 'A3', ['D4', 'F4'], ['D2', 'A2', 'D3', 'F3', 'A3']),
    ('Eb2', ['Bb2', 'G3'], 'Eb4', ['G4', 'Bb4'], ['Eb2', 'Bb2', 'Eb3', 'G3', 'Bb3']),
    ('D2', ['Bb2', 'F3'], 'D4', ['F4', 'Bb4'], ['D2', 'Bb2', 'D3', 'F3', 'Bb3']),
    ('C2', ['G2', 'Eb3'], 'G3', ['C4', 'Eb4'], ['C3', 'G3', 'C4', 'Eb4', 'G4']),
    ('F1', ['Eb3', 'Bb3'], 'Eb4', ['G4', 'Bb4'], ['F2', 'Eb3', 'G3', 'Bb3', 'Eb4']),
    ('F1', ['C3', 'A3'], 'C4', ['F4', 'A4'], ['F2', 'C3', 'F3', 'A3', 'C4']),
    ('F1', ['C3', 'A3'], 'Eb4', ['F4', 'A4'], ['F2', 'C3', 'Eb3', 'A3', 'C4']),
]


def build(variant=None):
    k = Key('Bb3', 'major')
    cue = Cue('ranch-night', 'Ranch Night', 60, 16, k, beats_per_bar=3, loop=True, hall=3.0, brightness=0.4,
              stems=STEMS)
    cue.meta['motif'] = 'clarinet bars 1-2 and 5; solo violin in G minor bars 9-10'
    strings(cue, [h if isinstance(h, list) else h[:4] for h in H], 3, vel=0.25, gains={'vn': -8, 'va': -4})

    pno = cue.part('piano', 'piano', 'pulse', pan=-0.1, gain_db=-7, reverb=0.4)
    for i, h in enumerate(H):
        notes = h[4] if not isinstance(h, list) else ['F2', 'C3', 'F3', 'A3', 'C4']
        arp(pno, i * 3, notes, [0, 2, 4, 3, 4, 2] if i % 4 != 3 else [0, 2, 3, 4, 3, 2], 0.5, 3, vel=0.3, accent=0.08,
            ring=1.5)

    cl = cue.part('clarinet', 'clarinet', 'melody', pan=0.15, gain_db=-6, reverb=0.45, attack=0.05, legato=0.08)
    cl.seq(0, 'F4:1 Bb4:.5 C5:.5 D5:1  D5:1.5 C5:.5 Bb4:1  G4:3  r:1 A4:1 C5:1', vel=0.45)
    cl.seq(12, 'D5:1 Bb4:.5 C5:.5 D5:1  Eb5:1.5 D5:.5 C5:1  Bb4:2 G4:1  C5:1.5 A4:1.5', vel=0.45)
    sv = cue.part('solo violin', 'solo_violin', 'melody', pan=-0.2, gain_db=-7, reverb=0.5, attack=0.08, legato=0.1)
    sv.seq(24, 'D5:1 G5:.5 A5:.5 Bb5:1  A5:1.5 F5:.5 D5:1  G5:1 F5:.5 Eb5:.5 G5:1  F5:3', vel=0.4, shape='arc')
    sv.seq(36, 'Eb5:1 G5:.5 F5:.5 Eb5:1  D5:1.5 C5:1.5  C5:3  A4:2 r:1', vel=0.4, shape='arc')

    gl = cue.part('glock', 'glock', 'color', pan=0.4, gain_db=-4, reverb=0.6)
    for b, p in [(0, 'D6'), (12, 'F6'), (24, 'D6'), (36, 'Eb6'), (45, 'C6')]:
        gl.note(b, n(p), 2, 0.3)
    hp = cue.part('harp', 'harp', 'color', pan=0.3, gain_db=-8, reverb=0.5)
    for b, ch in [(0, ['Bb3', 'D4', 'F4', 'Bb4', 'D5']), (24, ['G3', 'Bb3', 'D4', 'G4', 'Bb4'])]:
        hp.chord(b, [n(x) for x in ch], 3, 0.35, spread=0.12)
    return cue
