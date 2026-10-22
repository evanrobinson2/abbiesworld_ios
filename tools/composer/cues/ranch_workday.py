"""Ranch Workday: the busy-day bed. Pizzicato and marimba keep things moving while chores get done; the
clarinet carries Abbie's motif, flute and bassoon trade a light staccato figure. Playful, never silly."""
from engine.core import Cue, Key
from cues.common import STEMS, strings, arp, n

META = {
    'id': 'ranch-workday',
    'title': 'Ranch Workday',
    'group': 'Music',
    'brief': 'Busy daytime bed for the Ranch: chores, deliveries, animals out in the field. Pizzicato and marimba '
             'motion under a clarinet tune built on Abbie\'s motif; light staccato woodwinds in the second half.',
    'uses': ['ranch busy day', 'simulation running at speed', 'deliveries and chores'],
    'tags': ['ranch', 'day', 'playful', 'pizzicato'],
}

H = [
    ('G1', ['G2', 'D3'], 'B3', ['D4', 'G4'], ['G2', 'D3', 'G3', 'B3', 'D4']),
    ('G1', ['G2', 'E3'], 'C4', ['E4', 'G4'], ['G2', 'C3', 'E3', 'G3', 'C4']),
    ('G1', ['G2', 'D3'], 'B3', ['D4', 'G4'], ['G2', 'D3', 'G3', 'B3', 'D4']),
    ('F#1', ['A2', 'D3'], 'A3', ['D4', 'F#4'], ['F#2', 'A2', 'D3', 'F#3', 'A3']),
    ('E2', ['E3', 'B3'], 'G3', ['E4', 'G4'], ['E2', 'B2', 'E3', 'G3', 'B3']),
    ('C2', ['C3', 'G3'], 'E4', ['G4', 'C5'], ['C3', 'G3', 'C4', 'E4', 'G4']),
    ('A1', ['A2', 'E3'], 'C4', ['E4', 'G4'], ['A2', 'E3', 'G3', 'C4', 'E4']),
    [(0, 2, ('D2', ['D3', 'A3'], 'F#4', ['A4', 'D5'])), (2, 2, ('D2', ['D3', 'A3'], 'F#4', ['A4', 'C5']))],
    ('B1', ['D3', 'G3'], 'B3', ['D4', 'G4'], ['B2', 'D3', 'G3', 'B3', 'D4']),
    ('C2', ['E3', 'G3'], 'C4', ['E4', 'G4'], ['C3', 'E3', 'G3', 'C4', 'E4']),
    ('B1', ['D3', 'G3'], 'D4', ['G4', 'B4'], ['B2', 'D3', 'G3', 'B3', 'D4']),
    ('A1', ['E3', 'A3'], 'C4', ['E4', 'A4'], ['A2', 'E3', 'A3', 'C4', 'E4']),
    ('C2', ['G2', 'E3'], 'E4', ['G4', 'C5'], ['C3', 'G3', 'C4', 'E4', 'G4']),
    ('F#1', ['A2', 'D3'], 'D4', ['F#4', 'A4'], ['F#2', 'A2', 'D3', 'F#3', 'A3']),
    [(0, 2, ('B1', ['D3', 'G3'], 'D4', ['G4', 'B4'])), (2, 2, ('C2', ['E3', 'G3'], 'E4', ['G4', 'C5']))],
    [(0, 2, ('D2', ['A2', 'D3'], 'G4', ['A4', 'D5'])), (2, 2, ('D2', ['A2', 'D3'], 'F#4', ['A4', 'C5']))],
]
PULSE_SPLIT = {7: (['D3', 'A3', 'D4', 'F#4', 'A4'], ['D3', 'A3', 'C4', 'F#4', 'A4']),
               14: (['B2', 'D3', 'G3', 'B3', 'D4'], ['C3', 'E3', 'G3', 'C4', 'E4']),
               15: (['D3', 'G3', 'A3', 'D4', 'G4'], ['D3', 'F#3', 'A3', 'C4', 'F#4'])}


