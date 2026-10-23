"""Interludes: short through-composed pieces (6-15 s) for title cards and transitions between beds."""
from engine.core import Cue, Key
from engine.instruments import midi as n
from cues.stings import strings_chord


def world_intro():
    """The full statement of Abbie's motif: the 'you are somewhere new' title card. D major, ends home."""
    k = Key('D3', 'major')
    cue = Cue('world-intro', 'World Intro', 72, 6, k, kind='interlude', tail=5.0, hall=2.8)
    cue.part('fx', 'flute', 'foundation').hit(4, 'cymbal_swell', gain_db=-12).hit(20, 'cymbal_swell_long', gain_db=-10)
    hp = cue.part('harp', 'harp', 'foundation', pan=-0.2, gain_db=-3, reverb=0.4)
    for i in range(22):
        hp.note(i * 4 / 24, k(1 + i, -1), 1, 0.4 + i * 0.012)
    I = [(1, -1), [(1, -1), (5, -1)], [(3, 0)], [(5, 0), (1, 1)]]
    IV = [(4, -2), [(4, -1), (1, 0)], [(6, 0)], [(1, 1), (4, 1)]]
    vi = [(6, -2), [(6, -1), (3, 0)], [(6, 0)], [(1, 1), (3, 1)]]
    I6 = [(3, -2), [(5, -1), (1, 0)], [(5, 0)], [(1, 1), (3, 1)]]
    ii7 = [(2, -1), [(2, -1), (6, -1)], [(4, 0)], [(6, 0), (2, 1)]]
    V = [(5, -2), [(5, -1), (2, 0)], [(7, 0)], [(2, 1), (5, 1)]]
    I_full = [(1, -1), [(1, -1), (5, -1)], [(3, 0), (5, 0)], [(1, 1), (3, 1), (5, 1)]]
    chords = [(0, 4, I, 'swell', 0.45), (4, 4, I, 'arc', 0.55), (8, 2, IV, 'arc', 0.55), (10, 2, vi, 'arc', 0.6),
              (12, 2, IV, 'arc', 0.6), (14, 2, I6, 'arc', 0.6), (16, 2, ii7, 'arc', 0.65), (18, 2, V, 'cresc', 0.7),
              (20, 4, I_full, 'dim', 0.75)]
    for b, d, deg, shape, v in chords:
        strings_chord(cue, b, k, deg, d, v, shape=shape, attack=0.12 if b else 0.6)
    hn = cue.part('horns', 'horn', 'foundation', pan=0.25, gain_db=-1, reverb=0.45, attack=0.05, legato=0.08)
    tp = cue.part('trumpet', 'trumpet', 'foundation', pan=0.05, gain_db=-8, reverb=0.5, attack=0.05, legato=0.08)
    fl = cue.part('flute', 'flute', 'foundation', pan=-0.3, gain_db=-6, reverb=0.45, attack=0.03, legato=0.06)
    line = 'A3:1 D4:.5 E4:.5 F#4:2  G4:1.5 F#4:.5 D4:2  B3:1 D4:.5 E4:.5 F#4:1 A4:1  G4:2 E4:2  F#4:4'
    hn.seq(4, line, vel=0.65, shape='arc', transpose=-12)
    tp.seq(4, line, vel=0.35, shape='arc')
    fl.seq(4, line, vel=0.4, transpose=12)
    cue.part('timpani', 'timpani', 'foundation', gain_db=-3).note(4, n('D2'), 2, 0.55).note(20, n('D2'), 3, 0.65)
    cue.part('timpani roll', 'timpani_roll', 'foundation', gain_db=-8).note(18, n('A2'), 2, 0.5, shape='cresc')
    gl = cue.part('glock', 'glock', 'foundation', gain_db=-4, reverb=0.5)
    gl.seq(20, 'A6:1 D7:1 F#7:2', vel=0.4)
    return cue


