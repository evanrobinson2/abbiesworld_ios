"""Wonder: the adventure bed for the family teleport worlds. E lydian, so the raised fourth gives everything a
lift of 'somewhere new'. Horns state Abbie's motif, strings shimmer, timpani lean into each new phrase."""
from engine.core import Cue, Key
from cues.common import STEMS, strings, arp, n

META = {
    'id': 'wonder',
    'title': 'Wonder',
    'group': 'Music',
    'brief': 'Adventure bed for the family teleport worlds and any new world being explored. E lydian: harp '
             'ripples and string tremolo under horns singing Abbie\'s motif, timpani swells into each phrase.',
    'uses': ['exploring a new world', 'family teleport adventure', 'holodeck reveal', 'world tour'],
    'tags': ['adventure', 'wonder', 'lydian', 'cinematic', 'teleport'],
}

E_ = ('E2', ['E3', 'B3'], 'G#4', ['B4', 'E5'], ['E3', 'B3', 'E4', 'G#4', 'B4'])
FS = ('E2', ['E3', 'C#4'], 'A#4', ['C#5', 'F#5'], ['E3', 'C#4', 'F#4', 'A#4', 'C#5'])
H = [
    E_, FS, E_, FS,
    ('C#2', ['C#3', 'G#3'], 'E4', ['G#4', 'B4'], ['C#3', 'G#3', 'B3', 'E4', 'G#4']),
    ('A1', ['A2', 'E3'], 'C#4', ['G#4', 'C#5'], ['A2', 'E3', 'G#3', 'C#4', 'E4']),
    [(0, 2, ('B1', ['F#3', 'B3'], 'E4', ['F#4', 'B4'])), (2, 2, ('B1', ['F#3', 'B3'], 'D#4', ['F#4', 'B4']))],
    ('B1', ['F#3', 'A3'], 'D#4', ['F#4', 'B4'], ['B2', 'F#3', 'A3', 'D#4', 'F#4']),
    ('G#1', ['B2', 'E3'], 'B3', ['G#4', 'B4'], ['G#2', 'B2', 'E3', 'G#3', 'B3']),
    ('A1', ['A2', 'E3'], 'C#4', ['E4', 'A4'], ['A2', 'E3', 'A3', 'C#4', 'E4']),
    ('F#1', ['F#2', 'C#3'], 'A3', ['E4', 'A4'], ['F#2', 'C#3', 'E3', 'A3', 'C#4']),
    ('B1', ['F#2', 'D#3'], 'B3', ['D#4', 'F#4'], ['B2', 'F#3', 'B3', 'D#4', 'F#4']),
    ('C#2', ['C#3', 'G#3'], 'E4', ['G#4', 'C#5'], ['C#3', 'G#3', 'C#4', 'E4', 'G#4']),
    ('A1', ['A2', 'E3'], 'C#4', ['E4', 'B4'], ['A2', 'E3', 'B3', 'C#4', 'E4']),
    ('A#1', ['C#3', 'F#3'], 'A#3', ['C#4', 'F#4'], ['A#2', 'C#3', 'F#3', 'A#3', 'C#4']),
    [(0, 2, ('B1', ['F#2', 'B2'], 'E4', ['F#4', 'B4'])), (2, 2, ('B1', ['F#2', 'B2'], 'D#4', ['F#4', 'B4']))],
]
HARP_SPLIT = {6: ['B2', 'F#3', 'B3', 'E4', 'F#4'], 15: ['B2', 'F#3', 'B3', 'D#4', 'F#4']}


