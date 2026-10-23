"""Stings: one- to five-second musical moments, each written once in scale degrees and rendered in the key of
every bed (D, G, Bb, E), so the game can drop one over whatever is playing and it lands in tune."""
from engine.core import Cue, Key
from cues.common import STEMS

KEYS = {'D': 50, 'G': 55, 'Bb': 46, 'E': 52}      # tonic MIDI note per bed key (D3, G3, Bb2, E3)
BED_KEYS = {'ranch-morning': 'D', 'ranch-workday': 'G', 'ranch-night': 'Bb', 'wonder': 'E'}


def strings_chord(cue, beat, k, degrees, dur, vel, shape='arc', stem='foundation', attack=0.08, trem=False):
    """degrees: (bass, cellos[], violas[], violins[]) as (degree, octave) pairs."""
    names = ('basses', 'cellos', 'violas', 'violins')
    insts = ('bass', 'cellos_trem' if trem else 'cellos', 'violas', 'violins_trem' if trem else 'violins')
    gains = (-3, -1, -2, -3)
    for name, inst, g, notes in zip(names, insts, gains, degrees):
        p = cue.part(name, inst, stem, pan={'basses': .25, 'cellos': .35, 'violas': .1, 'violins': -.35}[name],
                     gain_db=g, reverb=0.35, attack=attack)
        for d, o in (notes if isinstance(notes, list) else [notes]):
            p.note(beat, k(d, o), dur, vel, shape=shape)


def arrival(k):
    cue = Cue('sting-arrival', 'Arrival', 90, 3, k, kind='sting', tail=4.5, hall=2.6)
    hp = cue.part('harp', 'harp', 'foundation', pan=-0.2, gain_db=-2, reverb=0.4)
    for i in range(15):
        hp.note(i / 16, k(1 + i, -1), 0.5, 0.45 + i * 0.02)
    cue.part('gliss', 'flute', 'foundation').hit(0, 'glock_gliss_up_slow', gain_db=-12)
    strings_chord(cue, 1, k, [(1, -1), [(5, -1), (1, 0)], [(3, 0), (5, 0)], [(1, 1), (3, 1), (5, 1)]], 4, 0.6)
    hn = cue.part('horn', 'horn', 'foundation', pan=0.2, gain_db=-1, reverb=0.45, attack=0.04)
    hn.seq(1, f'{k(5, -1)}:1 {k(1)}:.5 {k(2)}:.5 {k(3)}:3', vel=0.6, shape='arc')
    fl = cue.part('flute', 'flute', 'foundation', pan=-0.3, gain_db=-7, reverb=0.45, attack=0.03)
    fl.seq(1, f'{k(5, 1)}:1 {k(1, 2)}:.5 {k(2, 2)}:.5 {k(3, 2)}:3', vel=0.4)
    cue.part('timpani', 'timpani', 'foundation', gain_db=-4).note(1, k(1, -1), 2, 0.55)
    cue.part('triangle', 'flute', 'foundation').hit(1, 'triangle', gain_db=-14)
    return cue


def teleport(k):
    cue = Cue('sting-teleport', 'Teleport', 120, 2, k, kind='sting', tail=4.0, hall=3.0, brightness=0.7)
    fx = cue.part('fx', 'flute', 'foundation')
    fx.hit(0, 'glock_gliss_up', gain_db=-8).hit(0.25, 'bell_tree', gain_db=-10).hit(2, 'cymbal_swell_short', gain_db=-10)
    tr = cue.part('violins rise', 'violins_trem', 'foundation', pan=-0.3, gain_db=-4, reverb=0.5, attack=0.05)
    for i, d in enumerate([1, 3, 5, 8]):
        tr.note(i * 0.5, k(d, 1), 0.5, 0.35 + 0.1 * i, shape='cresc')
    va = cue.part('violas rise', 'violas', 'foundation', pan=0.2, gain_db=-5, reverb=0.5, attack=0.3)
    va.note(0, k(5), 2, 0.6, shape='swell')
    hp = cue.part('harp', 'harp', 'foundation', pan=0.15, gain_db=-1, reverb=0.5)
    hp.chord(2, [k(1, -1), k(5, -1), k(1), k(5), k(1, 1), k(3, 1), k('#4', 1), k(5, 1), k(1, 2)], 2, 0.55, spread=0.03)
    gl = cue.part('glock', 'glock', 'foundation', pan=-0.3, gain_db=-2, reverb=0.55)
    gl.chord(2, [k(5, 2), k(1, 3)], 2, 0.5, spread=0.04)
    strings_chord(cue, 2, k, [(1, -1), [(1, 0)], [(5, 0)], [(3, 1), ('#4', 1)]], 3, 0.4, shape='dim', attack=0.02, trem=True)
    return cue