def chapter_card():
    """A breath between chapters: flute motif over harp, home chord. D major."""
    k = Key('D3', 'major')
    cue = Cue('chapter-card', 'Chapter Card', 76, 3, k, kind='interlude', tail=4.0, hall=2.6)
    hp = cue.part('harp', 'harp', 'foundation', pan=-0.15, gain_db=-3, reverb=0.4)
    for b, ch in [(0, ['D3', 'A3', 'D4', 'F#4', 'A4']), (4, ['G2', 'D3', 'G3', 'B3', 'D4']), (8, ['D3', 'A3', 'D4', 'F#4', 'A4'])]:
        for i, p in enumerate(ch + ch[-2::-1]):
            hp.note(b + i * 0.5, n(p), 1, 0.4)
    strings_chord(cue, 0, k, [(1, -1), [(1, -1), (5, -1)], [(3, 0)], [(5, 0), (1, 1)]], 4, 0.35, attack=0.5)
    strings_chord(cue, 4, k, [(4, -2), [(4, -1), (1, 0)], [(4, 0)], [(6, 0), (1, 1)]], 4, 0.4)
    strings_chord(cue, 8, k, [(1, -1), [(1, -1), (5, -1)], [(3, 0)], [(5, 0), (1, 1)]], 4, 0.4, shape='dim')
    fl = cue.part('flute', 'flute', 'foundation', pan=-0.25, gain_db=-3, reverb=0.45, attack=0.03, legato=0.06)
    fl.seq(0, 'A4:1 D5:.5 E5:.5 F#5:2  G5:1.5 F#5:.5 D5:1 B4:1  A4:4', vel=0.5)
    cue.part('glock', 'glock', 'foundation', gain_db=-6, reverb=0.5).note(8, n('F#6'), 2, 0.35)
    return cue


def night_falls():
    """Day to night: D major darkens through borrowed chords and settles in B-flat, the Night bed's key."""
    k = Key('D3', 'major')
    cue = Cue('night-falls', 'Night Falls', 60, 4, k, beats_per_bar=3, kind='interlude', tail=5.0, hall=3.0, brightness=0.4)
    seq = [
        (0, 3, ['D2', ['D3', 'A3'], 'F#4', ['A4', 'D5']]),
        (3, 3, ['B1', ['F#3', 'B3'], 'D4', ['F#4', 'B4']]),
        (6, 3, ['G1', ['G2', 'D3'], 'Bb3', ['D4', 'G4']]),       # G minor: the first shadow
        (9, 3, ['F1', ['C3', 'A3'], 'Eb4', ['F4', 'A4']]),       # F7
        (12, 6, ['Bb1', ['Bb2', 'F3'], 'D4', ['F4', 'Bb4']]),
    ]
    parts = {}
    for b, d, (bs, vc, va, vn) in seq:
        for name, inst, pan, g, notes in [('basses', 'bass', .25, -3, [bs]), ('cellos', 'cellos', .35, -1, vc),
                                          ('violas', 'violas', .1, -3, [va]), ('violins', 'violins', -.35, -6, vn)]:
            p = parts.get(name) or parts.setdefault(name, cue.part(name, inst, 'foundation', pan=pan, gain_db=g, reverb=0.4, attack=0.3, legato=0.15))
            for x in notes:
                p.note(b, n(x), d, 0.35 if b < 12 else 0.3, shape='arc' if b < 12 else 'dim')
    cl = cue.part('clarinet', 'clarinet', 'foundation', pan=0.15, gain_db=-5, reverb=0.5, attack=0.05, legato=0.08)
    cl.seq(0, 'F#4:1.5 E4:.5 D4:1  D4:2 B3:1  Bb3:2 G3:1  A3:3  F3:3 r:3', vel=0.4)
    pn = cue.part('piano', 'piano', 'foundation', pan=-0.1, gain_db=-8, reverb=0.45)
    pn.seq(12, 'Bb3:.5 D4:.5 F4:.5 Bb4:.5 D5:1', vel=0.3)
    cue.part('glock', 'glock', 'foundation', gain_db=-6, reverb=0.6).note(13, n('D6'), 3, 0.3)
    return cue