def build(variant=None):
    k = Key('E3', 'lydian')
    cue = Cue('wonder', 'Wonder', 92, 16, k, loop=True, hall=2.8, brightness=0.6, stems=STEMS)
    cue.meta['motif'] = 'horn bars 1-3 (with the lydian A# answer), horns in thirds bars 9-11'
    strings(cue, [h if isinstance(h, list) else h[:4] for h in H], 4, vel=0.45)

    harp = cue.part('harp', 'harp', 'pulse', pan=-0.2, gain_db=-3, reverb=0.4)
    pizz = cue.part('cello pizz', 'cellos_pizz', 'pulse', pan=0.3, gain_db=-7, reverb=0.3)
    for i, h in enumerate(H):
        notes = HARP_SPLIT.get(i) or h[4]
        arp(harp, i * 4, notes, [0, 1, 2, 3, 4, 3, 2, 1], 0.5, 4, vel=0.45, accent=0.12, ring=1.5)
        pizz.note(i * 4, n(notes[0]), 1, 0.5)

    hn = cue.part('horn', 'horn', 'melody', pan=0.2, gain_db=-1, reverb=0.45, attack=0.05, legato=0.08)
    first = 'B3:1 E4:.5 F#4:.5 G#4:2  F#4:1.5 G#4:.5 A#4:2  B4:1 G#4:.5 F#4:.5 E4:2  F#4:4'
    hn.seq(0, first, vel=0.6, shape='arc', transpose=-12)     # low horns: the sampled horn is best below C4
    cla = cue.part('clarinet 1', 'clarinet', 'melody', pan=-0.05, gain_db=-8, reverb=0.4, attack=0.04, legato=0.06)
    cla.seq(0, first, vel=0.45, shape='arc')
    fl = cue.part('flute', 'flute', 'melody', pan=-0.25, gain_db=-5, reverb=0.4, attack=0.03, legato=0.06)
    cl = cue.part('clarinet', 'clarinet', 'melody', pan=0.1, gain_db=-7, reverb=0.4, attack=0.03, legato=0.06)
    line = 'G#4:1 B4:.5 C#5:.5 E5:2  E5:1 D#5:.5 C#5:.5 G#4:2  E5:2 D#5:2  F#5:3 r:1'
    fl.seq(16, line, vel=0.55)
    cl.seq(16, line, vel=0.5)
    # The big statement: horns an octave below a soft trumpet, flute an octave above (film-brass spacing).
    a = 'B3:1 E4:.5 F#4:.5 G#4:2  A4:1.5 G#4:.5 E4:2  C#4:1 F#4:.5 G#4:.5 A4:2  F#4:3 r:1'
    hn.seq(32, a, vel=0.7, shape='arc', transpose=-12)
    tp = cue.part('trumpet', 'trumpet', 'melody', pan=0.05, gain_db=-7, reverb=0.5, attack=0.05, legato=0.08)
    tp.seq(32, a, vel=0.35, shape='arc')
    fl.seq(32, a, vel=0.35, transpose=12)
    ob = cue.part('oboe', 'oboe', 'melody', pan=-0.1, gain_db=-5, reverb=0.4, attack=0.03, legato=0.06)
    ob.seq(48, 'G#4:1 C#5:.5 D#5:.5 E5:2  E5:1.5 D#5:.5 B4:2  C#5:1 A#4:1 F#4:2  B4:2 F#4:2', vel=0.5)

    tr = cue.part('violin shimmer', 'violins_trem', 'color', pan=-0.4, gain_db=-11, reverb=0.6, attack=0.5)
    for b, ch in [(0, ['G#5', 'B5']), (4, ['A#5', 'C#6']), (8, ['G#5', 'B5']), (12, ['A#5', 'C#6']),
                  (32, ['G#5', 'B5']), (36, ['A5', 'C#6']), (40, ['A5', 'C#6']), (44, ['F#5', 'B5'])]:
        tr.chord(b, [n(x) for x in ch], 4, 0.35, shape='arc')
    gl = cue.part('glock', 'glock', 'color', pan=0.4, gain_db=-3, reverb=0.5)
    gl.seq(0, 'B5:1 E6:.5 F#6:.5 G#6:2', vel=0.35)
    gl.seq(32, 'B5:1 E6:.5 F#6:.5 G#6:2', vel=0.35)
    timp = cue.part('timpani', 'timpani', 'color', pan=0.1, gain_db=-4, reverb=0.35)
    roll = cue.part('timpani roll', 'timpani_roll', 'color', pan=0.1, gain_db=-8, reverb=0.35)
    for bar in (7, 15):
        roll.note(bar * 4, n('F#2'), 4, 0.5, shape='swell')
    for bar in (0, 8):
        timp.note(bar * 4, n('E2'), 2, 0.6)
    cym = cue.part('cymbal', 'flute', 'color', reverb=0.4)
    cym.hit(32, 'cymbal_swell', gain_db=-14)
    return cue