def reveal(k):
    cue = Cue('sting-reveal', 'Reveal', 80, 2, k, kind='sting', tail=5.0, hall=3.0, brightness=0.6)
    cue.part('fx', 'flute', 'foundation').hit(2, 'cymbal_swell', gain_db=-9)
    # bVI swelling into I: the 'look at that' cadence.
    strings_chord(cue, 0, k, [('b6', -2), [('b6', -1), (1, 0)], [('b3', 0)], [(1, 1), ('b3', 1)]], 2, 0.5, shape='swell', attack=0.2)
    strings_chord(cue, 2, k, [(1, -1), [(1, -1), (5, -1)], [(3, 0), (5, 0)], [(1, 1), (3, 1), (5, 1)]], 4, 0.7, shape='dim', attack=0.01)
    hn = cue.part('horns', 'horn', 'foundation', pan=0.25, gain_db=-2, reverb=0.45, attack=0.02)
    hn.chord(2, [k(1, -1), k(5, -1), k(1)], 4, 0.65, shape='dim')
    hp = cue.part('harp', 'harp', 'foundation', pan=-0.2, gain_db=-1, reverb=0.45)
    hp.chord(2, [k(1, -1), k(5, -1), k(1), k(3), k(5), k(1, 1), k(3, 1), k(5, 1)], 3, 0.6, spread=0.025)
    cue.part('glock', 'glock', 'foundation', gain_db=-3, reverb=0.5).seq(2, f'{k(5, 2)}:.5 {k(1, 3)}:.5 {k(3, 3)}:2', vel=0.45)
    cue.part('timpani', 'timpani', 'foundation', gain_db=-3).note(2, k(1, -1), 2, 0.6)
    return cue


def victory(k):
    cue = Cue('sting-victory', 'Victory', 112, 2, k, kind='sting', tail=4.5, hall=2.4)
    ts = cue.part('trumpet stac', 'trumpet_stac', 'foundation', pan=0.05, gain_db=3, reverb=0.4)
    for i in range(3):
        ts.note(i / 3, k(5), 1 / 3, 0.6 + i * 0.05)
    tp = cue.part('trumpet', 'trumpet', 'foundation', pan=0.05, gain_db=-3, reverb=0.4, attack=0.01, legato=0.03)
    tp.seq(1, f'{k(1, 1)}:1 {k(2, 1)}:.5 {k(3, 1)}:.5 {k(5, 1)}:3', vel=0.65, shape=None)
    hn = cue.part('horns', 'horn', 'foundation', pan=0.25, gain_db=-1, reverb=0.45, attack=0.02)
    hn.seq(1, f'{k(1)}:1 {k(2)}:.5 {k(3)}:.5 {k(5)}:3', vel=0.65, transpose=-12)
    hn.chord(3, [k(1, -1), k(3, -1)], 3, 0.6)
    st = cue.part('strings stac', 'violins_spic', 'foundation', pan=-0.35, gain_db=-4, reverb=0.35)
    for b, ch in [(1, (1, 3, 5)), (2, (4, 6, 8)), (2.5, (5, 7, 9))]:
        st.chord(b, [k(d, 1) for d in ch], 0.5, 0.65)
    strings_chord(cue, 3, k, [(1, -1), [(1, -1), (5, -1)], [(3, 0), (5, 0)], [(1, 1), (3, 1), (5, 1), (1, 2)]], 3, 0.75, shape='dim', attack=0.01)
    tm = cue.part('timpani roll', 'timpani_roll', 'foundation', gain_db=-6)
    tm.note(1, k(5, -2), 2, 0.5, shape='cresc')
    cue.part('timpani', 'timpani', 'foundation', gain_db=-2).note(3, k(1, -1), 2, 0.7)
    fx = cue.part('fx', 'flute', 'foundation')
    fx.hit(3, 'crash', gain_db=-9).hit(3, 'triangle', gain_db=-12)
    cue.part('glock', 'glock', 'foundation', gain_db=-3, reverb=0.5).chord(3, [k(5, 2), k(1, 3)], 2, 0.5)
    return cue


def small_win(k):
    cue = Cue('sting-small-win', 'Small Win', 120, 1, k, kind='sting', tail=2.5, hall=2.0)
    pz = cue.part('pizz', 'violins_pizz', 'foundation', pan=-0.3, gain_db=-1, reverb=0.35)
    pz.seq(0, f'{k(1, 1)}:.5 {k(3, 1)}:.5 {k(5, 1)}:1', vel=0.6)
    gl = cue.part('glock', 'glock', 'foundation', pan=0.3, gain_db=-3, reverb=0.45)
    gl.seq(0, f'{k(1, 2)}:.5 {k(3, 2)}:.5 {k(5, 2)}:1', vel=0.45)
    cue.part('harp', 'harp', 'foundation', gain_db=-4, reverb=0.4).chord(1, [k(1), k(5), k(1, 1), k(3, 1)], 1, 0.5, spread=0.02)
    return cue


