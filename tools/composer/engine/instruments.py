"""The orchestra: which VS Chamber Orchestra CE (CC0) sample folders make each instrument, and how to read
a sample's pitch, dynamic layer and round robin from its file name.

Each instrument is a list of zones. A zone is one sample file with its MIDI pitch, a dynamic layer (1 = soft)
and a round-robin index. The sampler picks the nearest pitch, the layer nearest the note's velocity, and
rotates round robins so repeated notes never sound copied.
"""
import os, re, glob

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    """'C4' -> 60, 'F#3' -> 54, 'Bb2' -> 46. Ints pass through."""
    if isinstance(name, (int, float)):
        return int(name)
    m = re.fullmatch(r'([A-Ga-g])([#b]?)(-?\d)', name.strip())
    if not m:
        raise ValueError(f'bad note {name!r}')
    n = NOTE[m.group(1).upper()] + {'#': 1, 'b': -1, '': 0}[m.group(2)]
    return 12 * (int(m.group(3)) + 1) + n


NOTE_IN_NAME = re.compile(r'(?<![A-Za-z])([A-G]#?)(-?\d)(?=_|\.|$)')
LAYER_IN_NAME = re.compile(r'_(?:v|dyn)(\d)', re.I)
RR_IN_NAME = re.compile(r'_rr(\d)|_(\d)(?:_sum|_Mid|_Main)?\.wav$|_0(\d)(?:_far)?\.wav$', re.I)
DYN_WORDS = {'pp': 1, 'p': 1, 'mp': 2, 'mf': 2, 'f': 3, 'ff': 3, 'fff': 4, 'loud': 3, 'medium': 2, 'soft': 1}


def parse_name(path):
    base = os.path.basename(path)
    m = NOTE_IN_NAME.search(base)
    if not m:
        return None
    pitch = midi(m.group(1) + m.group(2))
    lm = LAYER_IN_NAME.search(base)
    layer = int(lm.group(1)) if lm else 2
    if not lm:
        for word, v in DYN_WORDS.items():
            if re.search(rf'_{word}(?:_|\.)', base, re.I):
                layer = v
                break
    rm = RR_IN_NAME.search(base)
    rr = int(next(g for g in rm.groups() if g)) if rm else 1
    return pitch, layer, rr


def piano_zones(root):
    zones = []
    for f in glob.glob(os.path.join(root, 'Keys/Upright Piano/Player_dyn*_rr1_*.wav')):
        m = re.search(r'dyn(\d)_rr1_(\d{3})', f)
        zones.append((21 + 2 * int(m.group(2)), int(m.group(1)), 1, f))
    return zones


# name: (folders, gain, default release s, kind). kind 'sus' is held for the note length, 'hit' rings out.
ORCHESTRA = {
    'violins':      (['Strings/Violin Section/susVib'], 1.0, 0.55, 'sus'),
    'violins_trem': (['Strings/Violin Section/Trem'], 0.8, 0.5, 'sus'),
    'violins_pizz': (['Strings/Violin Section/Pizz'], 1.1, 0.4, 'hit'),
    'violins_spic': (['Strings/Violin Section/Spic'], 0.9, 0.3, 'hit'),
    'violas':       (['Strings/Viola Section/susvib'], 1.0, 0.55, 'sus'),
    'violas_pizz':  (['Strings/Viola Section/pizz'], 1.1, 0.4, 'hit'),
    'cellos':       (['Strings/Cello Section/susvib'], 1.0, 0.6, 'sus'),
    'cellos_pizz':  (['Strings/Cello Section/pizzT'], 1.1, 0.5, 'hit'),
    'cellos_trem':  (['Strings/Cello Section/trem'], 0.8, 0.5, 'sus'),
    'bass':         (['Strings/Solo Contrabass/SusVib'], 1.0, 0.6, 'sus'),
    'bass_pizz':    (['Strings/Solo Contrabass/Pizz'], 1.2, 0.6, 'hit'),
    'solo_violin':  (['Strings/Solo Violin/Arco Vib'], 0.9, 0.5, 'sus'),
    'harp':         (['Strings/Harp'], 1.0, 2.5, 'hit'),
    'horn':         (['Brass/F Horn/sus'], 0.9, 0.5, 'sus'),
    'horn_stac':    (['Brass/F Horn/stac'], 0.9, 0.3, 'hit'),
    'trumpet':      (['Brass/Trumpet/sus'], 0.75, 0.4, 'sus'),
    'trumpet_stac': (['Brass/Trumpet/stac'], 0.75, 0.25, 'hit'),
    'trombone':     (['Brass/Tenor Trombone/sus'], 0.8, 0.45, 'sus'),
    'tuba':         (['Brass/Tuba/sus'], 0.8, 0.5, 'sus'),
    'flute':        (['Woodwinds/Flute/susvib'], 0.9, 0.4, 'sus'),
    'flute_stac':   (['Woodwinds/Flute/stac'], 0.9, 0.25, 'hit'),
    'piccolo':      (['Woodwinds/Piccolo/Sus'], 0.6, 0.3, 'sus'),
    'oboe':         (['Woodwinds/Oboe/Vib'], 0.85, 0.35, 'sus'),
    'clarinet':     (['Woodwinds/Clarinet/susLong'], 0.9, 0.4, 'sus'),
    'clarinet_stac': (['Woodwinds/Clarinet/stac'], 0.9, 0.25, 'hit'),
    'bassoon':      (['Woodwinds/Bassoon/sus'], 0.9, 0.4, 'sus'),
    'bassoon_stac': (['Woodwinds/Bassoon/stac'], 1.0, 0.25, 'hit'),
    'glock':        (['Percussion/Glock'], 0.55, 3.0, 'hit'),
    'marimba':      (['Percussion/Marimba'], 0.9, 1.5, 'hit'),
    'xylo':         (['Percussion/Xylo'], 0.6, 1.0, 'hit'),
}