def build(variant=None):
    k = Key('G3', 'major')
    cue = Cue('ranch-workday', 'Ranch Workday', 104, 16, k, loop=True, hall=2.0, brightness=0.6, stems=STEMS)
    cue.meta['motif'] = 'clarinet bars 1 and 5; flute high bars 9-10'
    strings(cue, [h if isinstance(h, list) else h[:4] for h in H], 4, vel=0.32, gains={'vn': -7})

    mar = cue.part('marimba', 'marimba', 'pulse', pan=-0.25, gain_db=-5, reverb=0.25)
    vcp = cue.part('cello pizz', 'cellos_pizz', 'pulse', pan=0.3, gain_db=-3, reverb=0.25)
    vnp = cue.part('violin pizz', 'violins_pizz', 'pulse', pan=-0.4, gain_db=-6, reverb=0.3)
    for i in range(16):
        halves = PULSE_SPLIT.get(i, (H[i][4], H[i][4]) if not isinstance(H[i], list) else None)
        for h, notes in enumerate(halves):
            b = i * 4 + h * 2
            arp(mar, b, notes, [0, 2, None, 3, 1, None, 4, 2][h * 4:h * 4 + 4], 0.5, 2, vel=0.5, accent=0.1)
            vcp.note(b, n(notes[0]), 0.5, 0.6)
            vnp.chord(b + 1, [n(notes[3]), n(notes[4])], 0.5, 0.45)
            vnp.chord(b + 1.5, [n(notes[3]), n(notes[4])], 0.5, 0.35) if (i + h) % 2 else None

    cl = cue.part('clarinet', 'clarinet', 'melody', pan=0.2, gain_db=-5, reverb=0.3, attack=0.02, legato=0.05)
    cl.seq(0, 'D4:1 G4:.5 A4:.5 B4:2  C5:1 B4:.5 A4:.5 G4:1 E4:1  D4:1 G4:.5 A4:.5 B4:1 D5:1  C5:1.5 B4:.5 A4:2', vel=0.55)
    cl.seq(16, 'B4:1 E5:.5 F#5:.5 G5:2  E5:1.5 D5:.5 C5:2  A4:1 C5:.5 D5:.5 E5:1 G5:1  F#5:3 r:1', vel=0.6)
    fl = cue.part('flute', 'flute', 'melody', pan=-0.2, gain_db=-6, reverb=0.35, attack=0.02, legato=0.05)
    fl.seq(32, 'D5:1 G5:.5 A5:.5 B5:2  A5:1.5 G5:.5 E5:2  G5:1 B5:.5 A5:.5 G5:1 D5:1  E5:2 C5:1 A4:1', vel=0.5)
    cs = cue.part('clarinet stac', 'clarinet_stac', 'melody', pan=0.2, gain_db=-5, reverb=0.3)
    cs.seq(48, 'E5:.5 G5:.5 C5:.5 E5:.5 G4:.5 C5:.5 E4:.5 G4:.5  F#4:.5 A4:.5 D5:.5 F#5:.5 A5:1 r:1', vel=0.55)
    cs.seq(56, 'G5:.5 D5:.5 B4:.5 G4:.5 E5:.5 C5:.5 G4:.5 E4:.5  G4:.5 A4:.5 r:.5 F#4:.5 A4:1 r:1', vel=0.55)
    bs = cue.part('bassoon stac', 'bassoon_stac', 'melody', pan=0.35, gain_db=-4, reverb=0.25)
    bs.seq(48, 'C3:1 G2:1 C3:1 E3:1  F#2:1 A2:1 D3:1 r:1  B2:1 G2:1 C3:1 G2:1  D3:1 r:1 D2:1 r:1', vel=0.55)

    gl = cue.part('glock', 'glock', 'color', pan=-0.4, gain_db=-3, reverb=0.45)
    gl.seq(32, 'D6:1 G6:.5 A6:.5 B6:2', vel=0.35)
    for b, p in [(0, 'B5'), (16, 'G6'), (44, 'E6'), (60, 'A6')]:
        gl.note(b, n(p), 1, 0.35)
    xy = cue.part('xylo', 'xylo', 'color', pan=0.4, gain_db=-8, reverb=0.3)
    xy.seq(52, 'F#5:.5 A5:.5 D6:.5 F#6:.5 A6:1', vel=0.45)
    tri = cue.part('triangle', 'flute', 'color', reverb=0.4)
    for b in (0, 32):
        tri.hit(b, 'triangle', gain_db=-14)
    return cue