def discovery(k):
    cue = Cue('sting-discovery', 'Discovery', 100, 2, k, kind='sting', tail=3.5, hall=2.6, brightness=0.6)
    fl = cue.part('flute', 'flute', 'foundation', pan=-0.2, gain_db=-3, reverb=0.45, attack=0.02)
    fl.seq(0, f'{k(5)}:.33 {k(1, 1)}:.33 {k(2, 1)}:.34 {k("#4", 1)}:2.5', vel=0.5)
    gl = cue.part('glock', 'glock', 'foundation', pan=0.3, gain_db=-5, reverb=0.55)
    gl.seq(1, f'{k("#4", 2)}:1 {k(5, 2)}:2', vel=0.4)
    hp = cue.part('harp', 'harp', 'foundation', pan=0.2, gain_db=-3, reverb=0.45)
    hp.chord(1, [k(1, -1), k(5, -1), k(2), k(3), k(5)], 2, 0.5, spread=0.05)
    strings_chord(cue, 1, k, [(1, -1), [(5, -1)], [(2, 0)], [(3, 1), (5, 1)]], 3, 0.35, shape='arc', attack=0.3)
    return cue


def oops(k):
    cue = Cue('sting-oops', 'Oops', 110, 1, k, kind='sting', tail=2.0, hall=1.8)
    bs = cue.part('bassoon', 'bassoon_stac', 'foundation', pan=0.2, gain_db=-1, reverb=0.3)
    bs.seq(0, f'{k(5)}:.5 {k(5) - 1}:.5 {k(4)}:.5', vel=0.6, transpose=-12)
    bsus = cue.part('bassoon hold', 'bassoon', 'foundation', pan=0.2, gain_db=-3, reverb=0.3, attack=0.01)
    bsus.note(1.5, k(3, -1), 1, 0.5, shape='dim')
    cue.part('pizz', 'cellos_pizz', 'foundation', pan=-0.2, gain_db=-3, reverb=0.3).chord(1.5, [k(1, -1), k(5, -1)], 1, 0.6)
    return cue


def build_complete(k):
    cue = Cue('sting-build-complete', 'Build Complete', 120, 1, k, kind='sting', tail=3.0, hall=2.2)
    mr = cue.part('marimba', 'marimba', 'foundation', pan=-0.25, gain_db=-2, reverb=0.3)
    mr.seq(0, f'{k(1)}:.25 {k(3)}:.25 {k(5)}:.25 {k(1, 1)}:.25 {k(3, 1)}:.5 {k(5, 1)}:.5 {k(1, 2)}:2', vel=0.6)
    hs = cue.part('horn stac', 'horn_stac', 'foundation', pan=0.25, gain_db=-3, reverb=0.4)
    hs.chord(1, [k(1, -1), k(5, -1), k(1)], 1, 0.7)
    cue.part('pizz', 'violins_pizz', 'foundation', pan=-0.3, gain_db=-3, reverb=0.35).chord(1, [k(3, 1), k(5, 1), k(1, 2)], 1, 0.7)
    cue.part('glock', 'glock', 'foundation', gain_db=-4, reverb=0.5).note(1, k(1, 3), 2, 0.5)
    cue.part('timpani', 'timpani', 'foundation', gain_db=-5).note(1, k(1, -1), 1, 0.55)
    return cue


STINGS = [
    ('arrival', 'Arrival', arrival, 'Harp sweep into the orchestra arriving on the home chord, horns quote Abbie\'s motif.',
     ['arriving in a world', 'teleport landing', 'opening a level'], ['arrival', 'harp', 'horns']),
    ('teleport', 'Teleport', teleport, 'Glockenspiel glissando and bell tree rise into a sparkling lydian harp chord.',
     ['teleport', 'portal', 'magic transition'], ['teleport', 'magic', 'shimmer']),
    ('reveal', 'Reveal', reveal, 'Strings swell on the flat-six chord and open onto the home chord with horns, harp and bells.',
     ['revealing a new world', 'unveiling a build', 'surprise'], ['reveal', 'swell', 'cinematic']),
    ('victory', 'Victory', victory, 'Brass fanfare on Abbie\'s motif over timpani and a full orchestra hit.',
     ['winning', 'quest complete', 'big achievement'], ['victory', 'fanfare', 'brass']),
    ('small-win', 'Small Win', small_win, 'Three plucked notes and a bell: a quick, friendly yes.',
     ['collecting', 'small success', 'task done'], ['success', 'pizzicato', 'short']),
    ('discovery', 'Discovery', discovery, 'Flute asks a question with the lydian fourth; harp and bells answer.',
     ['finding something', 'new item', 'curiosity'], ['discovery', 'flute', 'magic']),
    ('oops', 'Oops', oops, 'Bassoon slips down a half step and lands softly on pizzicato. Gentle, never mocking.',
     ['mistake', 'try again', 'blocked action'], ['oops', 'bassoon', 'light']),
    ('build-complete', 'Build Complete', build_complete, 'Marimba runs up to a horn and pizzicato hit with a bell on top.',
     ['building finished', 'tile placed', 'upgrade done'], ['build', 'marimba', 'success']),
]


def jobs():
    out = []
    for sid, title, fn, brief, uses, tags in STINGS:
        meta = {'id': f'sting-{sid}', 'title': title, 'group': 'Stings', 'brief': brief, 'uses': uses,
                'tags': ['sting'] + tags, 'keys': list(KEYS)}
        for key, tonic in KEYS.items():
            out.append((meta, (lambda fn=fn, tonic=tonic, key=key: _keyed(fn, tonic, key)), key))
    return out


def _keyed(fn, tonic, name):
    k = Key(tonic, 'major')
    k.name = name
    return fn(k)