# Unpitched and effect samples, chosen by name; 'layer' picks the dynamic.
FX = {
    'timpani_hit':  'Percussion/Timpani/Timpani{drum}_Hit_v{layer}_rr{rr}_Sum.wav',
    'bass_drum':    'Percussion/BDrumNewhit_v{layer}_rr{rr}_Sum.wav',
    'cymbal_swell_short': 'Percussion/susCymb1-cresc-Short_v1.wav',     # swells: placed so the peak lands on the beat
    'cymbal_swell': 'Percussion/susCymb1-cresc-Median_v1.wav',
    'cymbal_swell_long': 'Percussion/susCymb1-cresc-Long_v1.wav',
    'cymbal_roll':  'VSCO 1 Percussion/varMetal/Cymbals/susp/susp_hit_softmall_roll2_cresc.wav',
    'cymbal_hit':   'Percussion/susCymb1-hit_mp_rr*.wav',
    'crash':        'Percussion/cymbal-crash1_mf_rr*.wav',
    'crash_big':    'Percussion/cymbal-crash1_ff_rr*.wav',
    'triangle':     'Percussion/Triangle3-Hit_v1_rr*_Sum.wav',
    'triangle_roll': 'Percussion/Triangle3-Roll_v2_rr1_Sum.wav',
    'glock_gliss_up': 'Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_chromatic_fast_*.wav',
    'glock_gliss_up_slow': 'Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_pentatonic_med_*.wav',
    'glock_gliss_down': 'Miscellania Raw/Misc 2/glock_glisses/glock_fx_down_pentatonic_med_*.wav',
    'bells':        'Miscellania Raw/Misc 2/NepaleseBells/fx1_short_r0*_main.wav',
    'bell_tree':    'Percussion/BellTree_Stroke*_v1_Sum.wav',
    'sleigh':       'Percussion/Sleighbells_Hit_v1_rr*_Mid.wav',
    'vibraring':    'Percussion/vibraring_v1_rr*.wav',
    'gong':         'Percussion/gongHit_mf.wav',
}
PEAK_ALIGNED = {'cymbal_swell_short', 'cymbal_swell', 'cymbal_swell_long', 'cymbal_roll'}


# Most VSCO file names put middle C at C3; these few use C4. Checked by measuring each sample's fundamental
# (tools/composer/README.md, "Tuning check").
NAMED_AT_PITCH = {'solo_violin', 'harp', 'xylo'}


# Timpani file names carry the drum number, not its note. Measured strongest partial of each drum (MIDI):
TIMPANI_TUNING = {1: 41.46, 2: 53.56, 3: 56.3, 4: 58.94, 5: 54.55}


def timpani_zones(root, roll=False):
    out = []
    pat = 'Percussion/Timpani/Rolls/Timpani*_Roll_v*_rr*_Sum.wav' if roll else 'Percussion/Timpani/Timpani*_Hit_v*_rr*_Sum.wav'
    for f in glob.glob(os.path.join(root, pat)):
        m = re.search(r'Timpani(\d)_(?:Hit|Roll)_v(\d)_rr(\d)', f)
        out.append((TIMPANI_TUNING[int(m.group(1))], int(m.group(2)), int(m.group(3)), f))
    return out


def zones(root, name):
    if name == 'piano':
        return piano_zones(root)
    if name in ('timpani', 'timpani_roll'):
        return timpani_zones(root, name == 'timpani_roll')
    folders = ORCHESTRA[name][0]
    shift = 0 if name in NAMED_AT_PITCH else 12
    out = []
    for folder in folders:
        for f in sorted(glob.glob(os.path.join(root, glob.escape(folder), '*.wav'))):
            p = parse_name(f)
            if p:
                out.append((p[0] + shift, p[1], p[2], f))
    if not out:
        raise FileNotFoundError(f'no samples for {name} under {root} ({folders}); run fetch_samples.sh')
    return out


def info(name):
    if name == 'piano':
        return 1.0, 1.2, 'hit'
    if name == 'timpani':
        return 1.0, 3.0, 'hit'
    if name == 'timpani_roll':
        return 0.9, 1.2, 'sus'
    _, gain, rel, kind = ORCHESTRA[name]
    return gain, rel, kind