def morning_comes():
    """Night to day: from B-flat, birdlike flute flutters and a rising horn bring the sun up in D."""
    k = Key('D3', 'major')
    cue = Cue('morning-comes', 'Morning Comes', 70, 4, k, kind='interlude', tail=4.5, hall=2.6, brightness=0.6)
    seq = [
        (0, 4, ['Bb1', ['Bb2', 'F3'], 'D4', ['F4', 'Bb4']]),
        (4, 4, ['G1', ['G2', 'D3'], 'B3', ['D4', 'G4']]),         # G major: the light turns
        (8, 4, ['A1', ['E3', 'A3'], 'C#4', ['E4', 'A4']]),
        (12, 4, ['D2', ['D3', 'A3'], 'F#4', ['A4', 'D5']]),
    ]
    for b, d, (bs, vc, va, vn) in seq:
        strings = [('basses', 'bass', .25, -3, [bs]), ('cellos', 'cellos', .35, -1, vc), ('violas', 'violas', .1, -3, [va]),
                   ('violins', 'violins', -.35, -5, vn)]
        for name, inst, pan, g, notes in strings:
            p = next((q for q in cue.parts if q.name == name), None) or cue.part(name, inst, 'foundation', pan=pan, gain_db=g, reverb=0.4, attack=0.3, legato=0.15)
            for x in notes:
                p.note(b, n(x), d, 0.3 + b * 0.02, shape='cresc' if b < 12 else 'arc')
    fs = cue.part('flute flutter', 'flute_stac', 'foundation', pan=-0.35, gain_db=-8, reverb=0.5)
    fs.seq(1, 'F5:.25 Bb5:.25 F5:.25 r:1.25', vel=0.4)
    fs.seq(5, 'D5:.25 G5:.25 B5:.25 G5:.25 r:1', vel=0.45)
    fs.seq(9, 'E5:.25 A5:.25 C#6:.25 A5:.25 E5:.25 A5:.25', vel=0.5)
    hn = cue.part('horn', 'horn', 'foundation', pan=0.25, gain_db=-2, reverb=0.45, attack=0.05, legato=0.08)
    hn.seq(8, 'A2:1 D3:.5 E3:.5 F#3:2  F#3:4', vel=0.6, shape='arc')
    fl = cue.part('flute', 'flute', 'foundation', pan=-0.2, gain_db=-5, reverb=0.45, attack=0.03)
    fl.seq(12, 'A5:1 D6:.5 E6:.5 F#6:2', vel=0.45)
    gl = cue.part('glock', 'glock', 'foundation', gain_db=-5, reverb=0.5)
    gl.seq(12, 'A6:1 D7:.5 E7:.5 F#7:2', vel=0.35)
    cue.part('fx', 'flute', 'foundation').hit(12, 'triangle', gain_db=-14)
    return cue


JOBS = [
    (world_intro, 'World Intro', 'Abbie\'s motif in full: harp sweep, strings and horns, timpani, bells. The title card '
     'for arriving somewhere new.', ['entering a world', 'title card', 'level start'], ['intro', 'theme', 'cinematic']),
    (chapter_card, 'Chapter Card', 'A breath between chapters: the flute sings the motif over harp and strings.',
     ['chapter title', 'story beat', 'pause screen'], ['chapter', 'gentle', 'harp']),
    (night_falls, 'Night Falls', 'Day turns to night: D major darkens through G minor into B-flat, ready for Ranch Night.',
     ['dusk', 'day to night', 'before Ranch Night'], ['transition', 'dusk', 'night']),
    (morning_comes, 'Morning Comes', 'Night turns to day: bird-like flute flutters and the horn bring the sun up in D.',
     ['dawn', 'night to day', 'before Ranch Morning'], ['transition', 'dawn', 'morning']),
]


def jobs():
    out = []
    for fn, title, brief, uses, tags in JOBS:
        meta = {'id': fn.__name__.replace('_', '-'), 'title': title, 'group': 'Interludes', 'brief': brief,
                'uses': uses, 'tags': tags}
        out.append((meta, fn, None))
    return out
